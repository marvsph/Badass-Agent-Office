import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
globalThis.Image=class{};globalThis.devicePixelRatio=1;
const {OfficeScene}=await import('../public/office-scene.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),canvas=createCanvas(1600,900),scene=new OfficeScene(canvas),c=canvas.getContext('2d');
for(const [property,ready,file]of [['sprite','spriteReady','office-workers-v1.png'],['walkSprite','walkReady','office-workers-walk-v1.png'],['seatedSprite','seatedReady','office-workers-seated-v1.png'],['sideSprite','sideReady','office-workers-side-walk-v3.png'],['directionSeated','directionSeatedReady','office-workers-seated-directions-v2.png'],['activitySprite','activityReady','office-workers-thinking-writing-v1.png'],['leisureSprite','leisureReady','office-workers-leisure-v1.png']]){
 const image=await loadImage(path.join(root,'public/assets',file));Object.defineProperty(image,'naturalWidth',{get:()=>image.width});Object.defineProperty(image,'naturalHeight',{get:()=>image.height});scene[property]=image;scene[ready]=true;
}
const cases=[['Planning: write / think','planning','studio','front'],['Coffee: lift / sip','coffee','cafeteria','right'],['Water: lift / sip','water','cafeteria','front'],['Lunch: bite / chew','eating','cafeteria','left'],['Arcade: controls','arcade','game','back'],['Library: page turns','library-reading','library','front'],['Reception: unwind','input','reception','left'],['Quiet room: ...','quiet','quiet','front'],['Focus: checklist / think','focusing','focus','back'],['Team lounge: relax','reports','meeting','front']];
const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});
function draw(time){
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#e9eee8';c.fillRect(0,0,1600,900);c.fillStyle='#3d6357';c.font='bold 20px Segoe UI';c.fillText('Synthetic activity QA — actual worker sprites, two animation phases',20,33);
 scene.scale=1.4;scene.now=time;scene.hits=[];scene.overlays=null;
 for(const [i,[label,action,room,facing]]of cases.entries()){
  const left=i%5*320+10,top=55+Math.floor(i/5)*420;
  c.fillStyle=i%2?'#d7dfcd':'#e2dfcf';c.fillRect(left,top,300,400);c.fillStyle='#496859';c.font='bold 14px Segoe UI';c.fillText(label,left+13,top+25);
  const worker={id:'qa-'+i,seed:0,x:100,y:175,room,action,seated:action!=='arcade',agent:{id:'qa-'+i,name:'Synthetic fixture',colorIndex:i%8,status:'idle',kind:'done'},destination:{facing,seatAnchor:true}};
  c.save();c.translate(left+10,top+37);c.scale(1.4,1.4);scene.speakerId=worker.id;
  if(worker.seated)scene.drawChair({x:worker.x-33,y:worker.y-32,color:'#91a39a',facing});
  else scene.drawItem({type:'arcade',x:60,y:125,w:65,d:58,color:'#719dac'});
  scene.drawWorker(worker,null,null);if(worker.seated)scene.drawChairForeground({x:worker.x-33,y:worker.y-32,color:'#91a39a',facing});c.restore();
 }
 const file=path.join(out,'activity-check-'+time+'.png');fs.writeFileSync(file,canvas.toBuffer('image/png'));return file;
}
console.log(JSON.stringify({images:[draw(1000),draw(9000)]}));
