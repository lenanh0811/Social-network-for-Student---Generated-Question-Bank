import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { register } from 'node:module';

process.env.EXPO_PUBLIC_API_URL = 'https://backend.example';
process.env.EXPO_PUBLIC_WS_URL = 'https://backend.example/api/v1/ws';
globalThis.__DEV__ = false;
register(new URL('../../../../tests/ts-alias-loader.mjs', import.meta.url));
const { configureApiAuth, configureApiRefresh } = await import('@/api/http');
const messagesApi = await import('./messages.ts');
const { getNotifications } = await import('./notifications.ts');
const { fromApi, toApi, toMessageItem } = await import('./adapters.ts');
const { parseWsPayload, isWsNewMessageEvent, normalizeWsNewMessageEvent } = await import('./realtime/stomp.types.ts');
const { ChatStompClient } = await import('./realtime/stomp.client.ts');
const { useChatStore } = await import('../store/chat-store.ts');
const envelope = data => new Response(JSON.stringify({ code: '0000', data }), { status: 200 });

test('REST uses the shared API root, refreshes once, and adapts conversation fields', async () => {
  let token = 'expired';
  let refreshes = 0;
  const requests = [];
  configureApiAuth(async () => token);
  configureApiRefresh(async () => { refreshes++; token = 'fresh'; return token; });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({ url, token: init.headers.get('Authorization') });
    if (requests.length === 1) return new Response(JSON.stringify({ code: '9998', message: 'Expired' }), { status: 401 });
    return envelope({ items: [{ conversation_id: 7, type: 'DIRECT', display_name: 'Minh', last_message: null, unread_count: 2 }], pagination: { has_next: false } });
  };
  try {
    const result = await messagesApi.getConversations(123);
    assert.equal(requests[0].url, 'https://backend.example/api/v1/conversations?limit=10&after=123');
    assert.equal(refreshes, 1);
    assert.equal(requests[1].token, 'Bearer fresh');
    assert.equal(result.items[0].conversationId, 7);
    assert.equal(result.items[0].type, 'direct');
    assert.equal(result.pagination.hasNext, false);
  } finally { globalThis.fetch = previousFetch; }
});

test('delete uses the documented scope body and rejects temporary IDs before requesting', async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, 'https://backend.example/api/v1/messages/42');
    assert.equal(init.method, 'DELETE');
    assert.deepEqual(JSON.parse(init.body), { scope: 'EVERYONE' });
    return envelope({ message_id: 42, scope: 'EVERYONE' });
  };
  try {
    assert.throws(() => messagesApi.deleteMessage(-1, 'me'));
    assert.deepEqual(await messagesApi.deleteMessage(42, 'everyone'), { messageId: 42, scope: 'everyone' });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = previousFetch; }
});

test('notifications keep server unread count and adapt UI IDs including metadata', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.equal(url, 'https://backend.example/api/v1/notifications?limit=20&after=99');
    return envelope({ items: [{ notification_id: 42, title: 'Duyệt', body: 'Nội dung', type: 'QUESTION_APPROVED', created_at: '2026-11-01T00:00:00Z', actor: { user_id: 3, full_name: 'Minh' }, metadata: { confirmed_questions: [{ question_id: 4, subject_name: 'Web', question_snippet: 'HTTP', points: 1 }] } }], pagination: { after: 42, has_next: true }, unread_count: 123 });
  };
  try {
    const page = await getNotifications(99);
    assert.equal(page.unreadCount, 123);
    assert.equal(page.items[0].notificationId, '42');
    assert.equal(page.items[0].actor.userId, '3');
    assert.equal(page.items[0].metadata.confirmedQuestions[0].questionId, '4');
    assert.throws(() => getNotifications(undefined, 51));
  } finally { globalThis.fetch = previousFetch; }
});

const wireMessage = { message_id: '42', conversation_id: '7', sender: { user_id: '3', full_name: 'Minh' }, content: 'Xin chào', message_type: 'TEXT', created_at: '2026-11-01T00:00:00Z' };
test('STOMP accepts numeric-string IDs and translates only wire fields, preserving content', () => {
  const payload = parseWsPayload(JSON.stringify({ data: wireMessage }));
  assert.equal(isWsNewMessageEvent(payload), true);
  const message = normalizeWsNewMessageEvent(payload);
  assert.equal(message.messageId, 42);
  assert.equal(message.sender.userId, 3);
  assert.equal(message.messageType, 'text');
  assert.equal(toMessageItem(message, '3').mine, true);
  assert.equal(parseWsPayload('{'), null);
  assert.equal(isWsNewMessageEvent(fromApi({ ...wireMessage, message_id: 'not-an-id' })), false);
  assert.deepEqual(toApi({ conversationId: 7, content: 'TEXT giữ nguyên', messageType: 'text', mediaUrls: [], replyToMessageId: null }),
    { conversation_id: 7, content: 'TEXT giữ nguyên', message_type: 'TEXT', media_urls: [], reply_to_message_id: null });
});

test('REST snapshots retain newer realtime messages and cannot restore deleted content', () => {
  const store = useChatStore.getState();
  store.clearChat();
  const first = normalizeWsNewMessageEvent(fromApi(wireMessage));
  const second = { ...first, messageId: 43, content: 'Mới hơn', createdAt: '2026-11-01T00:01:00Z' };
  store.addMessage(second);
  store.setMessages(7, [first]);
  assert.deepEqual(useChatStore.getState().messages[7].map(m => m.messageId), [42, 43]);
  store.applyDelete(7, 43, 'everyone');
  store.setMessages(7, [first, second]);
  assert.equal(useChatStore.getState().messages[7][1].content, '');
  store.applyDelete(7, 42, 'me');
  store.setMessages(7, [first]);
  assert.equal(useChatStore.getState().messages[7].some(m => m.messageId === 42), false);
  store.clearChat();
});

test('offline sends are serialized when reconnected and disposed queues cannot cross accounts', () => {
  const client = new ChatStompClient(async () => 'token');
  const payload = { conversationId: 7, content: 'Hello', messageType: 'text', mediaUrls: [], replyToMessageId: null };
  client.sendMessage(payload);
  const sent = [];
  Object.defineProperty(client.client, 'connected', { configurable: true, get: () => true });
  client.client.publish = frame => sent.push(frame);
  client.flushPublishQueue();
  assert.equal(sent[0].destination, '/app/chat.send');
  assert.equal(JSON.parse(sent[0].body).conversation_id, 7);
  Object.defineProperty(client.client, 'connected', { configurable: true, get: () => false });
  client.sendMessage(payload);
  client.dispose();
  assert.equal(client.publishQueue.length, 0);
});

test('incoming messages update the conversation preview and order immediately without REST', () => {
  const store = useChatStore.getState();
  store.clearChat();
  store.setConversations([
    { conversationId: 8, type: 'direct', displayName: 'Other', unreadCount: 0, lastMessage: { content: 'Other message', createdAt: '2026-11-01T00:01:00Z' } },
    { conversationId: 7, type: 'direct', displayName: 'Minh', unreadCount: 0, lastMessage: null },
  ]);
  const event = normalizeWsNewMessageEvent(fromApi({ ...wireMessage, created_at: '2026-11-01T00:02:00Z' }));
  store.addMessage(event);
  let state = useChatStore.getState();
  assert.equal(state.messages[7][0].messageId, 42);
  assert.equal(state.conversations[0].conversationId, 7);
  assert.equal(state.conversations[0].lastMessage.content, event.content);
  store.addMessage({ ...event, messageId: 41, content: 'Delayed older message', createdAt: '2026-11-01T00:00:00Z' });
  state = useChatStore.getState();
  assert.equal(state.conversations[0].lastMessage.messageId, 42);
  store.clearChat();
});
