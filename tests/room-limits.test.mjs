import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {recentWorkers,WORKER_RECENCY_MS} from '../public/session-visibility.js';

globalThis.Image=class{};
const {OfficeScene}=await import('../public/office-scene.js');
const {BuildingScene}=await import('../public/building-scene.js');
const agent=(id,extra={})=>({id,name:id,status:'working',kind:'coding',projectPath:'project',lastSeen:1000,colorIndex:0,...extra});
const run=(scene,start=0,frames=1200)=>{for(let i=0;i<frames;i++)scene.update(start+i*50);};

test('500 and 1000 recorded agents stay bounded and new sessions replace subagents',()=>{
 for(const count of [500,1000]){
  const scene=new OfficeScene(createCanvas(1000,700));
  const parent=agent('lead'),children=Array.from({length:count-1},(_,i)=>agent('child-'+i,{parentId:'lead'})),records=[...children,parent];
  const original=structuredClone(records);scene.setAgents(records);run(scene);
  assert.equal(scene.workers.size,24);assert.equal(scene.hiddenAgents.length,count-24);
  assert.ok(scene.workers.has('lead'),'main session wins even when listed after all children');
  assert.ok([...scene.workers.values()].every(worker=>worker.seated&&!worker.pathFailed));
  assert.ok(scene.seats.length<32,'hidden records do not create extra desks');
  const width=scene.floorWidth,leadDesk=scene.deskAssignments.get('lead'),before=new Set(scene.workers.keys());
  const newcomer=agent('new-session',{lastSeen:2000});scene.setAgents([...records,newcomer]);run(scene,60000);
  assert.ok(scene.workers.has('new-session'));assert.ok(scene.workers.has('lead'));
  assert.equal(scene.deskAssignments.get('lead'),leadDesk,'existing main session keeps its table');
  assert.equal([...before].filter(id=>!scene.workers.has(id)).length,1,'one subagent despawns to free a slot');
  assert.equal(scene.workers.size,24);assert.equal(scene.floorWidth,width);
  assert.deepEqual(records,original,'display admission never edits session records');
  scene.setAgents([...records,newcomer].reverse());assert.ok(scene.workers.has('new-session'),'record order cannot restore the displaced worker');
 }
});

test('room limits apply to actual reservations and occupants, including decorative outings',()=>{
 const scene=new OfficeScene(createCanvas(1000,700));scene.roomAgentLimit=2;
 const records=Array.from({length:80},(_,i)=>agent('mixed-'+i,i<8?{}:i<16?{kind:'planning'}:i<24?{status:'waiting'}:i<32?{status:'delegating'}:{status:'idle'}));
 scene.setAgents(records);const desired=scene.desired.bind(scene);scene.desired=(worker,time)=>worker.agent.status==='idle'?'library-reading':desired(worker,time);
 for(let frame=0;frame<1600;frame++){
  scene.update(frame*50);
  const rooms=new Map();for(const worker of scene.workers.values())if(worker.action!=='walking')rooms.set(worker.room,(rooms.get(worker.room)||0)+1);
  for(const count of rooms.values())assert.ok(count<=2,'stationary occupancy respects the room limit throughout movement');
  const reserved=new Map();for(const [key,room]of scene.reservationRooms)if(scene.reservations.has(key))reserved.set(room,(reserved.get(room)||0)+1);
  for(const count of reserved.values())assert.ok(count<=2,'workers approaching a room also reserve its capacity');
 }
 assert.ok(scene.hiddenAgents.length>0);assert.equal(scene.getRoomInfo('library').occupants.length,2);
});

test('lowering the limit removes excess workers and clears previous room reservations',()=>{
 const scene=new OfficeScene(createCanvas(1000,700)),records=Array.from({length:30},(_,i)=>agent('root-'+i,{lastSeen:1000+i}));
 scene.roomAgentLimit=30;scene.setAgents(records);run(scene);
 scene.roomAgentLimit=1;scene.setAgents(records);run(scene,60000);
 assert.equal(scene.workers.size,1);assert.ok(scene.workers.has('root-29'),'newest main session keeps the slot when no subagents can be removed');
 assert.equal(scene.reservations.size,1);assert.equal(scene.getRoomInfo('office').occupants.length,1);
 assert.equal(scene.seats.length,18,'a lower room limit also compacts the floor');
});

test('each project applies its own cap and expired parent records stay off the floor',()=>{
 const building=new BuildingScene(createCanvas(1000,700));building.roomAgentLimit=2;building.projects=[{path:'project',name:'First'},{path:'other',name:'Second'}];
 const now=Date.now(),records=[agent('expired-lead',{lastSeen:now-WORKER_RECENCY_MS-1}),...Array.from({length:8},(_,i)=>agent('current-'+i,{lastSeen:now,parentId:'expired-lead',projectPath:i<4?'project':'other'}))];
 building.setAgents(recentWorkers(records,now));
 assert.equal(building.floors.get('project').workers.size,2);assert.equal(building.floors.get('other').workers.size,2);
 assert.ok([...building.floors.values()].every(floor=>!floor.workers.has('expired-lead')));
});
