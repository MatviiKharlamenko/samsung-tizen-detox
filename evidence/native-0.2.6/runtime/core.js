(function (root, factory) {
  var core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.CinemaCore = core;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var PAGE_HOSTS = ['www.kinokino.win', 'kinokino.win', 'fixtyflux.cfd'];
  var INPUT_HOSTS = PAGE_HOSTS.concat(['www.kinopoisk.ru', 'kinopoisk.ru']);
  var PLAYER_HOSTS = ['theatre.stravers.live', 'player.shortener2.link', '3a41cf05.obrut.show', 'api.nextembed.ws'];
  var IMAGE_HOSTS=['st.kp.yandex.net','avatars.mds.yandex.net','image.tmdb.org','cdnrrviubnyuntopbez5.svc.cdn.yandex.net'];
  // Public official-CDN locations verified 26.10.2026. These are image locations,
  // not media URLs or availability claims. Direct CDN avoids an extra redirect.
  var POSTER_CDN = {
    '258687':'https://avatars.mds.yandex.net/get-kinopoisk-image/1600647/430042eb-ee69-4818-aed0-a312400a26bf/360',
    '47015':'https://avatars.mds.yandex.net/get-kinopoisk-image/1777765/2f8295c3-cc9f-43cf-8dfe-13616c3eaa5e/360',
    '326':'https://avatars.mds.yandex.net/get-kinopoisk-image/1599028/0b76b2a2-d1c7-4f04-a284-80ff7bb709a4/360',
    '342':'https://avatars.mds.yandex.net/get-kinopoisk-image/4716873/0a07a903-9025-4aff-bf7c-46bbb175888c/360'
  };
  function validId(value) { return /^[1-9][0-9]{0,11}$/.test(String(value)); }
  function normalizeFilm(value) {
    if (!value || !validId(value.id)) return null;
    var title=String(value.title || ('Фильм №' + value.id)).slice(0,180);
    var englishTitle=typeof value.englishTitle==='string' ? value.englishTitle.trim().slice(0,180) : '';
    if (englishTitle.toLowerCase()===title.trim().toLowerCase()) englishTitle='';
    return { id: String(value.id), kind: value.kind === 'series' ? 'series' : 'film',
      title:title, englishTitle:englishTitle,
      year: /^\d{4}$/.test(String(value.year || '')) ? String(value.year) : '',
      description: String(value.description || '').slice(0, 500),
      wikidataId: /^Q\d+$/.test(String(value.wikidataId || '')) ? value.wikidataId : '',
      manual: value.manual === true,
      genres:Array.isArray(value.genres)?value.genres.filter(function(g){return typeof g==='string'&&g.trim();}).slice(0,12).map(function(g){return g.trim().slice(0,50);}):[],
      ratingKp:typeof value.ratingKp==='number'&&Number.isFinite(value.ratingKp)&&value.ratingKp>=0&&value.ratingKp<=10?value.ratingKp:null,
      votesKp:Number.isSafeInteger(value.votesKp)&&value.votesKp>=0?value.votesKp:null,
      premiereDate:typeof value.premiereDate==='string'&&/^\d{4}-\d\d-\d\d(?:T.*)?$/.test(value.premiereDate)&&value.premiereDate.length<=40&&Number.isFinite(Date.parse(value.premiereDate))?value.premiereDate:null,
      posterUrl:safeImageUrl(value.posterUrl),backdropUrl:safeImageUrl(value.backdropUrl),source:['poiskkino','wikidata'].includes(value.source)?value.source:'' };
  }
  function parseInput(input) {
    var text = String(input || '').trim();
    if (validId(text)) return normalizeFilm({id:text, manual:true});
    if (!/^https?:\/\//i.test(text)) return null;
    try {
      var url = new URL(text);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || INPUT_HOSTS.indexOf(url.hostname) < 0) return null;
      var path = url.pathname.match(/^\/(film|series)\/([1-9][0-9]{0,11})\/?$/);
      return path ? normalizeFilm({id:path[2],kind:path[1],manual:true,title:(path[1] === 'series' ? 'Сериал №' : 'Фильм №') + path[2]}) : null;
    } catch (_) { return null; }
  }
  function pageUrl(film) {
    var item = normalizeFilm(film);
    if (!item) throw new Error('Некорректный ID фильма');
    return 'https://www.kinokino.win/' + item.kind + '/' + item.id + '/';
  }
  function safeUrl(value, hosts) {
    try {
      var url = new URL(String(value));
      return url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.indexOf(url.hostname) >= 0 ? url.href : null;
    } catch (_) { return null; }
  }
  function safePlayerUrl(value) { return safeUrl(value, PLAYER_HOSTS); }
  function safeImageUrl(value){var safe=typeof value==='string'&&value.length<=2048?safeUrl(value,IMAGE_HOSTS):null;if(!safe)return null;var url=new URL(safe);return url.origin+url.pathname;}
  function safePageUrl(value) { return safeUrl(value, PAGE_HOSTS); }
  function filmKey(film) { return film.kind + ':' + film.id; }
  function posterUrl(film) {
    return film && validId(film.id) ? (safeImageUrl(film.posterUrl)||POSTER_CDN[film.id] || 'https://st.kp.yandex.net/images/film_iphone/iphone360_' + film.id + '.jpg') : null;
  }
  function decodeLibrary(raw) {
    var fallback = {version:1, favorites:[], recent:[], preferences:{},watched:[]};
    if (!raw) return fallback;
    try {
      var value = JSON.parse(raw);
      if (!value || value.version !== 1) return fallback;
      var clean = function (items, max) {
        var seen = {};
        return (Array.isArray(items) ? items : []).map(normalizeFilm).filter(function (film) {
          if (!film || seen[filmKey(film)]) return false;
          seen[filmKey(film)] = true; return true;
        }).slice(0, max);
      };
      var preferences = {};
      if (value.preferences && typeof value.preferences === 'object') Object.keys(value.preferences).slice(0, 300).forEach(function (key) {
        if (/^(film|series):[1-9][0-9]{0,11}$/.test(key) && typeof value.preferences[key] === 'string') preferences[key] = value.preferences[key].slice(0, 80);
      });
      return {version:1,favorites:clean(value.favorites,300),recent:clean(value.recent,50),preferences:preferences,watched:clean(value.watched,1000)};
    } catch (_) { return fallback; }
  }
  function watchedCandidate(library,film){
    var item=normalizeFilm(film);if(!item)return {library:null,error:'invalid'};
    var previous=library.watched||[],key=filmKey(item),exists=previous.some(function(value){return filmKey(value)===key;});
    if(!exists&&previous.length>=1000)return {library:null,error:'limit'};
    var next=previous.filter(function(value){return filmKey(value)!==key;});if(!exists)next.unshift(item);
    return {library:Object.assign({},library,{watched:next}),error:null,watched:!exists};
  }
  function refineLibrary(library,previous,next){
    var film=normalizeFilm(next),old=normalizeFilm(previous);if(!film||!old||film.id!==old.id)return {library:library,changed:false};
    var oldKey=filmKey(old),newKey=filmKey(film),candidate=Object.assign({},library);
    ['favorites','recent','watched'].forEach(function(name){var seen=Object.create(null);candidate[name]=(library[name]||[]).map(function(item){return [oldKey,newKey].includes(filmKey(item))?film:item;}).filter(function(item){var key=filmKey(item);if(seen[key])return false;seen[key]=true;return true;});});
    candidate.preferences=Object.assign({},library.preferences);
    if(oldKey!==newKey&&Object.prototype.hasOwnProperty.call(candidate.preferences,oldKey)){
      if(!Object.prototype.hasOwnProperty.call(candidate.preferences,newKey))candidate.preferences[newKey]=candidate.preferences[oldKey];
      delete candidate.preferences[oldKey];
    }
    return {library:candidate,changed:JSON.stringify(candidate)!==JSON.stringify(library)};
  }
  function normalizePlayers(payload) {
    var list = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : []);
    return list.filter(function (item) { return item && typeof item === 'object'; }).slice(0, 20).map(function (item, index) {
      var name = String(item.type || item.name || ('Плеер ' + (index + 1))).slice(0, 70);
      var entries = Array.isArray(item.translations) && item.translations.length ? item.translations : [{iframeUrl:item.iframeUrl}];
      var options = entries.filter(function (entry) { return entry && typeof entry === 'object'; }).slice(0, 100).map(function (entry, position) {
        return { key:String(position), label:String(entry.name || 'Озвучка не указана').slice(0, 200),
          quality:String(entry.quality || '').slice(0, 70), url:safePlayerUrl(entry.iframeUrl || item.iframeUrl) };
      });
      var byUrl=Object.create(null),unique=[];
      options.forEach(function(option){
        if(option.url&&byUrl[option.url]){
          var shared=byUrl[option.url];shared.shared=true;shared.label='Открыть плеер';shared.quality='';
        }else{unique.push(option);if(option.url)byUrl[option.url]=option;}
      });
      return {name:name, options:unique};
    });
  }
  return {validId:validId,normalizeFilm:normalizeFilm,parseInput:parseInput,pageUrl:pageUrl,
    safePlayerUrl:safePlayerUrl,safeImageUrl:safeImageUrl,safePageUrl:safePageUrl,filmKey:filmKey,posterUrl:posterUrl,decodeLibrary:decodeLibrary,watchedCandidate:watchedCandidate,refineLibrary:refineLibrary,normalizePlayers:normalizePlayers};
}));
