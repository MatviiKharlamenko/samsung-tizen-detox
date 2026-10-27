/* Home/catalog settings: no account, key in local TV storage only. */
(function(){'use strict';
 var KEY='father-cinema:catalog-api-key:v1',CACHE='father-cinema:catalog-metadata-cache:v1',LIMIT=600*1024,MAX_AGE=7*86400000;
 function validKey(value){return typeof value==='string'&&!/[\x00-\x1f\x7f]/.test(value)&&value.trim().length<=512&&/^[\x21-\x7e]+$/.test(value.trim())?value.trim():'';}
 window.CinemaCatalogUI={create:function(options){
  var $=options.$,C=options.core,route='off',client=null,abort=null,token=0,section='new',genre='',page=1,data=null,dataSection='',dataGenre='',genreData=[],genreStale=false,entries=[],counter=0,keyEpoch=0,lookups=[];
  try{var raw=localStorage.getItem(CACHE);if(raw&&raw.length<=1100000){var saved=JSON.parse(raw);if(saved.version===1&&Array.isArray(saved.entries))entries=saved.entries.slice(0,80).filter(function(e){return e&&typeof e.key==='string'&&e.key.length<=300&&e.record&&typeof e.record==='object'&&Number.isFinite(e.at)&&Date.now()-e.at<MAX_AGE;});}}catch(_){}
  counter=entries.reduce(function(max,e){return Math.max(max,Number.isSafeInteger(e.used)?e.used:0);},0);
  function key(){try{return validKey(localStorage.getItem(KEY));}catch(_){return '';}}
  function size(value){return new TextEncoder().encode(value).length;}
  function trimCache(){entries=entries.filter(function(e){return Date.now()-e.at<MAX_AGE;});entries.sort(function(a,b){return (b.used||0)-(a.used||0);});while(entries.length&&size(JSON.stringify({version:1,entries:entries}))>LIMIT)entries.pop();}
  function persistCache(){try{trimCache();localStorage.setItem(CACHE,JSON.stringify({version:1,entries:entries}));}catch(_){/* Optional cache failure never mutates library or key. */}}
  var cache={get:function(k){var e=entries.find(function(e){return e.key===k&&Date.now()-e.at<MAX_AGE;});if(e)e.used=++counter;return e?e.record:null;},set:function(k,record){if(typeof k!=='string'||k.length>300||!record||typeof record!=='object')return;entries=entries.filter(function(e){return e.key!==k;});entries.push({key:k,record:record,at:Date.now(),used:++counter});persistCache();}};
  function stop(){if(abort)abort.abort();abort=null;token++;}
  function reset(){keyEpoch++;lookups.splice(0).forEach(function(controller){controller.abort();});stop();client=null;data=null;page=1;genreData=[];entries=[];persistCache();}
  function getClient(){
   if(!client&&window.CinemaCatalogClient){
    var epoch=keyEpoch;
    client=window.CinemaCatalogClient.create({getApiKey:function(){return epoch===keyEpoch?key():'';},cache:{
     get:function(k){return epoch===keyEpoch?cache.get(k):null;},
     set:function(k,record){if(epoch===keyEpoch)cache.set(k,record);}
    }});
   }
   return client;
  }
  function cancelled(){var error=new Error('Abort');error.code='Abort';return error;}
  async function lookup(method,value,signal){
   var service=getClient(),epoch=keyEpoch,controller=new AbortController(),onAbort=function(){controller.abort();};
   if(signal){if(signal.aborted)controller.abort();else signal.addEventListener('abort',onAbort,{once:true});}
   lookups.push(controller);
   try{
    if(controller.signal.aborted)throw cancelled();
    var result=await (method==='search'?service.search(value,1,controller.signal):service.byId(value,controller.signal));
    if(controller.signal.aborted||epoch!==keyEpoch)throw cancelled();
    return result;
   }catch(error){if(controller.signal.aborted||epoch!==keyEpoch)throw cancelled();throw error;}
   finally{var index=lookups.indexOf(controller);if(index>=0)lookups.splice(index,1);if(signal)signal.removeEventListener('abort',onAbort);}
  }
  function note(text,error){$('home-status').textContent=text;$('home-status').hidden=!text;$('home-status').classList.toggle('error',!!error);}
  function errorText(error){return {MissingKey:'Подключите каталог в настройках.',RejectedKey:'Ключ каталога не принят. Проверьте настройки.',RateLimited:'Достигнут лимит запросов каталога. Попробуйте позже или используйте поиск.',Unavailable:'Каталог сейчас недоступен. Попробуйте позже или используйте поиск.'}[error&&error.code]||'Каталог сейчас недоступен. Попробуйте позже или используйте поиск.';}
  function renderData(){
   var names={'new':'Новинки','best-new':'Лучшее из нового',top:'Лучшие'};$('home-results-title').textContent=names[section]+(genre?' · '+genre:'');
   options.renderCards($('home-results'),data?data.films.map(function(film){return C.normalizeFilm(Object.assign({},film,{source:data.source}));}).filter(Boolean):[]);$('home-pager').hidden=!data||(!data.films.length&&page===1);
   $('home-prev').disabled=page<=1;$('home-next').disabled=!data||!data.hasNext||!data.nextPageKnown;
   $('home-page').textContent='Страница '+page+(data&&Number.isInteger(data.pages)?' из '+data.pages:'');
   if(data)note(data.stale?'Сохранённая подборка: свежие данные пока недоступны.':data.films.length?'':'В этой подборке ничего не найдено.');
  }
  async function load(preserve){
   stop();var id=token,previous=data&&dataSection===section&&dataGenre===genre?data:null;route='home';$('home-controls').hidden=!key();
   if(!key()){data=null;options.renderCards($('home-results'),options.keylessFilms());$('home-pager').hidden=true;$('home-results-title').textContent='Что посмотреть';note('');return;}
   if(preserve&&data){renderData();return;}
   var service=getClient();if(!service){note('Каталог сейчас недоступен. Поиск по названию работает отдельно.',true);return;}
   $('home-results-title').textContent=({'new':'Новинки','best-new':'Лучшее из нового',top:'Лучшие'})[section]+(genre?' · '+genre:'');
   abort=new AbortController();var signal=abort.signal;data=null;options.renderCards($('home-results'),[]);$('home-pager').hidden=true;note('Загружаем подборку…');
   $('home-genre').textContent=genre?'Жанр: '+genre:'Жанр: все';
   document.querySelectorAll('[data-home-section]').forEach(function(b){var selected=b.dataset.homeSection===section;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
   if(!genreData.length)service.genres(signal).then(function(result){if(id!==token||signal.aborted)return;genreData=Array.isArray(result.genres)?result.genres:[];genreStale=!!result.stale;}).catch(function(){/* Optional filter failure does not replace a valid film list. */});
   try{var result=await service.discover({section:section,genre:genre||undefined,page:page},signal);if(id!==token||route!=='home'||signal.aborted)return;data=result;dataSection=section;dataGenre=genre;renderData();}
   catch(error){if(id!==token||route!=='home'||signal.aborted)return;if(previous){data=previous;page=previous.page;renderData();}note(errorText(error),true);}
  }
  function closeGenres(focus){$('genres-dialog').hidden=true;options.onOverlayChange();if(focus)options.focus($('home-genre'));}
  function openGenres(){
   $('genres-list').replaceChildren();$('genres-dialog').hidden=false;options.onOverlayChange();$('genres-status').textContent=genreData.length?(genreStale?'Сохранённый список жанров.':''):'Жанры пока недоступны. Закройте окно и попробуйте позже.';
   [''].concat(genreData).forEach(function(value){var b=document.createElement('button');b.className='button secondary';b.textContent=value||'Все жанры';b.type='button';b.setAttribute('aria-pressed',String(value===genre));b.addEventListener('click',function(){genre=value;page=1;closeGenres(true);load(false);});$('genres-list').append(b);});options.focus($('genres-list').querySelector('[aria-pressed="true"]')||$('genres-close'));
  }
  function settings(){route='settings';stop();$('catalog-key').value='';$('catalog-key-status').textContent=key()?'Ключ сохранён на этом телевизоре. Введите новый, чтобы заменить.':'Онлайн-подборки не подключены. Поиск и ваши списки работают без ключа.';}
  $('home-search').addEventListener('click',options.onSearch);
  document.querySelectorAll('[data-home-section]').forEach(function(b){b.addEventListener('click',function(){section=b.dataset.homeSection;page=1;load(false);});});
  $('home-prev').addEventListener('click',function(){if(page>1){page--;load(false);options.focus($('home-search'));}});
  $('home-next').addEventListener('click',function(){if(data&&data.hasNext&&data.nextPageKnown){page++;load(false);options.focus($('home-search'));}});
  $('home-genre').addEventListener('click',openGenres);$('genres-close').addEventListener('click',function(){closeGenres(true);});
  $('catalog-key-form').addEventListener('submit',function(event){event.preventDefault();var next=validKey($('catalog-key').value);if(!next){$('catalog-key-status').textContent='Введите ключ: до 512 печатных латинских символов без переноса строки.';return;}try{localStorage.setItem(KEY,next);}catch(_){$('catalog-key-status').textContent='Не удалось сохранить ключ. Проверьте свободное место.';return;}$('catalog-key').value='';reset();$('catalog-key-status').textContent='Ключ сохранён на этом телевизоре. Откройте «Главная» для подборок.';});
  $('catalog-key-clear').addEventListener('click',function(){try{localStorage.setItem(KEY,'');}catch(_){$('catalog-key-status').textContent='Не удалось удалить ключ.';return;}$('catalog-key').value='';reset();$('catalog-key-status').textContent='Ключ удалён. Избранное и просмотренные фильмы сохранены.';});
  return {enterHome:function(preserve){if(!preserve)page=1;return load(!!preserve);},enterSettings:settings,leave:function(){route='off';stop();if(!$('genres-dialog').hidden)closeGenres(false);$('catalog-key').value='';},closeGenres:closeGenres,
   search:async function(query,signal,fallback){
    if(key()&&getClient()){try{var result=await lookup('search',query,signal);return {films:result.films.map(function(film){return C.normalizeFilm(Object.assign({},film,{source:result.source}));}).filter(Boolean),notice:result.stale?'Сохранённые результаты каталога.':''};}catch(error){if((signal&&signal.aborted)||(error&&error.code==='Abort'))throw error;return {films:await fallback(query,signal),notice:'Каталог недоступен. Показаны результаты Wikidata.'};}}
    return {films:await fallback(query,signal),notice:''};
   },
   byId:async function(id,signal,fallback){if(key()&&getClient()){try{var value=await lookup('byId',id,signal);if(value)return value;}catch(error){if((signal&&signal.aborted)||(error&&error.code==='Abort'))throw error;}}return fallback(id,signal);}
  };
 }};
}());
