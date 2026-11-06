import type { Difficulty, QuestionStatus, SessionStatus } from '@/modules/exam-bank/api/types';
import { Badge } from '@/components/badge';
import { colors } from '@/theme';

type AnyStatus = SessionStatus | QuestionStatus;
const STATUS: Record<AnyStatus, [string, string, string]> = {
  pending: ['Chờ duyệt', colors.warning, colors.warningSoft],
  reviewing: ['Đang duyệt', colors.blue, colors.blueSoft],
  resolved: ['Đã xử lý', colors.success, colors.successSoft],
  approved: ['Đã duyệt', colors.success, colors.successSoft],
  rejected: ['Bị từ chối', colors.danger, colors.dangerSoft],
  'needs-edit': ['Cần edit', colors.blue, colors.blueSoft],
};
export const statusLabel = (st: AnyStatus) => STATUS[st][0];
export const StatusBadge = ({ status }: { status: AnyStatus }) => <Badge label={STATUS[status][0]} fg={STATUS[status][1]} bg={STATUS[status][2]} />;

const DIFF: Record<Difficulty, [string, string, string]> = {
  easy: ['Dễ', colors.success, colors.successSoft],
  medium: ['Trung bình', colors.warning, colors.warningSoft],
  hard: ['Khó', colors.danger, colors.dangerSoft],
};
export const diffLabel = (d: Difficulty) => DIFF[d][0];
export const DifficultyBadge = ({ d }: { d: Difficulty }) => <Badge label={DIFF[d][0]} fg={DIFF[d][1]} bg={DIFF[d][2]} />;

