import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {workerAnimation} from '../public/worker-animation.js';
import {LEISURE_FRAMES} from '../public/worker-activity-frames.js';
import {drawActivityCharacter} from '../public/worker-activity-renderer.js';
globalThis.Image=class{};
const {OfficeScene}=await import('../public/office-scene.js');
const scene=()=>new OfficeScene(createCanvas(1000,700));
const agent=(id,status='idle')=>({id,name:id,colorIndex:0,status,kind:'done'});

test('standing pauses use reproducible clear spots across rooms and separate reservations',()=>{
 const office=scene(),other=scene();assert.ok(office.spots.standing.length>=12);
 assert.deepEqual(office.spots.standing,other.spots.standing);assert.ok(new Set(office.spots.standing.map(p=>p.room)).size>=5);
 for(const p of office.spots.standing){assert.equal(p.seated,false);for(const dx of [-24,0,24])for(const dy of [-24,0,24])assert.equal(office.blocked(p.x+dx,p.y+dy),false);}
 office.setAgents(Array.from({length:8},(_,i)=>agent('standing-'+i)));office.desired=()=> 'standing';
 for(let frame=0;frame<7200;frame++)office.update(frame*16.667);
 const workers=[...office.workers.values()];assert.ok(workers.every(w=>w.action==='standing'&&!w.seated&&!w.pathFailed));assert.equal(new Set(workers.map(w=>w.claim)).size,8);
 for(const a of workers)for(const b of workers)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=30);
});

test('arcade, billiards and bookshelf readers stand while corner readers reserve real armchairs',()=>{
 const office=scene(),actions=['arcade','arcade','arcade','billiards','billiards','shelf-reading','shelf-reading','shelf-reading','corner-reading','corner-reading'];
 office.setAgents(actions.map((a,i)=>agent('leisure-'+i)));office.desired=w=>actions[Number(w.id.split('-').at(-1))];
 for(let frame=0;frame<7200;frame++)office.update(frame*16.667);
 const workers=[...office.workers.values()];assert.equal(new Set(workers.map(w=>w.claim)).size,actions.length);
 assert.ok(workers.every(w=>w.action===actions[Number(w.id.split('-').at(-1))]&&!w.pathFailed));
 assert.equal(workers.filter(w=>w.seated).length,2);
 for(const w of workers){assert.equal(w.agent.status,'idle');if(w.action==='corner-reading')assert.ok(w.destination.chairId);if(w.action==='billiards'){assert.ok(w.destination.table);assert.ok(w.destination.facing==='right'?w.x<w.destination.table.x:w.x>w.destination.table.x+w.destination.table.w);}}
});

test('standing and game animation phases respect reduced motion and yield immediately to recorded work',()=>{
 const office=scene();office.setAgents([agent('pause')]);const w=office.workers.get('pause');
 w.destination={...office.spots.standing[0],desired:'standing',visualStatus:'idle'};w.claim='pause';office.reservations.set(w.claim,w.id);w.path=[];w.arrivedAt=1000;w.action='standing';w.seated=false;
 assert.equal(office.desired(w,2000),'standing');
 w.agent={...w.agent,status:'working',kind:'coding'};assert.equal(office.choose(w,2000).action,'typing');
 for(const action of ['standing','shelf-reading','arcade','billiards']){const body={...w,action,room:action==='shelf-reading'?'library':'game'};assert.deepEqual(workerAnimation(body,100,true),workerAnimation(body,9999,true));}
});

test('leisure sprite pairs include full bodies for all identities and change actual image frames',async()=>{
 const image=await loadImage(fileURLToPath(new URL('../public/assets/office-workers-leisure-v1.png',import.meta.url))),office=scene();office.leisureReady=true;office.leisureSprite=image;
 assert.equal(LEISURE_FRAMES.length,8);for(const row of LEISURE_FRAMES){assert.equal(row.length,8);for(const [x,y,w,h]of row)assert.ok(x>=0&&y>0&&w>30&&h>90&&x+w<image.width&&y+h<image.height-2,'full figures stay inside the atlas');}
 const calls=[];office.ctx.drawImage=(...args)=>calls.push(args);
 for(const [action,facing]of [['arcade','back'],['billiards','right'],['billiards','left'],['shelf-reading','front']]){
  calls.length=0;const w={agent:agent('sprite'),x:100,y:200,seated:false,seed:0,action,room:'game',destination:{facing}};
  assert.equal(drawActivityCharacter(office,w,workerAnimation(w,100)),true);assert.equal(drawActivityCharacter(office,w,workerAnimation(w,600)),true);
  assert.notEqual(calls[0][1],calls[1][1],'phases use distinct atlas cells');assert.equal(calls[0][6],calls[1][6],'feet stay anchored');
 }
});

test('a reserved billiards player sends the cue ball across the felt and reduced motion holds it steady',()=>{
 const office=scene(),spot=office.spots.billiards[0],w={id:'ball-check',seed:0,agent:agent('ball-check'),...spot,destination:spot};office.workers.set(w.id,w);
 const balls=[],circle=office.circle.bind(office);office.circle=(x,y,rx,ry,color)=>{if(color==='#f1e3c7')balls.push({x,y});circle(x,y,rx,ry,color);};
 office.now=1000;office.drawItem(spot.table);office.now=8000;office.drawItem(spot.table);
 assert.ok(balls[1].x>balls[0].x+60);assert.equal(balls[0].y,balls[1].y);
 office.reduced=true;office.drawItem(spot.table);office.now=11500;office.drawItem(spot.table);assert.deepEqual(balls[2],balls[3]);assert.equal(w.agent.status,'idle');
});
