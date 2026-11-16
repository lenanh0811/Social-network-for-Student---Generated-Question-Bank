/**
 * Kiểm thử phần gọi API của module Exam Bank (src/modules/exam-bank/api/client.ts) theo Swagger.
 *
 * Chạy:  npm run test:exam-bank
 *
 * KHÔNG cần tài khoản thật (kể cả giảng viên): test chạy chính client.ts và adapters.ts qua một backend giả
 * (tests/exam-bank-mock-server.mjs). Backend giả đối chiếu MỌI yêu cầu và phản hồi với Swagger thật
 * (https://snsqb.duckdns.org/api/v1/docs/openapi.json), nên gọi sai đường dẫn / thiếu trường / sai kiểu sẽ báo lỗi ngay.
 * Cần mạng để tải Swagger; không có mạng thì các test được bỏ qua.
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import test, { after, before } from 'node:test';
import { createExamBankMockServer, TOKENS } from './exam-bank-mock-server.mjs';

const SWAGGER = process.env.SWAGGER_URL ?? 'https://snsqb.duckdns.org/api/v1/docs/openapi.json';
let spec;
try {
  const res = await fetch(SWAGGER);
  if (res.ok) spec = await res.json();
} catch { /* không có mạng */ }
const skip = !spec && `Không tải được Swagger từ ${SWAGGER}`;

let mock, server, client, http;

before(async () => {
  if (!spec) return;
  mock = createExamBankMockServer(spec);
  server = await mock.listen();
  process.env.EXPO_PUBLIC_API_URL = server.url; // phải đặt trước khi nạp http.ts
  register(new URL('./ts-alias-loader.mjs', import.meta.url));
  http = await import('../src/api/http.ts');
  client = await import('../src/modules/exam-bank/api/client.ts');
});
after(async () => { await server?.close(); });

const as = (who) => http.setToken(TOKENS[who]);
const last = () => mock.requests.at(-1);
const draft = (over = {}) => ({
  source: 'self', confidence: 3, content: 'PUT dùng để làm gì?', options: ['Lấy dữ liệu', 'Thay thế toàn bộ tài nguyên', 'Xoá tài nguyên', 'Tạo mới'], correctIndex: 1, explanation: 'PUT thay thế toàn bộ.', ...over,
});

test('Sinh viên: lớp học phần, đề xuất, xem, sửa, xoá phiên', { skip }, async () => {
  as('student');
  const classes = await client.listMyClasses();
  assert.equal(classes[0].id, '100');
  assert.equal(classes[0].canPropose, true);

  const s = await client.proposeSession({ title: 'Ôn tập REST', content: 'Chương 3', courseClassId: '100', questions: [draft(), draft({ source: 'ai', confidence: 0, content: 'DNS là gì?' })] });
  assert.equal(s.id, '101');
  assert.equal(s.status, 'pending');
  assert.equal(s.questionCount, 2);
  const sent = mock.requests.find((r) => r.method === 'POST' && r.path === '/sessions/propose').body;
  assert.equal(sent.course_class_id, 100, 'course_class_id phải là SỐ');
  assert.deepEqual(sent.questions[0].options[1], { key: 'B', text: 'Thay thế toàn bộ tài nguyên', is_correct: true });
  assert.equal(sent.questions[0].llm_generated, false);
  assert.equal(sent.questions[1].llm_generated, true);
  assert.equal(sent.questions[0].confidence, 3);

  const list = await client.listMySubmissions();
  assert.equal(list.length, 1);
  assert.equal(last().query.limit, '100');

  const detail = await client.getMySubmission('101');
  assert.equal(detail.questions.length, 2);
  assert.equal(detail.questions[0].correctIndex, 1);
  assert.equal(detail.questions[1].source, 'ai');
  assert.equal(detail.questions[0].status, 'pending');

  await client.updateMySubmission('101', { title: 'Ôn tập REST (sửa)', content: 'Chương 3', questions: [draft({ id: '1001', content: 'PUT khác POST ở điểm nào?' }), draft({ id: '1002', source: 'ai', content: 'DNS là gì?' })] });
  assert.equal(last().body.questions[0].question_id, 1001, 'question_id phải là SỐ');
  assert.equal(last().body.questions[1].source, 'LLM');
  assert.equal((await client.getMySubmission('101')).title, 'Ôn tập REST (sửa)');

  const tmp = await client.proposeSession({ title: 'Phiên tạm', courseClassId: '100', questions: [draft()] });
  await client.deleteMySubmission(tmp.id);
  assert.equal((await client.listMySubmissions()).length, 1);
});

test('Sinh viên không dùng được API của giảng viên (403) và chưa đăng nhập thì 401', { skip }, async () => {
  as('student');
  await assert.rejects(client.listReviewableSessions(), (e) => e.status === 403 && /quyền/.test(e.message));
  http.setToken(null);
  await assert.rejects(client.listMySubmissions(), (e) => e.status === 401);
});

test('Giảng viên: xem phiên chờ duyệt, cảnh báo trùng, từ chối, sửa, duyệt', { skip }, async () => {
  as('lecturer');
  const classes = await client.listLecturerClasses();
  assert.equal(classes[0].subjectId, '10');
  assert.equal(classes[0].totalStudents, 40);

  const queue = await client.listReviewableSessions();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].authorName, 'Nguyễn Văn An');
  assert.equal(queue[0].status, 'pending');
  assert.equal(client.getCachedSession('101').title, 'Ôn tập REST (sửa)');

  const d = await client.getReviewDetail('101');
  assert.equal(d.questions.length, 2);
  assert.equal(d.questions[0].correctIndex, 1);
  assert.deepEqual(d.duplicates.map((w) => [w.questionIndex, w.similarQuestionId]), [[0, '900']]);
  assert.equal((await client.listReviewableSessions())[0].status, 'reviewing', 'mở phiên thì chuyển sang Đang duyệt');

  await client.rejectQuestions(['1002'], 'DUPLICATE', 'Trùng câu #900');
  assert.deepEqual(last().body, { question_ids: [1002], rejection_code: 'DUPLICATE', reason: 'Trùng câu #900' });

  await client.editQuestion('1001', draft({ content: 'PUT khác POST thế nào?', explanation: 'PUT idempotent.' }), false);
  assert.equal(last().body.auto_approve, false);
  assert.equal(last().body.options[1].is_correct, true);
  assert.equal(client.getCachedQuestion('1001').content, 'PUT khác POST thế nào?');

  const pts = await client.approveQuestions(['1001']);
  assert.equal(pts, 2.5);
  assert.deepEqual(last().body, { question_ids: [1001] });
  assert.equal((await client.listReviewableSessions()).length, 0, 'duyệt hết các câu thì phiên tự hoàn tất');
});

test('Giảng viên: chat với AI chỉnh câu hỏi (tinh chỉnh, cảnh báo ảo giác, từ chối, áp dụng)', { skip }, async () => {
  as('lecturer');
  const a = await client.aiRefine('1001', 'Viết lại cho rõ hơn', 'chat-test');
  assert.equal(a.editLogId, '55');
  assert.match(a.content, /đã tinh chỉnh/);
  assert.equal(a.hallucinated, false);
  assert.equal(a.options.length, 4);
  assert.equal(a.correctIndex, 1);
  assert.deepEqual(last().body, { prompt: 'Viết lại cho rõ hơn', chat_session_id: 'chat-test' });

  const bad = await client.aiRefine('1001', 'Thêm ý bịa ví dụ', 'chat-test');
  assert.equal(bad.hallucinated, true);
  assert.equal(bad.violations[0].detail, 'Mệnh đề không có trong giáo trình');

  const refused = await client.aiRefine('1001', 'nội dung cấm', 'chat-test');
  assert.match(refused.refusalReason, /không phù hợp/);

  await client.aiApply('1001', a, true);
  assert.deepEqual(last().body, { edit_log_id: 55, approve: true });
  assert.match(client.getCachedQuestion('1001').content, /đã tinh chỉnh/);
  await client.aiApply('1001', bad, false);
  assert.deepEqual(last().body, { edit_log_id: Number(bad.editLogId), approve: false });
});

test('Giảng viên: chốt phiên thì các câu còn chờ bị từ chối tự động', { skip }, async () => {
  as('student');
  const s = await client.proposeSession({ title: 'Phiên cần chốt', courseClassId: '100', questions: [draft({ content: 'Câu A?' }), draft({ content: 'Câu B?' })] });
  as('lecturer');
  await client.getReviewDetail(s.id);
  await client.completeReview(s.id);
  as('student');
  const after = await client.getMySubmission(s.id);
  assert.equal(after.status, 'resolved');
  assert.deepEqual(after.questions.map((q) => [q.status, q.rejectionCode]), [['rejected', 'AUTO_REJECTED_ON_COMPLETION'], ['rejected', 'AUTO_REJECTED_ON_COMPLETION']]);
});

test('Sinh viên: luyện tập, trả lời, thống kê, đánh giá (thang 0–4), báo lỗi', { skip }, async () => {
  as('student');
  assert.equal(await client.countApprovedQuestions('1'), 1);
  const sessions = await client.listUserSessions('1');
  assert.equal(sessions.find((x) => x.id === '101').approvedQuestionCount, 1);

  const p = await client.getPracticeSession('101');
  const q = p.questions.find((x) => x.id === '1001');
  assert.equal(q.correctIndex, -1, 'đáp án đúng phải bị ẩn trước khi trả lời');

  const wrong = await client.answerQuestion('1001', 0);
  assert.deepEqual(last().body, { selected_options: ['A'] });
  assert.equal(wrong.correct, false);
  assert.equal(wrong.correctIndex, 1);
  await assert.rejects(client.answerQuestion('1001', 1), /đã trả lời/);

  const after = (await client.getPracticeSession('101')).questions.find((x) => x.id === '1001');
  assert.equal(after.correctIndex, 1, 'sau khi trả lời thì đáp án đúng được hiện');

  const stats = await client.getQuestionStatistics('1001', 4);
  assert.equal(stats.totalAnswers, 1);
  assert.equal(stats.correctRate, 0);
  assert.deepEqual(stats.distribution, [1, 0, 0, 0]);

  await client.rateQuestion('1001', 5, '  Câu hay  ');
  assert.deepEqual(last().body, { rating: 4, comment: 'Câu hay' }, '5 sao = rating 4');
  await client.rateQuestion('1001', 1);
  assert.deepEqual(last().body, { rating: 0 }, '1 sao = rating 0');
  const ratings = await client.listRatings('1001');
  assert.equal(ratings.length, 1, 'đánh giá lại thì thay bản cũ');
  assert.equal(ratings[0].stars, 1);
  assert.equal((await client.getQuestionStatistics('1001', 4)).rating.average, 1);

  await client.reportQuestion('1001', '  Đáp án ghi sai  ');
  assert.deepEqual(last().body, { description: 'Đáp án ghi sai' });
  assert.equal(last().method, 'PUT');
});

test('Giảng viên: môn học, sinh đề, danh sách đề, chi tiết đề, xuất file', { skip }, async () => {
  as('lecturer');
  const subjects = await client.listSubjects();
  assert.deepEqual(subjects, [{ id: '10', code: 'IT4409', name: 'Công nghệ Web' }]);

  const e = await client.generateExam({ title: 'Giữa kỳ', subjectId: '10', classIds: ['100'], count: 5, difficulty: { easy: 0.4, medium: 0.4, hard: 0.2 } });
  assert.equal(e.id, '501');
  assert.equal(e.questionCount, 1);
  assert.deepEqual(last().body, {
    subject_id: 10, title: 'Giữa kỳ', question_count: 5, class_ids: [100],
    difficulty_distribution: { easy: 0.4, medium: 0.4, hard: 0.2, unclassified: 0 }, shuffle_options: true, include_answer_key: true,
  });
  const random = await client.generateExam({ title: '  ', subjectId: '10', classIds: ['100'], count: 3 });
  assert.equal(last().body.difficulty_distribution, undefined);
  assert.equal(last().body.title, undefined, 'tên trống thì để backend tự đặt');
  assert.equal(random.id, '502');

  const list = await client.listMyExams();
  assert.deepEqual(list.map((x) => x.id), ['501', '502']);
  assert.equal(list[0].statistic.unclassified, 1);
  assert.equal(last().query.limit, '20');

  const detail = await client.getExam('501');
  assert.equal(detail.questions[0].correctIndex, 1);
  assert.equal(client.getCachedQuestion('1001').id, '1001');

  const f = await client.exportExam('501', 'pdf', true);
  assert.equal(f.downloadUrl, 'https://files.example.test/export.pdf');
  assert.deepEqual(last().query, { format: 'pdf', include_answer_key: 'true' });

  const bank = await client.exportQuestionBank('10', 'excel', false);
  assert.equal(bank.questionsCount, 1);
  assert.deepEqual(last().query, { subject_id: '10', format: 'excel', include_answer: 'false' });
});
