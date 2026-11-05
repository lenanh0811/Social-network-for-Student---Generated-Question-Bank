import type { Difficulty, QuestionStatus } from '@/modules/exam-bank/api/types';
import { Badge } from '@/shared/ui';
import { colors } from '@/shared/theme';

const STATUS: Record<QuestionStatus, [string, string, string]> = {
  pending: ['Chờ duyệt', colors.warning, colors.warningSoft],
  approved: ['Đã duyệt', colors.success, colors.successSoft],
  rejected: ['Bị từ chối', colors.danger, colors.dangerSoft],
  'needs-edit': ['Cần edit', colors.blue, colors.blueSoft],
};
export const statusLabel = (st: QuestionStatus) => STATUS[st][0];
export const StatusBadge = ({ status }: { status: QuestionStatus }) => <Badge label={STATUS[status][0]} fg={STATUS[status][1]} bg={STATUS[status][2]} />;

const DIFF: Record<Difficulty, [string, string, string]> = {
  easy: ['Dễ', colors.success, colors.successSoft],
  medium: ['Trung bình', colors.warning, colors.warningSoft],
  hard: ['Khó', colors.danger, colors.dangerSoft],
};
export const diffLabel = (d: Difficulty) => DIFF[d][0];
export const DifficultyBadge = ({ d }: { d: Difficulty }) => <Badge label={DIFF[d][0]} fg={DIFF[d][1]} bg={DIFF[d][2]} />;

