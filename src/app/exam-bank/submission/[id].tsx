import SubmissionDetailScreen from '@/modules/exam-bank/screens/SubmissionDetailScreen';
import { withRole } from '@/shared/withRole';

export default withRole(SubmissionDetailScreen, ['student']);
