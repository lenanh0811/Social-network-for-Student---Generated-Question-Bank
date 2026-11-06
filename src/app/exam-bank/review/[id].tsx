import ReviewSessionScreen from '@/modules/exam-bank/screens/review-session';
import { withRole } from '@/components/with-role';

export default withRole(ReviewSessionScreen, ['lecturer']);
