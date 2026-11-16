import { api } from '@/api/backend';
import * as A from './adapters';
import type * as T from './types';

// Backend không có GET /questions/{id} => nhớ câu hỏi lấy được từ các API danh sách / chi tiết để màn hình câu hỏi dùng lại.
const cache = new Map<string, T.Question>();
const remember = <Q extends T.Question | T.Question[]>(x: Q): Q => {
  (Array.isArray(x) ? x : [x]).forEach((it) => cache.set(it.id, it));
  return x;
};
export const getCachedQuestion = (id: string) => cache.get(id);
/** Cập nhật câu hỏi đã nhớ (sau khi giảng viên sửa hoặc áp dụng gợi ý của AI). */
const patchCached = (id: string, patch: Partial<T.Question>) => {
  const q = cache.get(id);
  if (q) cache.set(id, { ...q, ...patch });
};

// Danh sách phiên chờ duyệt không kèm chi tiết, nên nhớ lại để màn hình duyệt hiện tiêu đề, tác giả, lớp.
const sessionCache = new Map<string, T.Session>();
export const getCachedSession = (id: string) => sessionCache.get(id);

// ───────── 5.2.1 Sinh viên đề xuất ─────────
/** Danh sách lớp học phần của tôi (GET /sessions/my-enrolled-course-classes) — chọn lớp khi đề xuất. */
export const listMyClasses = () =>
  api<A.RawClass[]>('GET', '/sessions/my-enrolled-course-classes').then((r) => r.map(A.toClass));

type SubmissionInput = { title: string; content?: string; sourceUrl?: string; courseClassId: string; questions: T.QuestionDraft[] };

/** 11 – POST /sessions/propose */
export const proposeSession = (p: SubmissionInput) =>
  api<A.RawSession>('POST', '/sessions/propose', { body: A.proposeBody(p) }).then((r) => A.toSession(r));

/** 12 – GET /sessions/my-submissions (cursor: chỉ lấy trang đầu, tối đa 100 phiên) */
export const listMySubmissions = (status?: T.SessionStatus) =>
  api<{ contents: A.RawSession[] }>('GET', '/sessions/my-submissions', { query: { limit: 100, status: status?.toUpperCase() } })
    .then((r) => r.contents.map((s) => A.toSession(s)));

/** 13 – GET /sessions/my-submissions/{id} (có đủ câu hỏi) */
export const getMySubmission = (id: string) =>
  api<A.RawSession>('GET', `/sessions/my-submissions/${id}`)
    .then((r) => A.toSession(r))
    .then((s) => { remember(s.questions); return s; });

/** 14 – PUT /sessions/my-submissions/{id} (chỉ sửa được khi phiên còn chờ duyệt) */
export const updateMySubmission = (id: string, p: Omit<SubmissionInput, 'courseClassId'>) =>
  api<unknown>('PUT', `/sessions/my-submissions/${id}`, { body: A.updateBody(p) }).then(() => undefined);

/** 15 – DELETE /sessions/my-submissions/{id} */
export const deleteMySubmission = (id: string) => api<void>('DELETE', `/sessions/my-submissions/${id}`);

// ───────── Luyện tập & đánh giá câu hỏi ─────────
/** 16 – GET /users/{userId}/sessions: phiên của một người dùng (người khác chỉ thấy phiên đã duyệt xong). */
export const listUserSessions = (userId: string) =>
  api<{ contents: A.RawSession[] }>('GET', `/users/${userId}/sessions`, { query: { limit: 50 } }).then((r) => r.contents.map((s) => A.toSession(s)));

/** Tổng số câu hỏi đã được duyệt của một người dùng (cộng từ các phiên của họ). */
export const countApprovedQuestions = (userId: string) =>
  listUserSessions(userId).then((list) => list.reduce((t, s) => t + (s.approvedQuestionCount ?? 0), 0));

/** GET /sessions/{id}/questions – câu hỏi của một phiên để luyện tập (đáp án đúng ẩn tới khi đã trả lời). */
export const getPracticeSession = (sessionId: string) =>
  api<A.RawPracticeSession>('GET', `/sessions/${sessionId}/questions`)
    .then(A.toPracticeSession)
    .then((s) => { remember(s.questions); return s; });

/** 17 – POST /questions/{id}/answer */
export const answerQuestion = (qid: string, choice: number) =>
  api<{ is_correct: boolean; correct_answer?: string; explanation?: string }>('POST', `/questions/${qid}/answer`, {
    body: { selected_options: [A.optionKey(choice)] },
  }).then(A.toAnswerResult);

/** 18 – GET /questions/{id}/statistics */
export const getQuestionStatistics = (qid: string, optionCount: number) =>
  api<A.RawStatistics>('GET', `/questions/${qid}/statistics`).then((r) => A.toStatistics(r, optionCount));

/** 19 – POST /questions/{id}/rate. Giao diện 1–5 sao, backend 0–4 (rating = sao - 1). */
export const rateQuestion = (qid: string, stars: number, comment?: string) =>
  api<{ new_avg_rating?: number; new_rating_count?: number }>('POST', `/questions/${qid}/rate`, {
    body: { rating: Math.min(4, Math.max(0, stars - 1)), comment: comment?.trim() || undefined },
  });

/** 20 – GET /questions/{id}/ratings (cursor: trang đầu, tối đa 50) */
export const listRatings = (qid: string) =>
  api<{ items: A.RawRating[] }>('GET', `/questions/${qid}/ratings`, { query: { limit: 50 } }).then((r) => r.items.map(A.toRating));

/** Game 5 – PUT /questions/{id}/report: báo câu hỏi sai đề / sai đáp án (gửi lại sẽ cập nhật nội dung). */
export const reportQuestion = (qid: string, description: string) =>
  api<unknown>('PUT', `/questions/${qid}/report`, { body: { description: description.trim() } }).then(() => undefined);

// ───────── 5.2.2 Giảng viên duyệt câu hỏi ─────────
/** 21 – GET /lecturer/sessions/reviewable: phiên chờ duyệt thuộc các lớp tôi phụ trách. */
export const listReviewableSessions = () =>
  api<{ items: A.RawReviewable[] }>('GET', '/lecturer/sessions/reviewable', { query: { limit: 50 } })
    .then((r) => r.items.map(A.toReviewable))
    .then((list) => { list.forEach((s) => sessionCache.set(s.id, s)); return list; });

/** 22 – GET /lecturer/sessions/{id}: câu hỏi của phiên + cảnh báo trùng. Mở phiên sẽ chuyển nó sang “Đang duyệt”. */
export const getReviewDetail = (sessionId: string) => {
  const s = sessionCache.get(sessionId);
  return api<A.RawReviewDetail>('GET', `/lecturer/sessions/${sessionId}`)
    .then((r) => A.toReviewDetail(r, { id: sessionId, subject: s?.subject ?? '', authorName: s?.authorName }))
    .then((d) => { remember(d.questions); return d; });
};

/** 23 – POST /lecturer/sessions/approve: duyệt các câu hỏi vào ngân hàng; trả về điểm thưởng của tác giả. */
export const approveQuestions = (questionIds: string[]) =>
  api<{ points_earned?: number }>('POST', '/lecturer/sessions/approve', { body: { question_ids: questionIds.map(Number) } })
    .then((r) => r?.points_earned ?? 0);

/** 24 – POST /lecturer/sessions/reject: từ chối các câu hỏi kèm mã lý do. */
export const rejectQuestions = (questionIds: string[], code: T.RejectionCode, reason?: string) =>
  api<unknown>('POST', '/lecturer/sessions/reject', { body: A.rejectBody(questionIds, code, reason) }).then(() => undefined);

/** POST /lecturer/sessions/{id}/complete-review: chốt phiên, câu còn chờ duyệt sẽ tự động bị từ chối. */
export const completeReview = (sessionId: string) =>
  api<unknown>('POST', `/lecturer/sessions/${sessionId}/complete-review`).then(() => undefined);

/** 25 – PUT /lecturer/questions/{id}: giảng viên sửa câu hỏi; `autoApprove` = duyệt luôn vào ngân hàng. */
export const editQuestion = (qid: string, draft: T.QuestionDraft, autoApprove: boolean) =>
  api<{ status?: string }>('PUT', `/lecturer/questions/${qid}`, { body: A.lecturerEditBody(draft, autoApprove) }).then((r) => {
    patchCached(qid, {
      content: draft.content, options: draft.options, correctIndex: draft.correctIndex, explanation: draft.explanation,
      ...(autoApprove ? { status: 'approved' as const } : {}),
    });
    return r;
  });

// ───────── 5.2.3 AI ─────────
/** 26 – POST /questions/{id}/ai-refine: AI đề xuất bản chỉnh sửa (chưa ghi vào câu hỏi). `chatSessionId` giữ ngữ cảnh cuộc chat. */
export const aiRefine = (qid: string, prompt: string, chatSessionId?: string) =>
  api<A.RawAiRefine>('POST', `/questions/${qid}/ai-refine`, { body: { prompt: prompt.trim(), chat_session_id: chatSessionId } }).then(A.toAiSuggestion);

/** 27 – POST /questions/{id}/ai-apply: chấp nhận (`approve = true`, ghi đè câu hỏi) hoặc loại bỏ bản AI đề xuất. */
export const aiApply = (qid: string, s: T.AiSuggestion, approve: boolean) =>
  api<unknown>('POST', `/questions/${qid}/ai-apply`, { body: { edit_log_id: Number(s.editLogId), approve } }).then(() => {
    if (approve) patchCached(qid, { content: s.content, options: s.options, correctIndex: s.correctIndex, explanation: s.explanation });
  });

// ───────── Môn học & lớp học phần ─────────
/** GET /subjects – danh sách môn học (Game 4, bảng xếp hạng theo môn, sinh đề, xuất câu hỏi). */
export const listSubjects = () =>
  api<{ subject_id: number; code: string; name: string }[]>('GET', '/subjects').then((r) => r.map(A.toSubject));

/** GET /lecturer/course-classes/my-classes – lớp học phần tôi phụ trách (học kỳ hiện tại). */
export const listLecturerClasses = () =>
  api<A.RawLecturerClass[]>('GET', '/lecturer/course-classes/my-classes').then((r) => r.map(A.toLecturerClass));

// ───────── 5.2.4 Trò chơi ─────────
const asPrediction = (r: unknown) => A.toPrediction(r as A.RawPrediction);

/** GET /games/prediction/game-1/classes – lớp học phần để đặt cược Game 1 */
export const listGame1Classes = () =>
  api<A.RawGame1Class[]>('GET', '/games/prediction/game-1/classes').then((r) => r.map(A.toGame1Class));
/** 28 – Game 1: đoán số sinh viên nộp câu hỏi ngày mai (chốt cược trước 22:00) */
export const placeGame1 = (courseClassId: string, predictedCount: number) =>
  api<unknown>('POST', '/games/prediction/participants', { body: { course_class_id: Number(courseClassId), predicted_count: predictedCount } }).then(asPrediction);
/** 29 – Game 2: đoán số câu AI / người trong phiên của mình được duyệt */
export const placeGame2 = (sessionId: string, llm: number, human: number) =>
  api<unknown>('POST', '/games/prediction/approved-questions', { body: { session_id: Number(sessionId), predicted_llm_count: llm, predicted_human_count: human } }).then(asPrediction);
/** 30 – Game 4: đoán quy mô ngân hàng câu hỏi của môn cuối kỳ */
export const placeGame4 = (subjectId: string, size: number) =>
  api<unknown>('POST', '/games/prediction/bank-size', { body: { subject_id: Number(subjectId), predicted_bank_size: size } }).then(asPrediction);

/** 31 – GET /games/my-predictions (cursor: chỉ trang đầu, tối đa 50) */
export const listMyPredictions = () =>
  api<{ contents: A.RawPrediction[] }>('GET', '/games/my-predictions', { query: { limit: 50 } }).then((r) => r.contents.map(A.toPrediction));

/** 32 – GET /games/leaderboard (theo học kỳ hoặc theo môn) */
export const getLeaderboard = (period: 'SEMESTER' | 'SUBJECT' = 'SEMESTER', subjectId?: string) =>
  api<A.RawLeaderboard>('GET', '/games/leaderboard', {
    query: { period, subject_id: period === 'SUBJECT' ? subjectId : undefined, limit: 20 },
  }).then(A.toLeaderboard);

/** GET /games/prediction/active-session – phiên Game 6 (Thứ 7 hàng tuần); null nếu chưa mở */
export const getGame6Round = () =>
  api<A.RawGame6 | null>('GET', '/games/prediction/active-session')
    .then((r) => (r ? A.toGame6(r) : null))
    .then((r) => { if (r) remember(r.questions); return r; });
/** POST /games/prediction/submit – Game 6: nộp các câu bạn nghĩ do AI tạo (mỗi phiên một lần) */
export const submitGame6 = (sessionId: string, questionIds: string[]) =>
  api<unknown>('POST', '/games/prediction/submit', {
    body: { minigame_session_id: Number(sessionId), selected_llm_question_ids: questionIds.map(Number) },
  }).then(() => undefined);

/** GET / POST /games/check-in – điểm danh hằng ngày (+1 xu, chuỗi ngày liên tiếp) */
export const getCheckIn = () =>
  api<{ current_streak: number; has_checked_in_today: boolean }>('GET', '/games/check-in').then(A.toCheckIn);
export const doCheckIn = () => api<unknown>('POST', '/games/check-in').then(() => getCheckIn());

// ───────── 5.2.5 Đề thi & xuất file (giảng viên) ─────────
type RawExport = Parameters<typeof A.toExportFile>[0];

/** 33 – GET /lecturer/questions/export: xuất toàn bộ câu hỏi của một môn, trả về đường dẫn tải file. */
export const exportQuestionBank = (subjectId: string, format: T.ExportFormat, includeAnswer = true) =>
  api<RawExport>('GET', '/lecturer/questions/export', { query: { subject_id: subjectId, format, include_answer: includeAnswer } }).then(A.toExportFile);

/** 34 – POST /exams/generate: sinh đề từ ngân hàng câu hỏi đã duyệt, theo môn, số câu, tỉ lệ độ khó và lớp áp dụng. */
export const generateExam = (p: T.ExamParams) =>
  api<A.RawExam>('POST', '/exams/generate', { body: A.generateExamBody(p) }).then(A.toExam).then((e) => { remember(e.questions); return e; });

/** 35 – GET /exams/{id} */
export const getExam = (id: string) =>
  api<A.RawExam>('GET', `/exams/${id}`).then(A.toExam).then((e) => { remember(e.questions); return e; });

/** 36 – GET /exams/my-exams (cursor: trang đầu, tối đa 20; danh sách không kèm câu hỏi) */
export const listMyExams = () =>
  api<{ items: A.RawExam[] }>('GET', '/exams/my-exams', { query: { limit: 20 } }).then((r) => r.items.map(A.toExam));

/** 37 – GET /exams/{id}/export: xuất đề thi ra PDF / Excel, trả về đường dẫn tải file. */
export const exportExam = (id: string, format: T.ExportFormat, includeAnswerKey = true) =>
  api<RawExport>('GET', `/exams/${id}/export`, { query: { format, include_answer_key: includeAnswerKey } }).then(A.toExportFile);
