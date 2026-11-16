export type Difficulty = 'easy' | 'medium' | 'hard';
/** Trạng thái phiên (backend): PENDING → REVIEWING → RESOLVED. */
export type SessionStatus = 'pending' | 'reviewing' | 'resolved';
/** Trạng thái câu hỏi (backend): chờ duyệt, đã vào ngân hàng, hoặc bị từ chối. */
export type QuestionStatus = 'pending' | 'approved' | 'rejected';
/** Mã lý do từ chối chuẩn hoá của backend (rejection_code). */
export type RejectionCode = 'DUPLICATE' | 'INCORRECT_ANSWER' | 'AMBIGUOUS_OR_INCOMPLETE' | 'OUT_OF_SCOPE' | 'LOW_QUALITY' | 'OTHER';

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
}
export interface Question extends QuestionDraft {
  /** Chỉ có ở câu hỏi trong đề thi (do backend phân loại), câu hỏi sinh viên soạn không có. */
  topic?: string;
  difficulty?: Difficulty;
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
  /** Số câu đã được duyệt (có ở danh sách phiên của một người dùng). */
  approvedQuestionCount?: number;
  questions: Question[];
}
export const questionCountOf = (s: Session) => s.questionCount ?? s.questions.length;
/** Lớp học phần sinh viên tham gia — nơi được đề xuất câu hỏi. */
export interface CourseClassOption {
  id: string; classCode: string; subjectName: string; subjectCode: string; semesterName: string; activeSemester: boolean; canPropose: boolean;
}
/** Kết quả chấm một câu trả lời. `correctIndex` là vị trí đáp án đúng trong danh sách đáp án. */
export interface AnswerResult { correct: boolean; correctIndex: number; explanation?: string }
export interface QuestionStatistics {
  totalAnswers: number;
  correctRate: number; // 0..1
  distribution: number[]; // số lượt chọn theo từng đáp án (A, B, C…)
  /** Đánh giá sao của cộng đồng, đã quy về thang 1–5 sao. */
  rating?: { average: number; total: number; distribution: number[] };
}
/** Một lượt đánh giá. Backend dùng thang 0–4, giao diện hiển thị 1–5 sao (stars = rating + 1). */
export interface Rating { id: string; userName: string; stars: number; comment?: string; createdAt: string }
/** Một điểm vi phạm AI phát hiện khi kiểm định “ảo giác”. */
export interface AiViolation { severity: string; detail: string }
/** Đề xuất chỉnh sửa của AI (chưa ghi vào câu hỏi cho tới khi giảng viên áp dụng). */
export interface AiSuggestion {
  editLogId: string;
  content: string; options: string[]; correctIndex: number; explanation?: string;
  /** Có khi AI từ chối chỉnh (ví dụ yêu cầu không phù hợp). */
  refusalReason?: string;
  /** Kết quả kiểm định ảo giác: true = AI có thể đã bịa kiến thức. */
  hallucinated?: boolean;
  confidence?: number;
  violations: AiViolation[];
}
/** Cảnh báo câu hỏi trong phiên có thể trùng với câu đã có trong ngân hàng. */
export interface DuplicateWarning { questionIndex: number; similarQuestionId: string; score: number; snippet?: string }
/** Chi tiết một phiên để giảng viên duyệt: danh sách câu hỏi + cảnh báo trùng. */
export interface ReviewDetail { questions: Question[]; duplicates: DuplicateWarning[] }
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
/** Lớp học phần giảng viên phụ trách (dùng khi sinh đề). */
export interface LecturerClass { id: string; classCode: string; subjectId: string; subjectName: string; semesterName: string; activeSemester: boolean; totalStudents?: number }
/** Tỉ lệ độ khó, mỗi giá trị 0–1. */
export interface DifficultyMix { easy: number; medium: number; hard: number }
export interface ExamParams {
  title: string;
  subjectId: string;
  /** Các lớp học phần được áp dụng đề thi. */
  classIds: string[];
  count: number;
  /** Bỏ trống = bốc ngẫu nhiên không theo độ khó. */
  difficulty?: DifficultyMix;
  shuffleOptions?: boolean;
  includeAnswerKey?: boolean;
}
export interface Exam {
  id: string; title: string; subject: string; createdAt: string;
  questionCount: number;
  /** Chỉ có ở chi tiết đề thi hoặc vừa sinh xong, danh sách đề thì không có. */
  questions: Question[];
  statistic?: { easy: number; medium: number; hard: number; unclassified: number };
}
export type ExportFormat = 'pdf' | 'excel';
/** Backend trả về đường dẫn tải file (có hạn), không trả nội dung file. */
export interface ExportFile { downloadUrl: string; sizeMb?: number; questionsCount?: number; expiresAt?: string }

/** Một lượt chat giữa giảng viên và AI khi chỉnh câu hỏi. */
export interface ChatMessage { id: string; from: 'lecturer' | 'ai'; text: string; suggestion?: AiSuggestion; applied?: boolean; discarded?: boolean }
