/**
 * Chuyển đổi giữa dữ liệu backend (snake_case, đáp án dạng danh sách có `is_correct`)
 * và kiểu dùng trong giao diện (đáp án là mảng chuỗi + `correctIndex`).
 */
import type { CheckInStatus, CourseClassOption, Game1Class, Game6Round, GameType, Leaderboard, Prediction, Question, QuestionDraft, QuestionStatus, Session, SessionStatus, Subject } from '@/modules/exam-bank/api/types';

type RawOption = { key?: string; text?: string; is_correct?: boolean };
export type RawQuestion = {
  question_id: number; content: string; options?: RawOption[]; explanation?: string;
  source?: 'LLM' | 'HOMO_SAPIENS'; confidence_score?: number; status?: string;
  rejection_code?: string; rejection_reason?: string; rating_count?: number;
};
export type RawSession = {
  session_id: number; session_code?: string; title: string; content?: string;
  subject_name?: string; subject_code?: string; course_class_id?: number; class_code?: string; semester_name?: string;
  status: string; question_counts?: number; created_at: string; questions?: RawQuestion[];
};
export type RawClass = {
  course_class_id: number; class_code: string; subject_code: string; subject_name: string; semester_name: string; active_semester: boolean; can_propose: boolean;
};

const LETTERS = 'ABCDEFGH';
const sessionStatus = (s: string): SessionStatus => (s.toLowerCase() as SessionStatus);
const questionStatus = (s?: string): QuestionStatus => ((s ?? 'PENDING').toLowerCase() as QuestionStatus);

export function toQuestion(r: RawQuestion, session: { id: string; subject: string; authorName?: string }): Question {
  const opts = r.options ?? [];
  return {
    id: String(r.question_id), sessionId: session.id, authorId: '', authorName: session.authorName ?? '', subject: session.subject,
    content: r.content, options: opts.map((o) => o.text ?? ''), correctIndex: Math.max(0, opts.findIndex((o) => o.is_correct)),
    explanation: r.explanation, source: r.source === 'LLM' ? 'ai' : 'self', confidence: r.confidence_score ?? 0,
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
    questionCount: r.question_counts ?? r.questions?.length,
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
