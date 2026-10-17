import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
globalThis.window={matchMedia:()=>({matches:false})};globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const agent=(id,status='unknown')=>({id,name:id,colorIndex:0,status,kind:'quiet'});
test('workers reserve separate quiet-room armchairs and walk there without stacking',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));scene.setAgents(Array.from({length:12},(_,i)=>agent('worker-'+i)));
 scene.desired=()=> 'reading';const initial=new Map([...scene.workers].map(([id,w])=>[id,{x:w.x,y:w.y}]));
 for(let frame=0;frame<3600;frame++)scene.update(frame*16.667);
 const workers=[...scene.workers.values()];assert.equal(new Set(workers.map(w=>w.claim)).size,12,'each armchair belongs to one worker');
 assert.ok(workers.every(w=>Math.hypot(w.x-initial.get(w.id).x,w.y-initial.get(w.id).y)>100),'all workers leave their arrival positions');
 assert.ok(workers.filter(w=>w.seated).length>=9,'workers reach and sit on reserved armchairs');
 for(let i=0;i<workers.length;i++)for(let j=i+1;j<workers.length;j++)assert.ok(Math.hypot(workers[i].x-workers[j].x,workers[i].y-workers[j].y)>=28,'worker bodies do not occupy the same place');
});
test('each worker has a stable individual work table',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));scene.roomAgentLimit=40;const agents=Array.from({length:30},(_,i)=>agent('desk-'+i,'working'));scene.setAgents(agents);
 const desks=new Map(scene.deskAssignments);assert.equal(new Set(desks.values()).size,30);scene.setAgents([...agents].reverse());assert.deepEqual(scene.deskAssignments,desks);
});

test('workers leave a lounge chair for their own desk and the water station',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));scene.setAgents([agent('round-trip')]);scene.spots.reading=scene.spots.reading.filter(spot=>spot.room==='quiet');
 let action='reading';scene.desired=()=>action;const worker=scene.workers.get('round-trip');
 const run=(from,frames)=>{for(let frame=0;frame<frames;frame++)scene.update(from+frame*16.667);};
 run(0,2400);assert.equal(worker.action,'reading');assert.equal(worker.seated,true);const chair={x:worker.x,y:worker.y};
 action='typing';run(40000,3600);assert.equal(worker.action,'typing');assert.equal(worker.pathFailed,false);assert.ok(Math.hypot(worker.x-chair.x,worker.y-chair.y)>100);
 action='water';run(100000,3600);assert.equal(worker.action,'water');assert.equal(worker.seated,false);assert.equal(worker.pathFailed,false);
});

test('work pod chairs and seated directions point toward their workstation',()=>{
 const scene=new OfficeScene(createCanvas(1000,700)),pods=scene.items.filter(item=>item.type==='deskPod');
 assert.ok(pods.some(pod=>pod.kind==='cross'));assert.ok(pods.some(pod=>pod.kind==='three'));
 const faces=new Set();for(const seat of scene.seats){const pod=pods[seat.pod],chair=scene.items.find(item=>item.chairId===seat.chairId);assert.equal(chair.facing,seat.facing);faces.add(seat.facing);
  const angle=scene.chairAngle(seat.facing),dx=pod.x-seat.x,dy=pod.y-seat.y,distance=Math.hypot(dx,dy);assert.ok((-Math.sin(angle)*dx+Math.cos(angle)*dy)/distance>.99);
 }
 assert.equal(faces.size,8);
});

test('every room activity and individual workstation is reachable from the corridor',()=>{
 const scene=new OfficeScene(createCanvas(1000,700)),start={x:100,y:scene.roomHeight+55};
 for(const target of [...scene.seats,...Object.values(scene.spots).flat()])assert.ok(scene.findPath(start,target).length>0,`${target.room}: ${target.action}`);
});
test('floor footprint is a wide rectangle and projection has no slanted edges',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));assert.ok(scene.floorHeight<=1600,'normal project office stays compact with wider pod aisles');
 assert.ok(scene.floorWidth>=scene.floorHeight*2,'normal floors keep the approved wide footprint');
 assert.equal(scene.project(100,0).x,scene.project(100,600).x);assert.equal(scene.project(0,600).y,scene.project(600,600).y);
 scene.setAgents(Array.from({length:180},(_,i)=>agent('large-'+i)));assert.ok(scene.floorWidth>=scene.floorHeight*2,'expanded floors keep a wide footprint');
});

test('planning workers reserve studio chairs and overflow to their own tables',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));scene.setAgents(Array.from({length:5},(_,i)=>({...agent('planner-'+i,'working'),kind:'planning'})));
 for(let frame=0;frame<7200;frame++)scene.update(frame*16.667);
 const workers=[...scene.workers.values()];
 assert.equal(workers.filter(w=>w.room==='studio').length,3);
 assert.equal(workers.filter(w=>w.room==='office').length,2);
 assert.ok(workers.every(w=>w.seated&&w.action==='planning'&&!w.pathFailed));
 assert.equal(new Set(workers.map(w=>w.claim)).size,5);
 const planner=workers[0];assert.equal(scene.getActivity(planner.id).animation,'Planning at the table');
 planner.agent={...planner.agent,kind:'coding'};assert.notEqual(scene.choose(planner,0).action,'planning');
});

test('faint dashed connections follow recorded parent workers and disappear with them',()=>{
 const canvas=createCanvas(1000,700),scene=new OfficeScene(canvas);
 const planner=agent('planner','working'),child={...agent('child','working'),parentId:'planner'},other=agent('unrelated');
 scene.setAgents([planner,child,other,{...agent('orphan'),parentId:'missing'}]);
 assert.deepEqual(scene.workerConnections().map(pair=>pair.map(w=>w.id)),[['planner','child']]);
 scene.scale=.3;const before=scene.ctx.getLineDash();scene.drawWorkerConnections();
 assert.deepEqual(scene.ctx.getLineDash(),before,'dashes do not affect furniture drawing');
 scene.setAgents([child,other]);assert.deepEqual(scene.workerConnections(),[]);
});

test('each room has an inspectable purpose and usable activity places',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));
 for(const room of scene.rooms){const info=scene.getRoomInfo(room.id);assert.ok(info.purpose);assert.ok(info.capacity>0,room.id+' has usable places');assert.deepEqual(info.occupants,[]);}
 assert.equal(scene.getRoomInfo('game').decorative,true);assert.equal(scene.getRoomInfo('studio').decorative,false);
 assert.ok(scene.zones.every(zone=>!zone.label.includes('TEAM')),'desk bays do not invent team membership');
});

test('active research and review workers stay at their own reserved work pods',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));
 scene.setAgents([...Array.from({length:6},(_,i)=>({...agent('research-'+i,'working'),kind:'research'})),...Array.from({length:5},(_,i)=>({...agent('review-'+i,'working'),kind:'reviewing'}))]);
 for(let frame=0;frame<7200;frame++)scene.update(frame*16.667);
 const workers=[...scene.workers.values()];
 assert.equal(workers.filter(worker=>worker.room==='office').length,11);
 assert.equal(new Set(workers.map(worker=>worker.claim)).size,11);
 assert.ok(workers.every(worker=>worker.seated&&!worker.pathFailed&&worker.agent.status==='working'));
 assert.ok(workers.every(worker=>worker.x===scene.seats[worker.desk].x&&worker.y===scene.seats[worker.desk].y));
 assert.equal(scene.getRoomInfo('library').occupants.length,0);
});

test('working pod occupants never schedule break trips across activity phases',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));scene.setAgents([{...agent('focused','working'),kind:'coding'}]);
 for(let frame=0;frame<2400;frame++)scene.update(frame*16.667);
 const worker=scene.workers.get('focused'),seat=scene.seats[worker.desk];assert.equal(worker.seated,true);
 for(const kind of ['coding','terminal','reading','research','reviewing']){
  worker.agent={...worker.agent,kind};
  for(let phase=0;phase<36;phase++){const target=scene.choose(worker,phase*18000);assert.equal(target.room,'office');assert.equal(target.x,seat.x);assert.equal(target.y,seat.y);assert.equal(worker.claim,'desk:'+worker.desk);assert.notEqual(target.action,'water');}
 }
 worker.agent={...worker.agent,status:'idle'};
 assert.notEqual(scene.choose(worker,0).room,'office','finished workers can use the break rooms again');
});
