import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
globalThis.Image=class{};
globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const {BuildingScene}=await import('../public/building-scene.js');
const scene=()=>new OfficeScene(createCanvas(3500,1550));
const luminance=([r,g,b])=>r*.2126+g*.7152+b*.0722;

test('night windows are dark, sunset windows are orange, and Fresh is bright daylight',()=>{
 const floor=scene(),c=floor.ctx,colors={};
 c.translate(0,100);
 // The first window is partly behind a bookcase; sample an unobstructed pane.
 for(const mood of ['cozy','fresh','night']){floor.theme=mood;floor.drawBuilding();floor.drawEntities();const window=floor.windows[1];colors[mood]=c.getImageData(window.x+17,window.y+100+30,1,1).data;}
 assert.ok(colors.cozy[0]>colors.cozy[2]*1.4,'sunset has an amber sky');
 assert.ok(luminance(colors.fresh)>luminance(colors.night)*4,'night has no outdoor daylight');
 const pixels={};
 for(const mood of ['cozy','fresh','night']){floor.theme=mood;floor.drawBuilding();floor.drawEntities();pixels[mood]=luminance(c.getImageData(700,760,1,1).data);}
 assert.ok(pixels.fresh>pixels.cozy,'Fresh is brighter than afternoon');
 assert.ok(pixels.night<pixels.fresh*.6,'building lighting leaves night substantially darker');
});

test('screen glow follows recorded working status and occupied workstations, with steady reduced motion',()=>{
 const floor=scene(),agent={id:'light-check',name:'Fixture',colorIndex:0,status:'working',kind:'coding'};
 floor.setAgents([agent]);const worker=floor.workers.get(agent.id),seat=floor.seats[worker.desk];
 Object.assign(worker,{x:seat.x,y:seat.y,seated:true,action:'typing'});
 let screens=floor.screenSources();assert.equal(screens.filter(s=>s.active).length,1);
 const active=screens.find(s=>s.active);floor.now=100;const first=floor.screenIntensity(active);floor.now=600;assert.notEqual(first,floor.screenIntensity(active));
 assert.ok(floor.screenIntensity(active)>floor.screenIntensity(screens.find(s=>!s.active))*3);
 floor.reduced=true;const steady=floor.screenIntensity(active);floor.now=9999;assert.equal(floor.screenIntensity(active),steady);
 for(const status of ['unknown','idle','waiting','delegating']){worker.agent={...agent,status};assert.ok(floor.screenSources().every(s=>!s.active),status+' does not invent work');}
 worker.agent=agent;worker.seated=false;assert.ok(floor.screenSources().every(s=>!s.active),'working away from a desk leaves its monitor dim');
});

test('light pools brighten the corridor and lighting restores canvas state',()=>{
 const floor=scene(),c=floor.ctx;floor.theme='night';
 c.fillStyle='#405060';c.fillRect(0,0,3500,1550);const before=c.getTransform();floor.drawLighting();
 const hall=floor.lights.find(light=>light.kind==='hall'),lit=luminance(c.getImageData(hall.x,hall.y+25,1,1).data),unlit=luminance(c.getImageData(hall.x,hall.y+265,1,1).data);
 assert.ok(lit>unlit*1.3,'hallway lamps cast visible pools');
 assert.deepEqual(c.getTransform(),before);assert.equal(c.globalAlpha,1);assert.equal(c.globalCompositeOperation,'source-over');
});

test('the building passes reduced-motion preferences to every project floor',()=>{
 const building=new BuildingScene(createCanvas(1000,650));building.projects=[{path:'fixture',name:'Lighting fixture'}];building.setAgents([]);building.reduced=true;building.render(1000);
 assert.equal(building.floors.get('fixture').reduced,true);
});
