import { api } from '@/api/backend';
import { fromApi, toApi } from './adapters';
import type { DeleteMessageResult, DeleteMessageScope, GetConversationMessagesData, GetConversationsData } from './interfaces/messages.interface';

export function deleteMessage(id: number, scope: DeleteMessageScope) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Tin nhắn chưa có ID từ máy chủ.');
  if (scope !== 'me' && scope !== 'everyone') throw new Error('Phạm vi xóa không hợp lệ.');
  return api<unknown>('DELETE', '/messages/' + id, {
    body: toApi({ scope }),
  }).then(fromApi<DeleteMessageResult>);
}
export const getConversations = (after?: number) => api<unknown>('GET', '/conversations', {
  query: { limit: 10, after },
}).then(fromApi<GetConversationsData>);
export const getConversationMessages = (conversationId: number, after?: number) =>
  api<unknown>('GET', '/conversations/' + conversationId + '/messages', {
    query: { limit: 100, after },
  }).then(fromApi<GetConversationMessagesData>);
