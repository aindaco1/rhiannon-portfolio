import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateMp4, MAX_VIDEO_BYTES, validateCatalog, videoReferences, mediaReferences, renderBlocks } from '../lib/content.mjs';
import { videoResponse } from '../lib/video-response.mjs';
import { handleApi } from '../worker/api.mjs';
const bytes = await readFile(new URL('./fixtures/loop.mp4', import.meta.url));
const seed = JSON.parse(await readFile(new URL('./fixtures/catalog.json', import.meta.url)));
const path = `/assets/videos/${'a'.repeat(64)}.mp4`;
test('MP4 uploads validate bounded complete containers and use immutable paths', async () => {
  assert.doesNotThrow(() => validateMp4(bytes));
  for (const bad of [Buffer.from('<script>bad</script>'), bytes.subarray(0, bytes.length - 1), Buffer.alloc(0)])
    assert.throws(() => validateMp4(bad));
  assert.throws(() => validateMp4(Buffer.alloc(MAX_VIDEO_BYTES + 1)), /25 MB/);
  const writes = [];
  const upload = (body, headers = {}) => handleApi(new Request('https://editor.example/api/videos', {
    method: 'POST', headers: { origin: 'https://editor.example', ...headers }, body,
  }), { upload: async (path, body) => writes.push({ path, body }) });
  const first = await upload(bytes), second = await upload(bytes);
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), await second.json());
  assert.match(writes[0].path, /^\/assets\/videos\/[a-f0-9]{64}\.mp4$/);
  assert.deepEqual(Buffer.from(writes[0].body), bytes);
  assert.equal((await upload('invalid')).status, 400);
  assert.equal((await upload(bytes, { origin: 'https://elsewhere.example' })).status, 403);
  assert.equal((await upload('x', { 'content-length': String(MAX_VIDEO_BYTES + 1) })).status, 413);
  assert.equal(writes.length, 2);
});
test('local video paths, publication references and native player stay constrained', () => {
  const d = structuredClone(seed);
  d.entries[0].blocks = [{ type: 'video', provider: 'local', src: path, caption: 'Dream loop', poster: '/assets/media/poster.webp' }];
  const valid = validateCatalog(d);
  assert.deepEqual(videoReferences(valid, true), [path]);
  assert(!mediaReferences(valid).includes(path));
  assert(mediaReferences(valid).includes('/assets/media/poster.webp'));
  const html = renderBlocks(valid.entries[0].blocks);
  assert.match(html, /controls playsinline loop preload="none"/);
  assert(!html.includes('autoplay'));
  assert.match(html, /poster="\/assets\/media\/poster.webp"/);
  d.entries[0].status = 'draft';
  assert.deepEqual(videoReferences(validateCatalog(d), true), []);
  d.profile.bio = d.entries[0].blocks;
  assert.deepEqual(videoReferences(validateCatalog(d), true), [path]);
  for (const src of ['https://example.com/movie.mp4', '/assets/videos/../../private.mp4', '/assets/media/image.webp']) {
    d.entries[0].blocks[0].src = src;
    assert.throws(() => validateCatalog(d), /uploaded MP4/);
  }
});
test('MP4 delivery supports byte ranges and HEAD without sending extra bytes', async () => {
  const req = (range, method = 'GET') => new Request('https://editor.example' + path, { method, headers: range ? { range } : {} });
  for (const [range, start, end] of [['bytes=10-19', 10, 20], ['bytes=-10', bytes.length-10, bytes.length], ['bytes=20-', 20, bytes.length]]) {
    const r = videoResponse(bytes, req(range));
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), `bytes ${start}-${end-1}/${bytes.length}`);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), bytes.subarray(start, end));
  }
  for (const range of ['bytes=99-1', 'bytes=99999999-', 'bytes=-0', 'bytes=0-1,4-5', 'junk'])
    assert.equal(videoResponse(bytes, req(range)).status, 416);
  const head = videoResponse(bytes, req(null, 'HEAD'));
  assert.equal(head.headers.get('content-length'), String(bytes.length));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.deepEqual(Buffer.from(await videoResponse(bytes, req()).arrayBuffer()), bytes);
});
