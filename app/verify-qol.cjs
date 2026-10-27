/* 0.2.1 behavior checks, isolated local Chrome, all remote requests mocked/blocked. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const reportDir=path.resolve(process.env.CINEMA_REPORT_DIR||path.join(__dirname,'..','build','browser-reports'));fs.mkdirSync(reportDir,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const report={version:JSON.parse(fs.readFileSync(path.join(__dirname,'EXPORT-MANIFEST.json'),'utf8')).exportVersion,scope:'Local isolated browser; external metadata fixtures and blocked images, no TV/CDP input',checks:[]};
  const catalogRequests=[],playerRequests=[],errors=[];let searchMode='film',releaseSearch=null;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='www.wikidata.org'){
      const action=url.searchParams.get('action');catalogRequests.push({action,query:url.searchParams.get('search'),language:url.searchParams.get('language')});
      let data;
      if(action==='wbsearchentities'&&searchMode==='hold')await new Promise(resolve=>{const prior=releaseSearch;releaseSearch=()=>{if(prior)prior();resolve();};});
      if(action==='wbsearchentities'&&searchMode==='fail')return route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{}'});
      if(action==='wbsearchentities')data={search:searchMode==='film'?[{id:'Q13417189'}]:[]};
      else if(action==='wbgetentities')data={entities:{Q13417189:{id:'Q13417189',labels:{ru:{value:'Интерстеллар'},en:{value:'Interstellar'}},descriptions:{ru:{value:'Тестовая запись поиска'}},claims:{P2603:[{mainsnak:{datavalue:{value:'258687'}}}],P577:[{mainsnak:{datavalue:{value:{time:'+2014-10-26T00:00:00Z'}}}}]}}}};
      else data={query:{search:[]}};
      return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify(data)});
    }
    if(url.hostname==='fbphdplay.top'){
      playerRequests.push(url.searchParams.get('kinopoisk'));
      return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({data:[{type:'Local fixture',iframeUrl:'https://theatre.stravers.live/?fixture=1',translations:[{name:'Только проверка управления'}]}]})});
    }
    if(url.protocol==='http:' && url.hostname==='127.0.0.1')return route.continue();
    return route.abort('blockedbyclient');
  });
  try{
    await page.goto(process.env.CINEMA_PREVIEW_URL || 'http://127.0.0.1:8876/',{waitUntil:'domcontentloaded'});await page.locator('[data-tab="search"]').click();
    const starters=[['258687','Интерстеллар','2014'],['47015','Убить Билла. Фильм 2','2004'],['342','Криминальное чтиво','1994']];
    for(const [id,title,year] of starters){
      await page.locator('[data-starter-id="'+id+'"]').click();
      await page.waitForFunction(()=>!document.getElementById('detail').hidden && document.querySelectorAll('#providers button').length===1,null,{timeout:5000});
      assert.equal(await page.locator('#detail-title').textContent(),title);assert.equal(await page.locator('#detail-meta').textContent(),year);
      assert.equal(catalogRequests.length,0);assert.equal(playerRequests.at(-1),id);
      await page.keyboard.press('Escape');assert.equal(await page.locator(':focus').getAttribute('data-starter-id'),id);
    }
    report.checks.push({name:'All three starter cards open exact known IDs/details in one click, with no Wikidata calls and correct return focus',passed:true});
    const input=page.locator('#search-input');
    await input.focus();await input.press('Enter');
    assert.equal(await page.locator('#keyboard').isVisible(),true);assert.equal(catalogRequests.length,0);
    await page.keyboard.press('Escape');
    report.checks.push({name:'Enter on an empty search input opens the own keyboard without starting search',passed:true});
    await input.fill('');await input.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'),'keyboard-open');
    await page.keyboard.press('Enter');assert.equal(await page.locator('#keyboard').isVisible(),true);await page.keyboard.press('Escape');
    report.checks.push({name:'Right on an empty field reaches Keyboard, and Enter opens it',passed:true});
    await input.fill('Interstellar');await input.evaluate(element=>element.setSelectionRange(element.value.length,element.value.length));await input.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'),'keyboard-open');assert.equal(await input.inputValue(),'Interstellar');
    report.checks.push({name:'Right at the end of text reaches Keyboard without modifying text',passed:true});
    await input.focus();await input.evaluate(element=>element.setSelectionRange(3,3));await input.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'),'search-input');assert.equal(await input.evaluate(element=>element.selectionStart),4);
    await input.press('ArrowLeft');assert.equal(await input.evaluate(element=>element.selectionStart),3);
    report.checks.push({name:'Left/right in the middle keep normal text caret movement',passed:true});
    await input.evaluate(element=>element.setSelectionRange(0,element.value.length));await input.press('ArrowRight');
    assert.equal(await page.locator(':focus').getAttribute('id'),'search-input');assert.equal(await input.evaluate(element=>element.selectionStart),12);
    report.checks.push({name:'Right collapses a text selection before a later boundary move',passed:true});
    await input.press('Enter');
    await page.waitForFunction(()=>document.querySelectorAll('#results .film-card').length===1 && !document.getElementById('search-submit').disabled,null,{timeout:5000});
    assert.deepEqual(catalogRequests.filter(request=>request.action==='wbsearchentities').map(request=>request.language).sort(),['en','ru']);
    assert.equal(catalogRequests.filter(request=>request.action==='wbgetentities').length,1);
    assert.equal(await page.locator('#keyboard').isHidden(),true);
    report.checks.push({name:'Enter with text performs exactly one bilingual search, not a duplicate form submit',passed:true});
    await input.focus();const countBefore=catalogRequests.length;
    const prevented=await input.evaluate(element=>{const event=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,isComposing:true,bubbles:true,cancelable:true});element.dispatchEvent(event);return event.defaultPrevented;});
    await page.waitForTimeout(80);assert.equal(prevented,false);assert.equal(catalogRequests.length,countBefore);assert.equal(await page.locator(':focus').getAttribute('id'),'search-input');
    report.checks.push({name:'IME composition Enter is left to the native input path',passed:true});
    for(const mode of ['empty','fail']){
      searchMode=mode;await input.fill('Audit '+mode);await page.locator('#search-submit').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>!document.getElementById('search-submit').disabled,null,{timeout:5000});
      assert.equal(await page.evaluate(()=>document.activeElement.id),'search-submit');
      const before=catalogRequests.length;await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.getElementById('search-submit').disabled,null,{timeout:5000});assert.equal(catalogRequests.length,before+2);
      report.checks.push({name:(mode==='empty'?'Empty':'Failed')+' search preserves remote Search focus and Enter retries without a navigation detour',passed:true});
    }
    searchMode='hold';releaseSearch=null;await input.fill('Audit delayed');await page.locator('#search-submit').focus();await page.keyboard.press('Enter');
    await page.waitForTimeout(40);await page.locator('[data-tab="favorites"]').click();const chosenFocus=await page.locator(':focus').evaluate(element=>({id:element.id,tab:element.dataset.tab}));
    searchMode='empty';releaseSearch();await page.waitForFunction(()=>!document.getElementById('search-submit').disabled,null,{timeout:5000});
    assert.deepEqual(await page.locator(':focus').evaluate(element=>({id:element.id,tab:element.dataset.tab})),chosenFocus);assert.equal(await page.locator('#collection-view').isVisible(),true);
    report.checks.push({name:'Completing a delayed empty search does not steal focus after navigation to another section',passed:true});
    assert.equal(await page.locator('iframe').count(),0);assert.deepEqual(errors,[]);
    report.checks.push({name:'No player frame or unhandled JS exception during QoL checks',passed:true});
    report.allPassed=true;
  }catch(error){report.allPassed=false;report.error=error.message;report.dom=await page.evaluate(()=>({title:document.title,detailHidden:document.getElementById('detail').hidden,detailTitle:document.getElementById('detail-title').textContent,playersStatus:document.getElementById('players-status').textContent,providerCount:document.querySelectorAll('#providers button').length,starterIds:Array.from(document.querySelectorAll('[data-starter-id]')).map(x=>x.dataset.starterId),core:!!window.CinemaCore,adapters:!!window.CinemaAdapters}));throw error;}
  finally{if(releaseSearch)releaseSearch();report.catalogRequestCount=catalogRequests.length;report.playerRequestIds=playerRequests;report.unhandledErrors=errors;fs.writeFileSync(path.join(reportDir,'qol-verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({allPassed:report.allPassed,checks:report.checks.length,error:report.error||null}));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
