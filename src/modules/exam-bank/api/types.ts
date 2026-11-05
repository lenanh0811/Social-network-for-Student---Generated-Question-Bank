export type Difficulty = 'easy' | 'medium' | 'hard';
/** Trạng thái phiên (backend): PENDING → REVIEWING → RESOLVED. */
export type SessionStatus = 'pending' | 'reviewing' | 'resolved';
/** Trạng thái câu hỏi: 'needs-edit' = GV đã chọn là tiềm năng, điểm cộng của SV được bảo lưu, chờ quyết định giữ/loại. */
export type QuestionStatus = 'pending' | 'approved' | 'rejected' | 'needs-edit';

/** Nguồn gốc khai báo khi đề xuất (ẩn với giảng viên). */
export type QuestionSource = 'self' | 'ai';

export interface QuestionDraft {
  /** Có khi sửa câu đã tồn tại (question_id). */
  id?: string;
  source: QuestionSource;
  /** Mức tự tin của tác giả, 0–4 (backend: confidence). */
  confidence: number;
  content: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  /** Backend không có chủ đề / độ khó; chỉ còn trong dữ liệu mock của các phần chưa nối. */
  topic?: string;
  difficulty?: Difficulty;
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
  rejectionCode?: string;
  rejectionReason?: string;
}
/** "Session" = phiên gửi câu hỏi (không phải phiên đăng nhập). */
export interface Session {
  id: string;
  code?: string;
  title: string;
  /** Mô tả của phiên. */
  content?: string;
  /** Tên môn học. */
  subject: string;
  courseClassId?: string;
  className?: string;
  semesterName?: string;
  authorId: string;
  authorName: string;
  status: SessionStatus;
  createdAt: string;
  /** Danh sách chỉ có số lượng; chi tiết phiên mới có `questions`. */
  questionCount?: number;
  questions: Question[];
}
export const questionCountOf = (s: Session) => s.questionCount ?? s.questions.length;
/** Lớp học phần sinh viên tham gia — nơi được đề xuất câu hỏi. */
export interface CourseClassOption {
  id: string; classCode: string; subjectName: string; subjectCode: string; semesterName: string; activeSemester: boolean; canPropose: boolean;
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
/** Loại trò chơi (game_type của backend). */
export type GameType = 'GAME_1_PARTICIPANTS' | 'GAME_2_APPROVED_QUESTIONS' | 'GAME_3_AUTHOR_CONFIDENCE' | 'GAME_4_SUBJECT_BANK_SIZE' | 'GAME_5_REPORT_ERROR' | 'GAME_6_LLM_IDENTIFICATION';
/** Một lượt dự đoán. `prediction` / `actual` là object tự do do backend trả về. */
export interface Prediction {
  id: string; game: GameType; status: 'pending' | 'resolved'; isCorrect?: boolean;
  prediction: Record<string, unknown>; actual?: Record<string, unknown>; createdAt: string; resolvedAt?: string;
}
/** Lớp học phần để đặt cược Game 1. */
export interface Game1Class {
  classId: string; classCode: string; semester: string; subjectName: string; lecturerName: string; alreadyPredicted: boolean; predictedCount?: number;
}
export interface Subject { id: string; code: string; name: string }
export interface LeaderboardEntry { rank: number; userId: string; userCode?: string; name: string; points: number; isMe: boolean }
export interface Leaderboard {
  entries: LeaderboardEntry[];
  myRank?: { rank: number; points: number; topPercent?: number; total?: number };
}
/** Phiên Game 6 (mở Thứ 7 hàng tuần). */
export interface Game6Round { sessionId: string; weekNumber: number; year: number; startTime: string; endTime: string; questions: Question[] }
export interface CheckInStatus { streak: number; checkedInToday: boolean }
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


/** Một lượt chat giữa giảng viên và AI khi chỉnh câu hỏi. */
export interface ChatMessage { id: string; from: 'lecturer' | 'ai'; text: string; suggestion?: AiSuggestion; applied?: boolean }
