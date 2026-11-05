import ExamDetailScreen from '@/modules/exam-bank/screens/ExamDetailScreen';
import { withRole } from '@/shared/withRole';

export default withRole(ExamDetailScreen, ['lecturer']);
