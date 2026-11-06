import ExamDetailScreen from '@/modules/exam-bank/screens/exam-detail';
import { withRole } from '@/components/with-role';

export default withRole(ExamDetailScreen, ['lecturer']);
