import ExamChatScreen from '@/modules/exam-bank/screens/ExamChatScreen';
import { withRole } from '@/shared/withRole';

export default withRole(ExamChatScreen, ['lecturer']);
