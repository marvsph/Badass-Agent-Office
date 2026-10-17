import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';

globalThis.Image=class{};
const {OfficeScene}=await import('../public/office-scene.js');
const agents=count=>Array.from({length:count},(_,i)=>({id:'crowd-'+i,name:'Worker '+i,status:'working',kind:i%8===7?'planning':'coding',colorIndex:i%8}));
const settle=(scene,start=0)=>{for(let frame=0;frame<2400;frame++)scene.update(start+frame*50);};

test('crowded floors devote growth to balanced work bays and furnished shared rooms',()=>{
 const scene=new OfficeScene(createCanvas(1510,780)),initialWidth=scene.rooms[0].w;scene.roomAgentLimit=240;
 for(const count of [48,180]){
  scene.setAgents(agents(count));
  const office=scene.rooms[0],pods=scene.items.filter(item=>item.type==='deskPod');
  assert.ok(office.w>initialWidth,'the work area widens as the population grows');
  assert.ok(office.w/scene.floorWidth>.5,'work bays receive most of a busy floor width');
  assert.ok(scene.floorWidth>=scene.floorHeight*2,'floors retain a wide rectangular footprint');
  for(const room of scene.rooms.slice(1,4))assert.ok(room.w<=740,'shared rooms do not expand into empty halls');
  const rowCounts=[...new Set(pods.map(pod=>pod.y))].map(y=>pods.filter(pod=>pod.y===y).length);
  assert.ok(Math.max(...rowCounts)-Math.min(...rowCounts)<=1,'partial rows share the pods evenly');
  for(const zone of scene.zones){assert.ok(zone.x>=0&&zone.x+zone.w<=office.w);assert.ok(zone.y>=0&&zone.y+zone.h<=office.h);}
  for(const a of scene.zones)for(const b of scene.zones)if(a!==b){
   const dx=Math.max(a.x-b.x-b.w,b.x-a.x-a.w),dy=Math.max(a.y-b.y-b.h,b.y-a.y-a.h);
   assert.ok(dx>=80||dy>=60,'work bays leave clear aisles between their chairs');
  }
  assert.ok(scene.planningTables.length>=2,'wide planning studios contain several usable tables');
  assert.equal(scene.spots.planning.length,scene.planningTables.length*3);
  assert.ok(scene.spots.reviewing.length>=6,'expanded focus rooms add workstations');
  assert.ok(scene.libraryTables.length>=2&&scene.gameRows.length>=2,'taller rooms add furniture throughout their footprint');
  settle(scene,count===48?0:120000);
  const workers=[...scene.workers.values()];
  assert.ok(workers.every(worker=>worker.seated&&!worker.pathFailed),'every worker reaches a seat');
  assert.equal(new Set(workers.map(worker=>worker.claim)).size,count,'all seats remain separately reserved');
  for(const a of workers)for(const b of workers)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=30,'stationary workers never overlap');
 }
});

test('adding agents to an occupied office preserves desk ownership and usable routes',()=>{
 const scene=new OfficeScene(createCanvas(1510,780));scene.roomAgentLimit=100;scene.setAgents(agents(18));settle(scene);
 const assignments=new Map(scene.deskAssignments);scene.setAgents(agents(64));settle(scene,120000);
 for(const [id,desk]of assignments)assert.equal(scene.deskAssignments.get(id),desk);
 assert.ok([...scene.workers.values()].every(worker=>worker.seated&&!worker.pathFailed));
 const start={x:100,y:scene.roomHeight+55};
 for(const target of [...scene.spots.planning,...scene.spots.reviewing,...scene.spots['library-reading']])assert.ok(scene.findPath(start,target).length>0,`${target.room} seats remain reachable after expansion`);
});
