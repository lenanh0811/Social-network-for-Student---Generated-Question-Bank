import { call, isMock } from '@/api/http';
import { api } from '@/api/backend';
import * as A from './adapters';
import { approvedQuestions, db, makeQuestion, MOCK_CLASSES, MOCK_SUBJECTS, STUDENT, uid } from './mock-db';
import type * as T from './types';

// Không có GET /questions/{id} trong đặc tả => cache câu hỏi từ các API danh sách/chi tiết.
const cache = new Map<string, T.Question>();
const remember = <Q extends T.Question | T.Question[]>(x: Q): Q => {
  (Array.isArray(x) ? x : [x]).forEach((it) => cache.set(it.id, it));
  return x;
};
export const getCachedQuestion = (id: string) => cache.get(id);

const findQ = (id: string) => {
  for (const s of db.sessions) {
    const i = s.questions.findIndex((x) => x.id === id);
    if (i >= 0) return { s, i, q: s.questions[i] };
  }
  throw new Error('Không tìm thấy câu hỏi');
};
const findS = (id: string) => {
  const s = db.sessions.find((x) => x.id === id);
  if (!s) throw new Error('Không tìm thấy phiên gửi câu hỏi');
  return s;
};
const mine = (s: T.Session) => s.authorId === STUDENT.id;

// ───────── 5.2.1 Sinh viên đề xuất / trả lời / đánh giá ─────────
/** Danh sách lớp học phần của tôi (GET /sessions/my-enrolled-course-classes) — chọn lớp khi đề xuất. */
export const listMyClasses = () =>
  api<A.RawClass[] | T.CourseClassOption[]>('GET', '/sessions/my-enrolled-course-classes', { mock: () => MOCK_CLASSES })
    .then((r) => (isMock ? (r as T.CourseClassOption[]) : (r as A.RawClass[]).map(A.toClass)));

type SubmissionInput = { title: string; content?: string; sourceUrl?: string; courseClassId: string; questions: T.QuestionDraft[] };

/** 11 – POST /sessions/propose */
export const proposeSession = (p: SubmissionInput) =>
  api<A.RawSession | T.Session>('POST', '/sessions/propose', {
    body: A.proposeBody(p),
    mock: () => {
      const id = uid('s');
      const cls = MOCK_CLASSES.find((c) => c.id === p.courseClassId);
      const s: T.Session = {
        id, title: p.title, content: p.content, subject: cls?.subjectName ?? '', courseClassId: p.courseClassId, className: cls?.classCode,
        authorId: STUDENT.id, authorName: STUDENT.name, status: 'pending', createdAt: new Date().toISOString(),
        questions: p.questions.map((d) => ({
          ...d, id: uid('q'), sessionId: id, authorId: STUDENT.id, authorName: STUDENT.name,
          subject: cls?.subjectName ?? '', status: 'pending' as const, avgRating: 0, ratingCount: 0, answerCount: 0,
        })),
      };
      db.sessions.unshift(s);
      return s;
    },
  }).then((r) => (isMock ? (r as T.Session) : A.toSession(r as A.RawSession)));

/** 12 – GET /sessions/my-submissions (cursor: chỉ lấy trang đầu, tối đa 100 phiên) */
export const listMySubmissions = (status?: T.SessionStatus) =>
  api<{ contents: A.RawSession[] } | T.Session[]>('GET', '/sessions/my-submissions', {
    query: { limit: 100, status: status?.toUpperCase() },
    mock: () => db.sessions.filter((s) => mine(s) && (!status || s.status === status)),
  }).then((r) => (isMock ? (r as T.Session[]) : (r as { contents: A.RawSession[] }).contents.map((s) => A.toSession(s))));

/** 13 – GET /sessions/my-submissions/{id} (có đủ câu hỏi) */
export const getMySubmission = (id: string) =>
  api<A.RawSession | T.Session>('GET', `/sessions/my-submissions/${id}`, { mock: () => findS(id) })
    .then((r) => (isMock ? (r as T.Session) : A.toSession(r as A.RawSession)))
    .then((s) => { remember(s.questions); return s; });

/** 14 – PUT /sessions/my-submissions/{id} (chỉ sửa được khi phiên còn chờ duyệt) */
export const updateMySubmission = (id: string, p: Omit<SubmissionInput, 'courseClassId'>) =>
  api<unknown>('PUT', `/sessions/my-submissions/${id}`, {
    body: A.updateBody(p),
    mock: () => {
      const s = findS(id);
      Object.assign(s, { title: p.title, content: p.content, status: 'pending' });
      s.questions = p.questions.map((d, i) => ({
        ...(s.questions[i] ?? { id: uid('q'), sessionId: id, authorId: s.authorId, authorName: s.authorName, subject: s.subject, avgRating: 0, ratingCount: 0, answerCount: 0 }),
        ...d, status: 'pending' as const,
      }));
    },
  }).then(() => undefined);

/** 15 – DELETE /sessions/my-submissions/{id} */
export const deleteMySubmission = (id: string) =>
  api<void>('DELETE', `/sessions/my-submissions/${id}`, { mock: () => { db.sessions = db.sessions.filter((s) => s.id !== id); } });

/** 16 */
export const listUserQuestions = (userId: string) =>
  call<T.Question[]>('GET', `/users/${userId}/questions`, undefined, () =>
    approvedQuestions().filter((x) => x.authorId === userId)).then(remember);
/** 17 */
export const answerQuestion = (qid: string, choice: number) =>
  call<T.AnswerResult>('POST', `/questions/${qid}/answer`, { choice }, () => {
    const { q } = findQ(qid);
    (db.answered[qid] ??= []).push(choice);
    q.answerCount++;
    return { correct: choice === q.correctIndex, correctIndex: q.correctIndex, explanation: q.explanation };
  });
/** 18 */
export const getQuestionStatistics = (qid: string) =>
  call<T.QuestionStatistics>('GET', `/questions/${qid}/statistics`, undefined, () => {
    const { q } = findQ(qid);
    const a = db.answered[qid] ?? [];
    const distribution = q.options.map((_, i) => a.filter((x) => x === i).length);
    return { totalAnswers: a.length, correctRate: a.length ? distribution[q.correctIndex] / a.length : 0, distribution };
  });
/** 19 */
const rateQuestionMock = (qid: string, stars: number, comment?: string) => {
  const { q } = findQ(qid);
  const r: T.Rating = { id: uid('r'), userName: STUDENT.name, stars, comment, createdAt: new Date().toISOString() };
  (db.ratings[qid] ??= []).unshift(r);
  q.avgRating = db.ratings[qid].reduce((t, x) => t + x.stars, 0) / db.ratings[qid].length;
  q.ratingCount = db.ratings[qid].length;
  return r;
};
export const rateQuestion = (qid: string, stars: number, comment?: string) =>
  call<T.Rating>('POST', `/questions/${qid}/rate`, { stars, comment }, () => rateQuestionMock(qid, stars, comment));
/** 20 */
export const listRatings = (qid: string) =>
  call<T.Rating[]>('GET', `/questions/${qid}/ratings`, undefined, () => db.ratings[qid] ?? []);

// ───────── 5.2.2 Giảng viên duyệt câu hỏi ─────────
/** 21 */
export const listPendingSessions = () =>
  call<T.Session[]>('GET', '/sessions/pending', undefined, () => db.sessions.filter((s) => s.status !== 'resolved'));
/** 22 */
export const getSession = (id: string) =>
  call<T.Session>('GET', `/sessions/${id}`, undefined, () => findS(id)).then((s) => {
    remember(s.questions);
    return s;
  });
/** 23 */
export const approveSessions = (sessionIds: string[]) =>
  call<void>('POST', '/sessions/approve', { sessionIds }, () => {
    sessionIds.forEach((id) => {
      const s = findS(id);
      s.status = 'resolved';
      s.questions.forEach((x) => { if (x.status !== 'needs-edit') x.status = 'approved'; });
    });
  });
/** 24 */
export const rejectSessions = (sessionIds: string[], reason: string) =>
  call<void>('POST', '/sessions/reject', { sessionIds, reason }, () => {
    sessionIds.forEach((id) => {
      const s = findS(id);
      s.status = 'resolved';
      s.questions.forEach((x) => { x.status = 'rejected'; x.rejectionCode = 'OTHER'; x.rejectionReason = reason; });
    });
  });
/** 25 */
export const updateQuestion = (qid: string, patch: Partial<T.QuestionDraft> & { status?: T.QuestionStatus }) =>
  call<T.Question>('PUT', `/questions/${qid}`, patch, () => Object.assign(findQ(qid).q, patch)).then(remember);

/**
 * Luồng duyệt theo slide 3.1 (9) – dùng PUT /questions/{id} (API 25) với trường `status`:
 *  1) GV tích chọn câu tiềm năng → 'needs-edit' (điểm cộng của SV được bảo lưu)
 *  2) Quyết định cuối: giữ → 'approved' (vào ngân hàng) / loại → 'rejected'.
 */
export const markNeedsEdit = (qids: string[]) => Promise.all(qids.map((id) => updateQuestion(id, { status: 'needs-edit' })));
export const decideQuestion = (qid: string, keep: boolean) => updateQuestion(qid, { status: keep ? 'approved' : 'rejected' });
/** TODO backend: GET /questions?status=needs-edit — danh sách câu đang ở trạng thái "Cần edit". */
export const listNeedsEdit = () =>
  call<T.Question[]>('GET', '/questions?status=needs-edit', undefined, () =>
    db.sessions.flatMap((s) => s.questions).filter((x) => x.status === 'needs-edit')).then(remember);

// ───────── 5.2.3 AI ─────────
/** 26 – gợi ý chỉnh sửa, chưa ghi vào câu hỏi */
export const aiRefine = (qid: string, instruction: string) =>
  call<T.AiSuggestion>('POST', `/questions/${qid}/ai-refine`, { instruction }, () => {
    const { q } = findQ(qid);
    return {
      content: q.content.replace(/\?*$/, '') + ' (nêu rõ ngữ cảnh)?',
      options: q.options.map((o) => o.trim()),
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? `Đáp án đúng là "${q.options[q.correctIndex]}" vì phù hợp với định nghĩa trong giáo trình.`,
      notes: `Đã diễn đạt lại câu hỏi cho rõ ràng hơn${instruction ? ` theo yêu cầu: “${instruction}”` : ''} và bổ sung giải thích.`,
    };
  });
/** 27 – áp dụng gợi ý của AI vào câu hỏi */
export const aiApply = (qid: string, s: T.AiSuggestion) =>
  call<T.Question>('POST', `/questions/${qid}/ai-apply`, s, () =>
    Object.assign(findQ(qid).q, { content: s.content, options: s.options, correctIndex: s.correctIndex, explanation: s.explanation })).then(remember);

// ───────── 5.2.4 Trò chơi ─────────
/** GET /subjects – danh sách môn học (Game 4, bảng xếp hạng theo môn). */
export const listSubjects = () =>
  api<{ subject_id: number; code: string; name: string }[] | T.Subject[]>('GET', '/subjects', { mock: () => MOCK_SUBJECTS })
    .then((r) => (isMock ? (r as T.Subject[]) : (r as { subject_id: number; code: string; name: string }[]).map(A.toSubject)));

const mockPrediction = (game: T.GameType, prediction: Record<string, unknown>): T.Prediction => {
  const p: T.Prediction = { id: uid('p'), game, status: 'pending', prediction, createdAt: new Date().toISOString() };
  db.predictions.unshift(p);
  return p;
};
const asPrediction = (r: unknown) => (isMock ? (r as T.Prediction) : A.toPrediction(r as A.RawPrediction));

/** GET /games/prediction/game-1/classes – lớp học phần để đặt cược Game 1 */
export const listGame1Classes = () =>
  api<A.RawGame1Class[] | T.Game1Class[]>('GET', '/games/prediction/game-1/classes', {
    mock: () => MOCK_CLASSES.filter((c) => c.canPropose).map((c) => ({ classId: c.id, classCode: c.classCode, semester: c.semesterName, subjectName: c.subjectName, lecturerName: 'TS. Trần Minh Quân', alreadyPredicted: false })),
  }).then((r) => (isMock ? (r as T.Game1Class[]) : (r as A.RawGame1Class[]).map(A.toGame1Class)));
/** 28 – Game 1: đoán số sinh viên nộp câu hỏi ngày mai (chốt cược trước 22:00) */
export const placeGame1 = (courseClassId: string, predictedCount: number) =>
  api<unknown>('POST', '/games/prediction/participants', { body: { course_class_id: Number(courseClassId), predicted_count: predictedCount }, mock: () => mockPrediction('GAME_1_PARTICIPANTS', { predicted_count: predictedCount }) }).then(asPrediction);
/** 29 – Game 2: đoán số câu AI / người trong phiên của mình được duyệt */
export const placeGame2 = (sessionId: string, llm: number, human: number) =>
  api<unknown>('POST', '/games/prediction/approved-questions', { body: { session_id: Number(sessionId), predicted_llm_count: llm, predicted_human_count: human }, mock: () => mockPrediction('GAME_2_APPROVED_QUESTIONS', { predicted_llm_count: llm, predicted_human_count: human }) }).then(asPrediction);
/** 30 – Game 4: đoán quy mô ngân hàng câu hỏi của môn cuối kỳ */
export const placeGame4 = (subjectId: string, size: number) =>
  api<unknown>('POST', '/games/prediction/bank-size', {
    body: { subject_id: Number(subjectId), predicted_bank_size: size },
    mock: () => {
      if (db.predictions.some((x) => x.game === 'GAME_4_SUBJECT_BANK_SIZE')) throw new Error('Bạn đã dự đoán rồi — mỗi người chỉ được đoán một lần.');
      return mockPrediction('GAME_4_SUBJECT_BANK_SIZE', { predicted_bank_size: size });
    },
  }).then(asPrediction);

/** 31 – GET /games/my-predictions (cursor: chỉ trang đầu, tối đa 50) */
export const listMyPredictions = () =>
  api<{ contents: A.RawPrediction[] } | T.Prediction[]>('GET', '/games/my-predictions', { query: { limit: 50 }, mock: () => db.predictions })
    .then((r) => (isMock ? (r as T.Prediction[]) : (r as { contents: A.RawPrediction[] }).contents.map(A.toPrediction)));

/** 32 – GET /games/leaderboard (theo học kỳ hoặc theo môn) */
export const getLeaderboard = (period: 'SEMESTER' | 'SUBJECT' = 'SEMESTER', subjectId?: string) =>
  api<A.RawLeaderboard | T.Leaderboard>('GET', '/games/leaderboard', {
    query: { period, subject_id: period === 'SUBJECT' ? subjectId : undefined, limit: 20 },
    mock: () => {
      const mineScore = 80;
      const entries = [
        { userId: 'u9', name: 'Hoàng Gia Huy', points: 340 }, { userId: 'u2', name: 'Lê Thu Hà', points: 285 },
        { userId: STUDENT.id, name: STUDENT.name, points: mineScore }, { userId: 'u3', name: 'Phạm Quốc Bảo', points: 60 },
      ].sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1, isMe: e.userId === STUDENT.id }));
      const me = entries.find((e) => e.isMe)!;
      return { entries, myRank: { rank: me.rank, points: me.points, topPercent: 50, total: entries.length } };
    },
  }).then((r) => (isMock ? (r as T.Leaderboard) : A.toLeaderboard(r as A.RawLeaderboard)));

/** GET /games/prediction/active-session – phiên Game 6 (Thứ 7 hàng tuần); null nếu chưa mở */
export const getGame6Round = () =>
  api<A.RawGame6 | T.Game6Round | null>('GET', '/games/prediction/active-session', {
    mock: () => ({
      sessionId: 'round1', weekNumber: 45, year: 2026, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 864e5).toISOString(),
      questions: LLM_SET.map((c, i) => makeQuestion(`g${i + 1}`, 'sg', 'u9', 'Ẩn danh', 'Công nghệ Web', c, ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'], 0, 'Tổng hợp', 'medium', 'approved')),
    }),
  }).then((r) => (!r ? null : isMock ? (r as T.Game6Round) : A.toGame6(r as A.RawGame6))).then((r) => { if (r) remember(r.questions); return r; });
/** POST /games/prediction/submit – Game 6: nộp các câu bạn nghĩ do AI tạo (mỗi phiên một lần) */
export const submitGame6 = (sessionId: string, questionIds: string[]) =>
  api<unknown>('POST', '/games/prediction/submit', {
    body: { minigame_session_id: Number(sessionId), selected_llm_question_ids: questionIds.map(Number) },
    mock: () => {
      if (db.llmSubmitted) throw new Error('Mỗi bạn chỉ được trả lời một lần cho một phiên chơi.');
      db.llmSubmitted = true;
      return mockPrediction('GAME_6_LLM_IDENTIFICATION', { selected_llm_question_ids: questionIds });
    },
  }).then(() => undefined);

/** GET / POST /games/check-in – điểm danh hằng ngày (+1 xu, chuỗi ngày liên tiếp) */
export const getCheckIn = () =>
  api<{ current_streak: number; has_checked_in_today: boolean } | T.CheckInStatus>('GET', '/games/check-in', { mock: () => db.checkIn })
    .then((r) => (isMock ? (r as T.CheckInStatus) : A.toCheckIn(r as { current_streak: number; has_checked_in_today: boolean })));
export const doCheckIn = () =>
  api<unknown>('POST', '/games/check-in', { mock: () => { db.checkIn = { streak: db.checkIn.streak + 1, checkedInToday: true }; return db.checkIn; } }).then(() => getCheckIn());

/** Game 5 – báo câu lỗi: POST /questions/{id}/rate với is_error = true (điểm tự động là 0). */
export const reportQuestion = (qid: string, reason: string) =>
  api<unknown>('POST', `/questions/${qid}/rate`, { body: { rating: 0, is_error: true, comment: reason }, mock: () => rateQuestionMock(qid, 0, reason) }).then(() => undefined);
/** Mock: danh sách câu để báo lỗi (backend thật không có API này — báo lỗi từ màn câu hỏi). */
export const listReportableQuestions = () =>
  api<T.Question[]>('GET', '/games/reportable-questions', { mock: () => approvedQuestions() }).then((r) => { r.forEach((x) => cache.set(x.id, x)); return r; });

// ───────── 5.2.5 Xuất & sinh đề ─────────
const toFile = (name: string, rows: T.Question[], f: T.ExportFormat): T.ExportFile => {
  const L = 'ABCD';
  if (f === 'json') return { filename: `${name}.json`, mime: 'application/json', content: JSON.stringify(rows, null, 2) };
  if (f === 'csv') {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = 'id,subject,topic,difficulty,question,A,B,C,D,answer';
    const body = rows.map((r) => [r.id, r.subject, r.topic ?? '', r.difficulty ?? '', r.content, ...r.options, L[r.correctIndex]].map((v) => esc(String(v))).join(','));
    return { filename: `${name}.csv`, mime: 'text/csv', content: [head, ...body].join('\n') };
  }
  const txt = rows.map((r, i) => `Câu ${i + 1}. ${r.content}\n${r.options.map((o, k) => `  ${L[k]}. ${o}`).join('\n')}\n  Đáp án: ${L[r.correctIndex]}`).join('\n\n');
  return { filename: `${name}.txt`, mime: 'text/plain', content: txt };
};
/** 33 */
export const exportQuestions = (format: T.ExportFormat, subject?: string) =>
  call<T.ExportFile>('GET', `/questions/export?format=${format}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`, undefined, () =>
    toFile('ngan-hang-cau-hoi', approvedQuestions().filter((x) => !subject || x.subject === subject), format));
/** 34 */
export const generateExam = (p: T.ExamParams) =>
  call<T.Exam>('POST', '/exams/generate', p, () => {
    let pool = approvedQuestions().filter((x) => x.subject === p.subject);
    if (p.mode === 'targeted' && p.topics?.length) pool = pool.filter((x) => p.topics!.includes(x.topic ?? ''));
    if (!pool.length) throw new Error(`Chưa có câu hỏi đã duyệt phù hợp cho môn “${p.subject}”.`);
    const shuffle = <A,>(a: A[]) => [...a].sort(() => Math.random() - 0.5);
    let picked: T.Question[] = [];
    if (p.mode === 'random') picked = shuffle(pool).slice(0, p.count);
    else (['easy', 'medium', 'hard'] as const).forEach((d) => {
      picked.push(...shuffle(pool.filter((x) => x.difficulty === d)).slice(0, Math.round((p.count * p.mix[d]) / 100)));
    });
    const exam: T.Exam = {
      id: uid('e'), title: p.title, subject: p.subject, durationMin: p.durationMin,
      createdAt: new Date().toISOString(), questions: picked.length ? picked : shuffle(pool).slice(0, p.count),
    };
    db.exams.unshift(exam);
    return remember(exam.questions) && exam;
  });
/** TODO backend: GET /questions/topics?subject= — các chủ đề trong ngân hàng, dùng cho sinh đề có chủ đích. */
export const listBankTopics = (subject: string) =>
  call<string[]>('GET', `/questions/topics?subject=${encodeURIComponent(subject)}`, undefined, () =>
    [...new Set(approvedQuestions().filter((x) => x.subject === subject).map((x) => x.topic ?? '').filter(Boolean))]);
/** 35 */
export const getExam = (id: string) =>
  call<T.Exam>('GET', `/exams/${id}`, undefined, () => {
    const e = db.exams.find((x) => x.id === id);
    if (!e) throw new Error('Không tìm thấy đề thi');
    return e;
  });
/** 36 */
export const listMyExams = () => call<T.Exam[]>('GET', '/exams/my-exams', undefined, () => db.exams);
/** 37 */
export const exportExam = (id: string, format: T.ExportFormat) =>
  call<T.ExportFile>('GET', `/exams/${id}/export?format=${format}`, undefined, () => {
    const e = db.exams.find((x) => x.id === id);
    if (!e) throw new Error('Không tìm thấy đề thi');
    return toFile(e.title.replace(/\s+/g, '-').toLowerCase(), e.questions, format);
  });



const LLM_SET = ['TCP khác UDP ở điểm nào?', 'DNS dùng để làm gì?', 'HTTP/2 cải thiện gì so với HTTP/1.1?', 'CSS Grid khác Flexbox thế nào?', 'JWT gồm mấy phần?', 'Index trong CSDL giúp gì?', 'Event loop trong JavaScript là gì?', 'REST là viết tắt của gì?'];
