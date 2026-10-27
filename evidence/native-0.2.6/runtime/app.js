(function () {
  'use strict';
  var C = window.CinemaCore, A = window.CinemaAdapters;
  var $ = function (id) { return document.getElementById(id); };
  var STORAGE = 'father-cinema.library.v1';
  // Three starter cards use already verified metadata/IDs, never a title-search guess.
  var starterFilms = {
    '258687':{id:'258687',kind:'film',title:'Интерстеллар',englishTitle:'Interstellar',year:'2014',description:'фильм Кристофера Нолана 2014 года',wikidataId:'Q13417189'},
    '47015':{id:'47015',kind:'film',title:'Убить Билла. Фильм 2',englishTitle:'Kill Bill: Volume 2',year:'2004',description:'второй фильм кинодилогии Квентина Тарантино, 2004 год',wikidataId:'Q928019'},
    '342':{id:'342',kind:'film',title:'Криминальное чтиво',englishTitle:'Pulp Fiction',year:'1994',description:'фильм Квентина Тарантино (1994)',wikidataId:'Q104123'}
  };
  var library;
  try { library = C.decodeLibrary(localStorage.getItem(STORAGE)); } catch (_) { library = C.decodeLibrary(null); }
  var state = {tab:'home',films:[],film:null,providers:[],provider:0,screen:'main',searchToken:0,detailToken:0,searchAbort:null,detailAbort:null,returnFocus:null,layout:0,collectionPages:{favorites:0,recent:0,watched:0},returnCollection:false,returnIndex:0};
  var catalogUI=null;
  var toastTimer, frameTimer, activeBridge=null, activeFrame=null, bridgeTimedOut=false,soundsRenderKey='';
  function el(tag, cls, text) { var node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
  function toast(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { $('toast').hidden=true; },4800); }
  function save() { var saved=true; try { localStorage.setItem(STORAGE,JSON.stringify(library)); } catch (_) { saved=false; toast('Не удалось сохранить избранное. Проверьте свободное место.'); } updateCount(); return saved; }
  function updateCount() {
    $('favorite-count').textContent=library.favorites.length;$('watched-count').textContent=library.watched.length;
    document.querySelectorAll('[data-starter-id]').forEach(function(tile){var film=starterFilms[tile.dataset.starterId],cover=tile.querySelector('.query-poster'),mark=cover.querySelector('.watched-mark');if(mark)mark.remove();if(watched(film))cover.append(el('span','watched-mark','Просмотрено'));tile.setAttribute('aria-label',film.title+(watched(film)?', просмотрено':''));});
  }
  function isolateOverlay() {
    var blocked=!$('keyboard').hidden || !$('genres-dialog').hidden || state.screen==='watch';
    [document.querySelector('.topbar'),$('main'),$('detail'),document.querySelector('.helpbar')].forEach(function (node) { node.inert=blocked; });
  }
  function favorite(film) { return library.favorites.some(function (item) { return C.filmKey(item) === C.filmKey(film); }); }
  function watched(film){return library.watched.some(function(item){return C.filmKey(item)===C.filmKey(film);});}
  function updateWatched(){var exists=watched(state.film);$('watched-toggle').textContent=exists?'Убрать отметку «Просмотрено»':'Отметить просмотренным';$('watched-toggle').setAttribute('aria-pressed',String(exists));}
  function focus(node) { if (node && !node.hidden && !node.disabled) { node.focus({preventScroll:true}); node.scrollIntoView({block:'nearest',inline:'nearest'}); } }
  function status(id,text,error) { $(id).textContent=text; $(id).hidden=!text; $(id).classList.toggle('error',!!error); }
  function poster(film, container, eager) {
    container.replaceChildren(); container.classList.remove('poster-loaded'); container.classList.remove('poster-missing');
    var fallback=el('span','poster-fallback',film.title || 'Кино дома'); container.append(fallback);
    var url=C.posterUrl(film); if (!url) { container.classList.add('poster-missing'); return; }
    var image=el('img','poster-image'); image.alt=''; image.width=360; image.height=540;
    image.crossOrigin='anonymous'; image.referrerPolicy='no-referrer'; image.loading=eager?'eager':'lazy'; image.decoding='async';
    image.addEventListener('load',function () { container.classList.add('poster-loaded'); });
    image.addEventListener('error',function () { container.classList.add('poster-missing'); image.remove(); });
    image.src=url; container.append(image);
  }
  function detailHeading() {
    $('detail-title').textContent=state.film.title;
    $('detail-english-title').textContent=state.film.englishTitle || ''; $('detail-english-title').hidden=!state.film.englishTitle;
    $('detail-meta').textContent=state.film.year || 'По ссылке Кинопоиска';
    $('detail-type').textContent=state.film.kind==='series'?'Сериал':'Фильм';
    $('detail-description').textContent=state.film.description; $('detail-description').hidden=!state.film.description;
    $('kind-choice').hidden=!state.film.manual;
    $('open-page').textContent='Открыть страницу ' + (state.film.kind==='series'?'сериала':'фильма'); updateFavorite();updateWatched();
  }
  function renderCards(target, films) {
    target.replaceChildren();
    films.forEach(function (film) {
      var isWatched=watched(film),card = el('button','film-card'); card.type='button'; card.dataset.filmkey=C.filmKey(film); card.setAttribute('aria-label',film.title + (film.englishTitle ? ', ' + film.englishTitle : '') + (film.year ? ', ' + film.year : '') + ', ' + (film.kind==='series'?'сериал':'фильм')+(isWatched?', просмотрено':''));
      var cover=el('div','film-cover'); cover.setAttribute('aria-hidden','true'); poster(film,cover,false);
      if (favorite(film)) cover.append(el('span','favorite-mark','★'));
      if(isWatched)cover.append(el('span','watched-mark','Просмотрено'));
      card.append(cover,el('span','film-title',film.title));
      if (film.englishTitle) card.append(el('span','film-english-title',film.englishTitle));
      card.append(el('span','film-meta',(film.year ? film.year + ' / ' : '') + (film.kind==='series'?'Сериал':'Фильм')));
      if(typeof film.ratingKp==='number'&&film.votesKp>0)card.append(el('span','film-rating','КП '+film.ratingKp.toFixed(1)));
      card.addEventListener('click',function () { openDetail(film,card); }); target.append(card);
    });
  }
  function renderCollection(){
    var meta={favorites:['Избранное','Фильмы и сериалы, которые вы сохранили.','Пока пусто. Найдите фильм и нажмите «В избранное».'],recent:['Недавно открывали','Последние открытые фильмы и сериалы.','Пока пусто. История появится при открытии плеера или страницы.'],watched:['Просмотрено','Ваши ручные отметки фильмов и сериалов.','Пока пусто. Откройте фильм и нажмите «Отметить просмотренным».']}[state.tab];
    var items=library[state.tab],pages=Math.max(1,Math.ceil(items.length/30)),page=Math.min(state.collectionPages[state.tab]||0,pages-1);state.collectionPages[state.tab]=page;
    $('collection-heading').textContent=meta[0];$('collection-note').textContent=meta[1];renderCards($('collection'),items.slice(page*30,page*30+30));
    if(!items.length)$('collection').append(el('p','empty-collection',meta[2]));
    $('collection-pager').hidden=pages<=1;$('collection-prev').disabled=page===0;$('collection-next').disabled=page===pages-1;$('collection-page').textContent='Страница '+(page+1)+' из '+pages;
  }
  function changeCollectionPage(delta){
    var max=Math.max(0,Math.ceil(library[state.tab].length/30)-1);state.collectionPages[state.tab]=Math.max(0,Math.min(max,state.collectionPages[state.tab]+delta));renderCollection();focus($('collection').querySelector('button'));
  }
  function tab(name,preservePage) {
    if(catalogUI)catalogUI.leave();
    state.tab=name; state.screen='main'; $('detail').hidden=true; $('main').hidden=false;
    document.querySelectorAll('[data-tab]').forEach(function (button) {
      button.classList.toggle('selected',button.dataset.tab===name);
      if (button.dataset.tab===name) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    $('home-view').hidden=name!=='home';$('settings-view').hidden=name!=='settings';$('search-view').hidden=name!=='search';
    var collection=['favorites','recent','watched'].includes(name);$('collection-view').hidden=!collection;
    if(name==='home'&&catalogUI)catalogUI.enterHome(preservePage);if(name==='settings'&&catalogUI)catalogUI.enterSettings();
    if (collection) {
      if(!preservePage)state.collectionPages[name]=0;renderCollection();
    }
  }
  async function search() {
    var query=$('search-input').value.trim();
    if (!query) { toast('Введите название фильма.'); focus($('search-input')); return; }
    if (state.searchAbort) state.searchAbort.abort();
    var token=++state.searchToken; $('search-submit').disabled=false;
    var direct=C.parseInput(query);
    if (/^https?:\/\//i.test(query) && !direct) { status('search-status','Нужна HTTPS-ссылка вида kinopoisk.ru/film/47015/ или kinopoisk.ru/series/…',true); return; }
    if (/^[0-9]+$/.test(query) && !direct) { status('search-status','Проверьте числовой ID Кинопоиска.',true); return; }
    tab('search');
    if (direct) { openDetail(direct,$('search-submit')); return; }
    state.searchAbort=new AbortController();
    $('results').replaceChildren(); $('results-count').textContent=''; $('results-header').hidden=false; $('results-heading').textContent='Результаты поиска'; $('search-submit').disabled=true; $('suggestions').hidden=true;
    status('search-status','Ищем «' + query + '»…');
    try {
      var result=await catalogUI.search(query,state.searchAbort.signal,A.catalog.search),films=result.films;
      if (token!==state.searchToken) return;
      state.films=films; renderCards($('results'),films); $('results-count').textContent=films.length?String(films.length):'';
      status('search-status',films.length?result.notice:'Ничего не найдено. Попробуйте другое название или вставьте ссылку Кинопоиска.');
      if (films.length && state.tab==='search' && state.screen==='main') focus($('results').querySelector('button'));
    } catch (error) {
      if (token!==state.searchToken || state.searchAbort.signal.aborted) return;
      status('search-status','Поиск сейчас недоступен. Проверьте интернет или откройте фильм по ссылке Кинопоиска.',true);
    } finally { if (token===state.searchToken) $('search-submit').disabled=false; }
  }
  function updateFavorite() { $('favorite-toggle').textContent=favorite(state.film)?'Убрать из избранного':'В избранное'; }
  function remember() {
    var film=C.normalizeFilm(state.film), key=C.filmKey(film);
    library.recent=[film].concat(library.recent.filter(function (item) { return C.filmKey(item)!==key; })).slice(0,50);
    save();
  }
  function closeDetail() {
    if (state.detailAbort) state.detailAbort.abort(); state.detailToken++;
    var key=state.film && C.filmKey(state.film), old=state.returnFocus,oldPage=state.collectionPages[state.tab]||0;
    tab(state.tab,true);
    if (state.tab==='search') renderCards($('results'),state.films);
    var replacement=Array.from(document.querySelectorAll('.film-card')).find(function (card) { return card.dataset.filmkey===key && card.getClientRects().length; });
    var cards=$('collection').querySelectorAll('button'),nearby=state.returnCollection&&cards.length?cards[state.collectionPages[state.tab]<oldPage?cards.length-1:Math.min(state.returnIndex,cards.length-1)]:null;
    focus(replacement || nearby || (old && old.isConnected && old.getClientRects().length ? old : document.querySelector('[data-tab="'+state.tab+'"]')));
  }
  function refineCurrentFilm(film){
    var next=C.normalizeFilm(film);if(!next||next.id!==state.film.id)return false;var candidate=C.refineLibrary(library,state.film,next);
    if(candidate.changed){
      try{localStorage.setItem(STORAGE,JSON.stringify(candidate.library));}
      catch(_){state.refinementFailed=true;status('watched-status','Не удалось сохранить уточнение карточки. Прежние отметки сохранены.',true);return false;}
      library=candidate.library;
    }
    state.film=next;detailHeading();updateCount();
    if(state.refinementFailed){state.refinementFailed=false;status('watched-status','');}
    return true;
  }
  async function openDetail(film, origin) {
    if(catalogUI)catalogUI.leave();
    if (state.detailAbort) state.detailAbort.abort();
    var token=++state.detailToken; state.detailAbort=new AbortController(); state.film=C.normalizeFilm(film); state.returnFocus=origin; state.providers=[]; state.screen='detail';
    state.returnCollection=!!(origin&&origin.closest('#collection'));state.returnIndex=state.returnCollection?Array.from($('collection').children).indexOf(origin):0;state.refinementFailed=false;status('watched-status','');
    $('main').hidden=true; $('detail').hidden=false; $('providers').replaceChildren(); $('translations').replaceChildren();
    state.kindTouched=false; detailHeading(); poster(state.film,$('detail-poster'),true); poster(state.film,$('detail-backdrop'),true);
    if (state.film.manual) catalogUI.byId(state.film.id,state.detailAbort.signal,A.catalog.byId).then(function (metadata) {
      if (!metadata || token!==state.detailToken || state.screen!=='detail') return;
      var next=C.normalizeFilm(metadata);if(state.kindTouched){next.kind=state.film.kind;next.manual=true;}
      refineCurrentFilm(next);
    }).catch(function () { /* Metadata is optional; the poster/player selection remains usable. */ });
    status('players-status','Загружаем список плееров…'); focus($('detail-back')); window.scrollTo(0,0);
    try {
      var providers=await A.players.list(state.film,state.detailAbort.signal);
      if (token!==state.detailToken) return;
      state.providers=providers;
      status('players-status',providers.length?'':'Сайт не вернул плееры. Можно открыть страницу фильма или попробовать позже.');
      renderProviders();
    } catch (_) {
      if (token!==state.detailToken || state.detailAbort.signal.aborted) return;
      status('players-status','Список плееров сейчас недоступен. Можно открыть страницу фильма в браузере.',true);
    }
  }
  function renderProviders() {
    $('providers').replaceChildren();
    var preferred=library.preferences[C.filmKey(state.film)];
    var preferredIndex=state.providers.findIndex(function (item) { return item.name===preferred; });
    var collapsIndex=state.providers.findIndex(function (item) { return item.name.toLowerCase()==='collaps'; });
    state.provider=preferredIndex>=0?preferredIndex:Math.max(0,collapsIndex);
    state.providers.forEach(function (provider,index) {
      var button=el('button','provider'); button.type='button';
      var first=provider.options[0], count=provider.options.length;
      var note=count>1?count+' вариантов запуска':first&&first.shared?(provider.name.toLowerCase()==='collaps'?'Озвучка при просмотре':'Озвучка плеера'):(first && first.quality || 'Открыть плеер');
      button.append(el('span','provider-name',provider.name),el('span','provider-note',note));
      button.addEventListener('click',function () { selectProvider(index); focus($('translations').querySelector('button')); }); $('providers').append(button);
    });
    selectProvider(state.provider);
  }
  function selectProvider(index) {
    state.provider=index; var provider=state.providers[index]; $('translations').replaceChildren();
    Array.from($('providers').children).forEach(function (button,i) { button.classList.toggle('selected',i===index); button.setAttribute('aria-pressed',String(i===index)); });
    $('translations-title').textContent=provider ? provider.name + ': выберите вариант' : 'Варианты запуска';
    if (!provider) return;
    provider.options.forEach(function (option) {
      var button=el('button','translation'); button.type='button';
      button.append(el('span','',option.label),el('small','',option.shared?(provider.name.toLowerCase()==='collaps'?'После запуска нажмите «Озвучка»':'Озвучка по умолчанию'):(option.quality || 'Качество не указано')));
      if (!option.url) {
        button.append(el('small','','Адрес не поддерживается'));
        button.setAttribute('aria-disabled','true');
        button.addEventListener('click',function () { toast('Адрес этого плеера изменился. Откройте страницу фильма в браузере.'); });
      } else button.addEventListener('click',function () { watch(provider,option); });
      $('translations').append(button);
    });
  }
  function clock(seconds){
    if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0)return '—:—';
    var value=Math.floor(Math.min(seconds,604800)),hours=Math.floor(value/3600),minutes=Math.floor(value%3600/60),rest=String(value%60).padStart(2,'0');
    return hours?hours+':'+String(minutes).padStart(2,'0')+':'+rest:minutes+':'+rest;
  }
  function writeText(node,text){if(node.textContent!==text)node.textContent=text;}
  function isolateSounds(open){
    document.querySelector('#watch .watch-bar').inert=open;$('watch-controls').inert=open;$('player-host').inert=open;
  }
  function closeSounds(restoreFocus){
    $('sounds-dialog').hidden=true;isolateSounds(false);soundsRenderKey='';$('sounds-list').replaceChildren();
    if(restoreFocus)focus($('watch-sounds').disabled?$('watch-back'):$('watch-sounds'));
    if(activeBridge)activeBridge.cancelSounds();
  }
  function renderSounds(info){
    if($('sounds-dialog').hidden)return;
    var key=JSON.stringify([info.status,info.items]);if(key===soundsRenderKey)return;soundsRenderKey=key;
    $('sounds-list').replaceChildren();
    var retry=$('sounds-retry');retry.hidden=info.status!=='error'&&!(info.status==='loading'&&!retry.hidden);
    retry.setAttribute('aria-disabled',String(info.status==='loading'));
    writeText($('sounds-status'),info.status==='loading'?'Загружаем озвучки…':info.status==='ready'?'Выберите озвучку.':'Не удалось получить список. Попробуйте ещё раз.');
    if(info.status!=='ready')return;
    info.items.forEach(function(item){var button=el('button','button secondary sound-option',item.label);button.type='button';button.dataset.soundKey=item.key;
      button.addEventListener('click',function(){if(activeBridge&&activeBridge.selectSound(item.key)){closeSounds(true);toast('Переключаем озвучку…');}else toast('Плеер пока не готов. Попробуйте снова.');});$('sounds-list').append(button);
    });
    var last=Array.from($('sounds-list').children).find(function(button){return button.dataset.soundKey===info.lastRequestedKey;});focus(last||$('sounds-list').firstElementChild);
  }
  function openSounds(){
    if(!activeBridge||!activeBridge.snapshot().ready){toast('Дождитесь готовности плеера.');return;}
    $('sounds-retry').hidden=true;$('sounds-dialog').hidden=false;isolateSounds(true);soundsRenderKey='';focus($('sounds-close'));activeBridge.requestSounds();
  }
  function transportAvailability(node,available,pending){
    // Native disabled blurs a focused button in Chromium. Keep its focus while
    // aria-disabled and the bridge prevent commands until readiness returns.
    node.disabled=!available&&document.activeElement!==node;
    node.setAttribute('aria-disabled',String(!available||pending));
  }
  function renderBridge(info){
    if(!activeBridge||state.screen!=='watch')return;
    if(!info.ready&&!$('sounds-dialog').hidden)closeSounds(true);
    if(info.ready){bridgeTimedOut=false;clearTimeout(frameTimer);}
    var text=bridgeTimedOut?'Плеер не подготовился. Выберите другой плеер.':
      info.commandError?'Плеер не ответил. Повторите команду или выберите другой.':
      info.pending?(info.pending.kind==='seek'?'Перематываем…':info.pending.value===3?'Приостанавливаем…':'Продолжаем просмотр…'):
      ({loading:'Плеер готовится…',ready:'Готов к воспроизведению',playing:'Воспроизведение',paused:'Пауза',ended:'Просмотр завершён'})[info.phase];
    writeText($('watch-status'),text);$('watch').dataset.playerState=info.phase;
    transportAvailability($('watch-toggle'),info.ready,!!info.pending);
    writeText($('watch-toggle'),!info.ready?'Подготовка…':info.state===2&&!info.ended?'Пауза':'Воспроизвести');
    var canSeek=info.ready&&typeof info.position==='number'&&info.duration>0;
    transportAvailability($('watch-rewind'),canSeek,!!info.pending);transportAvailability($('watch-forward'),canSeek,!!info.pending);
    transportAvailability($('watch-sounds'),info.ready,false);renderSounds(info.sounds);
    writeText($('watch-time'),clock(info.position)+' / '+clock(info.duration>0?info.duration:null));$('watch-progress').hidden=!(info.duration>0);
    $('watch-progress').max=info.duration>0?info.duration:1;$('watch-progress').value=info.position!==null?Math.min(info.position,$('watch-progress').max):0;
  }
  function beginBridge(frame,origin){
    if(!$('sounds-dialog').hidden)closeSounds(true);
    if(activeBridge)activeBridge.destroy();clearTimeout(frameTimer);bridgeTimedOut=false;
    var bridge=window.CinemaCollapsBridge.create({source:frame.contentWindow,origin:origin,onChange:renderBridge});activeBridge=bridge;
    renderBridge(bridge.snapshot());
    frameTimer=setTimeout(function(){if(state.screen==='watch'&&activeBridge===bridge&&!bridge.snapshot().ready){bridgeTimedOut=true;renderBridge(bridge.snapshot());}},20000);
  }
  function resetBridge(){
    closeSounds(false);
    if(activeBridge)activeBridge.destroy();activeBridge=null;activeFrame=null;bridgeTimedOut=false;clearTimeout(frameTimer);
    $('watch-controls').hidden=true;$('watch').classList.remove('with-parent-controls');delete $('watch').dataset.playerState;
    $('watch-toggle').disabled=true;$('watch-rewind').disabled=true;$('watch-forward').disabled=true;$('watch-sounds').disabled=true;
    writeText($('watch-toggle'),'Подготовка…');writeText($('watch-time'),'—:— / —:—');$('watch-progress').max=1;$('watch-progress').value=0;$('watch-progress').hidden=true;
  }
  function watch(provider,option) {
    var url=C.safePlayerUrl(option.url); if (!url) { toast('Адрес плеера не поддерживается.'); return; }
    resetBridge();
    library.preferences[C.filmKey(state.film)]=provider.name; remember();
    state.screen='watch'; $('watch').hidden=false; $('detail').hidden=true; isolateOverlay();
    $('watch-title').textContent=state.film.title+' / '+provider.name;
    var bridged=provider.name.toLowerCase()==='collaps'&&new URL(url).origin==='https://api.nextembed.ws';
    $('watch-status').textContent=bridged?'Плеер готовится…':'Открываем внешний плеер. Управление этим плеером на ТВ ещё проверяется.';
    var frame=el('iframe'); frame.id='player-frame'; frame.title='Внешний плеер'; frame.tabIndex=0;
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-presentation'); frame.setAttribute('allow','fullscreen; encrypted-media; autoplay');
    frame.referrerPolicy='strict-origin-when-cross-origin'; frame.src=url;
    if(bridged){frame.tabIndex=-1;frame.inert=true;frame.dataset.parentControls='true';frame.classList.add('bridged-frame');}
    var didLoad=false;
    frame.addEventListener('load',function () {
      if(state.screen!=='watch'||activeFrame!==frame)return;
      if(bridged){
        // First load may follow valid early readiness messages. Later documents
        // reuse WindowProxy, so discard the previous document's media state.
        if(didLoad)beginBridge(frame,new URL(url).origin);else renderBridge(activeBridge.snapshot());
      }else $('watch-status').textContent='Страница плеера открыта. Если видео не работает, выберите другой вариант.';
      didLoad=true;
    });
    $('player-host').replaceChildren(frame); focus($('watch-back'));
    activeFrame=frame;
    if(bridged){
      $('watch-controls').hidden=false;$('watch').classList.add('with-parent-controls');beginBridge(frame,new URL(url).origin);
    }else frameTimer=setTimeout(function(){if(state.screen==='watch'&&activeFrame===frame)$('watch-status').textContent='Если видео не началось, выберите другой плеер или откройте страницу в браузере.';},12000);
  }
  function closeWatch() {
    resetBridge(); $('player-host').replaceChildren(); $('watch').hidden=true; $('detail').hidden=false; state.screen='detail'; isolateOverlay(); focus($('providers').children[state.provider] || $('detail-back'));
  }
  async function openPage() {
    remember();
    try { await A.openPage(state.film); toast('Открываем страницу фильма в браузере.'); }
    catch (error) { toast(error.message); }
  }
  var layouts=['АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ','ABCDEFGHIJKLMNOPQRSTUVWXYZ','1234567890'];
  function renderKeyboard() {
    $('keyboard-keys').replaceChildren();
    Array.from(layouts[state.layout]).forEach(function (character) {
      var button=el('button','keyboard-key',character); button.type='button';
      button.addEventListener('click',function () { $('search-input').value=($('search-input').value+character.toLowerCase()).slice(0,180); updateKeyboard(); }); $('keyboard-keys').append(button);
    }); updateKeyboard();
  }
  function updateKeyboard() { $('keyboard-text').textContent=$('search-input').value || 'Введите название'; }
  function openKeyboard() { $('keyboard').hidden=false; isolateOverlay(); renderKeyboard(); focus($('keyboard-keys').querySelector('button')); }
  function closeKeyboard() { $('keyboard').hidden=true; isolateOverlay(); focus($('keyboard-open')); }
  function back() {
    if (!$('keyboard').hidden) { closeKeyboard(); return true; }
    if (!$('genres-dialog').hidden) { catalogUI.closeGenres(true); return true; }
    if (!$('sounds-dialog').hidden) { closeSounds(true); return true; }
    if (state.screen==='watch') { closeWatch(); return true; }
    if (state.screen==='detail') { closeDetail(); return true; }
    if (state.tab!=='home') { tab('home'); focus($('home-search')); return true; }
    return false;
  }
  function focusRoot() { return !$('keyboard').hidden ? $('keyboard') : !$('genres-dialog').hidden ? $('genres-dialog') : !$('sounds-dialog').hidden ? $('sounds-dialog') : state.screen==='watch' ? $('watch') : state.screen==='detail' ? $('detail') : document.body; }
  function moveFocus(direction) {
    var active=document.activeElement, root=focusRoot();
    var candidates=Array.from(root.querySelectorAll('button:not(:disabled),input,a[href],iframe')).filter(function (node) { return node.getClientRects().length && !node.closest('[hidden]') && node.dataset.parentControls!=='true'; });
    if (!candidates.length) return;
    if (!candidates.includes(active)) { focus(candidates[0]); return; }
    var r=active.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, best=null, score=Infinity;
    candidates.forEach(function (node) {
      if (node===active) return; var rect=node.getBoundingClientRect(), dx=rect.left+rect.width/2-x, dy=rect.top+rect.height/2-y;
      var primary=direction==='left'?-dx:direction==='right'?dx:direction==='up'?-dy:dy;
      if (primary<2) return; var cross=direction==='left'||direction==='right'?Math.abs(dy):Math.abs(dx);
      var next=primary+cross*2.7;
      if (next<score) { best=node; score=next; }
    }); if (best) focus(best);
  }
  document.addEventListener('keydown',function (event) {
    var code=event.keyCode, key=event.key;
    if (event.isComposing) return;
    if ((key==='Enter' || code===13) && document.activeElement===$('search-input')) {
      event.preventDefault();
      if ($('search-input').value.trim()) search(); else openKeyboard();
      return;
    }
    if (key==='Escape'||key==='BrowserBack'||code===10009) { if (back()) { event.preventDefault(); event.stopPropagation(); } return; }
    if (key==='Tab' && (!$('keyboard').hidden || !$('genres-dialog').hidden || state.screen==='watch')) {
      var items=Array.from(focusRoot().querySelectorAll('button:not(:disabled),iframe')).filter(function(node){return node.getClientRects().length&&!node.closest('[hidden]')&&!node.closest('[inert]')&&node.dataset.parentControls!=='true';}), current=items.indexOf(document.activeElement);
      if ((event.shiftKey && current===0) || (!event.shiftKey && current===items.length-1)) { event.preventDefault(); focus(items[event.shiftKey?items.length-1:0]); } return;
    }
    var directions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    var direction=directions[key] || ({37:'left',38:'up',39:'right',40:'down'})[code];
    if (direction) {
      if(document.activeElement===$('catalog-key')&&(direction==='left'||direction==='right'))return;
      if (document.activeElement===$('search-input') && (direction==='left'||direction==='right')) {
        var input=$('search-input');
        if (direction==='right' && (!input.value.length || (input.selectionStart===input.selectionEnd && input.selectionEnd===input.value.length))) {
          event.preventDefault(); focus($('keyboard-open'));
        }
        return;
      }
      event.preventDefault(); moveFocus(direction);
    }
  });
  document.addEventListener('focusin',function (event) {
    if(activeBridge&&event.target===activeFrame){focus($('watch-toggle').disabled?$('watch-back'):$('watch-toggle'));return;}
    if ((!$('keyboard').hidden || !$('genres-dialog').hidden || state.screen==='watch') && !focusRoot().contains(event.target)) focus(focusRoot().querySelector('button'));
  });
  document.querySelectorAll('[data-tab]').forEach(function (button) { button.addEventListener('click',function () { tab(button.dataset.tab);if(button.dataset.tab==='search')focus($('keyboard-open')); }); });
  document.querySelector('.brand').addEventListener('click',function (event) { event.preventDefault(); tab('home'); focus($('home-search')); });
  $('search-form').addEventListener('submit',function (event) { event.preventDefault(); search(); });
  document.querySelectorAll('[data-starter-id]').forEach(function (button) { button.addEventListener('click',function () {
    var film=starterFilms[button.dataset.starterId]; if (film) openDetail(film,button);
  }); });
  $('detail-back').addEventListener('click',closeDetail); $('watch-back').addEventListener('click',closeWatch); $('open-page').addEventListener('click',openPage); $('watch-browser').addEventListener('click',openPage);
  $('watch-toggle').addEventListener('click',function(){if(activeBridge)activeBridge.toggle();});
  $('watch-rewind').addEventListener('click',function(){if(activeBridge)activeBridge.seekBy(-10);});
  $('watch-forward').addEventListener('click',function(){if(activeBridge)activeBridge.seekBy(10);});
  $('watch-sounds').addEventListener('click',openSounds);$('sounds-close').addEventListener('click',function(){closeSounds(true);});$('sounds-retry').addEventListener('click',function(){if(activeBridge)activeBridge.requestSounds();});
  window.addEventListener('message',function(event){if(activeBridge&&state.screen==='watch')activeBridge.accept(event);});
  $('favorite-toggle').addEventListener('click',function () {
    var key=C.filmKey(state.film), exists=favorite(state.film), previous=library.favorites;
    library.favorites=library.favorites.filter(function (item) { return C.filmKey(item)!==key; });
    if (!exists) library.favorites.unshift(C.normalizeFilm(state.film)); library.favorites=library.favorites.slice(0,300);
    if (save()) { updateFavorite(); toast(exists?'Убрано из избранного':'Добавлено в избранное'); }
    else { library.favorites=previous; updateCount(); updateFavorite(); }
  });
  $('watched-toggle').addEventListener('click',function(){
    var candidate=C.watchedCandidate(library,state.film);
    if(candidate.error){status('watched-status',candidate.error==='limit'?'Достигнут лимит 1000 отметок. Снимите ненужную отметку перед добавлением новой.':'Не удалось сохранить отметку.',true);return;}
    try{localStorage.setItem(STORAGE,JSON.stringify(candidate.library));}
    catch(_){status('watched-status','Не удалось сохранить отметку. Проверьте свободное место.',true);return;}
    library=candidate.library;updateCount();updateWatched();status('watched-status','');toast(candidate.watched?'Отмечено как просмотренное':'Отметка «Просмотрено» снята');
  });
  $('collection-prev').addEventListener('click',function(){changeCollectionPage(-1);});$('collection-next').addEventListener('click',function(){changeCollectionPage(1);});
  document.querySelectorAll('[data-kind]').forEach(function (button) { button.addEventListener('click',function () { var next=Object.assign({},state.film,{kind:button.dataset.kind,manual:true});if(refineCurrentFilm(next))state.kindTouched=true; }); });
  $('keyboard-open').addEventListener('click',openKeyboard); $('keyboard-close').addEventListener('click',closeKeyboard); $('keyboard-search').addEventListener('click',function () { closeKeyboard(); search(); });
  document.querySelectorAll('[data-key]').forEach(function (button) { button.addEventListener('click',function () {
    var action=button.dataset.key, input=$('search-input');
    if (action==='space') input.value=(input.value+' ').slice(0,180);
    else if (action==='delete') input.value=Array.from(input.value).slice(0,-1).join('');
    else if (action==='clear') input.value='';
    else if (action==='layout') { state.layout=(state.layout+1)%layouts.length; renderKeyboard(); focus($('keyboard-keys').querySelector('button')); }
    updateKeyboard();
  }); });
  document.addEventListener('visibilitychange',function () { if (!document.hidden && state.screen==='main') updateCount(); });
  document.querySelectorAll('[data-poster-id]').forEach(function (container) { poster({id:container.dataset.posterId,title:''},container,false); });
  catalogUI=window.CinemaCatalogUI.create({$: $,core:C,renderCards:renderCards,focus:focus,onOverlayChange:isolateOverlay,onSearch:function(){tab('search');focus($('keyboard-open'));},keylessFilms:function(){
    var seen=Object.create(null);return library.recent.slice(0,3).concat(library.favorites.slice(0,3),Object.keys(starterFilms).map(function(id){return starterFilms[id];})).filter(function(film){var key=C.filmKey(film);if(seen[key])return false;seen[key]=true;return true;});
  }});
  updateCount();tab('home');focus($('home-search'));
}());
