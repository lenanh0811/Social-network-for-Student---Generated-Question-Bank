import { call } from '@/shared/api/http';
import { approvedQuestions, db, makeQuestion, STUDENT, uid } from '@/modules/exam-bank/api/mockDb';
import type * as T from '@/modules/exam-bank/api/types';

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
/** 11 */
export const proposeSession = (p: { title: string; subject: string; questions: T.QuestionDraft[] }) =>
  call<T.Session>('POST', '/sessions/propose', p, () => {
    const id = uid('s');
    const s: T.Session = {
      id, title: p.title, subject: p.subject, authorId: STUDENT.id, authorName: STUDENT.name,
      status: 'pending', createdAt: new Date().toISOString(),
      questions: p.questions.map((d) => ({
        ...d, id: uid('q'), sessionId: id, authorId: STUDENT.id, authorName: STUDENT.name,
        subject: p.subject, status: 'pending', avgRating: 0, ratingCount: 0, answerCount: 0,
      })),
    };
    db.sessions.unshift(s);
    return remember(s.questions) && s;
  });
/** 12 */
export const listMySubmissions = (status?: T.SessionStatus) =>
  call<T.Session[]>('GET', `/sessions/my-submissions${status ? `?status=${status}` : ''}`, undefined, () =>
    db.sessions.filter((s) => mine(s) && (!status || s.status === status)));
/** 13 */
export const getMySubmission = (id: string) =>
  call<T.Session>('GET', `/sessions/my-submissions/${id}`, undefined, () => findS(id)).then((s) => {
    remember(s.questions);
    return s;
  });
/** 14 – chỉ sửa được khi chờ duyệt hoặc bị từ chối */
export const updateMySubmission = (id: string, p: { title: string; subject: string; questions: T.QuestionDraft[] }) =>
  call<T.Session>('PUT', `/sessions/my-submissions/${id}`, p, () => {
    const s = findS(id);
    Object.assign(s, { title: p.title, subject: p.subject, status: 'pending', rejectReason: undefined });
    s.questions = p.questions.map((d, i) => ({
      ...(s.questions[i] ?? { id: uid('q'), sessionId: id, authorId: s.authorId, authorName: s.authorName, avgRating: 0, ratingCount: 0, answerCount: 0 }),
      ...d, subject: p.subject, status: 'pending',
    }));
    return s;
  });
/** 15 */
export const deleteMySubmission = (id: string) =>
  call<void>('DELETE', `/sessions/my-submissions/${id}`, undefined, () => {
    db.sessions = db.sessions.filter((s) => s.id !== id);
  });
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
export const rateQuestion = (qid: string, stars: number, comment?: string) =>
  call<T.Rating>('POST', `/questions/${qid}/rate`, { stars, comment }, () => {
    const { q } = findQ(qid);
    const r: T.Rating = { id: uid('r'), userName: STUDENT.name, stars, comment, createdAt: new Date().toISOString() };
    (db.ratings[qid] ??= []).unshift(r);
    q.avgRating = db.ratings[qid].reduce((t, x) => t + x.stars, 0) / db.ratings[qid].length;
    q.ratingCount = db.ratings[qid].length;
    return r;
  });
/** 20 */
export const listRatings = (qid: string) =>
  call<T.Rating[]>('GET', `/questions/${qid}/ratings`, undefined, () => db.ratings[qid] ?? []);

// ───────── 5.2.2 Giảng viên duyệt câu hỏi ─────────
/** 21 */
export const listPendingSessions = () =>
  call<T.Session[]>('GET', '/sessions/pending', undefined, () => db.sessions.filter((s) => s.status === 'pending'));
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
      s.status = 'approved';
      s.questions.forEach((x) => { if (x.status !== 'needs-edit') x.status = 'approved'; });
    });
  });
/** 24 */
export const rejectSessions = (sessionIds: string[], reason: string) =>
  call<void>('POST', '/sessions/reject', { sessionIds, reason }, () => {
    sessionIds.forEach((id) => {
      const s = findS(id);
      s.status = 'rejected';
      s.rejectReason = reason;
      s.questions.forEach((x) => (x.status = 'rejected'));
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
/**
 * 28 / 29 / 30 – gửi dự đoán.
 * participants (MG1): đoán số người tham gia, sai số ±5%.
 * approved-questions (MG2): extra = số câu được chọn của nhóm Tự làm / AI.
 * bank-size (MG4): mỗi sinh viên chỉ đoán một lần.
 */
export const submitPrediction = (type: T.PredictionType, value: number, extra?: { self: number; ai: number }) =>
  call<T.Prediction>('POST', `/games/prediction/${type}`, { value, ...extra }, () => {
    if (type === 'bank-size' && db.predictions.some((x) => x.type === type)) throw new Error('Bạn đã dự đoán rồi — mỗi người chỉ được đoán một lần.');
    const p: T.Prediction = {
      id: uid('p'), type, value, status: 'open', createdAt: new Date().toISOString(),
      detail: extra ? `Tự làm: ${extra.self} · AI: ${extra.ai}` : undefined,
      targetDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    };
    db.predictions.unshift(p);
    return p;
  });
/** 31 */
export const listMyPredictions = () => call<T.Prediction[]>('GET', '/games/my-predictions', undefined, () => db.predictions);
/** 32 */
export const getLeaderboard = () =>
  call<T.LeaderboardEntry[]>('GET', '/games/leaderboard', undefined, () => {
    const mineScore = db.predictions.reduce((t, p) => t + (p.points ?? 0), 0);
    return [
      { userId: 'u9', name: 'Hoàng Gia Huy', points: 340, hits: 6 },
      { userId: 'u2', name: 'Lê Thu Hà', points: 285, hits: 5 },
      { userId: STUDENT.id, name: STUDENT.name, points: mineScore, hits: db.predictions.filter((p) => p.status === 'settled').length },
      { userId: 'u3', name: 'Phạm Quốc Bảo', points: 60, hits: 1 },
    ].sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1 }));
  });

// ───────── 5.2.5 Xuất & sinh đề ─────────
const toFile = (name: string, rows: T.Question[], f: T.ExportFormat): T.ExportFile => {
  const L = 'ABCD';
  if (f === 'json') return { filename: `${name}.json`, mime: 'application/json', content: JSON.stringify(rows, null, 2) };
  if (f === 'csv') {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = 'id,subject,topic,difficulty,question,A,B,C,D,answer';
    const body = rows.map((r) => [r.id, r.subject, r.topic, r.difficulty, r.content, ...r.options, L[r.correctIndex]].map((v) => esc(String(v))).join(','));
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
    if (p.mode === 'targeted' && p.topics?.length) pool = pool.filter((x) => p.topics!.includes(x.topic));
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
    [...new Set(approvedQuestions().filter((x) => x.subject === subject).map((x) => x.topic))]);
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


// ───────── Minigame 3, 5, 6: CHƯA có trong đặc tả API → mock, cần backend bổ sung ─────────
/** MG3 (đề xuất: POST /games/prediction/likes) – đoán mức ưa thích (1–5★) của bạn học cho từng câu trong phiên của mình. */
export const submitLikeGuess = (sessionId: string, guesses: number[]) =>
  call<void>('POST', '/games/prediction/likes', { sessionId, guesses }, () => {
    if (db.likeGuesses[sessionId]) throw new Error('Phiên này bạn đã dự đoán rồi.');
    db.likeGuesses[sessionId] = guesses;
  });
export const hasLikeGuess = (sessionId: string) => !!db.likeGuesses[sessionId];
/** MG5 – báo câu lỗi dùng POST /questions/{id}/rate với 0★ (API 19), kèm lý do. Danh sách câu để báo: cần endpoint. */
export const listReportableQuestions = () =>
  call<T.Question[]>('GET', '/games/reportable-questions', undefined, () => approvedQuestions()).then((r) => { r.forEach((x) => cache.set(x.id, x)); return r; });
export const reportQuestion = (qid: string, reason: string) => rateQuestion(qid, 0, reason);
/** MG6 (đề xuất: GET /games/llm-round, POST /games/llm-round/{id}) – ≥7 câu, đoán câu nào do LLM tạo. */
const LLM_SET = ['TCP khác UDP ở điểm nào?', 'DNS dùng để làm gì?', 'HTTP/2 cải thiện gì so với HTTP/1.1?', 'CSS Grid khác Flexbox thế nào?', 'JWT gồm mấy phần?', 'Index trong CSDL giúp gì?', 'Event loop trong JavaScript là gì?', 'REST là viết tắt của gì?'];
export const getLlmRound = () =>
  call<T.LlmRound>('GET', '/games/llm-round', undefined, () => ({
    roundId: 'round1', submitted: !!db.llmSubmitted.round1,
    questions: LLM_SET.map((c, i) => makeQuestion(`g${i + 1}`, 'sg', 'u9', 'Ẩn danh', 'Công nghệ Web', c, ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'], 0, 'Tổng hợp', 'medium', 'approved')),
  }));
export const submitLlmGuess = (roundId: string, questionIds: string[]) =>
  call<void>('POST', `/games/llm-round/${roundId}`, { questionIds }, () => {
    if (db.llmSubmitted[roundId]) throw new Error('Mỗi bạn chỉ được trả lời một lần cho một phiên chơi.');
    db.llmSubmitted[roundId] = true;
  });
