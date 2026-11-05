import SubmissionFormScreen from '@/modules/exam-bank/screens/SubmissionFormScreen';
import { withRole } from '@/shared/withRole';

export default withRole(SubmissionFormScreen, ['student']);
