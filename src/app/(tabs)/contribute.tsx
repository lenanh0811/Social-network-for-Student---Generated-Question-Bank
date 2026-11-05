import MySubmissionsScreen from '@/modules/exam-bank/screens/MySubmissionsScreen';
import { withRole } from '@/shared/withRole';

export default withRole(MySubmissionsScreen, ['student']);
