/* Bounded checks for untrusted input, URL destinations, API data and persisted data. */
const assert = require('node:assert/strict');
const C = require('./core.js');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('ok', name); }
check('Kinopoisk URL preserves film/series and ID', () => {
  assert.equal(C.pageUrl(C.parseInput('https://www.kinopoisk.ru/film/47015/?from=test')), 'https://www.kinokino.win/film/47015/');
  assert.equal(C.pageUrl(C.parseInput('https://kinopoisk.ru/series/5281617/')), 'https://www.kinokino.win/series/5281617/');
  assert.equal(C.parseInput('47015').manual, true);
});
check('Input destinations reject credentials, mixed hosts and invalid IDs', () => {
  ['http://kinopoisk.ru/film/47015/','https://kinopoisk.ru.evil.test/film/47015/','https://kinopoisk.ru@evil.test/film/47015/','https://kinopoisk.ru:444/film/47015/','https://kinopoisk.ru/film/../47015/','0','0123','99999999999999999'].forEach(x=>assert.equal(C.parseInput(x),null,x));
});
check('Player URLs cannot escape the explicit HTTPS host list', () => {
  ['javascript:alert(1)','data:text/html,test','https://theatre.stravers.live.evil.test/','http://theatre.stravers.live/','https://user:pass@theatre.stravers.live/','https://unknown.example/'].forEach(x=>assert.equal(C.safePlayerUrl(x),null,x));
  assert.equal(C.safePlayerUrl('https://theatre.stravers.live/?test=1'),'https://theatre.stravers.live/?test=1');
});
check('Multiple providers and translations survive normalization independently', () => {
  const normalized=C.normalizePlayers({data:[{type:'One',iframeUrl:'https://theatre.stravers.live/',translations:[{name:'Дубляж',quality:'1080p',iframeUrl:'https://theatre.stravers.live/?translation=1'},{name:'Авторский',iframeUrl:'https://unknown.example/'}]},{type:'Two',iframeUrl:'https://api.nextembed.ws/'}]});
  assert.equal(normalized.length,2); assert.equal(normalized[0].options.length,2);
  assert.equal(normalized[0].options[0].label,'Дубляж'); assert.equal(normalized[0].options[1].url,null);
  assert.equal(normalized[1].options[0].label,'Озвучка не указана');
});
check('Shared player URLs create one neutral launch while distinct voice routes remain separate',()=>{
 const data=C.normalizePlayers({data:[{type:'Collaps',iframeUrl:'https://api.nextembed.ws/fixture',translations:Array.from({length:9},(_,i)=>({name:'Reported'+i,quality:'FHD',iframeUrl:'https://api.nextembed.ws/fixture'}))},{type:'Alloha',translations:Array.from({length:10},(_,i)=>({name:'Voice'+i,iframeUrl:'https://theatre.stravers.live/fixture?translation='+i}))}]});
 assert.equal(data[0].options.length,1);assert.equal(data[0].options[0].label,'Открыть плеер');assert.equal(data[0].options[0].quality,'');assert.equal(data[0].options[0].shared,true);assert.equal(data[1].options.length,10);assert.equal(data[1].options[0].label,'Voice0');
});
check('Library strips remote URLs/tokens, rejects malformed records and deduplicates', () => {
  const lib=C.decodeLibrary(JSON.stringify({version:1,favorites:[{id:'47015',kind:'film',title:'Проверка',url:'https://secret.example/?token=not-a-real-token',token:'not-a-real-token'},{id:'47015',kind:'film'},{id:'oops'}],recent:[],preferences:{'film:47015':'Alloha','bad key':'bad'}}));
  assert.equal(lib.favorites.length,1); assert.equal(lib.favorites[0].title,'Проверка');
  assert.equal(JSON.stringify(lib).includes('token'),false); assert.equal(Object.keys(lib.preferences).length,1);
  assert.deepEqual(C.decodeLibrary('{broken').favorites,[]); assert.deepEqual(C.decodeLibrary('{"version":900}').favorites,[]);
});
check('Poster source uses only fixed official CDN hosts and numeric IDs', () => {
  assert.equal(new URL(C.posterUrl({id:'258687'})).hostname,'avatars.mds.yandex.net');
  assert.equal(C.posterUrl({id:'123456789'}),'https://st.kp.yandex.net/images/film_iphone/iphone360_123456789.jpg');
  assert.equal(C.posterUrl({id:'../private'}),null); assert.equal(C.posterUrl({id:'https://evil.test/'}),null);
});
check('English catalog label persists without inventing an original title or storing non-string data', () => {
  const film=C.normalizeFilm({id:'258687',title:'Интерстеллар',englishTitle:'Interstellar'});
  assert.equal(film.englishTitle,'Interstellar');
  assert.equal(C.decodeLibrary(JSON.stringify({version:1,favorites:[film],recent:[film]})).favorites[0].englishTitle,'Interstellar');
  assert.equal(C.normalizeFilm({id:'1',title:'Interstellar',englishTitle:' interstellar '}).englishTitle,'');
  assert.equal(C.normalizeFilm({id:'1',title:'Фильм',englishTitle:{url:'https://evil.test/'}}).englishTitle,'');
  assert.equal(C.normalizeFilm({id:'1',title:'Фильм',englishTitle:'x'.repeat(300)}).englishTitle.length,180);
});
check('Catalog metadata keeps bounded real fields and only approved public image paths',()=>{
 const f=C.normalizeFilm({id:'123456789012',title:'Catalog',genres:Array.from({length:20},(_,i)=>'Genre'+i),ratingKp:8.7,votesKp:12000,premiereDate:'2026-10-10T00:00:00Z',posterUrl:'https://image.tmdb.org/t/p/w342/test.jpg?token=fixture',backdropUrl:'https://unknown.example/private.jpg',source:'poiskkino'});
 assert(f);assert.equal(f.genres.length,12);assert.equal(f.ratingKp,8.7);assert.equal(f.votesKp,12000);assert.equal(f.posterUrl,'https://image.tmdb.org/t/p/w342/test.jpg');assert.equal(f.backdropUrl,null);assert.equal(C.posterUrl(f),f.posterUrl);assert.equal(JSON.stringify(f).includes('token'),false);
 const invalid=C.normalizeFilm({id:'1',ratingKp:Infinity,votesKp:-1,premiereDate:'not-a-date',posterUrl:'http://image.tmdb.org/test'});assert.equal(invalid.ratingKp,null);assert.equal(invalid.votesKp,null);assert.equal(invalid.premiereDate,null);assert.equal(invalid.posterUrl,null);
});
console.log(checks+' checks passed');
