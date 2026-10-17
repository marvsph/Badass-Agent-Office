import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),canvas=createCanvas(1600,850),scene=new OfficeScene(canvas),c=canvas.getContext('2d');
for(const [property,ready,file]of [['sprite','spriteReady','office-workers-v1.png'],['walkSprite','walkReady','office-workers-walk-v1.png'],['seatedSprite','seatedReady','office-workers-seated-v1.png'],['sideSprite','sideReady','office-workers-side-walk-v3.png'],['directionSeated','directionSeatedReady','office-workers-seated-directions-v2.png'],['activitySprite','activityReady','office-workers-thinking-writing-v1.png'],['leisureSprite','leisureReady','office-workers-leisure-v1.png']]){
 const image=await loadImage(path.join(root,'public/assets',file));Object.defineProperty(image,'naturalWidth',{get:()=>image.width});Object.defineProperty(image,'naturalHeight',{get:()=>image.height});scene[property]=image;scene[ready]=true;
}
const actions=['standing','standing','standing','arcade','arcade','arcade','billiards','billiards','shelf-reading','shelf-reading','shelf-reading','corner-reading','corner-reading'];
scene.setAgents(actions.map((action,i)=>({id:'leisure-fixture-'+i,name:'Synthetic fixture '+i,colorIndex:i%8,status:'idle',kind:'done'})));
scene.desired=worker=>actions[Number(worker.id.split('-').at(-1))];
for(let frame=0;frame<7200;frame++)scene.update(frame*16.667);
const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});
function draw(file,time,scale,x,y){
 const player=[...scene.workers.values()].find(w=>w.action==='billiards');scene.now=time+12000-(player?.seed||0)%7000;scene.scale=scale;scene.speakerId=null;scene.hits=[];c.setTransform(1,0,0,1,0,0);c.fillStyle='#e9eee8';c.fillRect(0,0,1600,850);
 c.save();c.translate(x,y);c.scale(scale,scale);scene.drawBuilding();scene.drawEntities(null,null);scene.drawRoomLabels();c.restore();
 c.fillStyle='#e9eee8';c.fillRect(0,0,1600,48);c.fillStyle='#3d6357';c.font='bold 18px Segoe UI';c.fillText('Synthetic leisure QA — real sprites, reserved standing / gaming / reading spots',20,31);
 fs.writeFileSync(path.join(out,file),canvas.toBuffer('image/png'));
}
draw('leisure-check.png',1000,.44,45,125);
const game=scene.rooms.find(r=>r.id==='game');draw('games-check-1000.png',1000,1.03,400-game.x*1.03,130);draw('games-check-8000.png',8000,1.03,400-game.x*1.03,130);
const library=scene.rooms.find(r=>r.id==='library');draw('library-check.png',1000,1,400-library.x,120);
console.log(JSON.stringify({workers:scene.workers.size,standing:[...scene.workers.values()].filter(w=>!w.seated&&w.action!=='walking').length,seated:[...scene.workers.values()].filter(w=>w.seated).length,pathFailures:[...scene.workers.values()].filter(w=>w.pathFailed).length,actions:[...scene.workers.values()].map(w=>w.action),output:out}));
