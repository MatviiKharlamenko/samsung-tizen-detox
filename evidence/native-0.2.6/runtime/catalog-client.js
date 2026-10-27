(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.CinemaCatalogClient = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  var BASE = 'https://api.poiskkino.dev/v1.5';
  var DAY = 86400000, LIMIT = 24, MAX_PAGE = 10;
  var FIELDS = ['id', 'name', 'alternativeName', 'enName', 'year', 'type', 'isSeries',
    'description', 'shortDescription', 'genres', 'rating', 'votes', 'premiere', 'poster', 'backdrop'];
  var IMAGE_HOSTS = ['st.kp.yandex.net', 'avatars.mds.yandex.net', 'image.tmdb.org',
    'cdnrrviubnyuntopbez5.svc.cdn.yandex.net'];
  var ERROR_CODES = ['MissingKey', 'RejectedKey', 'RateLimited', 'Unavailable', 'Abort'];

  function error(code) {
    var result = new Error(code);
    result.name = code; result.code = code;
    return result;
  }
  function text(value, maximum) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum) : '';
  }
  function integer(value, minimum, maximum) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
  }
  function id(value) {
    if (typeof value !== 'string' && !integer(value, 1, 999999999999)) return null;
    return /^[1-9]\d{0,11}$/.test(String(value)) ? String(value) : null;
  }
  function image(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
      var url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || IMAGE_HOSTS.indexOf(url.hostname) < 0) return null;
      // The approved public CDNs use path-based image URLs; discard tracking/query fragments.
      return url.origin + url.pathname;
    } catch (_) { return null; }
  }
  function iso(value) {
    if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?$/.test(value)) return null;
    var parts = value.slice(0, 10).split('-').map(Number), date = new Date(value);
    var calendar = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (!Number.isFinite(date.getTime()) || calendar.getUTCFullYear() !== parts[0] || calendar.getUTCMonth() + 1 !== parts[1] || calendar.getUTCDate() !== parts[2]) return null;
    return date.toISOString();
  }
  function genreNames(values) {
    var result = [], seen = Object.create(null);
    if (!Array.isArray(values)) return result;
    values.slice(0, 100).forEach(function (item) {
      var name = text(typeof item === 'string' ? item : item && item.name, 64), key = name.toLowerCase();
      if (name && !seen[key]) { seen[key] = true; result.push(name); }
    });
    return result;
  }
  function film(value) {
    if (!value || typeof value !== 'object') return null;
    var filmId = id(value.id), title = text(value.name, 300) || text(value.alternativeName, 300) || text(value.enName, 300);
    if (!filmId || !title) return null;
    var knownTypes = ['movie', 'cartoon', 'anime', 'tv-series', 'animated-series'];
    if (typeof value.isSeries !== 'boolean' && knownTypes.indexOf(value.type) < 0) return null;
    var series = typeof value.isSeries === 'boolean' ? value.isSeries : ['tv-series', 'animated-series'].indexOf(value.type) >= 0;
    var year = /^(?:1|2)\d{3}$/.test(String(value.year)) ? String(value.year) : '';
    var premiere = value.premiere || {}, rating = (value.rating || {}).kp, votes = (value.votes || {}).kp;
    var poster = value.poster || {}, backdrop = value.backdrop || {};
    return {
      id: filmId, kind: series ? 'series' : 'film', title: title,
      englishTitle: text(value.enName, 300) || text(value.alternativeName, 300), year: year,
      description: text(value.shortDescription, 500) || text(value.description, 500),
      genres: genreNames(value.genres).slice(0, 12),
      ratingKp: typeof rating === 'number' && Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : null,
      votesKp: integer(votes, 0, Number.MAX_SAFE_INTEGER) ? votes : null,
      premiereDate: iso(premiere.digital) || iso(premiere.world) || iso(premiere.russia) || iso(premiere.cinema),
      posterUrl: image(poster.previewUrl) || image(poster.url),
      backdropUrl: image(backdrop.previewUrl) || image(backdrop.url)
    };
  }
  function cachedFilm(value) {
    if (!value || typeof value !== 'object' || ['film', 'series'].indexOf(value.kind) < 0) return null;
    return film({id: value.id, name: value.title, enName: value.englishTitle, year: value.year,
      isSeries: value.kind === 'series', description: value.description, genres: value.genres,
      rating: {kp: value.ratingKp}, votes: {kp: value.votesKp},
      premiere: {digital: value.premiereDate}, poster: {url: value.posterUrl}, backdrop: {url: value.backdropUrl}});
  }
  function films(values, cached) {
    if (!Array.isArray(values)) throw error('Unavailable');
    var seen = Object.create(null), result = [];
    values.slice(0, 250).forEach(function (value) {
      var item = cached ? cachedFilm(value) : film(value);
      if (item && !seen[item.id] && result.length < LIMIT) { seen[item.id] = true; result.push(item); }
    });
    return result;
  }
  function discoveryFilms(values, section, genre, date) {
    if (!Array.isArray(values)) throw error('Unavailable');
    return films(values.slice(0, 250).filter(function (raw) {
      var item = film(raw);
      if (!item) return false;
      if (genre && !item.genres.some(function (value) { return value.toLowerCase() === genre.toLowerCase(); })) return false;
      if (section !== 'top') {
        var digital = iso((raw.premiere || {}).digital), stamp = digital === null ? NaN : Date.parse(digital);
        if (!(stamp >= date.start && stamp < date.end)) return false;
      }
      if (section !== 'new' && !(item.ratingKp !== null && item.ratingKp >= 7 && item.votesKp !== null &&
          item.votesKp >= (section === 'top' ? 10000 : 1000))) return false;
      return true;
    })).sort(function (left, right) {
      if (section === 'new') return Date.parse(right.premiereDate) - Date.parse(left.premiereDate);
      return right.ratingKp - left.ratingKp || right.votesKp - left.votesKp;
    });
  }
  function cursor(value) {
    return typeof value === 'string' && /^[A-Za-z0-9+/_=-]{1,2048}$/.test(value) ? value : null;
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function pageNumber(value) {
    var page = value === undefined ? 1 : value;
    if (!integer(page, 1, MAX_PAGE)) throw error('Unavailable');
    return page;
  }
  function scope(signal) {
    if (signal && signal.aborted) throw error('Abort');
    var controller = new AbortController(), callerAborted = false, timedOut = false, rejectGuard;
    var guard = new Promise(function (_, reject) { rejectGuard = reject; });
    function cancel() { callerAborted = true; controller.abort(); rejectGuard(error('Abort')); }
    var timer = setTimeout(function () { timedOut = true; controller.abort(); rejectGuard(error('Unavailable')); }, 12000);
    if (signal) signal.addEventListener('abort', cancel, {once: true});
    return {
      signal: controller.signal,
      wait: function (promise) { return Promise.race([promise, guard]); },
      check: function () { if (controller.signal.aborted) throw error(callerAborted ? 'Abort' : 'Unavailable'); },
      code: function (failure) {
        if (callerAborted || (signal && signal.aborted)) return 'Abort';
        if (timedOut) return 'Unavailable';
        return failure && ERROR_CODES.indexOf(failure.code) >= 0 ? failure.code : 'Unavailable';
      },
      close: function () { clearTimeout(timer); if (signal) signal.removeEventListener('abort', cancel); }
    };
  }

  function create(options) {
    options = options || {};
    var fetcher = options.fetch || (root.fetch && root.fetch.bind(root));
    var getApiKey = typeof options.getApiKey === 'function' ? options.getApiKey : function () { return ''; };
    var storage = options.cache, memory = Object.create(null), order = [];
    function now() {
      var stamp = Number(typeof options.now === 'function' ? options.now() : Date.now());
      if (!Number.isFinite(stamp)) throw error('Unavailable');
      return stamp;
    }
    function remember(key, record) {
      order = order.filter(function (value) { return value !== key; }); order.push(key);
      memory[key] = record;
      while (order.length > 16) delete memory[order.shift()];
    }
    function validateRecord(record, kind, expectedPage) {
      try {
        if (typeof record === 'string') record = JSON.parse(record);
        if (!record || record.version !== 1 || record.kind !== kind || !Number.isFinite(record.savedAt) || record.savedAt > now() + 60000) return null;
        var value;
        if (kind === 'film') value = record.value === null ? null : cachedFilm(record.value);
        else if (kind === 'genres') {
          if (!Array.isArray(record.value)) return null;
          value = genreNames(record.value);
        } else {
          var data = record.value;
          if (!data || data.page !== expectedPage || typeof data.hasNext !== 'boolean') return null;
          value = {films: films(data.films, true), page: expectedPage,
            pages: integer(data.pages, 0, MAX_PAGE) ? data.pages : null,
            total: integer(data.total, 0, Number.MAX_SAFE_INTEGER) ? data.total : null,
            hasNext: data.hasNext};
        }
        if (kind === 'film' && record.value !== null && value === null) return null;
        return {version: 1, kind: kind, savedAt: record.savedAt, value: value, nextCursor: cursor(record.nextCursor)};
      } catch (_) { return null; }
    }
    async function read(key, kind, page) {
      var record = validateRecord(memory[key], kind, page);
      if (record) return record;
      try { record = storage && typeof storage.get === 'function' ? await storage.get(key) : null; }
      catch (_) { return null; }
      record = validateRecord(record, kind, page);
      if (record) remember(key, record);
      return record;
    }
    function write(key, record) {
      remember(key, copy(record));
      try {
        if (storage && typeof storage.set === 'function') {
          var pending = storage.set(key, copy(record));
          if (pending && typeof pending.catch === 'function') pending.catch(function () {});
        }
      } catch (_) { /* Cache writes are optional; never replace a successful catalog response. */ }
    }
    function result(record, stale) {
      if (record.kind === 'genres') return {genres: copy(record.value), stale: stale, source: 'poiskkino'};
      if (record.kind === 'film') return record.value === null ? null : Object.assign(copy(record.value), {stale: stale, source: 'poiskkino'});
      return Object.assign(copy(record.value), {stale: stale, source: 'poiskkino',
        nextPageKnown: record.value.hasNext && record.value.page < MAX_PAGE &&
          (record.kind === 'search' || Boolean(record.nextCursor))});
    }
    async function run(key, kind, ttl, page, build, parse, signal) {
      var active = scope(signal), old = null;
      try {
        old = await active.wait(read(key, kind, page));
        active.check();
        if (old && now() - old.savedAt < ttl) return result(old, false);
        var apiKey = await active.wait(Promise.resolve().then(getApiKey));
        active.check();
        apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
        if (!/^[\x21-\x7e]{1,512}$/.test(apiKey)) {
          if (old) return result(old, true);
          throw error('MissingKey');
        }
        if (typeof fetcher !== 'function') throw error('Unavailable');
        var request = await active.wait(Promise.resolve().then(function () { return build(active); }));
        active.check();
        var url = BASE + request.path + (request.query ? '?' + request.query.toString() : '');
        var response = await active.wait(Promise.resolve().then(function () {
          return fetcher(url, {method: 'GET', headers: {'Accept': 'application/json', 'X-API-KEY': apiKey},
            credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: active.signal});
        }));
        active.check();
        if (!response || response.redirected) throw error('Unavailable');
        if (response.status === 401) throw error('RejectedKey');
        if ([402, 403, 429].indexOf(response.status) >= 0) throw error('RateLimited');
        var parsed;
        if (response.status === 404 && kind === 'film') parsed = {value: null, nextCursor: null};
        else {
          if (!response.ok) throw error('Unavailable');
          var payload = await active.wait(Promise.resolve().then(function () { return response.json(); }));
          active.check();
          parsed = parse(payload);
        }
        var record = {version: 1, kind: kind, savedAt: now(), value: parsed.value, nextCursor: cursor(parsed.nextCursor)};
        write(key, record);
        return result(record, false);
      } catch (failure) {
        var code = active.code(failure);
        if (code !== 'Abort' && old) return result(old, true);
        throw error(code);
      } finally { active.close(); }
    }
    function cacheKey(value) { return 'father-cinema:catalog:v1:' + value; }
    function dates() {
      var end = new Date(now()), start = new Date(end.getTime());
      start.setUTCFullYear(end.getUTCFullYear() - 1);
      if (start.getUTCMonth() !== end.getUTCMonth()) start.setUTCDate(0);
      function display(date) { return String(date.getUTCDate()).padStart(2, '0') + '.' + String(date.getUTCMonth() + 1).padStart(2, '0') + '.' + date.getUTCFullYear(); }
      return {day: end.toISOString().slice(0, 10), range: display(start) + '-' + display(end),
        start: Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
        end: Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1)};
    }
    function discoverKey(section, genre, day, page) {
      return cacheKey('discover:' + section + ':' + encodeURIComponent(genre) + ':' + day + ':' + page);
    }
    return {
      async search(query, page, signal) {
        if (signal && signal.aborted) throw error('Abort');
        page = pageNumber(page);
        if (typeof query !== 'string' || query.length > 200) throw error('Unavailable');
        query = text(query, 200);
        if (!query) return {films: [], page: page, pages: 0, total: 0, stale: false, source: 'poiskkino', hasNext: false, nextPageKnown: false};
        var params = new URLSearchParams({query: query, page: String(page), limit: String(LIMIT)});
        return run(cacheKey('search:' + encodeURIComponent(query) + ':' + page), 'search', DAY, page,
          function () { return {path: '/movie/search', query: params}; }, function (payload) {
            if (!payload || !Array.isArray(payload.docs) || payload.page !== page) throw error('Unavailable');
            var pages = integer(payload.pages, 0, Number.MAX_SAFE_INTEGER) ? payload.pages : null;
            return {value: {films: films(payload.docs), page: page, pages: pages === null ? null : Math.min(MAX_PAGE, pages),
              total: integer(payload.total, 0, Number.MAX_SAFE_INTEGER) ? payload.total : null,
              hasNext: pages !== null && pages > page}, nextCursor: null};
          }, signal);
      },
      async discover(settings, signal) {
        if (signal && signal.aborted) throw error('Abort');
        settings = settings || {};
        var section = settings.section || 'new', page = pageNumber(settings.page), genre = settings.genre || '';
        if (['new', 'best-new', 'top'].indexOf(section) < 0 || typeof genre !== 'string' || genre.length > 64) throw error('Unavailable');
        genre = genre.trim();
        if (genre && !/^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 -]{0,63}$/.test(genre)) throw error('Unavailable');
        var date = dates(), day = section === 'top' ? 'all' : date.day;
        return run(discoverKey(section, genre, day, page), 'discover', DAY, page, async function (active) {
          var params = new URLSearchParams({limit: String(LIMIT), withCount: 'false'});
          FIELDS.forEach(function (field) { params.append('selectFields', field); });
          if (genre) params.append('genres.name', genre);
          if (section !== 'top') params.append('premiere.digital', date.range);
          if (section !== 'new') {
            params.append('rating.kp', '7-10');
            params.append('votes.kp', (section === 'top' ? '10000' : '1000') + '-1000000000');
          }
          params.append('sortField', section === 'new' ? 'premiere.digital' : 'rating.kp'); params.append('sortType', '-1');
          if (page > 1) {
            var previous = await active.wait(read(discoverKey(section, genre, day, page - 1), 'discover', page - 1));
            if (!previous || now() - previous.savedAt >= DAY || !previous.value.hasNext || !previous.nextCursor) throw error('Unavailable');
            params.append('next', previous.nextCursor);
          }
          return {path: '/movie', query: params};
        }, function (payload) {
          if (!payload || typeof payload.hasNext !== 'boolean') throw error('Unavailable');
          return {value: {films: discoveryFilms(payload.docs, section, genre, date), page: page, pages: payload.hasNext ? null : page,
            total: integer(payload.total, 0, Number.MAX_SAFE_INTEGER) ? payload.total : null, hasNext: payload.hasNext},
            nextCursor: cursor(payload.next)};
        }, signal);
      },
      async byId(value, signal) {
        if (signal && signal.aborted) throw error('Abort');
        var filmId = id(value);
        if (!filmId) return null;
        return run(cacheKey('film:' + filmId), 'film', DAY, null,
          function () { return {path: '/movie/' + filmId}; }, function (payload) {
            var item = film(payload);
            if (!item || item.id !== filmId) throw error('Unavailable');
            return {value: item, nextCursor: null};
          }, signal);
      },
      async genres(signal) {
        return run(cacheKey('genres'), 'genres', 7 * DAY, null,
          function () { return {path: '/dictionary/genres'}; }, function (payload) {
            if (!payload || !Array.isArray(payload.items)) throw error('Unavailable');
            return {value: genreNames(payload.items), nextCursor: null};
          }, signal);
      }
    };
  }
  return {create: create};
}));
