import ExamsScreen from '@/modules/exam-bank/screens/ExamsScreen';
import { withRole } from '@/shared/withRole';

export default withRole(ExamsScreen, ['lecturer']);
