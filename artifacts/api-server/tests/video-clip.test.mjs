import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVideoUrl, normalizeMedia, MAX_CLIPS } from '../src/lib/videoClip.ts';

const ID = 'dQw4w9WgXcQ';

test('YouTube and Vimeo link forms resolve to provider and id', () => {
  for (const url of [`https://www.youtube.com/watch?v=${ID}`, `https://youtu.be/${ID}`, `https://m.youtube.com/watch?v=${ID}&t=42s`, `https://www.youtube.com/shorts/${ID}`, `https://www.youtube-nocookie.com/embed/${ID}`]) {
    assert.equal(parseVideoUrl(url)?.videoId, ID, url);
  }
  assert.equal(parseVideoUrl(`https://youtu.be/${ID}?t=42`).t, 42);
  assert.deepEqual(parseVideoUrl('https://vimeo.com/123456'), { provider: 'vimeo', videoId: '123456' });
  assert.deepEqual(parseVideoUrl('https://vimeo.com/123456/abcdef12'), { provider: 'vimeo', videoId: '123456', hash: 'abcdef12' });
  assert.deepEqual(parseVideoUrl('https://player.vimeo.com/video/123456?h=abcdef12'), { provider: 'vimeo', videoId: '123456', hash: 'abcdef12' });
});

test('other hosts, http and malformed ids are rejected', () => {
  for (const url of [`http://youtu.be/${ID}`, `https://evil.example/watch?v=${ID}`, `https://youtube.com.evil.example/watch?v=${ID}`, 'https://youtu.be/short', 'https://vimeo.com/channels/staff', 'javascript:alert(1)', 'not a url']) {
    assert.equal(parseVideoUrl(url), null, url);
  }
});

test('normalizeMedia derives ids server-side and validates times, title and count', () => {
  const ok = normalizeMedia([{ url: `https://youtu.be/${ID}?t=42`, endSec: 55, title: ' Referenz ', provider: 'vimeo', videoId: 'forged' }]);
  assert.deepEqual(ok.media, [{ url: `https://youtu.be/${ID}?t=42`, provider: 'youtube', videoId: ID, startSec: 42, endSec: 55, title: 'Referenz' }]);
  assert.equal(normalizeMedia([{ url: `https://youtu.be/${ID}`, startSec: 10 }]).media[0].endSec, null);
  assert.match(normalizeMedia([{ url: `https://youtu.be/${ID}`, startSec: 10, endSec: 10 }]).error, /after start/);
  assert.match(normalizeMedia([{ url: `https://youtu.be/${ID}`, startSec: -1 }]).error, /time/);
  assert.match(normalizeMedia([{ url: `https://youtu.be/${ID}`, startSec: 1.5 }]).error, /time/);
  assert.match(normalizeMedia([{ url: 'https://example.com/v.mp4' }]).error, /YouTube or Vimeo/);
  assert.match(normalizeMedia([{ url: `https://youtu.be/${ID}`, title: 'x'.repeat(121) }]).error, /title/);
  assert.match(normalizeMedia(Array(MAX_CLIPS + 1).fill({ url: `https://youtu.be/${ID}` })).error, /At most/);
  assert.match(normalizeMedia('x').error, /array/);
  assert.deepEqual(normalizeMedia([]).media, []);
});
