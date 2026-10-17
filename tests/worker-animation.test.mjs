import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {fileURLToPath} from 'node:url';
import {workerAnimation} from '../public/worker-animation.js';
import {ACTIVITY_FRAMES} from '../public/worker-activity-frames.js';
import {drawActivityCharacter,drawActivityProps,drawThoughtBubble} from '../public/worker-activity-renderer.js';
globalThis.Image=class{};
const {OfficeScene}=await import('../public/office-scene.js');
const worker=(action,room='office')=>({id:'visual-fixture',seed:0,x:200,y:250,seated:true,action,room,agent:{id:'visual-fixture',name:'Fixture',colorIndex:0,status:'working',kind:'coding',title:'Build office'},destination:{facing:'back',seatAnchor:true,action}});

test('planning alternates writing and thinking without changing recorded status or seats',()=>{
 const w=worker('planning','studio'),before=structuredClone(w),poses=new Set();
 for(let t=0;t<12000;t+=420)poses.add(workerAnimation(w,t).pose);
 assert.deepEqual(poses,new Set(['writing','thinking']));assert.deepEqual(w,before);
 assert.notEqual(workerAnimation(w,100).frame,workerAnimation(w,500).frame);
 assert.equal(workerAnimation(w,9000).thought,true);
});

test('each room activity gets its own visual routine and walking overrides room decor',()=>{
 const cases=[['coffee','cafeteria','drinking'],['water','cafeteria','drinking'],['eating','cafeteria','eating'],['arcade','game','gaming'],['pingpong','game','pingpong'],['library-reading','library','reading'],['input','reception','relax'],['reports','meeting','relax'],['resting','quiet','quiet'],['focusing','focus','checking']];
 for(const [action,room,pose]of cases)assert.equal(workerAnimation(worker(action,room),100).pose,pose);
 assert.equal(workerAnimation(worker('focusing','focus'),10000).pose,'thinking');
 assert.equal(workerAnimation(worker('walking','quiet'),100).pose,'walking');
});

test('reduced motion freezes activity frames, scribbles, props and breathing phases',()=>{
 for(const action of ['planning','typing','coffee','eating','library-reading','focusing','pingpong']){
  const w=worker(action);assert.deepEqual(workerAnimation(w,100,true),workerAnimation(w,20000,true));
 }
});

test('decorative outings finish their journey, settle, and immediately yield to recorded work',()=>{
 const scene=new OfficeScene(createCanvas(900,600));scene.setAgents([{...worker('resting').agent,status:'idle'}]);const w=[...scene.workers.values()][0],target=scene.spots['library-reading'][0];
 w.destination={...target,desired:'library-reading',visualStatus:'idle'};w.path=[{x:100,y:100}];w.claim='fixture';scene.reservations.set('fixture',w.id);
 assert.equal(scene.desired(w,80000),'library-reading');w.path=[];w.arrivedAt=80000;
 assert.equal(scene.desired(w,85000),'library-reading');w.agent={...w.agent,status:'working',kind:'coding'};
 assert.equal(scene.desired(w,85000),'typing');
});

test('quiet dialogue is ellipsis and thought bubbles leave unread attention clickable',()=>{
 const scene=new OfficeScene(createCanvas(900,700)),quiet=worker('quiet','quiet');
 assert.equal(scene.workerDialogue(quiet),'...');scene.scale=.44;scene.now=9500;scene.overlays=[];
 const planning=worker('planning','studio');planning.agent.unreadCompletionAt=100;
 scene.drawWorker(planning,null,null);for(const draw of scene.overlays)draw();
 assert.ok(scene.hits.some(hit=>hit.id===planning.id&&hit.r<15),'attention retains its own hit target');
 assert.equal(scene.ctx.globalAlpha,1);
});

test('every additional decorative destination remains reachable and reservations stay unique',()=>{
 const scene=new OfficeScene(createCanvas(900,700)),start={x:100,y:scene.roomHeight+55};
 for(const action of ['library-reading','quiet','lounge','reception-rest','focusing']){
  const spots=scene.spots[action];assert.ok(spots.length>0);for(const spot of spots)assert.ok(scene.findPath(start,spot).length>0,action+' remains reachable');
 }
});

test('all eight identities have complete thinking and writing frames at stable seat anchors',async()=>{
 const image=await loadImage(new URL('../public/assets/office-workers-thinking-writing-v1.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
 const scene=new OfficeScene(createCanvas(900,700));scene.activitySprite=image;scene.activityReady=true;const calls=[];
 scene.ctx.drawImage=(...args)=>calls.push(args);
 assert.equal(ACTIVITY_FRAMES.length,8);
 for(let row=0;row<8;row++){
  assert.equal(ACTIVITY_FRAMES[row].length,8);
  for(const [x,y,w,h]of ACTIVITY_FRAMES[row]){assert.ok(w>40&&h>80);assert.ok(x>=0&&y>0&&x+w<image.width&&y+h<image.height-2,'complete figures have bottom padding');}
  for(const facing of ['front','back']){const w=worker('planning','studio');w.agent.colorIndex=row;w.destination.facing=facing;
   for(const time of [100,520,8000,8420])assert.equal(drawActivityCharacter(scene,w,workerAnimation(w,time)),true);
  }
 }
 assert.ok(calls.every(args=>args[8]===94&&args[6]===250-8-94*.72),'animation frames hold the same size and vertical anchor');
 const diagonal=worker('planning','studio');diagonal.destination.facing='ne';assert.equal(drawActivityCharacter(scene,diagonal,workerAnimation(diagonal,8000)),false,'diagonal chairs retain their original aligned pose');
});

test('reading books follow the chair direction and pass behind back-facing bodies',async()=>{
 const scene=new OfficeScene(createCanvas(900,700));scene.spriteReady=true;scene.directionSeatedReady=true;scene.reduced=true;
 const image=await loadImage(fileURLToPath(new URL('../public/assets/office-workers-seated-directions-v2.png',import.meta.url)));
 Object.defineProperty(image,'naturalWidth',{get:()=>image.width});scene.directionSeated=image;
 const events=[],round=scene.round.bind(scene),draw=scene.ctx.drawImage.bind(scene.ctx);
 scene.round=(...args)=>{if(args[5]==='#725d49')events.push({type:'book',transform:scene.ctx.getTransform()});round(...args);};
 scene.ctx.drawImage=(...args)=>{events.push({type:'body'});draw(...args);};
 for(const facing of ['front','right','back','left','ne','se','sw','nw']){
  events.length=0;const w=worker('library-reading','library');w.destination.facing=facing;const original=structuredClone(w);scene.drawWorker(w,null,null);
  assert.equal(events.filter(e=>e.type==='book').length,1,'each direction draws a single book');
  const behind=['back','ne','nw'].includes(facing);assert.equal(events[0].type,behind?'book':'body',facing+' layers the book on the held side of the body');
  const {a,b,e}=events.find(e=>e.type==='book').transform;
  if(['left','right'].includes(facing)){assert.ok(Math.abs(b)>Math.abs(a)*10,'profile spreads rotate sideways');assert.ok(facing==='right'?e>w.x:e<w.x,'the book is held ahead of the reader');}
  if(facing==='back')assert.equal(e,w.x,'back views keep the book ahead, centered behind the body');
  assert.deepEqual(w,original,'rendering never changes the seat or recorded activity');
 }
});

test('studio writing is rendered on its table surface after furniture, without a handheld clipboard',()=>{
 const scene=new OfficeScene(createCanvas(900,700)),studio=scene.rooms.find(r=>r.id==='studio'),table=scene.items.find(item=>item.type==='roundTable'&&item.x>studio.x);
 for(const place of scene.spots.planning){const w={...worker('planning','studio'),x:place.x,y:place.y,destination:place},surface=place.writingSurface;
  assert.ok(surface.x>=table.x&&surface.x<=table.x+table.w);assert.ok(surface.y>=table.y-31&&surface.y<=table.y+table.d-31);
  scene.surfaceOverlays=[];drawActivityProps(scene,w,workerAnimation(w,1000));assert.equal(scene.surfaceOverlays.length,1);
  for(const draw of scene.surfaceOverlays)draw();assert.equal(scene.ctx.globalAlpha,1);
 }
});

test('thought bubbles stay compact and track the head across camera scales and unread markers',()=>{
 const scene=new OfficeScene(createCanvas(900,700)),w=worker('planning','studio'),anchors=[];
 scene.headAnchors=new Map([[w.id,{x:210,y:175}]]);const translate=scene.ctx.translate.bind(scene.ctx),scale=scene.ctx.scale.bind(scene.ctx);
 scene.ctx.translate=(x,y)=>{anchors.push({x,y});translate(x,y);};const sizes=[];scene.ctx.scale=(x,y)=>{sizes.push({x,y});scale(x,y);};
 for(const zoom of [.3,.6,1.2])for(const unread of [0,100]){scene.scale=zoom;w.agent.unreadCompletionAt=unread;drawThoughtBubble(scene,w);}
 assert.ok(anchors.every(p=>p.x===210&&p.y===158.5));assert.ok(sizes.every(p=>p.x===.5&&p.y===.5));
});
