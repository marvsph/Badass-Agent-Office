import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {snapshot} from '../adapter.mjs';
import {loadConfig} from '../office-config.mjs';
import {recentWorkers} from '../public/session-visibility.js';
import {buildBossReport} from '../public/boss-report.js';
import {nameWorkers} from '../public/worker-names.js';
globalThis.window={matchMedia:()=>({matches:false})};globalThis.devicePixelRatio=1;globalThis.Image=class{};
const {BuildingScene}=await import('../public/building-scene.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const atlas=await loadImage(path.join(root,'public/assets/office-workers-v1.png'));
const walking=await loadImage(path.join(root,'public/assets/office-workers-walk-v1.png'));
const seated=await loadImage(path.join(root,'public/assets/office-workers-seated-v1.png'));
const directionSeated=await loadImage(path.join(root,'public/assets/office-workers-seated-directions-v2.png'));
const sideways=await loadImage(path.join(root,'public/assets/office-workers-side-walk-v3.png'));
const activity=await loadImage(path.join(root,'public/assets/office-workers-thinking-writing-v1.png'));
const leisure=await loadImage(path.join(root,'public/assets/office-workers-leisure-v1.png'));
for(const image of [atlas,walking,seated,sideways,directionSeated,activity,leisure]){Object.defineProperty(image,'naturalWidth',{get:()=>image.width});Object.defineProperty(image,'naturalHeight',{get:()=>image.height});}
const previewWidth=Number(process.argv[2])||1400,previewHeight=Number(process.argv[3])||850;
const config=await loadConfig();
const canvas=createCanvas(previewWidth,previewHeight),scene=new BuildingScene(canvas),world=snapshot({projects:config.projects});
scene.officeName=config.officeName;
world.sessions=nameWorkers(world.sessions);
const bossDetail=process.argv[4]==='boss-desk',boss=process.argv[4]==='boss'||bossDetail;scene.theme=['cozy','fresh','night'].includes(process.argv[5])?process.argv[5]:'cozy';
scene.projects=world.projects;scene.activeProject=boss?'':world.projects.find(p=>p.active)?.path||world.projects[0]?.path;scene.report=buildBossReport(world);scene.connected=world.connected;
scene.setAgents(recentWorkers(world.sessions));scene.fit(previewWidth,previewHeight,true);
for(const floor of [scene.bossPainter,...scene.floors.values()]){floor.sprite=atlas;floor.spriteReady=true;floor.walkSprite=walking;floor.walkReady=true;floor.seatedSprite=seated;floor.seatedReady=true;floor.sideSprite=sideways;floor.sideReady=true;floor.directionSeated=directionSeated;floor.directionSeatedReady=true;floor.activitySprite=activity;floor.activityReady=true;floor.leisureSprite=leisure;floor.leisureReady=true;}
for(let frame=0;frame<2400;frame++)for(const floor of scene.floors.values())floor.update(frame*16.667);
if(bossDetail){scene.targetScale=Math.min((previewWidth-60)/900,(previewHeight-50)/520);scene.targetOffset={x:previewWidth/2-(scene.bossRoom.x+910)*scene.targetScale,y:previewHeight/2-(scene.bossRoom.y+530)*scene.targetScale};}
scene.scale=scene.targetScale;scene.offset={...scene.targetOffset};scene.render(Number(process.argv[6])||(bossDetail?5000:40000));
const c=canvas.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle=scene.theme==='night'?'#253447':'#e9eee8';c.fillRect(0,0,previewWidth,previewHeight);
const out=path.join(root,'output'),filename=boss?`boss-${bossDetail?'desk':'preview'}-${scene.theme}-${previewWidth}.png`:'office-preview.png';fs.mkdirSync(out,{recursive:true});const png=canvas.toBuffer('image/png');fs.writeFileSync(path.join(out,filename),png);if(!boss)fs.writeFileSync(path.join(out,`office-preview-${scene.theme}-${previewWidth}.png`),png);
const focused=scene.floors.get(scene.activeProject);console.log(JSON.stringify({image:path.join(out,filename),focused:focused?.company||'Boss room',workers:focused?.workers.size||0,seated:focused?[...focused.workers.values()].filter(w=>w.seated).length:1,walking:focused?[...focused.workers.values()].filter(w=>w.action==='walking').length:0,pathFailures:focused?[...focused.workers.values()].filter(w=>w.pathFailed).length:0,rooms:focused?.rooms.map(r=>r.label)},null,2));
