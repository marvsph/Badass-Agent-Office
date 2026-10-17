import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';

globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const canvas=createCanvas(1600,760),scene=new OfficeScene(canvas);
for(const [property,ready,file]of [['sprite','spriteReady','office-workers-v1.png'],['walkSprite','walkReady','office-workers-walk-v1.png'],['seatedSprite','seatedReady','office-workers-seated-v1.png'],['sideSprite','sideReady','office-workers-side-walk-v3.png'],['directionSeated','directionSeatedReady','office-workers-seated-directions-v2.png'],['activitySprite','activityReady','office-workers-thinking-writing-v1.png']]){
 const image=await loadImage(path.join(root,'public/assets',file));
 Object.defineProperty(image,'naturalWidth',{get:()=>image.width});Object.defineProperty(image,'naturalHeight',{get:()=>image.height});scene[property]=image;scene[ready]=true;
}
scene.setAgents(Array.from({length:6},(_,i)=>({id:'planning-fixture-'+i,name:i<3?'Planner '+(i+1):'Worker '+(i-2),colorIndex:i,status:'working',kind:i<3?'planning':'coding',parentId:i<3?null:'planning-fixture-'+(i-3)})));
for(let frame=0;frame<7200;frame++)scene.update(frame*16.667);
const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});
const c=canvas.getContext('2d');
function draw(name,scale,x,y){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#e9eee8';c.fillRect(0,0,1600,760);
 scene.scale=scale;c.save();c.translate(x,y);c.scale(scale,scale);scene.drawBuilding();scene.drawEntities(null,null);scene.drawRoomLabels();c.restore();
 c.fillStyle='#e9eee8';c.fillRect(0,0,1600,48);c.fillStyle='#3d6357';c.font='bold 18px Segoe UI';c.fillText('Synthetic planning check - real sprites and recorded-parent fixture links',20,31);
 fs.writeFileSync(path.join(out,name),canvas.toBuffer('image/png'));
}
draw('planning-check.png',.44,40,115);
const studio=scene.rooms.find(r=>r.id==='studio');draw('planning-studio-check.png',1.05,160-studio.x*1.05,190-studio.y*1.05);
for(const worker of scene.workers.values()){worker.seed=0;if(worker.room==='studio')worker.agent.unreadCompletionAt=1;}
scene.now=9000;draw('planning-thought-check.png',1.05,160-studio.x*1.05,190-studio.y*1.05);
draw('planning-thought-floor-check.png',.44,40,115);
console.log(JSON.stringify({plannersInStudio:[...scene.workers.values()].filter(w=>w.action==='planning'&&w.room==='studio').length,connections:scene.workerConnections().length,pathFailures:[...scene.workers.values()].filter(w=>w.pathFailed).length,images:['planning-check.png','planning-studio-check.png'].map(name=>path.join(out,name))}));
