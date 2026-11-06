import ExamsScreen from '@/modules/exam-bank/screens/exams';
import { withRole } from '@/components/with-role';

export default withRole(ExamsScreen, ['lecturer']);
