export type Difficulty = 'easy' | 'medium' | 'hard';
export type SessionStatus = 'pending' | 'approved' | 'rejected';
/** Trạng thái câu hỏi: 'needs-edit' = GV đã chọn là tiềm năng, điểm cộng của SV được bảo lưu, chờ quyết định giữ/loại. */
export type QuestionStatus = SessionStatus | 'needs-edit';

/** Nguồn gốc khai báo khi đề xuất (ẩn với giảng viên). */
export type QuestionSource = 'self' | 'ai';

export interface QuestionDraft {
  source: QuestionSource;
  content: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic: string;
  difficulty: Difficulty;
}
export interface Question extends QuestionDraft {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  subject: string;
  status: QuestionStatus;
  avgRating: number;
  ratingCount: number;
  answerCount: number;
}
/** "Session" = phiên gửi câu hỏi (không phải phiên đăng nhập). */
export interface Session {
  id: string;
  title: string;
  subject: string;
  authorId: string;
  authorName: string;
  status: SessionStatus;
  rejectReason?: string;
  createdAt: string;
  questions: Question[];
}
export interface AnswerResult { correct: boolean; correctIndex: number; explanation?: string }
export interface QuestionStatistics {
  totalAnswers: number;
  correctRate: number; // 0..1
  distribution: number[]; // số lượt chọn theo từng đáp án
}
export interface Rating { id: string; userName: string; stars: number; comment?: string; createdAt: string }
export interface AiSuggestion {
  content: string; options: string[]; correctIndex: number; explanation?: string; notes: string;
}
export type PredictionType = 'participants' | 'approved-questions' | 'bank-size';
export interface Prediction {
  id: string; type: PredictionType; value: number; actual?: number;
  detail?: string; status: 'open' | 'settled'; points?: number; createdAt: string; targetDate: string;
}
export interface LeaderboardEntry { rank: number; userId: string; name: string; points: number; hits: number }
export interface ExamParams {
  /** random = bốc ngẫu nhiên · targeted = có chủ đích (theo chủ đề + tỉ lệ độ khó). Chỉ gồm câu single-choice. */
  mode: 'random' | 'targeted'; topics?: string[];
  /** Yêu cầu gốc của giảng viên khi tạo đề bằng chat AI (backend có thể dùng để diễn giải). */
  prompt?: string;
  title: string; subject: string; count: number; durationMin: number;
  mix: { easy: number; medium: number; hard: number }; // %
}
export interface Exam {
  id: string; title: string; subject: string; durationMin: number; createdAt: string; questions: Question[];
}
export type ExportFormat = 'csv' | 'json' | 'txt';
export interface ExportFile { filename: string; content: string; mime: string }

// ── Minigame ngoài 5 API đặc tả (28–32): cần backend bổ sung endpoint ──
export interface LlmRound { roundId: string; questions: Question[]; submitted: boolean }

/** Một lượt chat giữa giảng viên và AI khi chỉnh câu hỏi. */
export interface ChatMessage { id: string; from: 'lecturer' | 'ai'; text: string; suggestion?: AiSuggestion; applied?: boolean }
