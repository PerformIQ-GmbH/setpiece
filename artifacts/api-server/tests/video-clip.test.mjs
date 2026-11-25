import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVideoUrl, normalizeMedia, libraryBases, MAX_CLIPS } from '../src/lib/videoClip.ts';

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
  assert.match(normalizeMedia([{ url: 'https://storage.googleapis.com/lib/a.mp4' }], []).error, /YouTube or Vimeo/, 'library links need a configured base');
  assert.match(normalizeMedia([{ url: `https://youtu.be/${ID}`, title: 'x'.repeat(121) }]).error, /title/);
  assert.match(normalizeMedia(Array(MAX_CLIPS + 1).fill({ url: `https://youtu.be/${ID}` })).error, /At most/);
  assert.match(normalizeMedia('x').error, /array/);
  assert.deepEqual(normalizeMedia([]).media, []);
});

test('own media library: only configured https bases, plain video paths, no traversal or query', () => {
  const base = 'https://storage.googleapis.com/setpiece-mediathek/';
  assert.deepEqual(libraryBases(` ${base}, http://insecure.example/, https://no-slash.example`), [base]);
  assert.deepEqual(libraryBases(undefined), []);
  assert.deepEqual(parseVideoUrl(`${base}clips/03-kurze-ecke-1a2b3c4d.mp4`, [base]), { provider: 'file', videoId: 'clips/03-kurze-ecke-1a2b3c4d.mp4' });
  for (const bad of [`${base}clips/a.mp4?x=1`, `${base}clips/a.mp4#t=3`, `${base}../other/a.mp4`, `${base}clips/a.exe`, `${base}clips//a.mp4`, `${base}.hidden.mp4`, 'https://storage.googleapis.com/other-bucket/a.mp4']) {
    assert.equal(parseVideoUrl(bad, [base]), null, bad);
  }
  const ok = normalizeMedia([{ url: `${base}clips/a.mp4`, startSec: 2, endSec: 9, provider: 'youtube', videoId: 'forged' }], [base]);
  assert.deepEqual(ok.media, [{ url: `${base}clips/a.mp4`, provider: 'file', videoId: 'clips/a.mp4', startSec: 2, endSec: 9, title: null }]);
});
