import ExamGenerateScreen from '@/modules/exam-bank/screens/exam-generate';
import { withRole } from '@/components/with-role';

export default withRole(ExamGenerateScreen, ['lecturer']);
