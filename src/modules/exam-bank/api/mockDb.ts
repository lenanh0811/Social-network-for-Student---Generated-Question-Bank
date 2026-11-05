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
  id, sessionId, authorId, authorName, subject, content, options, correctIndex, topic, difficulty,
  status, explanation, avgRating: 4.2, ratingCount: 5, answerCount: 24,
});

export const db = {
  sessions: [
    {
      id: 's1', title: 'Ôn tập chương 3 – HTTP & REST', subject: 'Công nghệ Web',
      authorId: 'u1', authorName: STUDENT.name, status: 'approved', createdAt: '2026-10-20T08:00:00Z',
      questions: [
        q('q1', 's1', 'u1', STUDENT.name, 'Công nghệ Web', 'Phương thức HTTP nào là idempotent và dùng để thay thế toàn bộ tài nguyên?',
          ['GET', 'POST', 'PUT', 'PATCH'], 2, 'REST', 'medium', 'approved', 'PUT thay thế toàn bộ tài nguyên và idempotent.'),
        q('q2', 's1', 'u1', STUDENT.name, 'Công nghệ Web', 'Mã trạng thái nào biểu thị tài nguyên được tạo thành công?',
          ['200', '201', '204', '301'], 1, 'HTTP', 'easy', 'approved', '201 Created.'),
      ],
    },
    {
      id: 's2', title: 'Câu hỏi về JavaScript bất đồng bộ', subject: 'Công nghệ Web',
      authorId: 'u1', authorName: STUDENT.name, status: 'pending', createdAt: '2026-11-02T10:30:00Z',
      questions: [
        q('q3', 's2', 'u1', STUDENT.name, 'Công nghệ Web', 'Promise.all() trả về kết quả khi nào?',
          ['Khi promise đầu tiên xong', 'Khi tất cả promise xong', 'Khi có promise lỗi', 'Ngay lập tức'], 1, 'JavaScript', 'medium', 'pending'),
      ],
    },
    {
      id: 's3', title: 'CSS Flexbox cơ bản', subject: 'Công nghệ Web',
      authorId: 'u1', authorName: STUDENT.name, status: 'rejected', rejectReason: 'Đáp án đúng chưa chính xác, vui lòng kiểm tra lại câu 1.',
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
          ['Phụ thuộc hàm riêng phần', 'Phụ thuộc bắc cầu', 'Phụ thuộc đa trị', 'Phụ thuộc nối'], 1, 'Chuẩn hoá', 'hard', 'pending'),
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
    { id: 'p1', type: 'participants', value: 120, actual: 112, status: 'settled', points: 80, createdAt: '2026-10-25T00:00:00Z', targetDate: '2026-11-01' },
    { id: 'p2', type: 'bank-size', value: 500, status: 'open', createdAt: '2026-11-03T00:00:00Z', targetDate: '2026-11-15' },
  ] as Prediction[],
  exams: [] as Exam[],
};
db.answered = { q1: [2, 2, 2, 1, 0, 2], q2: [1, 1, 1, 2] };

export const approvedQuestions = () =>
  db.sessions.filter((s) => s.status === 'approved').flatMap((s) => s.questions);
