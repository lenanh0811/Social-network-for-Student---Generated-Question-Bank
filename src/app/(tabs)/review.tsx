import ReviewQueueScreen from '@/modules/exam-bank/screens/ReviewQueueScreen';
import { withRole } from '@/shared/withRole';

export default withRole(ReviewQueueScreen, ['lecturer']);
