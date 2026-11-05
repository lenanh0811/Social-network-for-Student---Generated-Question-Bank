import ExamGenerateScreen from '@/modules/exam-bank/screens/ExamGenerateScreen';
import { withRole } from '@/shared/withRole';

export default withRole(ExamGenerateScreen, ['lecturer']);
