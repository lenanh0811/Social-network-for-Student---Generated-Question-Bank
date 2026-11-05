import GamesScreen from '@/modules/exam-bank/screens/GamesScreen';
import { withRole } from '@/shared/withRole';

export default withRole(GamesScreen, ['student']);
