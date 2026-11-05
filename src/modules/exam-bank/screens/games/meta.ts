import type { GameType } from '@/modules/exam-bank/api/types';
import type { IconName } from '@/modules/exam-bank/screens/games/GameShell';

export const GAME_META: Record<GameType, { no: number; title: string; short: string; icon: IconName; color: string }> = {
  GAME_1_PARTICIPANTS: { no: 1, title: 'Đoán số lượng', short: 'Bao nhiêu bạn trong lớp sẽ đề xuất câu hỏi ngày mai?', icon: 'people', color: '#4472C4' },
  GAME_2_APPROVED_QUESTIONS: { no: 2, title: 'Đoán tỷ lệ duyệt', short: 'Bao nhiêu câu của bạn được giảng viên chọn?', icon: 'checkmark-done', color: '#1E8E4E' },
  GAME_3_AUTHOR_CONFIDENCE: { no: 3, title: 'Mức tự tin của tác giả', short: 'Bạn tự tin đến đâu về câu hỏi của mình?', icon: 'speedometer', color: '#E0384F' },
  GAME_4_SUBJECT_BANK_SIZE: { no: 4, title: 'Quy mô ngân hàng đề', short: 'Cuối kỳ ngân hàng có bao nhiêu câu?', icon: 'library', color: '#B26A00' },
  GAME_5_REPORT_ERROR: { no: 5, title: 'Báo câu lỗi', short: 'Săn lỗi, nhận điểm khi giảng viên xác nhận.', icon: 'bug', color: '#D32F2F' },
  GAME_6_LLM_IDENTIFICATION: { no: 6, title: 'Đâu là câu của LLM?', short: 'Phân biệt câu do AI và do người viết.', icon: 'hardware-chip', color: '#7B4DD6' },
};

const LABEL: Record<string, string> = {
  predicted_count: 'Dự đoán', actual_count: 'Thực tế', predicted_bank_size: 'Dự đoán', actual_bank_size: 'Thực tế',
  predicted_llm_count: 'AI', predicted_human_count: 'Người', actual_llm_count: 'AI thực tế', actual_human_count: 'Người thực tế',
};
/** Mô tả gọn dữ liệu dự đoán / kết quả (object tự do từ backend). */
export function describeData(o?: Record<string, unknown>): string {
  if (!o) return '';
  return Object.entries(o)
    .map(([k, v]) => (Array.isArray(v) ? `${LABEL[k] ?? 'Đã chọn'}: ${v.length} câu` : typeof v === 'object' && v ? '' : `${LABEL[k] ?? k}: ${v}`))
    .filter(Boolean).join(' · ');
}
