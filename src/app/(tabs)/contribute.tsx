import MySubmissionsScreen from '@/modules/exam-bank/screens/my-submissions';
import { withRole } from '@/components/with-role';

export default withRole(MySubmissionsScreen, ['student']);
