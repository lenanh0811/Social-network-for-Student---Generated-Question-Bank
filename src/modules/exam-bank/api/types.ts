export type Difficulty = 'easy' | 'medium' | 'hard';
export type SessionStatus = 'pending' | 'approved' | 'rejected';

export interface QuestionDraft {
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
  status: SessionStatus;
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
  status: 'open' | 'settled'; points?: number; createdAt: string; targetDate: string;
}
export interface LeaderboardEntry { rank: number; userId: string; name: string; points: number; hits: number }
export interface ExamParams {
  title: string; subject: string; count: number; durationMin: number;
  mix: { easy: number; medium: number; hard: number }; // %
}
export interface Exam {
  id: string; title: string; subject: string; durationMin: number; createdAt: string; questions: Question[];
}
export type ExportFormat = 'csv' | 'json' | 'txt';
export interface ExportFile { filename: string; content: string; mime: string }
