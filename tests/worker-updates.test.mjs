import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';

globalThis.Image=class{};
const {OfficeScene}=await import('../public/office-scene.js');
const agent=(overrides={})=>({id:'worker',name:'Worker',title:'Improve appointment booking',status:'working',kind:'coding',colorIndex:0,...overrides});
const sceneFor=a=>{const scene=new OfficeScene(createCanvas(1000,700));scene.setAgents([a]);return scene;};

test('returning workers run at half the previous speed while following their route',()=>{
 const make=status=>{const scene=sceneFor(agent({status})),worker=scene.workers.get('worker'),y=scene.roomHeight+80;Object.assign(worker,{x:100,y});scene.choose=()=>({x:500,y,action:'typing',room:'office',seated:true});scene.update(0);scene.update(60);return {scene,worker};};
 const running=make('working'),walking=make('idle');
 assert.ok(running.worker.x>=118&&running.worker.x<=121,'running covers about 19–21 pixels in 60 ms');
 assert.ok(Math.abs((running.worker.x-100)-.06*(620+running.worker.seed%80)/2)<1e-9,'the same worker runs half as fast as before within floating-point precision');
 assert.ok(running.worker.x-100>2.5*(walking.worker.x-100));
 assert.equal(running.worker.running,true);assert.equal(walking.worker.running,false);
 assert.ok(running.worker.path.every(point=>!running.scene.blocked(point.x,point.y)),'the static route stays intact');
 for(let frame=1;frame<120;frame++)running.scene.update(60+frame*16.667);
 assert.equal(running.worker.x,500);assert.equal(running.worker.action,'typing');
 assert.equal(running.worker.agent.status,'working','movement never changes recorded status');
});

test('reduced motion suppresses running cues and animated movement',()=>{
 const scene=sceneFor(agent()),worker=scene.workers.get('worker');scene.reduced=true;const start={x:worker.x,y:worker.y};scene.update(0);scene.update(60);
 assert.equal(worker.running,false);assert.deepEqual({x:worker.x,y:worker.y},start);
});

test('planning and pod dialogue describe the public session task without using private data',()=>{
 const scene=sceneFor(agent({kind:'planning',reasoning:'PRIVATE',toolArguments:'SECRET'})),worker=scene.workers.get('worker');
 worker.destination={action:'planning'};assert.equal(scene.workerDialogue(worker),'Brainstorming appointment booking');
 worker.agent={...worker.agent,kind:'coding'};worker.destination={action:'typing'};
 assert.equal(scene.workerDialogue(worker),'Updating appointment booking');
 worker.room='studio';assert.equal(scene.workerDialogue(worker),'Brainstorming appointment booking','Planning Studio speech stays focused on brainstorming');
 assert.doesNotMatch(scene.workerDialogue(worker),/keyboard/i);worker.room='office';
 worker.agent.title='   ';assert.equal(scene.workerDialogue(worker),'Working on recorded task');
 worker.agent.title='x'.repeat(500);assert.equal(scene.workerDialogue(worker),'Working on recorded task');
 worker.agent.status='unknown';assert.doesNotMatch(scene.workerDialogue(worker),/PRIVATE|SECRET|xxxx|Working on/);
});

test('every worker dialogue is at most five words and prompt boilerplate never becomes speech',()=>{
 const scene=sceneFor(agent()),worker=scene.workers.get('worker');
 const titles=['Build dashboard notification badges','Fix appointment booking errors when visitors submit','Please improve appointment booking flow','Review payment validation','AGENTS.md instructions for C:\\Office: keep the office local','Example Project, DemoWellness, DEMOCLINIC, Agent-Office','<INSTRUCTIONS>Run npm start</INSTRUCTIONS>','Read C:\\Users\\developer\\Desktop\\private.txt','x'.repeat(100),'Fix agent_worker_session_010af8f6','First project\nSecond project\nThird project'];
 for(const title of titles)for(const status of ['working','delegating','waiting','idle','unknown'])for(const kind of ['coding','planning','research','reviewing']){
  worker.agent={...agent({title,status,kind})};worker.destination={action:kind==='planning'?'planning':'typing'};
  const text=scene.workerDialogue(worker);assert.ok(text.trim().split(/\s+/).length<=5,`${status}/${kind}: ${text}`);assert.ok(text.length<=57,'dialogue stays short in pixels too');assert.doesNotMatch(text,/AGENTS|C:|INSTRUCTIONS|private|agent_worker|DEMOCLINIC|Example Project|xxxxx|First project/);
 }
 worker.agent=agent({title:'Improve appointment booking flow'});worker.destination={action:'typing'};assert.equal(scene.workerDialogue(worker),'Updating appointment booking flow');
 worker.agent=agent({title:'Fix dashboard notifications and add tests'});assert.equal(scene.workerDialogue(worker),'Fixing dashboard notifications');
 worker.agent=agent({title:'AGENTS.md instructions',kind:'research'});assert.equal(scene.workerDialogue(worker),'Researching project references','boilerplate falls back to recorded activity kind');
});

test('unread completion marker remains clickable above the worker and below task speech',()=>{
 const scene=sceneFor(agent({unreadCompletionAt:100})),worker=scene.workers.get('worker');
 scene.scale=.3;scene.offset={x:10,y:20};scene.now=1000;scene.speakerId=worker.id;scene.overlays=[];
 const texts=[],fill=scene.ctx.fillText.bind(scene.ctx);scene.ctx.fillText=(text,x,y,...args)=>{texts.push({text,x,y});fill(text,x,y,...args);};
 scene.drawWorker(worker,null,null);for(const overlay of scene.overlays)overlay();
 const marker=texts.find(entry=>entry.text==='!');assert.ok(marker);
 assert.ok(scene.hits.some(hit=>hit.id===worker.id&&Math.hypot(hit.x-(scene.offset.x+marker.x*scene.scale),hit.y-(scene.offset.y+(marker.y-4/.3)*scene.scale))<1),'marker has its own worker hit target');
 assert.ok(texts.filter(entry=>entry.text!=='!').every(entry=>entry.y<marker.y-22/.3),'speech stays clear of the attention marker');
 assert.ok(texts.some(entry=>entry.text==='VISUAL'),'scripted speech is labeled as visual');
 scene.setAgents([agent({unreadCompletionAt:0})]);scene.hits=[];scene.overlays=[];texts.length=0;scene.drawWorker(worker,null,null);for(const overlay of scene.overlays)overlay();
 assert.equal(texts.some(entry=>entry.text==='!'),false,'read completion removes the marker');
});
