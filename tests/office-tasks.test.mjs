import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('office Create task sends only on Send and follows up in the same session',async()=>{
 const elements=new Map(),listeners=new Map(),requests=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,disabled:false,textContent:'',innerHTML:'',addEventListener:(event,fn)=>listeners.set(id+':'+event,fn),showModal(){this.open=true;},close(){this.open=false;},focus(){}});return elements.get(id);};
 const state={project:'C:/Projects/local',world:{
  csrfToken:'local-token',projects:[{path:'C:/Projects/local',name:'Local floor'}],
  runner:{providers:[{id:'codex',available:true},{id:'claude',available:false}],catalog:{codex:{models:[{id:'model-1',label:'Model One',efforts:['low','high']}],efforts:['low','high']}},tasks:[]}
 }};
 let job={id:'12345678-1234-1234-1234-123456789abc',status:'running',activity:'Working',projectPath:state.project,provider:'codex',canFollowup:false,reply:'',history:[]},updated=0;
 const context=vm.createContext({document:{getElementById:el},setInterval(){},fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>structuredClone(job)};}});
 context.getState=()=>state;context.onUpdate=()=>updated++;
 vm.runInContext(fs.readFileSync(new URL('../public/office-tasks.js',import.meta.url),'utf8').replace(/^export /gm,''),context);vm.runInContext('installOfficeTasks({getState,onUpdate})',context);
 el('task-provider').value='codex';el('task-mode').value='read-only';await listeners.get('open-prompt:click')();
 assert.equal(el('prompt-dialog').open,true);assert.match(el('prompt-project').textContent,/Local floor/);assert.equal(requests.length,0,'opening does not launch a task');
 el('task-provider').value='claude';listeners.get('task-provider:change')();assert.equal(el('send-prompt').disabled,true);assert.match(el('task-provider-note').textContent,/unavailable/);await listeners.get('send-prompt:click')();assert.equal(requests.length,0);
 el('task-provider').value='codex';listeners.get('task-provider:change')();el('task-model').value='model-1';listeners.get('task-model:input')();el('task-effort').value='high';el('prompt-text').value='Review this project';assert.equal(requests.length,0);
 await listeners.get('send-prompt:click')();assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/tasks');assert.equal(requests[0].options.headers['X-Office-Token'],'local-token');
 assert.deepEqual(JSON.parse(requests[0].options.body),{prompt:'Review this project',projectPath:state.project,mode:'read-only',provider:'codex',model:'model-1',effort:'high'});assert.equal(el('send-followup').disabled,true);
 el('task-followup-text').value='Continue';await listeners.get('send-followup:click')();assert.equal(requests.length,1,'a running turn cannot receive a follow-up');
 job={...job,status:'completed',canFollowup:true,reply:'<script>Public text</script>'};await listeners.get('open-prompt:click')();assert.equal(el('task-reply').textContent,job.reply);assert.equal(el('send-followup').disabled,false);
 job={...job,status:'running',canFollowup:false};await listeners.get('send-followup:click')();const last=requests.at(-1);assert.equal(last.url,`/api/tasks/${job.id}/followup`);assert.deepEqual(JSON.parse(last.options.body),{prompt:'Continue'});assert.equal(updated,2);assert.equal(el('task-followup-text').value,'');
 state.project='C:/Projects/other';state.world.projects.push({path:state.project,name:'Other floor'});await listeners.get('open-prompt:click')();assert.equal(el('task-reply').hidden,true);assert.equal(el('task-reply').textContent,'');assert.equal(el('task-followup-section').hidden,true);
 const before=requests.length;state.world.runner={available:true};await listeners.get('open-prompt:click')();assert.equal(el('send-prompt').disabled,true);assert.match(el('task-provider-note').textContent,/Restart/);await listeners.get('send-prompt:click')();assert.equal(requests.length,before,'an older running backend cannot silently ignore task settings');
});
