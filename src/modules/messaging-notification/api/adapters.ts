import type { Conversation } from './interfaces/messages.interface';
import type { ChatMessage } from '../store/chat-store';
import type { ConversationItemData, MessageItemData } from './types/types';

const enumKeys = new Set(['type', 'messageType', 'conversationType', 'eventType', 'scope', 'role']);
/** Convert snake_case wire data once at the REST/STOMP boundary. */
export function fromApi<T>(value: unknown): T {
  const convert = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(convert);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(Object.entries(input).map(([key, item]) => {
      const name = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      return [name, enumKeys.has(name) && typeof item === 'string'
        ? item.toLowerCase().replaceAll('_', '-') : convert(item)];
    }));
  };
  return convert(value) as T;
}
export function toApi(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/[A-Z]/g, c => '_' + c.toLowerCase()),
    enumKeys.has(key) && typeof item === 'string' ? item.toUpperCase().replaceAll('-', '_') : item,
  ]));
}
const toTime = (value?: string) => value
  ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
export const toConversationItem = (item: Conversation): ConversationItemData => ({
  id: String(item.conversationId), name: item.displayName, avatarUrl: item.displayAvatarUrl,
  lastMessage: item.lastMessage?.content, time: toTime(item.lastMessage?.createdAt), unreadCount: item.unreadCount,
});
export const toMessageItem = (message: ChatMessage, userId: string): MessageItemData => ({
  id: String(message.messageId), content: message.content, mine: String(message.sender.userId) === userId,
  time: toTime(message.createdAt), pending: message.pending, failed: message.failed, revoked: message.revoked,
});
