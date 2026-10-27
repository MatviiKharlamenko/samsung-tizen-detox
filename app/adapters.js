(function () {
  'use strict';
  var C = window.CinemaCore;
  var WD = 'https://www.wikidata.org/w/api.php';
  async function json(url, signal) {
    var controller = new AbortController();
    var aborted = function () { controller.abort(); };
    if (signal) { if (signal.aborted) controller.abort(); else signal.addEventListener('abort', aborted, {once:true}); }
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(url, {signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      if (!response.ok) throw new Error('Сервис ответил HTTP ' + response.status);
      var data = await response.json();
      if (data && data.error) throw new Error('Сервис поиска временно недоступен');
      return data;
    } finally { clearTimeout(timer); if (signal) signal.removeEventListener('abort', aborted); }
  }
  function wdUrl(params) {
    var query = new URLSearchParams(Object.assign({format:'json',origin:'*'},params));
    return WD + '?' + query.toString();
  }
  function claim(entity, property) {
    return ((entity.claims || {})[property] || []).filter(function (x) { return x.rank !== 'deprecated'; }).map(function (x) {
      return x.mainsnak && x.mainsnak.datavalue ? x.mainsnak.datavalue.value : null;
    }).filter(function (x) { return x !== null; });
  }
  function label(values) { return values && ((values.ru && values.ru.value) || (values.en && values.en.value)) || ''; }
  function toFilm(entity) {
    var id = claim(entity,'P2603').filter(C.validId)[0];
    if (!id) return null;
    var description = label(entity.descriptions);
    var types = claim(entity,'P31').map(function (x) { return x.id; });
    var series = types.some(function (x) { return ['Q5398426','Q15416','Q1259759','Q581714'].indexOf(x) >= 0; }) || /сериал|телесериал|мини-сериал/i.test(description);
    var date = claim(entity,'P577')[0];
    var year = date && date.time ? (date.time.match(/^\+(\d{4})-/) || [])[1] : '';
    return C.normalizeFilm({id:id,kind:series?'series':'film',title:label(entity.labels),englishTitle:entity.labels && entity.labels.en ? entity.labels.en.value : '',description:description,year:year,wikidataId:entity.id});
  }
  var catalog = {
    name:'Wikidata',
    async byId(id, signal) {
      if (!C.validId(id)) return null;
      var found = await json(wdUrl({action:'query',list:'search',srsearch:'haswbstatement:P2603=' + id,srnamespace:'0',srlimit:'3'}),signal);
      var ids = ((found.query || {}).search || []).map(function (item) { return item.title; }).filter(function (value) { return /^Q\d+$/.test(value); });
      if (!ids.length) return null;
      var data = await json(wdUrl({action:'wbgetentities',ids:ids.join('|'),props:'labels|descriptions|claims',languages:'ru|en'}),signal);
      return ids.map(function (key) { return data.entities && data.entities[key] ? toFilm(data.entities[key]) : null; }).find(function (film) { return film && film.id === String(id); }) || null;
    },
    async search(query, signal) {
      var languages=/[\u0400-\u04ff]/.test(query) ? ['ru','en'] : ['en','ru'];
      var searches=await Promise.allSettled(languages.map(function (language) {
        return json(wdUrl({action:'wbsearchentities',search:query,language:language,uselang:'ru',type:'item',limit:'30'}),signal);
      }));
      var successful=searches.filter(function (result) { return result.status==='fulfilled'; });
      if (!successful.length) throw new Error('Сервис поиска временно недоступен');
      var ids=[],entitiesSeen={};
      searches.forEach(function (result) {
        if (result.status!=='fulfilled') return;
        (result.value.search || []).forEach(function (item) {
          if (/^Q\d+$/.test(item.id) && !entitiesSeen[item.id]) { entitiesSeen[item.id]=true; ids.push(item.id); }
        });
      });
      // Anonymous wbgetentities permits at most 50 IDs in one request.
      ids=ids.slice(0,50);
      if (!ids.length) return [];
      var details = await json(wdUrl({action:'wbgetentities',ids:ids.join('|'),props:'labels|descriptions|claims',languages:'ru|en'}),signal);
      var seen = {};
      return ids.map(function (id) { return details.entities && details.entities[id] ? toFilm(details.entities[id]) : null; }).filter(function (film) {
        if (!film || seen[C.filmKey(film)]) return false;
        seen[C.filmKey(film)] = true; return true;
      });
    }
  };
  var playerProvider = {
    name:'Плееры сайта',
    async list(film, signal) {
      if (!C.validId(film.id)) throw new Error('Некорректный ID фильма');
      return C.normalizePlayers(await json('https://fbphdplay.top/api/players?kinopoisk=' + encodeURIComponent(film.id),signal));
    }
  };
  function openPage(film) {
    var url = C.pageUrl(film);
    if (!C.safePageUrl(url)) return Promise.reject(new Error('Адрес страницы не разрешён'));
    return new Promise(function (resolve,reject) {
      if (window.tizen && tizen.application && tizen.ApplicationControl) {
        try {
          var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view',url);
          tizen.application.findAppControl(control,function (apps) {
            if (!apps.length) { reject(new Error('Телевизор не нашёл браузер для этой ссылки')); return; }
            tizen.application.launchAppControl(control,apps[0].id,function () { resolve(); },function () { reject(new Error('Не удалось открыть страницу в браузере ТВ')); });
          },function () { reject(new Error('Не удалось найти браузер ТВ')); });
        } catch (_) { reject(new Error('Открытие ссылки на этой прошивке ещё требует проверки')); }
      } else {
        var opened = window.open(url,'_blank','noopener,noreferrer');
        // noopener may return null even after a successful open; do not label it as confirmed.
        resolve({desktop:true,confirmed:!!opened});
      }
    });
  }
  window.CinemaAdapters = {catalog:catalog,players:playerProvider,openPage:openPage};
}());
