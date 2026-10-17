import { OfficeScene } from './office-scene.js';
import { bossAnimation } from './boss-animation.js';

export class BuildingScene{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.projects=[];this.floors=new Map();this.workers=new Map();this.width=1000;this.height=600;this.scale=1;this.zoom=1;this.pan={x:0,y:0};this.offset={x:0,y:0};this.targetOffset={x:0,y:0};this.targetScale=1;this.ready=false;this.theme='cozy';this.activeProject='';this.hits=[];this.floorHits=[];this.lastTime=null;this.bossRoom={x:1240,y:-1280,w:2200,h:920};this.bossHit=null;this.report=null;this.bossPainter=new OfficeScene(canvas);this.reduced=false;}
 point(x,y){return{x,y};}
 setAgents(agents){
  this.agents=agents;const order=new Map(this.projects.map((p,i)=>[p.path,i]));
  for(const project of this.projects){let floor=this.floors.get(project.path);if(!floor){floor=new OfficeScene(this.canvas);floor.company=project.name;this.floors.set(project.path,floor);}floor.company=project.name;floor.order=order.get(project.path);floor.setAgents(agents.filter(a=>a.projectPath===project.path));}
  const keep=new Set(this.projects.map(p=>p.path));for(const path of this.floors.keys())if(!keep.has(path))this.floors.delete(path);
  const values=[...this.floors.values()].sort((a,b)=>a.order-b.order);let rowY=0;
  this.columnWidth=Math.max(1400,...values.map(f=>f.floorWidth))+220;this.buildingWidth=Math.max(this.bossRoom.w,values.length>1?this.columnWidth*2-280:this.columnWidth-280);this.bossRoom.x=(this.buildingWidth-this.bossRoom.w)/2;
  for(let row=0;row<Math.ceil(values.length/2);row++){const pair=values.slice(row*2,row*2+2),rowH=Math.max(...pair.map(f=>f.floorHeight));pair.forEach((floor,col)=>{floor.origin={x:col*this.columnWidth,y:rowY};});rowY+=rowH+290;}
  this.buildingHeight=rowY;this.fit(this.width,this.height,false);
 }
 fit(width=this.width,height=this.height,reset=false){
  this.width=width;this.height=height;if(reset)this.pan={x:0,y:0};
  if(!this.buildingWidth)return;
  const floor=this.floors.get(this.activeProject);
  const totalW=floor?floor.floorWidth+40:this.bossRoom.w+100,totalH=floor?floor.floorHeight+170:this.bossRoom.h+250;
  this.targetScale=Math.min((width-40)/totalW,(height-(floor?70:36))/totalH)*this.zoom;
  const center=floor?this.point(floor.origin.x+floor.floorWidth/2,floor.origin.y+(floor.floorHeight-130)/2):this.point(this.buildingWidth/2,this.bossRoom.y+(this.bossRoom.h-140)/2);
  this.targetOffset={x:width/2-center.x*this.targetScale,y:height/2-center.y*this.targetScale};
  if(!this.ready){this.scale=this.targetScale;this.offset={...this.targetOffset};this.ready=true;}
 }
 drawBossRoom(time=0){
  const p=this.bossPainter,c=this.ctx,r=this.bossRoom,night=this.theme==='night';p.theme=this.theme;
  const wall=night?'#46616b':'#648b7d',wood=night?'#b49a7d':'#d4b28a',ink=night?'#dce8de':'#37594c',muted=night?'#a9c1b5':'#748b78';
  const counts=this.report?.counts||{working:0,waiting:0,delegating:0,unknown:0},totals=this.report?.totals||{projects:0,workers:0,subagents:0};
  c.save();c.translate(r.x,r.y);
  // Architecture and furniture are decorative; only the board uses recorded totals.
  c.save();c.shadowColor='#172c3833';c.shadowBlur=30;c.shadowOffsetY=20;p.rect(-12,-8,r.w+24,r.h+20,'#344f53');c.restore();
  p.rect(0,0,r.w,r.h,wood);
  for(let x=0;x<r.w;x+=90){p.line([{x,y:0},{x,y:r.h}],night?'#79695455':'#9b795335',2);for(let y=80+(x/90%2)*140;y<r.h;y+=280)p.line([{x,y},{x:x+90,y}],night?'#79695455':'#9b79532a',2);}
  p.rect(0,0,r.w,172,wall);p.rect(25,154,r.w-50,15,night?'#688577':'#8fae96');
  p.box(0,0,r.w,24,78,wall);p.box(0,0,24,r.h,60,wall);p.box(r.w-24,0,24,r.h,60,wall);
  p.box(0,r.h-14,970,14,20,wall);p.box(1230,r.h-14,r.w-1230,14,20,wall);p.rect(970,r.h-10,260,10,'#bda16b');
  c.fillStyle=ink;c.font='bold 54px Segoe UI';c.fillText('THE BOSS ROOM',30,-133);
  c.fillStyle=muted;c.font='25px Segoe UI';c.fillText('YOUR BUILDING AT A GLANCE',32,-87);
  // A broad window, low storage, and a small reference library frame the desk.
  p.rect(480,25,780,115,night?'#60757c':'#e5dec7');
  for(let i=0;i<4;i++)p.drawWindow({x:500+i*190,y:41,w:175,h:77,sun:i===3});
  p.rect(468,134,804,16,'#d8d5b8');
  if(!night){const sunset=this.theme==='cozy',beam=c.createLinearGradient(0,150,0,530);beam.addColorStop(0,sunset?'#ffba6560':'#fffbd44a');beam.addColorStop(1,'#ffe9b000');p.polygon([{x:493,y:150},{x:1247,y:150},{x:1247+(sunset?180:40),y:530},{x:493+(sunset?180:40),y:530}],beam);}
  p.box(105,115,250,110,30,'#8e7058');p.rect(119,48,222,146,'#4e665c');
  for(let shelf=0;shelf<2;shelf++){for(let i=0;i<10;i++)p.rect(129+i*20,63+shelf*65,14,48-(i%3)*7,['#87aaa0','#c49a77','#d4c48c','#9aa786'][i%4]);p.rect(117,116+shelf*65,226,10,'#b49970');}
  p.box(1475,100,610,76,28,night?'#71847a':'#9bad92');
  for(let i=0;i<3;i++){p.rect(1490+i*194,94,180,56,night?'#819789':'#b3bda1');p.rect(1558+i*194,118,40,5,'#e6d7ad');}
  // A woven rug gives the compact executive desk its own work area.
  p.rect(440,324,940,420,night?'#576e68':'#9bab8d');p.rect(456,340,908,388,night?'#6e8173':'#b4bea0');
  for(let i=0;i<4;i++)p.rect(472+i*6,354+i*6,876-i*12,3,night?'#93a28b':'#d2d3b4');
  p.rect(475,706,870,4,night?'#93a28b':'#d2d3b4');
  const actor=bossAnimation(time,this.reduced);this.bossActivity=actor.activity;
  const drawRoamingBoss=()=>{
   // Atlas standing heads are smaller than seated heads; match their visible
   // size so getting up keeps the boss's proportions consistent.
   c.save();c.translate(actor.x,actor.y);c.scale(2.65,2.65);
   p.now=this.reduced?0:time;p.reduced=this.reduced;p.speakerId=null;p.hits=[];
   p.drawWorker({id:'decorative-boss',x:0,y:0,action:actor.mode==='walking'?'walking':'resting',direction:actor.direction,walkDistance:actor.distance||0,seed:0,agent:{id:'decorative-boss',colorIndex:4,name:'The boss',status:'idle'}},null,null);
   if(actor.cigar){p.line([{x:9,y:-62},{x:23,y:-59}],'#795235',4);p.circle(24,-59,2,2,'#dd9b4d');for(let i=0;i<3;i++){const drift=((time*.00028+i/3)%1);c.beginPath();c.moveTo(24+Math.sin(drift*7+i)*6,-65-drift*35);c.quadraticCurveTo(34+Math.sin(drift*9)*7,-76-drift*35,25+Math.sin(drift*7)*8,-87-drift*35);c.strokeStyle='rgba(218,222,205,'+((1-drift)*.3)+')';c.lineWidth=2;c.stroke();}}
   c.restore();
  };
  // Keep the approved front-facing desk; the chair and body now sit behind its rear edge.
  p.round(801,261,178,173,16,'#344f49');p.round(812,271,156,144,12,'#526f60');p.round(825,285,130,105,9,'#6b8974');
  const nod=this.reduced?0:Math.sin(time*.0018)*1.1;
  const behindDesk=actor.y<590;
  if(actor.mode!=='seated'&&behindDesk)drawRoamingBoss();
  p.box(553,494,95,170,54,'#8d6d50');p.box(1130,494,95,170,54,'#8d6d50');
  p.box(535,484,710,170,13,'#bd9467',54);p.rect(553,442,674,143,night?'#d2b88d':'#ead1a0');
  p.rect(698,466,365,90,'#506f5d');p.line([{x:704,y:471},{x:1056,y:471}],'#8eab8a',3);
  p.rect(1088,462,92,69,'#f5ecd7');for(let i=0;i<3;i++)p.rect(1099,475+i*13,60-i*10,3,'#b39d76');
  p.round(604,478,25,30,4,'#f6ecd1');p.circle(616,480,12,5,'#84694b');p.line([{x:630,y:488},{x:638,y:488},{x:638,y:501},{x:630,y:501}],'#f6ecd1',5);
  p.rect(824,446,135,91,'#f9eed5');for(let i=0;i<4;i++)p.rect(838,473+i*13,99-i*14,2,'#b49a6c');
  if(actor.mode==='seated'){
   // The full upper body crosses the rear edge without a seam; only legs sit behind the desktop.
   c.save();c.beginPath();c.rect(790,250,200,208);c.clip();p.drawSeatedCharacter(4,actor.frame,890,500+nod,205);c.restore();
   if(actor.frame===3){const tip=this.reduced?0:Math.sin(time*.008)*2;p.line([{x:923,y:444+nod},{x:936+tip,y:460+nod}],'#4c665b',4);}
  }else if(!behindDesk)drawRoamingBoss();
  p.round(820,592,144,29,4,'#3e5e50');c.font='bold 17px Segoe UI';c.fillStyle='#f4e6c3';c.fillText('THE BOSS',851,612);
  // Separate visitor armchairs and a coffee table form a small briefing corner.
  p.rect(95,605,310,210,night?'#6d8077':'#c2c4a3');
  for(const x of [111,301]){p.round(x,627,82,96,10,'#8e7962');p.round(x+9,637,64,69,7,'#d8bd98');p.rect(x+5,627,72,17,'#b19b7e');p.rect(x,647,12,67,'#bba183');p.rect(x+70,647,12,67,'#bba183');}
  p.box(215,707,65,66,21,'#9e805b');p.rect(223,689,49,46,'#e4d3ad');p.rect(235,698,26,23,'#7d9e90');
  // Compact report cabinet: clear hierarchy, real counts, no invented report.
  p.rect(1468,242,640,462,'#2f49483b');p.rect(1456,226,640,462,night?'#354f55':'#405f53');p.rect(1472,242,608,430,night?'#263e48':'#f3eedb');
  const boardInk=night?'#dce8db':'#36594b',boardMuted=night?'#a6bfb3':'#7d8e78';
  c.fillStyle=boardInk;c.font='bold 29px Segoe UI';c.fillText('OFFICE PULSE',1502,290);
  p.circle(1508,320,5,5,this.connected?'#83ad7d':'#c69b55');c.font='19px Segoe UI';c.fillStyle=boardMuted;c.fillText(this.connected?'LIVE LOCAL RECORDS':'LAST OBSERVED RECORDS',1524,327);
  const metrics=[['PROJECTS',totals.projects],['SESSION RECORDS',totals.workers],['NEED INPUT',counts.waiting],['UNKNOWN',counts.unknown]];
  metrics.forEach(([label,value],i)=>{const x=1502+(i%2)*282,y=405+Math.floor(i/2)*135;c.fillStyle=i===2?'#b28b48':boardInk;c.font='bold 64px Segoe UI';c.fillText(String(value),x,y);c.fillStyle=boardMuted;c.font='20px Segoe UI';c.fillText(label,x,y+32);});
  p.rect(1502,591,548,2,night?'#5a726d':'#d5d9c5');c.fillStyle=boardMuted;c.font='22px Segoe UI';c.fillText(counts.working+' at work  /  '+counts.delegating+' team reports',1502,630);
  p.box(1485,773,590,60,38,night?'#71847a':'#93a68e');
  for(let i=0;i<3;i++){p.rect(1495+i*191,740,180,49,night?'#819789':'#b0bc9d');p.rect(1560+i*191,753,45,5,'#e5d5ad');}
  // Larger corner plants use the same in-game plant art as the project floors.
  for(const [x,y]of [[110,395],[1325,196],[1315,776],[2110,855]]){c.save();c.translate(x,y);c.scale(2.2,2.2);p.drawPlant(0,0);c.restore();}
  c.fillStyle=ink;c.font='22px Segoe UI';c.fillText('BRIEFING CORNER',104,862);c.font='20px Segoe UI';c.fillText('BOSS ANIMATION / '+actor.activity.toUpperCase(),500,862);c.fillStyle=muted;c.font='22px Segoe UI';c.fillText('Click the room to open recorded updates',1475,857);
  c.save();c.beginPath();c.rect(0,-78,r.w,r.h+78);c.clip();
  if(night)p.rect(0,-78,r.w,r.h+78,'#06112079');
  for(const [x,y,ceiling]of [[440,220,true],[1330,220,true],[1775,190,true],[560,845,true],[1140,845,true],[1990,845,true],[42,440,false],[2160,440,false]]){
   p.glow(x,y+35,ceiling?260:180,'rgba(255,215,151,0.32)',night?1:this.theme==='cozy'?.74:.18);
   const width=ceiling?90:14,height=ceiling?10:34;p.round(x-width/2-5,y-height/2-5,width+10,height+10,4,'#354b4f');p.round(x-width/2,y-height/2,width,height,2,night?'#fff0c9':this.theme==='cozy'?'#ffdf9b':'#eff6e4');
  }
  if(this.theme==='cozy')p.glow(870,170,470,'rgba(255,165,74,0.23)');
  c.restore();
  c.restore();
  const left=this.offset.x+this.pan.x+r.x*this.scale,top=this.offset.y+this.pan.y+(r.y-30)*this.scale;
  this.bossHit={left,top,right:left+r.w*this.scale,bottom:top+(r.h+30)*this.scale};
 }
 getActivity(id){for(const floor of this.floors.values()){if(floor.workers.has(id))return floor.getActivity(id);}return null;}
 roomAt(x,y,{allFloors=false}={}){
  const entries=allFloors?[...this.floors]:[[this.activeProject,this.floors.get(this.activeProject)]];
  for(const [projectPath,floor]of entries){if(!floor)continue;
   const localX=(x-this.offset.x-this.pan.x)/this.scale-floor.origin.x,localY=(y-this.offset.y-this.pan.y)/this.scale-floor.origin.y;
   if(localX<0||localX>floor.floorWidth||localY< -92||localY>floor.floorHeight)continue;
   const room=floor.rooms.find(room=>{const sign=floor.roomSign(room);return(localX>=room.x&&localX<=room.x+room.w&&localY>=room.y&&localY<=room.y+room.h)||(localX>=sign.x&&localX<=sign.x+sign.w&&localY>=sign.y&&localY<=sign.y+sign.h);});
   if(room)return{projectPath,id:room.id};
  }
  return null;
 }
 render(time,selected=null,hover=null){
  const c=this.ctx,dpr=Math.min(devicePixelRatio||1,2),dt=Math.min(.06,Math.max(0,(time-(this.lastTime??time))/1000));this.lastTime=time;
  const alpha=1-Math.exp(-dt*9);this.scale+=(this.targetScale-this.scale)*alpha;this.offset.x+=(this.targetOffset.x-this.offset.x)*alpha;this.offset.y+=(this.targetOffset.y-this.offset.y)*alpha;
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,this.width,this.height);this.hits=[];this.floorHits=[];this.bossHit=null;
  c.save();c.translate(this.offset.x+this.pan.x,this.offset.y+this.pan.y);c.scale(this.scale,this.scale);
  // The reporter room sits above the continuous project building. Project
  // scenes still own their workers, desks, rooms, and activity animations.
  c.beginPath();c.strokeStyle=this.theme==='night'?'#779b8d':'#8da486';c.lineWidth=10;
  const middle=this.buildingWidth/2,leftCenter=(this.floors.values().next().value?.floorWidth||2200)/2;c.moveTo(middle,-350);c.lineTo(middle,-170);c.lineTo(leftCenter,-170);if(this.floors.size>1){c.moveTo(middle,-170);c.lineTo(this.columnWidth+leftCenter,-170);}c.stroke();
  this.drawBossRoom(time);
  for(const floor of this.floors.values()){
   floor.theme=this.theme;floor.reduced=this.reduced;floor.update(time);const origin=this.point(floor.origin.x,floor.origin.y);
   const left=this.offset.x+this.pan.x+origin.x*this.scale,top=this.offset.y+this.pan.y+(origin.y-150)*this.scale,right=left+floor.floorWidth*this.scale,bottom=top+(floor.floorHeight+180)*this.scale;
   if(right<0||left>this.width||bottom<0||top>this.height)continue;
   floor.scale=this.scale;floor.offset={x:this.offset.x+origin.x*this.scale,y:this.offset.y+origin.y*this.scale};floor.pan=this.pan;floor.hits=[];
   this.floorHits.push({path:[...this.floors.entries()].find(([,f])=>f===floor)[0],left,top,right,bottom});
   c.save();c.translate(origin.x,origin.y);
   c.font=`bold ${17/this.scale}px Segoe UI`;c.fillStyle=this.theme==='night'?'#d0dfd7':'#4e7765';c.fillText(floor.company,30,-115);c.font=`${10/this.scale}px Segoe UI`;c.fillStyle=this.theme==='night'?'#9db6b4':'#8d9e87';c.fillText(`${floor.agents.length} coworkers · a floor of ${this.officeName || 'Agent Office'}`,30,-60);
   floor.drawBuilding();
   floor.drawEntities(selected,hover);floor.drawRoomLabels();this.hits.push(...floor.hits);c.restore();
  }
  c.restore();return this.hits;
 }
}
