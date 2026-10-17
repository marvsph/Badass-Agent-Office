import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {bossAnimation} from '../public/boss-animation.js';
globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {BuildingScene}=await import('../public/building-scene.js');

test('decorative boss writes, reads, roams, takes a cigar break, and returns to his desk',()=>{
  assert.equal(bossAnimation(0).activity,'Writing reports');
  assert.equal(bossAnimation(22000).activity,'Reading reports');
  assert.equal(bossAnimation(30000).mode,'walking');
  assert.equal(bossAnimation(40000).cigar,true);
  assert.equal(bossAnimation(62000).activity,'At the reference shelf');
  assert.equal(bossAnimation(84000).activity,'Surveying the office');
  assert.deepEqual(bossAnimation(110000),bossAnimation(0));
  assert.deepEqual(bossAnimation(40000,true),bossAnimation(0),'reduced motion keeps the boss at the desk');
});

test('boss walking routes stay inside his office and go around the desk and report cabinet',()=>{
  for(let time=0;time<110000;time+=100){const pose=bossAnimation(time);if(pose.mode!=='walking')continue;
    assert.ok(pose.x>=50&&pose.x<=2150&&pose.y>=180&&pose.y<=880);
    assert.ok(!(pose.x>=510&&pose.x<=1270&&pose.y>=585&&pose.y<=690),'route avoids the front and legs of the desk');
    assert.ok(pose.x<1400,'route avoids the report cabinet');
    const next=bossAnimation(time+1);if(next.mode==='walking')assert.ok(Math.hypot(next.x-pose.x,next.y-pose.y)<1,'movement is continuous');
  }
});

test('boss leaves and returns to the same hidden seat anchor without position jumps',()=>{
  const seated=bossAnimation(27999),departing=bossAnimation(28000),returning=bossAnimation(109999);
  assert.equal(departing.x,seated.x);assert.equal(departing.y,seated.y);
  assert.ok(Math.hypot(returning.x-seated.x,returning.y-seated.y)<1);
});

test('boss animations never create session workers, claims, or report counts',()=>{
 const scene=new BuildingScene(createCanvas(900,550));scene.projects=[{path:'A',name:'Office'}];scene.setAgents([]);
 const report={totals:{projects:1,workers:0,subagents:0},counts:{working:0,waiting:0,delegating:0,unknown:0}};scene.report=report;
 for(const time of [5000,22000,30000,40000,62000,73000,84000,100000])scene.drawBossRoom(time);
 assert.deepEqual(scene.report,report);assert.equal(scene.bossPainter.workers.size,0);assert.equal(scene.bossPainter.reservations.size,0);
 assert.ok([...scene.floors.values()].every(floor=>floor.workers.size===0));
});
