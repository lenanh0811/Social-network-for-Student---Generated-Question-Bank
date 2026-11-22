import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { register } from 'node:module';

delete process.env.EXPO_PUBLIC_API_URL;
delete process.env.EXPO_PUBLIC_WS_URL;
register(new URL('../../../../tests/ts-alias-loader.mjs', import.meta.url));
const { getConversations, getConversationMessages, deleteMessage } = await import('./messages.ts');
const { getNotifications } = await import('./notifications.ts');
const { mockChat } = await import('./mock-db.ts');
const { toMessageItem } = await import('./adapters.ts');

test('demo starts without URLs and supports send/revoke/delete without network requests', async () => {
  await import('./realtime/stomp.config.ts');
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Demo must not call the backend'); };
  try {
    mockChat.reset();
    assert.equal((await getConversations()).items.length, 3);
    const sent = mockChat.send({ conversationId: 1, content: 'Tin demo', messageType: 'text', mediaUrls: [], replyToMessageId: null }, 'Bạn');
    assert.equal(toMessageItem(sent, 's1').mine, true);
    assert.equal((await getConversationMessages(1)).messages.at(-1).content, 'Tin demo');
    await deleteMessage(sent.messageId, 'everyone');
    assert.equal((await getConversationMessages(1)).messages.at(-1).revoked, true);
    await deleteMessage(sent.messageId, 'me');
    assert.equal((await getConversationMessages(1)).messages.some(m => m.messageId === sent.messageId), false);
    assert.equal((await getNotifications()).unreadCount, 2);
  } finally { globalThis.fetch = previousFetch; }
});
