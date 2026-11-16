/**
 * Chuyển đổi giữa dữ liệu backend (snake_case, đáp án dạng danh sách có `is_correct`)
 * và kiểu dùng trong giao diện (đáp án là mảng chuỗi + `correctIndex`).
 */
import type {
  AiSuggestion, AnswerResult, CheckInStatus, CourseClassOption, Difficulty, DuplicateWarning, Exam, ExamParams, ExportFile, Game1Class, Game6Round,
  GameType, Leaderboard, LecturerClass, Prediction, Question, QuestionDraft, QuestionStatistics, QuestionStatus, Rating, RejectionCode, ReviewDetail,
  Session, SessionStatus, Subject,
} from './types';

type RawOption = { key?: string; text?: string; is_correct?: boolean | null };
export type RawQuestion = {
  question_id: number; content: string; options?: RawOption[]; explanation?: string;
  source?: 'LLM' | 'HOMO_SAPIENS'; confidence_score?: number; status?: string;
  rejection_code?: string; rejection_reason?: string; rating_count?: number;
  /** Có ở câu hỏi trong phiên duyệt (khoá đáp án đúng). */
  correct_answer?: string;
  /** Có ở câu hỏi luyện tập: đáp án và lời giải chỉ hiện sau khi người dùng đã trả lời. */
  hidden_fields?: { correct_answer?: string; explanation?: string };
};
export type RawSession = {
  session_id: number; session_code?: string; title: string; content?: string;
  subject_name?: string; subject_code?: string; course_class_id?: number; class_code?: string; semester_name?: string;
  status: string; question_counts?: number; question_count?: number; created_at: string; questions?: RawQuestion[];
  approved_question_count?: number;
};
export type RawClass = {
  course_class_id: number; class_code: string; subject_code: string; subject_name: string; semester_name: string; active_semester: boolean; can_propose: boolean;
};

const LETTERS = 'ABCDEFGH';
const sessionStatus = (s: string): SessionStatus => (s.toLowerCase() as SessionStatus);
const questionStatus = (s?: string): QuestionStatus => ((s ?? 'PENDING').toLowerCase() as QuestionStatus);

/** Vị trí đáp án đúng: theo cờ `is_correct`, hoặc theo khoá đáp án; -1 nếu backend đang ẩn đáp án. */
function correctIndexOf(opts: RawOption[], key?: string) {
  const byFlag = opts.findIndex((o) => o.is_correct);
  if (byFlag >= 0) return byFlag;
  return key ? opts.findIndex((o) => o.key === key) : -1;
}

export function toQuestion(r: RawQuestion, session: { id: string; subject: string; authorName?: string }): Question {
  const opts = r.options ?? [];
  return {
    id: String(r.question_id), sessionId: session.id, authorId: '', authorName: session.authorName ?? '', subject: session.subject,
    content: r.content, options: opts.map((o) => o.text ?? ''), correctIndex: correctIndexOf(opts, r.correct_answer ?? r.hidden_fields?.correct_answer),
    explanation: r.explanation ?? r.hidden_fields?.explanation, source: r.source === 'LLM' ? 'ai' : 'self', confidence: r.confidence_score ?? 0,
    status: questionStatus(r.status), rejectionCode: r.rejection_code, rejectionReason: r.rejection_reason,
    avgRating: 0, ratingCount: r.rating_count ?? 0, answerCount: 0,
  };
}

export function toSession(r: RawSession, authorName = ''): Session {
  const id = String(r.session_id);
  const subject = r.subject_name ?? '';
  return {
    id, code: r.session_code, title: r.title, content: r.content, subject,
    courseClassId: r.course_class_id === undefined ? undefined : String(r.course_class_id), className: r.class_code, semesterName: r.semester_name,
    authorId: '', authorName, status: sessionStatus(r.status), createdAt: r.created_at,
    questionCount: r.question_counts ?? r.question_count ?? r.questions?.length, approvedQuestionCount: r.approved_question_count,
    questions: (r.questions ?? []).map((q) => toQuestion(q, { id, subject, authorName })),
  };
}

export const toClass = (r: RawClass): CourseClassOption => ({
  id: String(r.course_class_id), classCode: r.class_code, subjectName: r.subject_name, subjectCode: r.subject_code,
  semesterName: r.semester_name, activeSemester: r.active_semester, canPropose: r.can_propose,
});

const toOptions = (d: QuestionDraft) => d.options.map((text, i) => ({ key: LETTERS[i], text: text.trim(), is_correct: i === d.correctIndex }));
const nullable = (s?: string) => (s && s.trim() ? s.trim() : undefined);

/** Body POST /sessions/propose */
export const proposeBody = (p: { title: string; content?: string; sourceUrl?: string; courseClassId: string; questions: QuestionDraft[] }) => ({
  title: p.title.trim(), content: nullable(p.content), source_url: nullable(p.sourceUrl), course_class_id: Number(p.courseClassId),
  questions: p.questions.map((d) => ({
    content: d.content.trim(), options: toOptions(d), explanation: nullable(d.explanation),
    llm_generated: d.source === 'ai', confidence: d.confidence,
  })),
});

/** Body PUT /sessions/my-submissions/{id} (không đổi lớp học phần). */
export const updateBody = (p: { title: string; content?: string; sourceUrl?: string; questions: QuestionDraft[] }) => ({
  title: p.title.trim(), content: nullable(p.content), source_url: nullable(p.sourceUrl),
  questions: p.questions.map((d) => ({
    question_id: d.id && /^\d+$/.test(d.id) ? Number(d.id) : undefined,
    content: d.content.trim(), options: toOptions(d), explanation: nullable(d.explanation),
    source: d.source === 'ai' ? 'LLM' : 'HOMO_SAPIENS', confidence: d.confidence,
  })),
});

// ───────── Trò chơi ─────────
type Obj = Record<string, unknown>;
export type RawPrediction = { prediction_id: number; game_type: GameType; status: string; is_correct?: boolean; prediction_data?: Obj; actual_data?: Obj; created_at: string; resolved_at?: string };
export const toPrediction = (r: RawPrediction): Prediction => ({
  id: String(r.prediction_id), game: r.game_type, status: r.status === 'RESOLVED' ? 'resolved' : 'pending', isCorrect: r.is_correct ?? undefined,
  prediction: r.prediction_data ?? {}, actual: r.actual_data ?? undefined, createdAt: r.created_at, resolvedAt: r.resolved_at,
});
export type RawGame1Class = { course_class_id: number; class_code: string; semester: string; subject_name: string; lecturer_name: string; already_predicted: boolean; predicted_count?: number };
export const toGame1Class = (r: RawGame1Class): Game1Class => ({
  classId: String(r.course_class_id), classCode: r.class_code, semester: r.semester, subjectName: r.subject_name, lecturerName: r.lecturer_name,
  alreadyPredicted: r.already_predicted, predictedCount: r.predicted_count ?? undefined,
});
export const toSubject = (r: { subject_id: number; code: string; name: string }): Subject => ({ id: String(r.subject_id), code: r.code, name: r.name });
export type RawLeaderboard = {
  entries?: { rank: number; user_id: number; user_code?: string; full_name: string; total_points: number; is_current_user?: boolean }[];
  my_rank?: { rank: number; total_points: number; top_percent?: number; total_participants?: number };
};
export const toLeaderboard = (r: RawLeaderboard): Leaderboard => ({
  entries: (r.entries ?? []).map((e) => ({ rank: e.rank, userId: String(e.user_id), userCode: e.user_code, name: e.full_name, points: e.total_points, isMe: !!e.is_current_user })),
  myRank: r.my_rank ? { rank: r.my_rank.rank, points: r.my_rank.total_points, topPercent: r.my_rank.top_percent, total: r.my_rank.total_participants } : undefined,
});
export type RawGame6 = { session_id: number; week_number: number; year: number; start_time: string; end_time: string; questions?: RawQuestion[] };
export const toGame6 = (r: RawGame6): Game6Round => ({
  sessionId: String(r.session_id), weekNumber: r.week_number, year: r.year, startTime: r.start_time, endTime: r.end_time,
  questions: (r.questions ?? []).map((q) => toQuestion(q, { id: String(r.session_id), subject: '' })),
});
export const toCheckIn = (r: { current_streak: number; has_checked_in_today: boolean }): CheckInStatus => ({ streak: r.current_streak, checkedInToday: r.has_checked_in_today });

// ───────── Luyện tập, thống kê, đánh giá ─────────
/** GET /sessions/{id}/questions: phiên + câu hỏi để luyện tập. */
export type RawPracticeSession = {
  session_id: number; session_code?: string; title: string; content?: string; subject_name?: string; created_at: string;
  total_questions?: number; questions?: RawQuestion[];
};
export function toPracticeSession(r: RawPracticeSession): Session {
  const id = String(r.session_id);
  const subject = r.subject_name ?? '';
  return {
    id, code: r.session_code, title: r.title, content: r.content, subject, authorId: '', authorName: '', status: 'resolved', createdAt: r.created_at,
    questionCount: r.total_questions ?? r.questions?.length,
    questions: (r.questions ?? []).map((q) => toQuestion({ ...q, status: q.status ?? 'APPROVED' }, { id, subject })),
  };
}

/** POST /questions/{id}/answer. Khoá đáp án là chữ cái A, B, C… theo thứ tự đáp án. */
export const optionKey = (index: number) => LETTERS[index] ?? String(index);
export const toAnswerResult = (r: { is_correct: boolean; correct_answer?: string; explanation?: string }): AnswerResult => ({
  correct: r.is_correct, correctIndex: LETTERS.indexOf(r.correct_answer ?? ''), explanation: r.explanation,
});

/** GET /questions/{id}/statistics. Điểm đánh giá của backend là 0–4, giao diện dùng 1–5 sao. */
export type RawStatistics = {
  total_answer?: number; correct_rate?: number; option_distribution?: Record<string, number>;
  rating_summary?: { avg_rating?: number; total_ratings?: number; distribution?: Record<string, number> };
};
export function toStatistics(r: RawStatistics, optionCount: number): QuestionStatistics {
  const dist = r.option_distribution ?? {};
  const rs = r.rating_summary;
  return {
    totalAnswers: r.total_answer ?? 0, correctRate: r.correct_rate ?? 0,
    distribution: Array.from({ length: optionCount }, (_, i) => Number(dist[LETTERS[i]] ?? 0)),
    rating: rs ? {
      average: (rs.avg_rating ?? 0) + 1, total: rs.total_ratings ?? 0,
      distribution: [0, 1, 2, 3, 4].map((k) => Number(rs.distribution?.[String(k)] ?? 0)),
    } : undefined,
  };
}

/** GET /questions/{id}/ratings (items) */
export type RawRating = { user_id: number; reviewer_name?: string; rating: number; comment?: string; created_at: string };
export const toRating = (r: RawRating): Rating => ({
  id: String(r.user_id), userName: r.reviewer_name ?? 'Người dùng', stars: Math.round(r.rating) + 1, comment: r.comment || undefined, createdAt: r.created_at,
});

// ───────── Giảng viên duyệt ─────────
/** GET /lecturer/sessions/reviewable (items) */
export type RawReviewable = {
  session_id: number; topic?: string; subject_code?: string; course_class_id?: number; class_code?: string; semester_name?: string;
  title: string; content?: string; author?: { user_id: number; full_name?: string }; status: string; created_at: string;
};
export const toReviewable = (r: RawReviewable): Session => ({
  id: String(r.session_id), title: r.title, content: r.content, subject: r.topic ?? r.subject_code ?? '',
  courseClassId: r.course_class_id === undefined ? undefined : String(r.course_class_id), className: r.class_code, semesterName: r.semester_name,
  authorId: r.author ? String(r.author.user_id) : '', authorName: r.author?.full_name ?? '', status: sessionStatus(r.status), createdAt: r.created_at, questions: [],
});

/** GET /lecturer/sessions/{id} */
export type RawReviewDetail = {
  items?: RawQuestion[];
  duplicate_warnings?: { question_index: number; similar_question_id: number; similarity_score: number; matched_snipet?: string }[];
};
export function toReviewDetail(r: RawReviewDetail, session: { id: string; subject: string; authorName?: string }): ReviewDetail {
  return {
    questions: (r.items ?? []).map((q) => toQuestion(q, session)),
    duplicates: (r.duplicate_warnings ?? []).map((w): DuplicateWarning => ({
      questionIndex: w.question_index, similarQuestionId: String(w.similar_question_id), score: w.similarity_score, snippet: w.matched_snipet,
    })),
  };
}

export const rejectBody = (ids: string[], code: RejectionCode, reason?: string) => ({
  question_ids: ids.map(Number), rejection_code: code, reason: nullable(reason),
});

/** Body PUT /lecturer/questions/{id}. `autoApprove` = duyệt luôn vào ngân hàng sau khi sửa. */
export const lecturerEditBody = (d: QuestionDraft, autoApprove: boolean) => ({
  content: d.content.trim(), options: toOptions(d), explanation: nullable(d.explanation), auto_approve: autoApprove,
});

// ───────── AI ─────────
export type RawAiRefine = {
  edit_log_id: number;
  suggested_question?: { content?: string; options?: RawOption[]; explanation?: string; refusal_reason?: string };
  hallucination_audit?: { is_hallucinated?: boolean; confidence_score?: number; violations?: { severity?: string; detail?: string; node_statement?: string }[] };
};
export function toAiSuggestion(r: RawAiRefine): AiSuggestion {
  const q = r.suggested_question ?? {};
  const opts = q.options ?? [];
  const a = r.hallucination_audit;
  return {
    editLogId: String(r.edit_log_id), content: q.content ?? '', options: opts.map((o) => o.text ?? ''), correctIndex: Math.max(0, correctIndexOf(opts)),
    explanation: q.explanation || undefined, refusalReason: q.refusal_reason || undefined,
    hallucinated: a?.is_hallucinated, confidence: a?.confidence_score,
    violations: (a?.violations ?? []).map((v) => ({ severity: v.severity ?? '', detail: v.detail ?? v.node_statement ?? '' })),
  };
}

// ───────── Đề thi ─────────
export type RawExamQuestion = { order?: number; question_id: number; content: string; options?: RawOption[]; difficulty?: string; topic?: string };
export type RawExam = {
  exam_id: number; title: string; subject_name?: string; question_count?: number; created_at: string;
  questions?: RawExamQuestion[]; statistic?: { easy_count?: number; medium_count?: number; hard_count?: number; unclassified_count?: number };
};
const difficultyOf = (d?: string): Difficulty | undefined => (d === 'EASY' ? 'easy' : d === 'MEDIUM' ? 'medium' : d === 'HARD' ? 'hard' : undefined);
export function toExam(r: RawExam): Exam {
  const id = String(r.exam_id);
  const subject = r.subject_name ?? '';
  const questions = [...(r.questions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((q): Question => ({
    ...toQuestion({ question_id: q.question_id, content: q.content, options: q.options, status: 'APPROVED' }, { id, subject }),
    difficulty: difficultyOf(q.difficulty), topic: q.topic || undefined,
  }));
  const s = r.statistic;
  return {
    id, title: r.title, subject, createdAt: r.created_at, questionCount: r.question_count ?? questions.length, questions,
    statistic: s ? { easy: s.easy_count ?? 0, medium: s.medium_count ?? 0, hard: s.hard_count ?? 0, unclassified: s.unclassified_count ?? 0 } : undefined,
  };
}

/** Body POST /exams/generate. Tỉ lệ độ khó là số 0–1; câu chưa phân loại độ khó chỉ lấy khi không chọn tỉ lệ. */
export const generateExamBody = (p: ExamParams) => ({
  subject_id: Number(p.subjectId), title: nullable(p.title), question_count: p.count, class_ids: p.classIds.map(Number),
  difficulty_distribution: p.difficulty ? { ...p.difficulty, unclassified: 0 } : undefined,
  shuffle_options: p.shuffleOptions ?? true, include_answer_key: p.includeAnswerKey ?? true,
});

export const toExportFile = (r: { download_url: string; file_size_mb?: number; questions_count?: number; expires_at?: string }): ExportFile => ({
  downloadUrl: r.download_url, sizeMb: r.file_size_mb, questionsCount: r.questions_count, expiresAt: r.expires_at,
});

export type RawLecturerClass = {
  course_class_id: number; class_code: string; subject_id: number; subject_name: string; semester_name: string; active_semester: boolean; total_students?: number;
};
export const toLecturerClass = (r: RawLecturerClass): LecturerClass => ({
  id: String(r.course_class_id), classCode: r.class_code, subjectId: String(r.subject_id), subjectName: r.subject_name,
  semesterName: r.semester_name, activeSemester: r.active_semester, totalStudents: r.total_students,
});
