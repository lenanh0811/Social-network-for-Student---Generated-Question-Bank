/**
 * Backend giả cho module Exam Bank, dùng để kiểm thử mà KHÔNG cần tài khoản thật (đặc biệt là tài khoản giảng viên).
 *  - Mọi yêu cầu gửi tới đều được đối chiếu với Swagger THẬT (đường dẫn, phương thức, query, body, kiểu dữ liệu, enum).
 *    Sai là trả 400 kèm lý do, nên lỗi gọi sai API lộ ra ngay.
 *  - Mọi phản hồi giả cũng được đối chiếu với Swagger trước khi trả, để dữ liệu thử nghiệm sát thực tế.
 *  - Có phân quyền: token 'student-token' (sinh viên) và 'lecturer-token' (giảng viên); API của giảng viên trả 403 cho sinh viên.
 * Có trạng thái trong bộ nhớ: đề xuất → duyệt → luyện tập → đánh giá → sinh đề… chạy được theo luồng thật.
 */
import { createServer } from 'node:http';
import { createValidator } from './openapi-validate.mjs';

export const TOKENS = { student: 'student-token', lecturer: 'lecturer-token' };
const USERS = { [TOKENS.student]: { id: 1, name: 'Nguyễn Văn An', role: 'STUDENT' }, [TOKENS.lecturer]: { id: 2, name: 'TS. Trần Minh Quân', role: 'LECTURER' } };
const LETTERS = 'ABCDEFGH';
const NOW = () => new Date().toISOString();

export function createExamBankMockServer(spec) {
  const v = createValidator(spec);
  const requests = [];
  let s;
  const reset = () => {
    s = { sessions: [], nextSession: 101, nextQuestion: 1001, nextExam: 501, answers: [], ratings: [], reports: [], exams: [], aiLogs: new Map() };
  };
  reset();

  // ───────── dữ liệu nền ─────────
  const subject = { subject_id: 10, code: 'IT4409', name: 'Công nghệ Web' };
  const klass = { course_class_id: 100, class_code: 'IT4409-20251', subject_id: 10, subject_code: 'IT4409', subject_name: 'Công nghệ Web', semester_id: 1, semester_name: 'Học kỳ 20251', active_semester: true };
  const answerKey = (q) => q.options.find((o) => o.is_correct)?.key;
  const findQuestion = (id) => s.sessions.flatMap((x) => x.questions).find((q) => q.id === Number(id));
  const sessionOf = (qid) => s.sessions.find((x) => x.questions.some((q) => q.id === Number(qid)));
  const pageInfo = { has_prev: false, has_next: false };

  const summary = (x, withApproved = false) => ({
    session_id: x.id, session_code: `IT4409_${x.id}`, title: x.title, content: x.content, subject_id: 10, subject_name: subject.name, subject_code: subject.code,
    course_class_id: 100, class_code: klass.class_code, semester_id: 1, semester_name: klass.semester_name, status: x.status,
    question_counts: x.questions.length, created_at: x.created_at, react_count: 0, comment_count: 0,
    ...(withApproved ? { approved_question_count: x.questions.filter((q) => q.status === 'APPROVED').length } : {}),
  });
  const myQuestion = (q) => ({
    question_id: q.id, content: q.content, image_urls: [], options: q.options, explanation: q.explanation, source: q.source, confidence_score: q.confidence_score,
    status: q.status, ...(q.rejection_code ? { rejection_code: q.rejection_code, rejection_reason: q.rejection_reason } : {}), comment_count: 0, react_count: 0, rating_count: s.ratings.filter((r) => r.q === q.id).length,
  });
  const examDto = (e) => ({
    exam_id: e.id, title: e.title, subject_name: subject.name, question_count: e.questions.length, created_at: e.created_at,
    questions: e.questions.map((q, i) => ({ order: i + 1, question_id: q.id, content: q.content, image_urls: [], options: q.options.map(({ key, text, is_correct }) => ({ key, text, is_correct })), difficulty: 'UNCLASSIFIED' })),
    statistic: { easy_count: 0, medium_count: 0, hard_count: 0, unclassified_count: e.questions.length },
  });
  const fileDto = (count) => ({ download_url: 'https://files.example.test/export.pdf', file_size_mb: 0.5, questions_count: count, expires_at: NOW() });

  // ───────── xử lý từng API: khoá "METHOD /đường-dẫn-Swagger" ─────────
  const H = {
    'GET /sessions/my-enrolled-course-classes': () => [{ ...klass, can_propose: true }],
    'GET /subjects': () => [subject],
    'GET /lecturer/course-classes/my-classes': () => [{ ...klass, lecturer_id: 2, lecturer_name: 'TS. Trần Minh Quân', total_students: 40, created_at: NOW() }],

    'POST /sessions/propose': ({ body }) => {
      const x = { id: s.nextSession++, title: body.title, content: body.content, status: 'PENDING', created_at: NOW(), questions: [] };
      x.questions = body.questions.map((q) => ({
        id: s.nextQuestion++, content: q.content, options: q.options, explanation: q.explanation, source: q.llm_generated ? 'LLM' : 'HOMO_SAPIENS', confidence_score: q.confidence, status: 'PENDING',
      }));
      s.sessions.push(x);
      return { http: 201, data: { session_id: x.id, session_code: `IT4409_${x.id}`, subject_id: 10, course_class_id: body.course_class_id, semester_name: klass.semester_name, question_count: x.questions.length, status: 'PENDING', created_at: x.created_at } };
    },
    'GET /sessions/my-submissions': ({ query }) => ({ contents: s.sessions.filter((x) => !query.status || x.status === query.status).map((x) => summary(x)), pagination: pageInfo }),
    'GET /sessions/my-submissions/{sessionId}': ({ params }) => {
      const x = s.sessions.find((y) => y.id === Number(params.sessionId));
      if (!x) return { error: 404, message: 'Không tìm thấy phiên đề xuất' };
      const { question_counts: _a, react_count: _b, comment_count: _c, ...rest } = summary(x);
      return { ...rest, comment_count: 0, react_count: 0, created_at: x.created_at, questions: x.questions.map(myQuestion) };
    },
    'PUT /sessions/my-submissions/{sessionId}': ({ params, body }) => {
      const x = s.sessions.find((y) => y.id === Number(params.sessionId));
      if (!x) return { error: 404, message: 'Không tìm thấy phiên đề xuất' };
      if (x.status !== 'PENDING') return { error: 400, message: 'Chỉ sửa được phiên đang chờ duyệt' };
      if (body.title) x.title = body.title;
      if (body.content !== undefined) x.content = body.content;
      for (const q of body.questions ?? []) {
        const cur = q.question_id && x.questions.find((z) => z.id === q.question_id);
        if (cur) Object.assign(cur, { content: q.content ?? cur.content, options: q.options ?? cur.options, explanation: q.explanation, source: q.source ?? cur.source, confidence_score: q.confidence ?? cur.confidence_score });
        else x.questions.push({ id: s.nextQuestion++, content: q.content, options: q.options, explanation: q.explanation, source: q.source ?? 'HOMO_SAPIENS', confidence_score: q.confidence ?? 0, status: 'PENDING' });
      }
      return {};
    },
    'DELETE /sessions/my-submissions/{sessionId}': ({ params }) => { s.sessions = s.sessions.filter((y) => y.id !== Number(params.sessionId)); return {}; },
    'GET /users/{userId}/sessions': ({ params, user }) => ({
      contents: s.sessions.filter((x) => Number(params.userId) === user.id || x.status === 'RESOLVED').map((x) => summary(x, true)), pagination: pageInfo,
    }),

    'GET /sessions/{sessionId}/questions': ({ params, user }) => {
      const x = s.sessions.find((y) => y.id === Number(params.sessionId));
      if (!x) return { error: 404, message: 'Không tìm thấy phiên' };
      return {
        session_id: x.id, session_code: `IT4409_${x.id}`, title: x.title, content: x.content, subject_id: 10, subject_name: subject.name, subject_code: subject.code,
        created_at: x.created_at, total_questions: x.questions.length,
        questions: x.questions.map((q) => {
          const done = s.answers.find((a) => a.q === q.id && a.user === user.id);
          return {
            question_id: q.id, question_code: `Q${q.id}`, content: q.content, image_urls: [], source: q.source, created_at: x.created_at, updated_at: x.created_at,
            options: q.options.map(({ key, text }) => ({ key, text })), // đáp án đúng bị ẩn
            my_interaction: { answered: !!done, rated: s.ratings.some((r) => r.q === q.id && r.user === user.id) },
            ...(done ? { hidden_fields: { correct_answer: answerKey(q), explanation: q.explanation, was_correct: done.correct } } : {}),
            react_count: 0, comment_count: 0, rating_count: s.ratings.filter((r) => r.q === q.id).length,
          };
        }),
      };
    },
    'POST /questions/{questionId}/answer': ({ params, body, user }) => {
      const q = findQuestion(params.questionId);
      if (!q) return { error: 404, message: 'Không tìm thấy câu hỏi' };
      if (s.answers.some((a) => a.q === q.id && a.user === user.id)) return { error: 400, message: 'Bạn đã trả lời câu hỏi này rồi' };
      const correct = body.selected_options.length === 1 && body.selected_options[0] === answerKey(q);
      s.answers.push({ q: q.id, user: user.id, picked: body.selected_options[0], correct });
      return { is_correct: correct, correct_answer: answerKey(q), explanation: q.explanation };
    },
    'GET /questions/{questionId}/statistics': ({ params }) => {
      const q = findQuestion(params.questionId);
      if (!q) return { error: 404, message: 'Không tìm thấy câu hỏi' };
      const a = s.answers.filter((x) => x.q === q.id);
      const dist = Object.fromEntries(q.options.map((o) => [o.key, a.filter((x) => x.picked === o.key).length]));
      const r = s.ratings.filter((x) => x.q === q.id);
      const rd = {}; r.forEach((x) => { rd[String(x.rating)] = (rd[String(x.rating)] ?? 0) + 1; });
      return {
        total_answer: a.length, correct_rate: a.length ? a.filter((x) => x.correct).length / a.length : 0, option_distribution: dist,
        rating_summary: { avg_rating: r.length ? r.reduce((t, x) => t + x.rating, 0) / r.length : 0, total_ratings: r.length, distribution: rd },
      };
    },
    'POST /questions/{questionId}/rate': ({ params, body, user }) => {
      s.ratings = s.ratings.filter((r) => !(r.q === Number(params.questionId) && r.user === user.id));
      s.ratings.push({ q: Number(params.questionId), user: user.id, name: user.name, rating: body.rating, comment: body.comment, at: NOW() });
      const r = s.ratings.filter((x) => x.q === Number(params.questionId));
      return { new_avg_rating: r.reduce((t, x) => t + x.rating, 0) / r.length, new_rating_count: r.length };
    },
    'GET /questions/{questionId}/ratings': ({ params }) => ({
      items: s.ratings.filter((r) => r.q === Number(params.questionId)).map((r) => ({ user_id: r.user, reviewer_name: r.name, rating: r.rating, comment: r.comment, created_at: r.at })), pagination: pageInfo,
    }),
    'PUT /questions/{questionId}/report': ({ params, body, user }) => { s.reports.push({ q: Number(params.questionId), user: user.id, description: body.description }); return {}; },

    // ───────── giảng viên ─────────
    'GET /lecturer/sessions/reviewable': () => ({
      items: s.sessions.filter((x) => x.status !== 'RESOLVED').map((x) => ({
        session_id: x.id, topic: subject.name, subject_id: 10, subject_code: subject.code, course_class_id: 100, class_code: klass.class_code, semester_id: 1, semester_name: klass.semester_name,
        title: x.title, content: x.content, author: { user_id: 1, full_name: 'Nguyễn Văn An' }, status: x.status, created_at: x.created_at,
      })), pagination: pageInfo,
    }),
    'GET /lecturer/sessions/{sessionId}': ({ params }) => {
      const x = s.sessions.find((y) => y.id === Number(params.sessionId));
      if (!x) return { error: 404, message: 'Không tìm thấy phiên' };
      if (x.status === 'PENDING') x.status = 'REVIEWING';
      return {
        items: x.questions.map((q) => ({
          question_id: q.id, content: q.content, image_urls: [], options: q.options, correct_answer: answerKey(q), explanation: q.explanation, status: q.status,
          ...(q.rejection_code ? { rejection_code: q.rejection_code, rejection_reason: q.rejection_reason } : {}),
        })),
        duplicate_warnings: [{ question_index: 0, similar_question_id: 900, similarity_score: 0.91, tier: 'TRIGRAM', matched_snipet: 'câu hỏi tương tự trong ngân hàng' }],
      };
    },
    'POST /lecturer/sessions/approve': ({ body }) => {
      body.question_ids.forEach((id) => { const q = findQuestion(id); if (q) q.status = 'APPROVED'; });
      s.sessions.forEach((x) => { if (x.questions.every((q) => q.status !== 'PENDING')) x.status = 'RESOLVED'; });
      return { points_earned: 2.5 * body.question_ids.length };
    },
    'POST /lecturer/sessions/reject': ({ body }) => {
      body.question_ids.forEach((id) => { const q = findQuestion(id); if (q) Object.assign(q, { status: 'REJECTED', rejection_code: body.rejection_code ?? 'UNSPECIFIED', rejection_reason: body.reason }); });
      s.sessions.forEach((x) => { if (x.questions.every((q) => q.status !== 'PENDING')) x.status = 'RESOLVED'; });
      return {};
    },
    'POST /lecturer/sessions/{sessionId}/complete-review': ({ params }) => {
      const x = s.sessions.find((y) => y.id === Number(params.sessionId));
      if (!x) return { error: 404, message: 'Không tìm thấy phiên' };
      x.questions.filter((q) => q.status === 'PENDING').forEach((q) => Object.assign(q, { status: 'REJECTED', rejection_code: 'AUTO_REJECTED_ON_COMPLETION' }));
      x.status = 'RESOLVED';
      return {};
    },
    'PUT /lecturer/questions/{questionId}': ({ params, body }) => {
      const q = findQuestion(params.questionId);
      if (!q) return { error: 404, message: 'Không tìm thấy câu hỏi' };
      if (body.content) q.content = body.content;
      if (body.options) q.options = body.options;
      if (body.explanation !== undefined) q.explanation = body.explanation;
      if (body.auto_approve) q.status = 'APPROVED';
      return { question_id: q.id, status: q.status, reviewed_by: 2, reviewed_at: NOW() };
    },

    'POST /questions/{questionId}/ai-refine': ({ params, body }) => {
      const q = findQuestion(params.questionId);
      if (!q) return { error: 404, message: 'Không tìm thấy câu hỏi' };
      const id = 55 + s.aiLogs.size;
      if (/cấm/i.test(body.prompt)) return { edit_log_id: id, suggested_question: { refusal_reason: 'Yêu cầu không phù hợp với nội dung câu hỏi' }, hallucination_audit: { is_hallucinated: false, confidence_score: 1, belief_tree_depth: 0, violations: [] }, ai_metadata: { model: 'mock', tokens_used: 10, processing_time_ms: 5 } };
      const next = { content: `${q.content} (đã tinh chỉnh)`, options: q.options, explanation: `${q.explanation ?? ''} Giải thích chi tiết hơn.`.trim() };
      s.aiLogs.set(id, { q: q.id, next });
      return { edit_log_id: id, suggested_question: next, hallucination_audit: { is_hallucinated: /bịa/i.test(body.prompt), confidence_score: 0.92, belief_tree_depth: 2, violations: /bịa/i.test(body.prompt) ? [{ type: 'FACT', node_statement: 'mệnh đề', detail: 'Mệnh đề không có trong giáo trình', severity: 'HIGH' }] : [] }, ai_metadata: { model: 'mock-llm', tokens_used: 120, processing_time_ms: 800 } };
    },
    'POST /questions/{questionId}/ai-apply': ({ params, body }) => {
      const log = s.aiLogs.get(body.edit_log_id);
      const q = findQuestion(params.questionId);
      if (!log || !q) return { error: 404, message: 'Không tìm thấy bản chỉnh sửa của AI' };
      if (body.approve) Object.assign(q, log.next);
      return { question_id: q.id, status: q.status, confidence_score: 0.92, hallucination: false };
    },

    'POST /exams/generate': ({ body }) => {
      const approved = s.sessions.flatMap((x) => x.questions).filter((q) => q.status === 'APPROVED').slice(0, body.question_count ?? 10);
      if (!approved.length) return { error: 400, message: 'Chưa có câu hỏi đã duyệt cho môn này' };
      const e = { id: s.nextExam++, title: body.title ?? 'Đề tự sinh', created_at: NOW(), questions: approved, body };
      s.exams.push(e);
      return examDto(e);
    },
    'GET /exams/my-exams': () => ({
      items: s.exams.map((e) => { const d = examDto(e); return { exam_id: d.exam_id, title: d.title, subject_name: d.subject_name, question_count: d.question_count, created_at: d.created_at, statistic: d.statistic }; }), pagination: pageInfo,
    }),
    'GET /exams/{examId}': ({ params }) => { const e = s.exams.find((x) => x.id === Number(params.examId)); return e ? examDto(e) : { error: 404, message: 'Không tìm thấy đề thi' }; },
    'GET /exams/{examId}/export': ({ params }) => { const e = s.exams.find((x) => x.id === Number(params.examId)); return e ? fileDto(e.questions.length) : { error: 404, message: 'Không tìm thấy đề thi' }; },
    'GET /lecturer/questions/export': () => fileDto(s.sessions.flatMap((x) => x.questions).filter((q) => q.status === 'APPROVED').length),
  };

  const lecturerOnly = (tpl) => tpl.startsWith('/lecturer/') || tpl.startsWith('/exams/') || tpl.includes('/ai-');

  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const send = (status, payload) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(payload)); };
      const fail = (status, message, code = '9999') => send(status, { code, message, data: null });
      try {
        const url = new URL(req.url, 'http://x');
        const urlPath = url.pathname.replace(/^\/api\/v1/, '');
        const raw = Buffer.concat(chunks).toString();
        let body; if (raw) { try { body = JSON.parse(raw); } catch { return fail(400, 'Dữ liệu JSON gửi lên không đúng định dạng', '1003'); } }
        const query = Object.fromEntries(url.searchParams);
        const user = USERS[(req.headers.authorization ?? '').replace(/^Bearer /, '')];
        requests.push({ method: req.method, path: urlPath, query, body, auth: req.headers.authorization });
        const found = v.match(req.method, urlPath);
        if (!found) return fail(404, `[MOCK] ${req.method} ${urlPath} không có trong Swagger`, '1012');
        if (!user) return fail(401, 'Full authentication is required to access this resource', '9998');
        if (lecturerOnly(found.template) && user.role !== 'LECTURER') return fail(403, 'Bạn không có quyền thực hiện thao tác này', '9997');
        const bad = v.checkRequest(found, query, body);
        if (bad.length) return fail(400, `[MOCK] Yêu cầu không đúng Swagger: ${bad.join('; ')}`, '1002');
        const handler = H[`${req.method} ${found.template}`];
        if (!handler) return fail(501, `[MOCK] Chưa giả lập ${req.method} ${found.template}`);
        const out = handler({ params: found.params, query, body, user });
        if (out && out.error) return fail(out.error, out.message, '1012');
        const status = out?.http ?? 200;
        const data = out?.http ? out.data : out;
        const payload = { code: '0000', message: 'Thành công', data };
        const wrong = v.checkResponse(found, payload);
        if (wrong.length) return fail(500, `[MOCK] Phản hồi giả không đúng Swagger (${found.template}): ${wrong.join('; ')}`);
        send(status, payload);
      } catch (e) { fail(500, `[MOCK] Lỗi nội bộ: ${e.stack ?? e}`); }
    });
  });

  return {
    requests,
    reset,
    async listen() {
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      return { url: `http://127.0.0.1:${server.address().port}/api/v1`, close: () => new Promise((r) => server.close(r)) };
    },
  };
}
