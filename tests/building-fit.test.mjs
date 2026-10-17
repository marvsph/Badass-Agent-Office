import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
globalThis.Image=class{};
const {BuildingScene}=await import('../public/building-scene.js');

test('selected rectangular projects fit desktop, short desktop and narrow canvases with title space',()=>{
  const scene=new BuildingScene(createCanvas(1600,1000));
  scene.projects=[{path:'A',name:'example-site.test'},{path:'B',name:'ExampleSoftwareSolutions'}];
  scene.setAgents(Array.from({length:110},(_,i)=>({id:'worker'+i,projectPath:i<30?'A':'B',status:'working',kind:'coding',name:'worker'+i,colorIndex:0})));
  for(const [width,height] of [[1124,704],[1201,553],[358,290]])for(const path of ['A','B']){
    scene.activeProject=path;scene.zoom=1;scene.fit(width,height,true);
    const floor=scene.floors.get(path),scale=scene.targetScale,offset=scene.targetOffset;
    assert.ok(floor.floorWidth>=floor.floorHeight*2,'project floors keep the approved wide footprint');
    const left=offset.x+floor.origin.x*scale,right=left+floor.floorWidth*scale;
    const top=offset.y+(floor.origin.y-150)*scale,bottom=offset.y+(floor.origin.y+floor.floorHeight)*scale;
    assert.ok(left>=19&&right<=width-19,`${path} fits width ${width}`);
    assert.ok(top>=0&&bottom<=height-17,`${path} title and bottom fit height ${height}`);
  }
  assert.ok(scene.bossRoom.y+scene.bossRoom.h<0,'Boss room stays above the project floors');
  const [first,second]=[...scene.floors.values()];assert.ok(first.origin.x+first.floorWidth<second.origin.x,'rectangular project floors do not overlap');
});

test('Boss room title and full room fit desktop, short and narrow canvases',()=>{
  const scene=new BuildingScene(createCanvas(1200,800));scene.projects=[{path:'A',name:'Project'}];scene.setAgents([]);
  for(const [width,height]of [[1124,704],[800,450],[358,340]]){
    scene.activeProject='';scene.fit(width,height,true);const r=scene.bossRoom,s=scene.targetScale,o=scene.targetOffset;
    assert.ok(o.x+r.x*s>=19&&o.x+(r.x+r.w)*s<=width-19,'room fits horizontally');
    assert.ok(o.y+(r.y-180)*s>=0&&o.y+(r.y+r.h)*s<=height-17,'title and entrance fit vertically');
  }
});

test('room inspection follows the selected floor through camera movement and pan',()=>{
 const scene=new BuildingScene(createCanvas(1200,800));scene.projects=[{path:'A',name:'First'},{path:'B',name:'Second'}];scene.setAgents([]);
 scene.activeProject='B';scene.fit(1200,800,true);scene.scale=scene.targetScale;scene.offset={...scene.targetOffset};scene.pan={x:85,y:-30};
 const floor=scene.floors.get('B'),room=floor.rooms.find(room=>room.id==='studio');
 const x=scene.offset.x+scene.pan.x+(floor.origin.x+room.x+room.w/2)*scene.scale,y=scene.offset.y+scene.pan.y+(floor.origin.y+room.y+room.h/2)*scene.scale;
 assert.deepEqual(scene.roomAt(x,y),{projectPath:'B',id:'studio'});
 scene.activeProject='';assert.equal(scene.roomAt(x,y),null,'Boss view keeps floor navigation separate from room inspection');
 assert.deepEqual(scene.roomAt(x,y,{allFloors:true}),{projectPath:'B',id:'studio'},'hover can describe any floor on the continuous map');
 const sign=floor.roomSign(room),signX=scene.offset.x+scene.pan.x+(floor.origin.x+sign.x+sign.w/2)*scene.scale,signY=scene.offset.y+scene.pan.y+(floor.origin.y+sign.y+sign.h/2)*scene.scale;
 assert.deepEqual(scene.roomAt(signX,signY,{allFloors:true}),{projectPath:'B',id:'studio'},'the wall sign itself activates its room description');
});

test('room signs mount within their wall sections and descriptions stay off the floor',()=>{
 const scene=new BuildingScene(createCanvas(1200,800));scene.projects=[{path:'A',name:'Office'}];scene.setAgents([]);const floor=scene.floors.get('A');
 const rendered=[],fill=floor.ctx.fillText.bind(floor.ctx);floor.ctx.fillText=(text,...args)=>{rendered.push(text);fill(text,...args);};
 for(const room of floor.rooms){const sign=floor.roomSign(room);assert.ok(sign.x>=room.x&&sign.x+sign.w<=room.x+room.w);if(room.y===0)assert.ok(sign.y>=-82&&sign.y+sign.h<=-10);else{assert.ok(sign.x+sign.w<room.x+room.w/2-70,'lower sign leaves its doorway clear');assert.ok(sign.y>=room.y-88&&sign.y+sign.h<=room.y-20);}}
 floor.drawRoomLabels();assert.deepEqual(rendered,floor.rooms.map(room=>room.label),'only room names are painted as plaques');
});
