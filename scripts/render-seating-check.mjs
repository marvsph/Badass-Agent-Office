import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';

globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const canvas=createCanvas(760,790),scene=new OfficeScene(canvas);
for(const [property,ready,file] of [['sprite','spriteReady','office-workers-v1.png'],['walkSprite','walkReady','office-workers-walk-v1.png'],['seatedSprite','seatedReady','office-workers-seated-v1.png'],['sideSprite','sideReady','office-workers-side-walk-v3.png'],['directionSeated','directionSeatedReady','office-workers-seated-directions-v2.png']]){
 const image=await loadImage(path.join(root,'public/assets',file));
 Object.defineProperty(image,'naturalWidth',{get:()=>image.width});Object.defineProperty(image,'naturalHeight',{get:()=>image.height});scene[property]=image;scene[ready]=true;
}
scene.setAgents(Array.from({length:8},(_,i)=>({id:'seating-fixture-'+i,name:'QA worker '+i,colorIndex:i,status:'unknown',kind:'quiet'})));
let identity=0;for(const worker of scene.workers.values())worker.seed=identity++;
scene.spots.reading=scene.spots.reading.filter(spot=>spot.room==='quiet');scene.desired=()=> 'reading';
for(let frame=0;frame<7200;frame++)scene.update(frame*16.667);
const room=scene.rooms.find(r=>r.id==='quiet'),c=canvas.getContext('2d');
c.fillStyle='#e9eee8';c.fillRect(0,0,760,790);c.fillStyle='#3d6357';c.font='bold 19px Segoe UI';c.fillText('Synthetic seating check - separate armchairs',20,31);
c.save();c.translate(20-room.x,115-room.y);scene.drawBuilding();
scene.drawEntities(null,null);c.restore();c.fillStyle='#e9eee8';c.fillRect(0,0,760,48);c.fillStyle='#3d6357';c.font='bold 19px Segoe UI';c.fillText('Synthetic seating check - separate armchairs',20,31);
const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});const image=path.join(out,'seating-check.png');fs.writeFileSync(image,canvas.toBuffer('image/png'));
console.log(JSON.stringify({image,seated:[...scene.workers.values()].filter(w=>w.seated).length,claims:new Set([...scene.workers.values()].map(w=>w.claim)).size,pathFailures:[...scene.workers.values()].filter(w=>w.pathFailed).length}));
