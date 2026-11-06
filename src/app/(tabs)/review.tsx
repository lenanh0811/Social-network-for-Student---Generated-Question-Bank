import ReviewQueueScreen from '@/modules/exam-bank/screens/review-queue';
import { withRole } from '@/components/with-role';

export default withRole(ReviewQueueScreen, ['lecturer']);
