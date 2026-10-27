(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CinemaCollapsBridge=api;}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var MAX_SECONDS=604800,nextRequestId=0;
  function finite(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
  function create(options){
    if(options.origin!=='https://api.nextembed.ws'||!options.source||typeof options.source.postMessage!=='function')throw new Error('Unsupported bridge destination');
    var source=options.source,origin=options.origin,active=true,timer=null,soundsTimer=null,soundsRequest=null,soundItems=[],soundsStatus='idle',lastSoundValue=null;
    var state={ready:false,state:null,position:null,duration:null,ended:false,pending:null,commandError:false};
    function snapshot(){
      var phase=!state.ready?'loading':state.ended?'ended':state.state===2?'playing':state.state===3?'paused':'ready';
      return {ready:state.ready,state:state.state,position:state.position,duration:state.duration,ended:state.ended,
        phase:phase,pending:state.pending?{kind:state.pending.kind,value:state.pending.value}:null,commandError:state.commandError,
        sounds:{status:soundsStatus,items:soundItems.map(function(item){return {key:item.key,label:item.label};}),lastRequestedKey:(soundItems.find(function(item){return item.value===lastSoundValue;})||{}).key||null}};
    }
    function emit(){if(active&&typeof options.onChange==='function')options.onChange(snapshot());}
    function clearPending(){clearTimeout(timer);timer=null;state.pending=null;}
    function clearSounds(resetChoice){clearTimeout(soundsTimer);soundsTimer=null;soundsRequest=null;soundItems=[];soundsStatus='idle';if(resetChoice)lastSoundValue=null;}
    function soundsResponse(data){
      if(!soundsRequest||data.action!=='response:'+soundsRequest)return false;
      var body=data.data;
      if(!body||typeof body!=='object'||Array.isArray(body))return false;
      if(!body.error&&!Array.isArray(body.items))return false;
      clearTimeout(soundsTimer);soundsTimer=null;soundsRequest=null;soundItems=[];
      if(body.error){soundsStatus='error';emit();return true;}
      var seen=Object.create(null);
      body.items.slice(0,100).forEach(function(item){
        if(soundItems.length>=30||!item||typeof item!=='object'||Array.isArray(item)||item.action!=='player:commit:message:sound')return;
        if(typeof item.label!=='string'||!item.label.trim()||typeof item.data!=='string'||!item.data.length||item.data.length>2048||/[\u0000-\u001f\u007f]/.test(item.data)||seen[item.data])return;
        seen[item.data]=true;soundItems.push({key:'sound-'+soundItems.length,label:item.label.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,180),value:item.data});
      });
      soundsStatus=soundItems.length?'ready':'error';emit();return true;
    }
    function requestSounds(){
      if(!active||!state.ready||soundsRequest)return false;
      clearSounds(false);soundsRequest='cinema-sounds-'+(++nextRequestId);soundsStatus='loading';
      try{source.postMessage({type:'videoPlugin',sender:'app',target:'plugin',data:{requestId:soundsRequest,dataId:'sounds'}},origin);}
      catch(_){clearSounds(false);soundsStatus='error';emit();return false;}
      soundsTimer=setTimeout(function(){if(!active)return;soundsRequest=null;soundItems=[];soundsStatus='error';emit();},options.soundsTimeoutMs||6000);
      emit();return true;
    }
    function selectSound(key){
      if(!active||!state.ready||soundsStatus!=='ready')return false;
      var item=soundItems.find(function(item){return item.key===key;});if(!item)return false;
      try{source.postMessage({type:'videoPlugin',sender:'app',target:'plugin',data:{message:'sound',data:item.value}},origin);}
      catch(_){return false;}
      lastSoundValue=item.value;emit();return true;
    }
    function accept(event){
      if(!active||event.source!==source||event.origin!==origin)return false;
      var data=event.data;
      if(!data||typeof data!=='object'||Array.isArray(data)||data.type!=='videoPlugin'||data.sender!=='plugin'||data.target!=='app')return false;
      if(typeof data.action==='string'&&data.action.indexOf('response:')===0)return soundsResponse(data);
      var action=data.action;
      if(action!==undefined&&action!==null&&['plugin:init','player:busy:start:player','player:busy:stop:player'].indexOf(action)<0)return false;
      if(data.data!==undefined&&data.data!==null)return false;
      if(data.state!==undefined&&data.state!==2&&data.state!==3)return false;
      if(data.position!==undefined&&!finite(data.position))return false;
      if(data.duration!==undefined&&!finite(data.duration))return false;
      if(data.ended!==undefined&&typeof data.ended!=='boolean')return false;
      if(data.muted!==undefined&&typeof data.muted!=='boolean')return false;
      if(action==='plugin:init'||action==='player:busy:start:player'){
        state.ready=false;state.state=null;clearPending();clearSounds(action==='plugin:init');
        if(action==='plugin:init'){state.position=null;state.duration=null;state.ended=false;state.commandError=false;}
      }else if(action==='player:busy:stop:player')state.ready=true;
      if(data.duration!==undefined)state.duration=Math.min(data.duration,MAX_SECONDS);
      if(data.position!==undefined)state.position=Math.min(data.position,state.duration>0?state.duration:MAX_SECONDS);
      if(state.duration>0&&state.position!==null)state.position=Math.min(state.position,state.duration);
      if(data.state===2&&data.ended===undefined)state.ended=false;
      if(data.ended!==undefined)state.ended=data.ended;
      if(data.state!==undefined){state.state=data.state;state.ready=true;}
      if(state.pending&&((state.pending.kind==='state'&&data.state===state.pending.value)||
        (state.pending.kind==='seek'&&data.position!==undefined&&Math.abs(state.position-state.pending.value)<=2))){clearPending();state.commandError=false;}
      emit();return true;
    }
    function send(kind,value){
      if(!active||!state.ready||state.pending)return false;
      var message={type:'videoPlugin',sender:'app',target:'plugin'};
      if(kind==='state'){if(value!==2&&value!==3)return false;message.state=value;}
      else if(kind==='seek'){if(!finite(value)||!finite(state.duration)||state.duration<=0)return false;message.position=Math.max(0,Math.min(value,state.duration));value=message.position;}
      else return false;
      try{source.postMessage(message,origin);}catch(_){state.commandError=true;emit();return false;}
      state.commandError=false;state.pending={kind:kind,value:value};
      timer=setTimeout(function(){if(!active)return;state.pending=null;state.commandError=true;emit();},options.commandTimeoutMs||4000);
      emit();return true;
    }
    return {
      accept:accept,snapshot:snapshot,requestSounds:requestSounds,selectSound:selectSound,cancelSounds:function(){clearSounds(false);emit();},
      toggle:function(){return send('state',state.state===2&&!state.ended?3:2);},
      seekBy:function(delta){if(typeof delta!=='number'||!Number.isFinite(delta)||state.position===null)return false;return send('seek',Math.max(0,Math.min(state.position+delta,state.duration>0?state.duration:0)));},
      destroy:function(){active=false;clearPending();clearSounds(true);state={ready:false,state:null,position:null,duration:null,ended:false,pending:null,commandError:false};}
    };
  }
  return {create:create};
}));
