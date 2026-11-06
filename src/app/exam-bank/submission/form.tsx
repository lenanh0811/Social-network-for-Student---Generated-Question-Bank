import SubmissionFormScreen from '@/modules/exam-bank/screens/submission-form';
import { withRole } from '@/components/with-role';

export default withRole(SubmissionFormScreen, ['student']);
