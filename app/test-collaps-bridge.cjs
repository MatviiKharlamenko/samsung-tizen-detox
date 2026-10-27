/* Contract samples from the observed bridge; no third-party code or media access. */
const assert=require('node:assert/strict'),Bridge=require('./collaps-bridge.js');
const fixtures=[];let checks=0;
function fixture(timeout){const calls=[],source={postMessage:(message,origin)=>calls.push({message,origin})};const bridge=Bridge.create({source,origin:'https://api.nextembed.ws',commandTimeoutMs:timeout});fixtures.push(bridge);return {bridge,calls,source,send:data=>bridge.accept({source,origin:'https://api.nextembed.ws',data})};}
function message(fields){return {type:'videoPlugin',sender:'plugin',target:'app',action:null,data:null,...fields};}
function check(name,fn){fn();checks++;console.log('ok',name);}
(async()=>{try{
check('Origin, source, envelope and object shape reject unrelated messages',()=>{
 const f=fixture();const payload=message({state:2,position:10,duration:100});
 assert.equal(f.bridge.accept({source:f.source,origin:'https://wrong.example',data:payload}),false);
 assert.equal(f.bridge.accept({source:{},origin:'https://api.nextembed.ws',data:payload}),false);
 for(const data of [null,[],JSON.stringify(payload),{...payload,sender:'app'},{...payload,target:'plugin'},{...payload,type:'interactionPlugin'},{...payload,action:'arbitrary:code'}])assert.equal(f.send(data),false);
 assert.equal(f.bridge.snapshot().ready,false);
});
check('Init alone is loading; ready is distinct from a playing acknowledgement',()=>{
 const f=fixture();assert(f.send(message({action:'plugin:init'})));assert.equal(f.bridge.snapshot().phase,'loading');assert.equal(f.bridge.toggle(),false);
 assert(f.send(message({action:'player:busy:stop:player'})));assert.equal(f.bridge.snapshot().phase,'ready');assert(f.bridge.toggle());
 assert.deepEqual(f.calls[0],{origin:'https://api.nextembed.ws',message:{type:'videoPlugin',sender:'app',target:'plugin',state:2}});
 assert.equal(f.bridge.snapshot().phase,'ready');f.send(message({state:2,position:20,duration:200,ended:false}));assert.equal(f.bridge.snapshot().phase,'playing');assert.equal(f.bridge.snapshot().pending,null);
});
check('Pause command never optimistically changes confirmed state',()=>{
 const f=fixture();f.send(message({state:2,position:42,duration:200}));assert(f.bridge.toggle());assert.equal(f.calls[0].message.state,3);
 assert.equal(f.bridge.snapshot().state,2);assert.equal(f.bridge.snapshot().phase,'playing');assert.equal(f.bridge.toggle(),false);
 f.send(message({state:3,position:42,duration:200}));assert.equal(f.bridge.snapshot().phase,'paused');assert.equal(f.bridge.snapshot().pending,null);
});
check('A new playing acknowledgement clears an old ended flag without requiring optional ended:false',()=>{
 const f=fixture();f.send(message({state:3,position:100,duration:100,ended:true}));assert.equal(f.bridge.snapshot().phase,'ended');
 assert(f.bridge.toggle());assert.equal(f.calls[0].message.state,2);f.send(message({state:2,position:0,duration:100}));
 assert.equal(f.bridge.snapshot().phase,'playing');assert.equal(f.bridge.snapshot().ended,false);assert(f.bridge.toggle());assert.equal(f.calls[1].message.state,3);
 f.send(message({state:2,position:100,duration:100,ended:true}));assert.equal(f.bridge.snapshot().phase,'ended');
});
check('Seek commands are absolute, separate from state and bounded by actual duration',()=>{
 const f=fixture();f.send(message({state:3,position:95,duration:100}));assert(f.bridge.seekBy(10));assert.deepEqual(f.calls[0].message,{type:'videoPlugin',sender:'app',target:'plugin',position:100});assert.equal(f.bridge.snapshot().position,95);
 f.send(message({state:3,position:100,duration:100}));f.send(message({state:3,position:5,duration:100}));assert(f.bridge.seekBy(-10));assert.equal(f.calls[1].message.position,0);
});
check('Bad numeric/boolean fields cannot corrupt media state; huge finite values are bounded',()=>{
 const f=fixture();f.send(message({state:3,position:5,duration:100}));
 for(const fields of [{position:'8'},{position:NaN},{duration:Infinity},{duration:-1},{ended:'true'},{muted:1},{state:9}])assert.equal(f.send(message(fields)),false);
 assert.equal(f.bridge.snapshot().position,5);f.send(message({state:3,position:1e99,duration:1e99}));assert.equal(f.bridge.snapshot().duration,604800);assert.equal(f.bridge.snapshot().position,604800);
});
check('Extra URLs/IDs are ignored rather than retained in snapshots',()=>{
 const f=fixture();f.send(message({state:2,position:1,duration:100,unexpectedUrl:'https://example.invalid/?token=fixture',contentId:'fixture'}));
 assert.equal(JSON.stringify(f.bridge.snapshot()).includes('token'),false);assert.equal(JSON.stringify(f.bridge.snapshot()).includes('contentId'),false);
});
check('Busy/init and destruction clear readiness/pending; old controller cannot send or accept',()=>{
 const f=fixture();f.send(message({state:2,position:40,duration:100}));f.bridge.toggle();f.send(message({action:'plugin:init'}));assert.equal(f.bridge.snapshot().position,null);assert.equal(f.bridge.snapshot().duration,null);assert.equal(f.bridge.snapshot().phase,'loading');
 f.bridge.destroy();assert.equal(f.send(message({state:2,position:2,duration:3})),false);assert.equal(f.bridge.toggle(),false);assert.equal(f.bridge.snapshot().ready,false);
});
const timed=fixture(12);timed.send(message({state:2,position:3,duration:100}));timed.bridge.toggle();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(timed.bridge.snapshot().state,2);assert.equal(timed.bridge.snapshot().pending,null);assert.equal(timed.bridge.snapshot().commandError,true);assert.equal(timed.calls.length,1);checks++;console.log('ok Missing acknowledgement times out without fabricating pause or retrying');
console.log(checks+' bridge contract checks passed');
}finally{fixtures.forEach(bridge=>bridge.destroy());}})().catch(error=>{console.error(error.message);process.exitCode=1;});
