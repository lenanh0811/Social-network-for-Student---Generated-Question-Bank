import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readLocalEnv(key) {
  try {
    const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = envFile.match(new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.*?)\\s*$`, 'm'));
    return match?.[1]?.replace(/^["']|["']$/g, '') ?? '';
  } catch {
    return '';
  }
}

const configuredUrl = process.env.SOCIAL_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? readLocalEnv('EXPO_PUBLIC_API_URL');
const baseUrl = configuredUrl.replace(/\/+$/, '');
const apiUrl = baseUrl && (baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`);
const token = process.env.SOCIAL_API_TOKEN ?? readLocalEnv('SOCIAL_API_TOKEN');
const otherUserToken = process.env.SOCIAL_OTHER_USER_TOKEN ?? readLocalEnv('SOCIAL_OTHER_USER_TOKEN');
const subjectId = process.env.SOCIAL_SUBJECT_ID;

test(
  'API connection and OpenAPI routes',
  { skip: !apiUrl && 'Set EXPO_PUBLIC_API_URL or SOCIAL_API_URL to check API connectivity.' },
  async () => {
    const response = await fetch(`${apiUrl}/docs/openapi.json`);
    assert.equal(response.status, 200, `OpenAPI returned HTTP ${response.status}`);
    const spec = await response.json();
    const paths = spec.paths ?? {};
    for (const path of ['/posts', '/comments', '/react', '/activity-feeds', '/medias/upload']) {
      assert.ok(paths[path], `OpenAPI does not declare ${path}`);
    }
  },
);

async function request(path, { accessToken, ...init } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(accessToken ?? token ? { Authorization: `Bearer ${accessToken ?? token}` } : {}),
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  });
  const text = response.status === 204 ? '' : await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  const code = body && typeof body === 'object' && 'code' in body ? String(body.code) : undefined;
  const success = response.ok && (code === undefined || code === '0000' || code === '1000' || code === 'SUCCESS');
  return { response, body, code, success };
}

function dataOf(result) {
  return result.body && typeof result.body === 'object' ? result.body.data ?? result.body : {};
}

function assertSuccess(result) {
  assert.ok(result.success, `Expected success, received HTTP ${result.response.status}, code ${result.code ?? 'none'}`);
}

function assertFailure(result) {
  assert.equal(result.success, false, `Expected failure, received HTTP ${result.response.status}, code ${result.code ?? 'none'}`);
}

function wordPayload(count) {
  return Array.from({ length: count }, (_, index) => `word${index}`).join(' ');
}

async function resolveSubjectId() {
  if (subjectId && /^\d+$/.test(subjectId) && Number.isSafeInteger(Number(subjectId)) && Number(subjectId) > 0) {
    return Number(subjectId);
  }
  const response = await request('/subjects');
  assertSuccess(response);
  const data = dataOf(response);
  const subjects = Array.isArray(data) ? data : data.items ?? data.contents ?? [];
  const firstId = subjects.find((subject) => Number.isSafeInteger(Number(subject.subject_id ?? subject.id)) && Number(subject.subject_id ?? subject.id) > 0);
  assert.ok(firstId, 'GET /subjects did not return a valid subject_id');
  return Number(firstId.subject_id ?? firstId.id);
}

const postBody = (content, validSubjectId) => ({
  content,
  media_urls: [],
  visibility: 'PUBLIC',
  subject_id: validSubjectId,
  post_type: 'SOCIAL_POST',
});

test(
  'Social Network Core API contract',
  {
    skip:
      !apiUrl
        ? 'Set SOCIAL_API_URL or EXPO_PUBLIC_API_URL to run API integration tests.'
        : !token
          ? 'Set SOCIAL_API_TOKEN to a temporary authenticated test token. Subject ID is discovered from GET /subjects.'
          : false,
  },
  async (t) => {
    const validSubjectId = await resolveSubjectId();
    const unique = `api-contract-${randomUUID()}`;
    const created = await request('/posts', {
      method: 'POST',
      body: JSON.stringify(postBody(unique, validSubjectId)),
    });
    assertSuccess(created);
    let postId = dataOf(created).post_id;
    assert.ok(postId, 'POST /posts response data must include post_id');
    let commentId;

    t.after(async () => {
      if (commentId) await request(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
      if (postId) await request(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
    });

    await t.test('reads and edits an owned post', async () => {
      const read = await request(`/posts/${encodeURIComponent(postId)}`);
      assertSuccess(read);
      assert.equal(dataOf(read).post_id, postId);
      const update = await request(`/posts/${encodeURIComponent(postId)}`, {
        method: 'PUT',
        body: JSON.stringify({ content: `${unique}-edited` }),
      });
      assertSuccess(update);
    });

    await t.test('rejects empty and over-500-word posts', async () => {
      const empty = await request('/posts', {
        method: 'POST',
        body: JSON.stringify(postBody('   ', validSubjectId)),
      });
      assertFailure(empty);

      const tooLong = await request('/posts', {
        method: 'POST',
        body: JSON.stringify(postBody(wordPayload(501), validSubjectId)),
      });
      assertFailure(tooLong);
    });

    await t.test('prevents a different user from editing or deleting a post', async (context) => {
      if (!otherUserToken) {
        context.skip('Set SOCIAL_OTHER_USER_TOKEN to exercise ownership authorization.');
        return;
      }
      const edit = await request(`/posts/${encodeURIComponent(postId)}`, {
        accessToken: otherUserToken,
        method: 'PUT',
        body: JSON.stringify({ content: 'unauthorized edit' }),
      });
      assertFailure(edit);

      const deletion = await request(`/posts/${encodeURIComponent(postId)}`, {
        accessToken: otherUserToken,
        method: 'DELETE',
      });
      assertFailure(deletion);
    });

    await t.test('creates, lists, edits, and deletes comments', async () => {
      const empty = await request('/comments', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'POST', target_id: postId, content: '   ' }),
      });
      assertFailure(empty);

      const tooLong = await request('/comments', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'POST', target_id: postId, content: wordPayload(501) }),
      });
      assertFailure(tooLong);

      const createdComment = await request('/comments', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'POST', target_id: postId, content: unique }),
      });
      assertSuccess(createdComment);
      commentId = dataOf(createdComment).comment_id;
      assert.ok(commentId, 'POST /comments response data must include comment_id');

      const list = await request(`/comments?target_type=POST&target_id=${encodeURIComponent(postId)}&limit=20`);
      assertSuccess(list);
      assert.ok(dataOf(list).items.some((item) => item.comment_id === commentId));

      const update = await request(`/comments/${encodeURIComponent(commentId)}`, {
        method: 'PUT',
        body: JSON.stringify({ content: `${unique}-edited` }),
      });
      assertSuccess(update);
      const deletion = await request(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
      assertSuccess(deletion);
      commentId = undefined;
    });

    await t.test('checks LIKE and repeated reaction behavior', async () => {
      const first = await request('/react', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'POST', target_id: postId, reaction_type: 'LIKE' }),
      });
      assertSuccess(first);
      const afterFirst = await request(`/posts/${encodeURIComponent(postId)}`);
      assertSuccess(afterFirst);
      assert.equal(dataOf(afterFirst).reacted_by_me, true);

      const second = await request('/react', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'POST', target_id: postId, reaction_type: 'LIKE' }),
      });
      assert.ok(
        second.success || second.code === '1010',
        `Unexpected repeated reaction result: HTTP ${second.response.status}, code ${second.code ?? 'none'}`,
      );
      const afterSecond = await request(`/posts/${encodeURIComponent(postId)}`);
      assertSuccess(afterSecond);
      const currentCount = Number(dataOf(afterSecond).react_count);
      const firstCount = Number(dataOf(afterFirst).react_count);
      assert.ok(
        currentCount === firstCount || currentCount === firstCount - 1,
        'Repeated LIKE must not increase the count; it may be idempotent or toggle off.',
      );
    });

    await t.test('rejects invalid media and reports upload validation errors', async () => {
      const invalidForm = new FormData();
      invalidForm.append('file', new Blob(['not a media file'], { type: 'text/plain' }), 'invalid.txt');
      invalidForm.append('purpose', 'POST');
      assertFailure(await request('/medias/upload', { method: 'POST', body: invalidForm }));

      const oversizedForm = new FormData();
      oversizedForm.append(
        'file',
        new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: 'image/png' }),
        'oversized.png',
      );
      oversizedForm.append('purpose', 'POST');
      assertFailure(await request('/medias/upload', { method: 'POST', body: oversizedForm }));

      const animatedForm = new FormData();
      animatedForm.append('file', new Blob(['GIF89a'], { type: 'image/gif' }), 'animated.gif');
      animatedForm.append('purpose', 'POST');
      assertFailure(await request('/medias/upload', { method: 'POST', body: animatedForm }));

      const missingFileForm = new FormData();
      missingFileForm.append('purpose', 'POST');
      const missingFile = await request('/medias/upload', { method: 'POST', body: missingFileForm });
      assertFailure(missingFile);
    });
  },
);
