import GamesScreen from '@/modules/exam-bank/screens/games';
import { withRole } from '@/components/with-role';

export default withRole(GamesScreen, ['student']);
