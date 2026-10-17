import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),canvas=createCanvas(860,490),scene=new OfficeScene(canvas),c=canvas.getContext('2d');
const reading=process.argv[2]==='reading';
const image=await loadImage(path.join(root,'public/assets/office-workers-seated-directions-v2.png'));
Object.defineProperty(image,'naturalWidth',{get:()=>image.width});Object.defineProperty(image,'naturalHeight',{get:()=>image.height});scene.directionSeated=image;scene.directionSeatedReady=true;scene.spriteReady=true;
c.fillStyle='#e9eee8';c.fillRect(0,0,860,490);c.fillStyle='#3d6357';c.font='bold 19px Segoe UI';c.fillText(reading?'Books follow eight seated directions and body occlusion':'Actual sprites aligned to eight chair directions',20,31);
for(const [i,facing]of ['front','right','back','left','ne','se','sw','nw'].entries()){
 const x=115+(i%4)*205,y=170+Math.floor(i/4)*220,o={type:'orientedChair',x:x-33,y:y-32,w:66,d:64,color:'#96a691',facing};
 const worker={id:'qa-'+i,agent:{id:'qa-'+i,name:'QA worker',colorIndex:i%2?3:0,status:'unknown'},x,y,room:reading?'library':undefined,action:reading?'library-reading':'resting',seated:true,seed:0,destination:{facing,seatAnchor:true}};
 scene.drawChair(o);scene.drawWorker(worker,null,null);scene.drawChairForeground(o);c.font='13px Segoe UI';c.fillStyle='#59786b';c.fillText(facing,x-20,y+60);
}
const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});const file=path.join(out,reading?'reading-directions-check.png':'seated-directions-check.png');fs.writeFileSync(file,canvas.toBuffer('image/png'));console.log(file);
