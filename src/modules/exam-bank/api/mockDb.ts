import { LECTURER, STUDENT } from '@/shared/mockUsers';
import type { Exam, Prediction, Question, Rating, Session } from '@/modules/exam-bank/api/types';

export { LECTURER, STUDENT };


let n = 100;
export const uid = (p: string) => `${p}${++n}`;

const q = (
  id: string, sessionId: string, authorId: string, authorName: string, subject: string,
  content: string, options: string[], correctIndex: number, topic: string,
  difficulty: Question['difficulty'], status: Question['status'], explanation?: string,
): Question => ({
  confidence: 2,
  id, sessionId, authorId, authorName, subject, content, options, correctIndex, topic, difficulty,
  status, explanation, source: 'self', avgRating: 4.2, ratingCount: 5, answerCount: 24,
});

export { q as makeQuestion };

export const db = {
  sessions: [
    {
      id: 's1', title: 'Ôn tập chương 3 – HTTP & REST', subject: 'Công nghệ Web',
      authorId: 'u1', authorName: STUDENT.name, status: 'resolved', className: 'IT4409 · 20251', createdAt: '2026-10-20T08:00:00Z',
      questions: [
        q('q1', 's1', 'u1', STUDENT.name, 'Công nghệ Web', 'Phương thức HTTP nào là idempotent và dùng để thay thế toàn bộ tài nguyên?',
          ['GET', 'POST', 'PUT', 'PATCH'], 2, 'REST', 'medium', 'approved', 'PUT thay thế toàn bộ tài nguyên và idempotent.'),
        q('q2', 's1', 'u1', STUDENT.name, 'Công nghệ Web', 'Mã trạng thái nào biểu thị tài nguyên được tạo thành công?',
          ['200', '201', '204', '301'], 1, 'HTTP', 'easy', 'approved', '201 Created.'),
      ],
    },
    {
      id: 's2', title: 'Câu hỏi về JavaScript bất đồng bộ', subject: 'Công nghệ Web',
      authorId: 'u1', authorName: STUDENT.name, status: 'reviewing', className: 'IT4409 · 20251', createdAt: '2026-11-02T10:30:00Z',
      questions: [
        q('q3', 's2', 'u1', STUDENT.name, 'Công nghệ Web', 'Promise.all() trả về kết quả khi nào?',
          ['Khi promise đầu tiên xong', 'Khi tất cả promise xong', 'Khi có promise lỗi', 'Ngay lập tức'], 1, 'JavaScript', 'medium', 'needs-edit'),
      ],
    },
    {
      id: 's3', title: 'CSS Flexbox cơ bản', subject: 'Công nghệ Web',
      authorId: 'u1', authorName: STUDENT.name, status: 'resolved', className: 'IT4409 · 20251',
      createdAt: '2026-10-28T14:00:00Z',
      questions: [
        q('q4', 's3', 'u1', STUDENT.name, 'Công nghệ Web', 'Thuộc tính nào căn giữa theo trục chính của flex container?',
          ['align-items', 'justify-content', 'flex-wrap', 'order'], 0, 'CSS', 'easy', 'rejected'),
      ],
    },
    {
      id: 's4', title: 'Cơ sở dữ liệu quan hệ', subject: 'Cơ sở dữ liệu',
      authorId: 'u2', authorName: 'Lê Thu Hà', status: 'pending', createdAt: '2026-11-03T09:15:00Z',
      questions: [
        q('q5', 's4', 'u2', 'Lê Thu Hà', 'Cơ sở dữ liệu', 'Khóa nào đảm bảo tính toàn vẹn tham chiếu giữa hai bảng?',
          ['Primary key', 'Foreign key', 'Unique key', 'Candidate key'], 1, 'SQL', 'easy', 'pending'),
        q('q6', 's4', 'u2', 'Lê Thu Hà', 'Cơ sở dữ liệu', 'Dạng chuẩn 3NF loại bỏ loại phụ thuộc nào?',
          ['Phụ thuộc hàm riêng phần', 'Phụ thuộc bắc cầu', 'Phụ thuộc đa trị', 'Phụ thuộc nối'], 1, 'Chuẩn hoá', 'hard', 'needs-edit'),
      ],
    },
    {
      id: 's5', title: 'Mạng máy tính – tầng giao vận', subject: 'Mạng máy tính',
      authorId: 'u3', authorName: 'Phạm Quốc Bảo', status: 'pending', createdAt: '2026-11-04T07:45:00Z',
      questions: [
        q('q7', 's5', 'u3', 'Phạm Quốc Bảo', 'Mạng máy tính', 'Giao thức nào đảm bảo truyền tin cậy?',
          ['UDP', 'TCP', 'ICMP', 'ARP'], 1, 'Transport', 'easy', 'pending'),
      ],
    },
  ] as Session[],
  ratings: {
    q1: [
      { id: 'r1', userName: 'Lê Thu Hà', stars: 5, comment: 'Câu hỏi rất rõ ràng!', createdAt: '2026-10-22T09:00:00Z' },
      { id: 'r2', userName: 'Phạm Quốc Bảo', stars: 4, comment: 'Nên thêm ví dụ.', createdAt: '2026-10-23T12:00:00Z' },
    ],
  } as Record<string, Rating[]>,
  answered: {} as Record<string, number[]>, // qid -> list of chosen indices
  predictions: [
    { id: 'p1', game: 'GAME_1_PARTICIPANTS', status: 'resolved', isCorrect: true, prediction: { predicted_count: 12 }, actual: { actual_count: 12 }, createdAt: '2026-10-25T00:00:00Z', resolvedAt: '2026-10-26T00:00:00Z' },
    { id: 'p2', game: 'GAME_4_SUBJECT_BANK_SIZE', status: 'pending', prediction: { predicted_bank_size: 500 }, createdAt: '2026-11-03T00:00:00Z' },
  ] as Prediction[],
  exams: [] as Exam[],
  checkIn: { streak: 3, checkedInToday: false },
  llmSubmitted: false,
};
db.answered = { q1: [2, 2, 2, 1, 0, 2], q2: [1, 1, 1, 2] };

// Câu bị từ chối: lý do của giảng viên (giống rejection_code / rejection_reason của backend).
const rejected = db.sessions.flatMap((s) => s.questions).find((x) => x.id === 'q4');
if (rejected) Object.assign(rejected, { rejectionCode: 'INCORRECT_ANSWER', rejectionReason: 'Đáp án đúng chưa chính xác, vui lòng kiểm tra lại.' });

/** Câu hỏi đã được giảng viên duyệt (nằm trong ngân hàng đề). */
export const approvedQuestions = () =>
  db.sessions.flatMap((s) => s.questions).filter((x) => x.status === 'approved');

export const MOCK_SUBJECTS = [
  { id: '1', code: 'IT4409', name: 'Công nghệ Web' },
  { id: '2', code: 'IT3090', name: 'Cơ sở dữ liệu' },
  { id: '3', code: 'IT3080', name: 'Mạng máy tính' },
];

export const MOCK_CLASSES = [
  { id: 'c1', classCode: 'IT4409 · 20251', subjectName: 'Công nghệ Web', subjectCode: 'IT4409', semesterName: 'Học kỳ 20251', activeSemester: true, canPropose: true },
  { id: 'c2', classCode: 'IT3090 · 20251', subjectName: 'Cơ sở dữ liệu', subjectCode: 'IT3090', semesterName: 'Học kỳ 20251', activeSemester: true, canPropose: true },
  { id: 'c3', classCode: 'IT3080 · 20243', subjectName: 'Mạng máy tính', subjectCode: 'IT3080', semesterName: 'Học kỳ 20243', activeSemester: false, canPropose: false },
];
