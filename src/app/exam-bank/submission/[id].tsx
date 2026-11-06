import SubmissionDetailScreen from '@/modules/exam-bank/screens/submission-detail';
import { withRole } from '@/components/with-role';

export default withRole(SubmissionDetailScreen, ['student']);
