import ExamChatScreen from '@/modules/exam-bank/screens/exam-chat';
import { withRole } from '@/components/with-role';

export default withRole(ExamChatScreen, ['lecturer']);
