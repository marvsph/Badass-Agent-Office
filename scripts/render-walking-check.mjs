import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),canvas=createCanvas(650,610),scene=new OfficeScene(canvas),c=canvas.getContext('2d');
const image=await loadImage(path.join(root,'public/assets/office-workers-side-walk-v3.png'));
Object.defineProperty(image,'naturalWidth',{get:()=>image.width});Object.defineProperty(image,'naturalHeight',{get:()=>image.height});scene.sideSprite=image;scene.sideReady=true;scene.spriteReady=true;
c.fillStyle='#e9eee8';c.fillRect(0,0,650,610);c.fillStyle='#3d6357';c.font='bold 18px Segoe UI';c.fillText('Actual four-frame side walk cycles',20,31);
for(let row=0;row<4;row++)for(let phase=0;phase<4;phase++){
 const direction=row%2?'left':'right',worker={id:'qa-'+row,agent:{id:'qa-'+row,name:'Synthetic QA worker',colorIndex:row<2?0:3,status:'unknown'},x:103+phase*140,y:160+row*137,action:'walking',direction,seed:0,walkDistance:phase*14};
 scene.now=phase*120;scene.drawWorker(worker,null,null);
 if(!phase){c.font='12px Segoe UI';c.fillStyle='#59786b';c.fillText(direction,22,worker.y+5);}
}
const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});const file=path.join(out,'walking-check.png');fs.writeFileSync(file,canvas.toBuffer('image/png'));console.log(file);
