/* Real browser messaging/focus with independently controlled child fixture; no TV or media. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const reportDir=path.resolve(process.env.CINEMA_REPORT_DIR||path.join(__dirname,'..','build','browser-reports'));fs.mkdirSync(reportDir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1920,height:1080}});
 const base=process.env.CINEMA_PREVIEW_URL||'http://127.0.0.1:8876/',parentOrigin=new URL(base).origin;
 const report={version:JSON.parse(fs.readFileSync(path.join(__dirname,'EXPORT-MANIFEST.json'),'utf8')).exportVersion,scope:'Isolated local Chrome with own remote-origin fixture; no TV, real player or media',checks:[]},errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 let documentMode='normal',releaseLoad=null;
 const child='<!doctype html><html><body>Controlled bridge fixture<script>window.commands=[];window.loaded=false;addEventListener("load",function(){window.loaded=true});window.emitBridge=function(fields){parent.postMessage(Object.assign({type:"videoPlugin",sender:"plugin",target:"app",action:null,data:null},fields),'+JSON.stringify(parentOrigin)+');};addEventListener("message",function(event){if(event.source===parent&&event.origin==='+JSON.stringify(parentOrigin)+'&&event.data&&event.data.type==="videoPlugin"&&event.data.sender==="app"&&event.data.target==="plugin")window.commands.push(event.data);});emitBridge({action:"plugin:init"});<\/script></body></html>';
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin===parentOrigin)return route.continue();
  if(url.hostname==='fbphdplay.top')return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({data:[
   {type:'Alloha',iframeUrl:'https://theatre.stravers.live/fixture',translations:[{name:'Other provider fixture'}]},
   {type:'Collaps',iframeUrl:'https://api.nextembed.ws/fixture?variant=1',translations:[{name:'First test voice',quality:'Fixture',iframeUrl:'https://api.nextembed.ws/fixture?variant=1'},{name:'Second test voice',iframeUrl:'https://api.nextembed.ws/fixture?variant=2'}]}
  ]})});
  if(url.hostname==='api.nextembed.ws'){
   if(url.pathname==='/hold-load')return new Promise(resolve=>{releaseLoad=async()=>{await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'});resolve();};});
   let body=child;
   if(documentMode==='silent')body=body.replace('emitBridge({action:"plugin:init"});','');
   if(documentMode==='early-ready')body=body.replace('</body>','<script>emitBridge({state:2,position:11,duration:100});<\/script><img src="https://api.nextembed.ws/hold-load"></body>');
   return route.fulfill({status:200,contentType:'text/html',body});
  }
  if(url.hostname==='theatre.stravers.live')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>Unverified other provider fixture</body></html>'});
  return route.abort('blockedbyclient');
 });
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('[data-tab="search"]').click();await page.locator('[data-starter-id="258687"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#providers button').length===2,null,{timeout:5000});
  assert.match(await page.locator('#providers .selected').textContent(),/Collaps/);
  report.checks.push({name:'Collaps is preferred over API-first Alloha when no preference is saved',passed:true});
  await page.locator('#translations button').first().click();await page.waitForSelector('#player-frame');
  let frame=page.frames().find(item=>item.url().startsWith('https://api.nextembed.ws/'));
  await frame.waitForFunction(()=>typeof window.emitBridge==='function');
  const emit=async fields=>{await frame.evaluate(value=>window.emitBridge(value),fields);await page.waitForTimeout(35);};
  await emit({action:'plugin:init'});assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'loading');
  assert.equal(await page.locator('#watch-toggle').isDisabled(),true);assert.equal(await page.locator('#player-frame').getAttribute('tabindex'),'-1');assert.equal(await page.locator('#player-frame').evaluate(element=>element.inert),true);
  report.checks.push({name:'Init is loading, controls are disabled, and bridged iframe is inert/out of tab order',passed:true});
  await emit({action:'player:busy:stop:player'});assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'ready');assert.equal(await page.locator('#watch-toggle').textContent(),'Воспроизвести');assert.equal(await page.locator(':focus').getAttribute('id'),'watch-back');
  await page.locator('#watch-toggle').click();await frame.waitForFunction(()=>window.commands.length===1);
  assert.equal(await frame.evaluate(()=>window.commands[0].state),2);assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'ready');
  await emit({state:2,position:42,duration:200,ended:false,muted:false});
  assert.equal(await page.locator('#watch-toggle').textContent(),'Пауза');assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'playing');
  report.checks.push({name:'Ready differs from playing; play uses an object command and waits for acknowledgement',passed:true});
  await page.locator('#watch-toggle').click();await frame.waitForFunction(()=>window.commands.length===2);assert.equal(await frame.evaluate(()=>window.commands[1].state),3);
  assert.equal(await page.locator('#watch-toggle').textContent(),'Пауза');await emit({state:3,position:42,duration:200});assert.equal(await page.locator('#watch-toggle').textContent(),'Воспроизвести');
  report.checks.push({name:'Pause label/state change only after native-shaped state3 acknowledgement',passed:true});
  await page.locator('#watch-forward').click();await frame.waitForFunction(()=>window.commands.length===3);assert.equal(await frame.evaluate(()=>window.commands[2].position),52);
  assert.equal(await page.locator('#watch-time').textContent(),'0:42 / 3:20');await emit({state:3,position:52,duration:200});assert.equal(await page.locator('#watch-time').textContent(),'0:52 / 3:20');
  await page.locator('#watch-rewind').click();await frame.waitForFunction(()=>window.commands.length===4);assert.equal(await frame.evaluate(()=>window.commands[3].position),42);await emit({state:3,position:42,duration:200});
  await emit({state:3,position:195,duration:200});await page.locator('#watch-forward').click();await frame.waitForFunction(()=>window.commands.length===5);assert.equal(await frame.evaluate(()=>window.commands[4].position),200);await emit({state:3,position:200,duration:200});
  await emit({state:3,position:5,duration:200});await page.locator('#watch-rewind').click();await frame.waitForFunction(()=>window.commands.length===6);assert.equal(await frame.evaluate(()=>window.commands[5].position),0);await emit({state:3,position:0,duration:200});
  report.checks.push({name:'±10 second controls send separate absolute seeks, clamp boundaries, and display only acknowledged position',passed:true});
  for(const id of ['watch-toggle','watch-rewind','watch-forward']){
   await page.locator('#'+id).focus();const count=await frame.evaluate(()=>window.commands.length);
   await emit({action:'player:busy:start:player'});assert.equal(await page.locator(':focus').getAttribute('id'),id);assert.equal(await page.locator('#'+id).getAttribute('aria-disabled'),'true');
   await page.keyboard.press('Enter');assert.equal(await frame.evaluate(()=>window.commands.length),count);
   await emit({action:'player:busy:stop:player'});assert.equal(await page.locator(':focus').getAttribute('id'),id);
   await emit({state:3,position:0,duration:200});
  }
  await page.locator('#watch-toggle').focus();await emit({action:'player:busy:start:player'});await page.locator('#watch-back').focus();
  await emit({action:'player:busy:stop:player'});assert.equal(await page.locator(':focus').getAttribute('id'),'watch-back');
  await page.locator('#watch-browser').focus();await emit({state:3,position:0,duration:200});assert.equal(await page.locator(':focus').getAttribute('id'),'watch-browser');
  report.checks.push({name:'Buffering preserves each focused transport button, ignores OK until ready and never steals deliberate Back/browser focus',passed:true});
  await emit({state:3,position:200,duration:200,ended:true});assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'ended');
  await page.locator('#watch-toggle').click();let commands=await frame.evaluate(()=>window.commands);assert.equal(commands.at(-1).state,2);
  await emit({state:2,position:0,duration:200});assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'playing');assert.equal(await page.locator('#watch-toggle').textContent(),'Пауза');
  await page.locator('#watch-toggle').click();commands=await frame.evaluate(()=>window.commands);assert.equal(commands.at(-1).state,3);await emit({state:3,position:0,duration:200});
  report.checks.push({name:'Replay clears stale ended state on state2 without optional ended:false and the next OK pauses',passed:true});
  const before=await page.locator('#watch-time').textContent();
  await page.evaluate(()=>{const envelope={type:'videoPlugin',sender:'plugin',target:'app',action:null,data:null,state:2,position:999,duration:999};window.dispatchEvent(new MessageEvent('message',{source:document.getElementById('player-frame').contentWindow,origin:'https://wrong.example',data:envelope}));window.dispatchEvent(new MessageEvent('message',{source:window,origin:'https://api.nextembed.ws',data:envelope}));});
  await emit({state:2,position:'999',duration:999});assert.equal(await page.locator('#watch-time').textContent(),before);assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'paused');
  report.checks.push({name:'Wrong origin, sibling source and nonnumeric media fields cannot spoof UI state',passed:true});
  await page.locator('#watch-toggle').focus();
  for(const key of ['ArrowLeft','ArrowRight','ArrowRight','ArrowDown','ArrowUp','Tab','Shift+Tab','Tab','Tab','Tab','Tab']){
   await page.keyboard.press(key);assert.notEqual(await page.locator(':focus').getAttribute('id'),'player-frame');assert.equal(await page.locator(':focus').evaluate(element=>!!element.closest('#watch')),true);
  }
  await page.locator('#player-frame').evaluate(element=>element.focus());assert.notEqual(await page.locator(':focus').getAttribute('id'),'player-frame');
  report.checks.push({name:'D-pad, Tab and programmatic iframe focus remain in parent controls',passed:true});
  await page.evaluate(()=>window.__oldPlayerWindow=document.getElementById('player-frame').contentWindow);
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'BrowserBack',keyCode:10009,bubbles:true,cancelable:true})));
  assert.equal(await page.locator('#watch').isHidden(),true);assert.equal(await page.locator('iframe').count(),0);assert.match(await page.locator(':focus').textContent(),/Collaps/);
  report.checks.push({name:'TV-shaped Back10009 removes iframe and returns to the selected provider',passed:true});
  await page.locator('#translations button').nth(1).click();await page.waitForSelector('#player-frame');frame=page.frames().find(item=>item.url().startsWith('https://api.nextembed.ws/'));await frame.waitForFunction(()=>typeof window.emitBridge==='function');
  assert.equal(await page.locator('#watch-time').textContent(),'—:— / —:—');assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'loading');
  await page.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{source:window.__oldPlayerWindow,origin:'https://api.nextembed.ws',data:{type:'videoPlugin',sender:'plugin',target:'app',action:null,data:null,state:2,position:77,duration:100}})));
  assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'loading');
  report.checks.push({name:'Changing translation resets state and rejects events from the removed frame',passed:true});
  await page.keyboard.press('Escape');documentMode='early-ready';await page.locator('#translations button').nth(1).click();await page.waitForSelector('#player-frame');frame=page.frames().find(item=>item.url().startsWith('https://api.nextembed.ws/'));
  await page.waitForFunction(()=>document.getElementById('watch').dataset.playerState==='playing');assert.equal(await page.locator('#watch-time').textContent(),'0:11 / 1:40');
  assert.equal(await frame.evaluate(()=>window.loaded),false);assert.equal(typeof releaseLoad,'function');await releaseLoad();await frame.waitForFunction(()=>window.loaded);await page.waitForTimeout(40);
  assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'playing');assert.equal(await page.locator('#watch-time').textContent(),'0:11 / 1:40');
  report.checks.push({name:'First iframe load preserves valid ready/state messages received before its load event',passed:true});
  await page.locator('#watch-toggle').click();assert.equal(await page.locator('#watch-toggle').getAttribute('aria-disabled'),'true');documentMode='silent';await frame.goto('https://api.nextembed.ws/fixture?generation=silent',{waitUntil:'load'});await page.waitForTimeout(40);
  assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'loading');assert.equal(await page.locator('#watch-time').textContent(),'—:— / —:—');assert.equal(await page.locator(':focus').getAttribute('id'),'watch-toggle');assert.equal(await page.locator('#watch-status').textContent(),'Плеер готовится…');
  await page.keyboard.press('Enter');assert.equal(await frame.evaluate(()=>window.commands.length),0);assert.equal(await page.locator('#watch-toggle').getAttribute('aria-disabled'),'true');
  await page.waitForFunction(()=>document.getElementById('watch-status').textContent.includes('не подготовился'),null,{timeout:22000});
  await emit({state:3,position:0,duration:100});assert.equal(await page.locator('#watch').getAttribute('data-player-state'),'paused');assert.equal(await page.locator('#watch-toggle').getAttribute('aria-disabled'),'false');
  report.checks.push({name:'Repeated same-origin iframe navigation resets stale state/time/commands and starts a fresh readiness deadline',passed:true});
  await page.keyboard.press('Escape');await page.locator('#providers button').filter({hasText:'Alloha'}).click();await page.locator('#translations button').click();await page.waitForSelector('#player-frame');
  assert.equal(await page.locator('#watch-controls').isHidden(),true);assert.equal(await page.locator('#player-frame').getAttribute('tabindex'),'0');assert.equal(await page.locator('#player-frame').evaluate(element=>element.inert),false);
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.locator('[data-starter-id="258687"]').click();await page.waitForFunction(()=>document.querySelectorAll('#providers button').length===2,null,{timeout:5000});assert.match(await page.locator('#providers .selected').textContent(),/Alloha/);
  report.checks.push({name:'Other providers retain their explicit unverified fallback and saved preference overrides default Collaps',passed:true});
  assert.deepEqual(errors,[]);report.allPassed=true;
 }catch(error){report.allPassed=false;report.error=error.message;report.watch=await page.locator('#watch-status').textContent();throw error;}
 finally{report.unhandledErrors=errors;fs.writeFileSync(path.join(reportDir,'collaps-verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({allPassed:report.allPassed,checks:report.checks.length,error:report.error||null}));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
