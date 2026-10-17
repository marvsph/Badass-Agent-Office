import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
globalThis.Image=class{};
const {OfficeScene}=await import('../public/office-scene.js');
const agent=id=>({id,name:id,colorIndex:0,status:'working',kind:'coding'});
const stepScene=(scene,frames,start=0)=>{for(let n=0;n<frames;n++)scene.update(start+n*16.667);};

test('walking workers pass through walking and stationary characters',()=>{
  const scene=new OfficeScene(createCanvas(1000,600));scene.setAgents(['walker','standing','other-walker'].map(agent));
  const y=scene.roomHeight+80,[walker,standing,other]=[...scene.workers.values()];
  Object.assign(walker,{x:100,y});Object.assign(standing,{x:150,y,action:'typing',seated:true});Object.assign(other,{x:200,y});
  const targets=new Map([[walker.id,{x:240,y,action:'walking',room:'reception'}],[standing.id,{x:150,y,action:'typing',seated:true,room:'reception'}],[other.id,{x:60,y,action:'walking',room:'reception'}]]);
  scene.choose=w=>targets.get(w.id);
  stepScene(scene,180);
  assert.ok(walker.x>standing.x+50,'walker crosses the occupied character without yielding');
  assert.ok(other.x<standing.x-50,'walking characters cross one another');
  assert.equal(standing.x,150);assert.equal(standing.action,'typing');assert.equal(scene.isWorkerSolid(standing),true);
  assert.equal(scene.isWorkerSolid(walker),false);assert.equal(scene.isWorkerSolid(other),false);
});

test('collision follows working→walking→resting→walking→sitting transitions',()=>{
  const scene=new OfficeScene(createCanvas(1000,600));scene.setAgents([agent('worker')]);
  const worker=scene.workers.get('worker'),y=scene.roomHeight+80;Object.assign(worker,{x:200,y});
  let target={x:200,y,action:'typing',seated:true,room:'office'};scene.choose=()=>target;
  stepScene(scene,3);assert.equal(worker.action,'typing');assert.equal(scene.isWorkerSolid(worker),true);
  target={x:340,y,action:'resting',seated:true,room:'quiet'};
  scene.update(80);assert.equal(worker.action,'walking');assert.equal(worker.seated,false);assert.equal(scene.isWorkerSolid(worker),false);
  stepScene(scene,180,100);assert.equal(worker.action,'resting');assert.equal(worker.seated,true);assert.equal(scene.isWorkerSolid(worker),true);
  target={x:200,y,action:'reading',seated:true,room:'quiet'};
  scene.update(3200);assert.equal(worker.action,'walking');assert.equal(scene.isWorkerSolid(worker),false);
  stepScene(scene,180,3220);assert.equal(worker.action,'reading');assert.equal(worker.seated,true);assert.equal(scene.isWorkerSolid(worker),true);
});

test('stationary activity cannot activate in another stationary occupied place',()=>{
  const scene=new OfficeScene(createCanvas(1000,600));scene.setAgents([agent('occupant'),agent('arrival')]);
  const [occupant,arrival]=[...scene.workers.values()],y=scene.roomHeight+80;
  Object.assign(occupant,{x:250,y,action:'resting',seated:true});Object.assign(arrival,{x:250,y,action:'walking'});
  scene.choose=w=>({x:250,y,action:w.id==='occupant'?'resting':'typing',seated:true,room:'quiet'});
  stepScene(scene,3);
  assert.equal(occupant.action,'resting');assert.equal(arrival.action,'walking');assert.equal(arrival.seated,false);
  arrival.x=310;scene.choose=w=>({x:w.id==='occupant'?250:310,y,action:w.id==='occupant'?'resting':'typing',seated:true,room:'quiet'});
  stepScene(scene,3,100);assert.equal(arrival.action,'typing');assert.equal(scene.isWorkerSolid(arrival),true);
});

test('non-solid walking routes still avoid static walls and furniture',()=>{
  const scene=new OfficeScene(createCanvas(1000,600)),office=scene.rooms.find(r=>r.id==='office');
  const path=scene.findPath({x:office.w-60,y:100},{x:office.w+100,y:100});
  assert.ok(path.length>20,'route travels through a doorway instead of the partition');
  assert.ok(path.slice(0,-1).every(point=>!scene.blocked(point.x,point.y)));
  assert.equal(scene.blocked(office.w+10,100),true);
});
