import type { Conversation, ConversationMessage, DeleteMessageScope, DirectConversation } from './interfaces/messages.interface';
import type { SendWsMessageRequest, WsNewMessageEvent } from './realtime/stomp.types';

let nextId = 100;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const initialConversations: Conversation[] = [
  { conversationId: 1, type: 'direct', displayName: 'Trần Minh', lastMessage: { messageId: 3, content: 'Cảm ơn nhiều nha!', createdAt: '2026-11-01T03:30:00Z' }, unreadCount: 2 },
  { conversationId: 2, type: 'direct', displayName: 'Lê Thu Hà', lastMessage: null, unreadCount: 0 },
  { conversationId: 3, type: 'group', displayName: 'Nhóm ôn thi Giải tích', lastMessage: null, unreadCount: 0 },
];
let conversations = clone(initialConversations);
const initialMessages: ConversationMessage[] = [
  { messageId: 1, senderId: 2, senderName: 'Trần Minh', content: 'Chào bạn, bạn làm xong bài tập chưa?', messageType: 'text', mediaUrls: [], createdAt: '2026-11-01T03:28:00Z' },
  { messageId: 2, senderId: 1, senderName: 'Bạn', content: 'Mình xong rồi, để mình gửi cho.', messageType: 'text', mediaUrls: [], createdAt: '2026-11-01T03:29:00Z' },
  { messageId: 3, senderId: 2, senderName: 'Trần Minh', content: 'Cảm ơn nhiều nha!', messageType: 'text', mediaUrls: [], createdAt: '2026-11-01T03:30:00Z' },
];
let messages: Record<number, ConversationMessage[]> = { 1: clone(initialMessages) };
export const mockChat = {
  reset() { conversations = clone(initialConversations); messages = { 1: clone(initialMessages) }; },
  conversations: () => ({ items: clone(conversations), pagination: { hasNext: false }, totalConversations: conversations.length }),
  messages: (id: number) => ({ conversationId: id, conversationType: conversations.find(c => c.conversationId === id)?.type ?? 'direct', messages: clone(messages[id] ?? []), pagination: { hasNext: false } }),
  deleteMessage(id: number, scope: DeleteMessageScope) {
    for (const [key, list] of Object.entries(messages)) {
      messages[Number(key)] = list.filter(m => scope !== 'me' || m.messageId !== id)
        .map(m => m.messageId === id ? { ...m, content: '', mediaUrls: [], revoked: true } : m);
    }
    conversations = conversations.map(c => c.lastMessage?.messageId === id
      ? { ...c, lastMessage: scope === 'me' ? null : { ...c.lastMessage, content: 'Tin nhắn đã được thu hồi' } } : c);
    return { messageId: id, scope };
  },
  createDirect(targetUserId: number): DirectConversation {
    const id = ++nextId;
    conversations.push({ conversationId: id, type: 'direct', displayName: 'Người dùng demo', lastMessage: null, unreadCount: 0 });
    return { conversationId: id, type: 'direct', members: [{ userId: targetUserId, fullName: 'Người dùng demo' }] };
  },
  send(payload: SendWsMessageRequest, name: string): WsNewMessageEvent {
    const message: ConversationMessage = { messageId: ++nextId, senderId: 1, senderName: name,
      ...payload, createdAt: new Date().toISOString() };
    messages[payload.conversationId] = [...(messages[payload.conversationId] ?? []), message];
    conversations = conversations.map(c => c.conversationId === payload.conversationId
      ? { ...c, lastMessage: { messageId: message.messageId, content: message.content, createdAt: message.createdAt }, unreadCount: 0 } : c);
    return { eventType: 'new-message', messageId: message.messageId, ...payload,
      conversationType: conversations.find(c => c.conversationId === payload.conversationId)?.type ?? 'direct',
      sender: { userId: 1, fullName: name }, createdAt: message.createdAt, isEdited: false, reactions: [], readBy: [] };
  },
};
const notices = [
  { notificationId: '4', type: 'question-approved', title: 'Câu hỏi đã được duyệt', body: 'Bộ câu hỏi ôn tập của bạn đã được duyệt.', createdAt: '2026-11-01T04:00:00Z', readAt: null },
  { notificationId: '3', type: 'new-comment', title: 'Bình luận mới', body: 'Lê Thu Hà đã bình luận về câu hỏi của bạn.', createdAt: '2026-10-31T04:00:00Z', readAt: null },
  { notificationId: '2', type: 'earned-badge', title: 'Huy hiệu mới', body: 'Bạn vừa nhận được huy hiệu đóng góp.', createdAt: '2026-10-30T04:00:00Z', readAt: '2026-10-30T05:00:00Z' },
];
export function mockNotifications(after?: number, limit = 20) {
  const remaining = notices.filter(n => after === undefined || Number(n.notificationId) < after);
  const items = remaining.slice(0, limit);
  return { items, unreadCount: 2, pagination: { hasNext: remaining.length > limit, after: items.length ? Number(items.at(-1)!.notificationId) : undefined } };
}
