import ReviewSessionScreen from '@/modules/exam-bank/screens/ReviewSessionScreen';
import { withRole } from '@/shared/withRole';

export default withRole(ReviewSessionScreen, ['lecturer']);
