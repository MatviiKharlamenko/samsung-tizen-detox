const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, './catalog-client.js');
const KEY = 'TEST-ONLY-CATALOG-KEY';
const TODAY = Date.UTC(2026, 9, 26, 12);
const DAY = 86400000;
const film = {
  id: 258687, name: '  Интерстеллар  ', enName: 'Interstellar', alternativeName: 'Interstellar',
  type: 'movie', isSeries: false, year: 2014, description: 'Описание', genres: [{name: 'драма'}],
  rating: {kp: 8.7}, votes: {kp: 1000000}, premiere: {digital: '2015-03-30T00:00:00.000Z'},
  poster: {previewUrl: 'https://st.kp.yandex.net/images/example.jpg'}, backdrop: null,
  apiKey: KEY, unneededPayload: {authorization: KEY}
};
function make(options = {}) {
  assert.ok(fs.existsSync(modulePath), 'optional catalog client has not been implemented');
  return require(modulePath).create({getApiKey: () => KEY, now: () => TODAY, ...options});
}
function response(value, status = 200) {
  return new Response(JSON.stringify(value), {status, headers: {'content-type': 'application/json'}});
}
function searchPayload(docs = [film]) { return {docs, page: 1, pages: 3, total: 49, limit: 24}; }
function cursorPayload(docs = [film], next = null) {
  return {docs, limit: 24, next, prev: null, hasNext: Boolean(next), hasPrev: false};
}
function memory() {
  const map = new Map();
  return {map, get: k => map.get(k), set: (k, v) => map.set(k, v)};
}

test('search emits a fixed authenticated endpoint and returns only normalized public film fields', async () => {
  let request;
  const cache = memory();
  const client = make({cache, getApiKey: async () => KEY, fetch: async (url, options) => {
    request = {url: new URL(url), options};
    return response(searchPayload());
  }});
  const result = await client.search('  Интерстеллар  ', 1);
  assert.equal(request.url.origin + request.url.pathname, 'https://api.poiskkino.dev/v1.5/movie/search');
  assert.equal(request.url.searchParams.get('query'), 'Интерстеллар');
  assert.equal(request.url.searchParams.get('page'), '1');
  assert.equal(request.options.headers['X-API-KEY'], KEY);
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.url.href.includes(KEY), false);
  assert.deepEqual(result.films[0], {
    id: '258687', kind: 'film', title: 'Интерстеллар', englishTitle: 'Interstellar', year: '2014',
    description: 'Описание', genres: ['драма'], ratingKp: 8.7, votesKp: 1000000,
    premiereDate: '2015-03-30T00:00:00.000Z',
    posterUrl: 'https://st.kp.yandex.net/images/example.jpg', backdropUrl: null
  });
  assert.equal(result.stale, false);
  assert.equal(result.source, 'poiskkino');
  assert.equal(result.hasNext, true);
  assert.equal(result.nextPageKnown, true);
  assert.equal(JSON.stringify([...cache.map]).includes(KEY), false);
});

test('malformed metadata cannot create IDs, ratings, image origins, or oversized card text', async () => {
  const bad = {...film, id: 123, description: 'x'.repeat(900), year: '2026junk',
    genres: Array.from({length: 20}, (_, i) => ({name: 'Жанр ' + i})),
    rating: {kp: 99}, votes: {kp: 3.5}, premiere: {digital: '2026-02-30'},
    poster: {url: 'https://st.kp.yandex.net.evil.invalid/image.jpg'},
    backdrop: {url: 'https://user:password@image.tmdb.org/image.jpg'}};
  const result = await make({fetch: async () => response(searchPayload([
    bad, {...film, id: '1e3'}, {...film, id: 0}, {...film, id: 123}, {...film, id: 456, name: null, enName: null, alternativeName: null}
  ]))}).search('пример', 1);
  assert.equal(result.films.length, 1);
  assert.equal(result.films[0].id, '123');
  assert.equal(result.films[0].description.length, 500);
  assert.equal(result.films[0].genres.length, 12);
  assert.equal(result.films[0].year, '');
  assert.equal(result.films[0].ratingKp, null);
  assert.equal(result.films[0].votesKp, null);
  assert.equal(result.films[0].premiereDate, null);
  assert.equal(result.films[0].posterUrl, null);
  assert.equal(result.films[0].backdropUrl, null);
});

test('discovery uses documented digital dates and real rating/vote filters without inventing totals', async () => {
  const urls = [];
  const client = make({fetch: async url => {urls.push(new URL(url)); return response(cursorPayload([], 'NEXT_valid-1='));}});
  const result = await client.discover({section: 'best-new', genre: 'драма', page: 1});
  const q = urls[0].searchParams;
  assert.equal(urls[0].pathname, '/v1.5/movie');
  assert.equal(q.get('premiere.digital'), '26.10.2025-26.10.2026');
  assert.equal(q.get('rating.kp'), '7-10');
  assert.equal(q.get('votes.kp'), '1000-1000000000');
  assert.equal(q.get('genres.name'), 'драма');
  assert.equal(q.get('sortField'), 'rating.kp');
  assert.equal(q.get('sortType'), '-1');
  assert.equal(q.get('withCount'), 'false');
  assert.equal(q.has('page'), false);
  assert.ok(q.getAll('selectFields').includes('poster'));
  assert.equal(result.total, null);
  assert.equal(result.pages, null);
  assert.equal(result.hasNext, true);
  assert.equal(result.nextPageKnown, true);
});

test('numeric discovery pagination uses the observed cursor and never follows returned URLs', async () => {
  const cache = memory(), urls = [];
  const client = make({cache, fetch: async url => {
    urls.push(new URL(url));
    return response(cursorPayload([], urls.length === 1 ? 'OBSERVED_cursor=' : null));
  }});
  await client.discover({section: 'new', page: 1});
  const second = await client.discover({section: 'new', page: 2});
  assert.equal(urls[1].searchParams.get('next'), 'OBSERVED_cursor=');
  assert.equal(urls[1].searchParams.has('page'), false);
  assert.equal(second.pages, 2);
  assert.equal(second.nextPageKnown, false);
  await assert.rejects(client.discover({section: 'new', page: 4}), {code: 'Unavailable'});
  assert.equal(urls.length, 2);
  const unsafe = make({fetch: async () => response(cursorPayload([], 'https://evil.invalid/cursor'))});
  const first = await unsafe.discover({section: 'new'});
  assert.equal(first.hasNext, true);
  assert.equal(first.nextPageKnown, false);
  await assert.rejects(unsafe.discover({section: 'new', page: 2}), {code: 'Unavailable'});
});

test('missing keys permit cache reads but never anonymous requests, including expired last-good data', async () => {
  let calls = 0;
  const cache = memory();
  await make({cache, fetch: async () => {calls++; return response(searchPayload());}}).search('фильм', 1);
  const offline = make({cache, getApiKey: () => '', now: () => TODAY + 2 * DAY,
    fetch: async () => {calls++; throw new Error('anonymous request must not occur');}});
  const old = await offline.search('фильм', 1);
  assert.equal(old.stale, true);
  assert.equal(old.films[0].id, '258687');
  await assert.rejects(offline.search('другой фильм', 1), {code: 'MissingKey'});
  assert.equal(calls, 1);
});

test('network failure uses clearly marked last-good cache without retries', async () => {
  const cache = memory(); let calls = 0;
  await make({cache, fetch: async () => response(searchPayload())}).search('фильм', 1);
  const failed = make({cache, now: () => TODAY + 2 * DAY, fetch: async () => {calls++; throw new Error(KEY);}});
  const result = await failed.search('фильм', 1);
  assert.equal(result.stale, true);
  assert.equal(calls, 1);
});

test('HTTP and transport errors expose only static codes, never backend bodies or key values', async () => {
  for (const [status, code] of [[401, 'RejectedKey'], [403, 'RateLimited'], [429, 'RateLimited'], [500, 'Unavailable']]) {
    const client = make({fetch: async () => response({message: KEY}, status)});
    await assert.rejects(client.search('фильм', 1), error => {
      assert.equal(error.code, code); assert.equal(error.message, code);
      assert.equal(JSON.stringify(error).includes(KEY), false); return true;
    });
  }
  await assert.rejects(make({fetch: async () => {throw new Error(KEY);}}).search('фильм', 1), {message: 'Unavailable'});
  await assert.rejects(make({fetch: async () => new Response(KEY, {status: 200})}).search('фильм', 1), {code: 'Unavailable'});
});

test('caller abort wins over stale fallback and cancels a pending request', async () => {
  const controller = new AbortController(); let fetchSignal;
  const client = make({fetch: async (_url, options) => {
    fetchSignal = options.signal;
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error(KEY)), {once: true}));
  }});
  const pending = client.search('фильм', 1, controller.signal);
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, {code: 'Abort'});
  assert.equal(fetchSignal.aborted, true);
});

test('12-second timeout remains bounded even if a transport ignores abort', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const client = make({fetch: () => new Promise(() => {})});
  const pending = client.search('фильм', 1);
  const rejection = assert.rejects(pending, {code: 'Unavailable'});
  await Promise.resolve(); await Promise.resolve();
  t.mock.timers.tick(12000);
  await rejection;
});

test('byId validates IDs, handles 404, and genres returns a deduplicated wrapper with a seven-day cache', async () => {
  const paths = [], cache = memory(); let clock = TODAY;
  const client = make({cache, now: () => clock, fetch: async url => {
    paths.push(new URL(url).pathname);
    return url.includes('/dictionary/') ? response({type: 'genres', total: 4, items: [{name: 'комедия'}, {name: 'комедия'}, {name: 'драма'}, {name: ''}]}) : response({}, 404);
  }});
  assert.equal(await client.byId('https://invalid/1'), null);
  assert.equal(paths.length, 0);
  assert.equal(await client.byId('258687'), null);
  const genres = await client.genres();
  assert.deepEqual(genres, {genres:['комедия', 'драма'],stale:false,source:'poiskkino'});
  clock += 6 * DAY;
  assert.deepEqual((await client.genres()).genres, ['комедия', 'драма']);
  assert.deepEqual(paths, ['/v1.5/movie/258687', '/v1.5/dictionary/genres']);
});

test('discovery rejects future, missing-digital, low-vote and wrong-genre cards even if the provider returns them', async () => {
  const recent = {...film, id: 1, year: 2026, premiere: {digital: '2026-10-01'}, votes: {kp: 2000}};
  const payload = cursorPayload([
    recent,
    {...recent, id: 2, premiere: {digital: '2026-12-01'}},
    {...recent, id: 3, premiere: {world: '2026-10-01'}},
    {...recent, id: 4, votes: {kp: 20}},
    {...recent, id: 5, genres: [{name: 'комедия'}]},
    {...recent, id: 6, rating: {kp: null}}
  ]);
  const result = await make({fetch: async () => response(payload)}).discover({section: 'best-new', genre: 'драма'});
  assert.deepEqual(result.films.map(x => x.id), ['1']);
});

test('fresh cache is independent of caller mutation and cache write failures do not hide metadata', async () => {
  let calls = 0;
  const client = make({cache: {get: () => null, set: () => {throw new Error(KEY);}},
    fetch: async () => {calls++; return response(searchPayload());}});
  const first = await client.search('фильм', 1);
  first.films[0].title = 'Испорчено'; first.films[0].genres.push('лишнее');
  const second = await client.search('фильм', 1);
  assert.equal(second.films[0].title, 'Интерстеллар');
  assert.deepEqual(second.films[0].genres, ['драма']);
  assert.equal(calls, 1);
});

test('byId and genres expose ordinary stale status when the key is removed', async () => {
  const cache = memory();
  const online = make({cache, fetch: async url => response(url.includes('/dictionary/') ? {items:[{name:'драма'}]} : film)});
  await online.byId('258687'); await online.genres();
  const offline = make({cache, getApiKey: () => '', now: () => TODAY + 8 * DAY});
  const details = await offline.byId('258687'), genres = await offline.genres();
  assert.equal(details.stale, true); assert.equal(details.source, 'poiskkino');
  assert.deepEqual(genres, {genres:['драма'],stale:true,source:'poiskkino'});
});

test('pre-aborted callers never receive cached data or cause a request', async () => {
  let calls = 0;
  const client = make({fetch: async () => {calls++; return response(searchPayload());}});
  await client.search('фильм', 1);
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(client.search('фильм', 1, aborted.signal), {code:'Abort'});
  assert.equal(calls, 1);
});

test('leap-day discovery starts at the previous February end and top requires actual ratings and votes', async () => {
  const requests = [];
  const client = make({now: () => Date.UTC(2024, 1, 29, 12), fetch: async url => {
    requests.push(new URL(url)); return response(cursorPayload([]));
  }});
  await client.discover({section:'new'});
  await client.discover({section:'top'});
  assert.equal(requests[0].searchParams.get('premiere.digital'), '28.02.2023-29.02.2024');
  assert.equal(requests[1].searchParams.has('premiere.digital'), false);
  assert.equal(requests[1].searchParams.get('rating.kp'), '7-10');
  assert.equal(requests[1].searchParams.get('votes.kp'), '10000-1000000000');
  await assert.rejects(client.discover({section:'top',page:11}), {code:'Unavailable'});
  assert.equal(requests.length, 2);
});

test('best-new ranking uses the actual rating and vote count rather than response order', async () => {
  const recent = {...film, premiere:{digital:'2026-10-01'}, votes:{kp:2000}};
  const client = make({fetch: async () => response(cursorPayload([
    {...recent,id:1,rating:{kp:7.1}},
    {...recent,id:2,rating:{kp:8.5},votes:{kp:1500}},
    {...recent,id:3,rating:{kp:8.5},votes:{kp:9000}}
  ]))});
  assert.deepEqual((await client.discover({section:'best-new'})).films.map(x=>x.id), ['3','2','1']);
});

test('an abort at the cache microtask boundary wins over a ready cached response', async () => {
  const client = make({fetch: async () => response(searchPayload())});
  await client.search('фильм', 1);
  const controller = new AbortController();
  const pending = client.search('фильм', 1, controller.signal);
  controller.abort();
  await assert.rejects(pending, {code:'Abort'});
});
