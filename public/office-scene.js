import {workerAnimation} from './worker-animation.js';
import {drawActivityCharacter,drawActivityProps,drawThoughtBubble} from './worker-activity-renderer.js';
import {ACTIVITY_FRAMES,LEISURE_FRAMES} from './worker-activity-frames.js';
const THEMES={
 cozy:{wood:'#ba8f6b',wall:'#596f66',trim:'#d9bea0',desk:'#d5a476',office:'#b6b39a',cafeteria:'#d6c3a0',game:'#94aaa0',library:'#aab199',meeting:'#a4b1ab',quiet:'#b4b39b',reception:'#c9bca6',focus:'#a9b3a1',studio:'#b4baa3'},
 fresh:{wood:'#dbc5a4',wall:'#73968c',trim:'#f5f0dc',desk:'#e2be91',office:'#dbe1ca',cafeteria:'#f2e2bd',game:'#c3ddd2',library:'#d8e2c9',meeting:'#cddde0',quiet:'#e0e2ca',reception:'#ece1ca',focus:'#d6e2d8',studio:'#dce5ce'},
 night:{wood:'#514b46',wall:'#293e49',trim:'#66757a',desk:'#8f7764',office:'#526460',cafeteria:'#706d5c',game:'#425e65',library:'#53635c',meeting:'#4b606c',quiet:'#596257',reception:'#6c685f',focus:'#526563',studio:'#53675e'}
};
const ROOM_NAMES={office:'Work pods',cafeteria:'Cafeteria',game:'Game room',library:'Library',meeting:'Team lounge',quiet:'Quiet room',reception:'Reception',focus:'Focus room',studio:'Planning studio'};
const ROOM_PURPOSES={office:'Implementation & tools',cafeteria:'Meals, coffee & water · visual',game:'Games & downtime · visual',library:'Research & reading',meeting:'Waiting for team reports',quiet:'Quiet breaks · visual',reception:'Waiting for your input',focus:'Review & validation',studio:'Plans & task design'};
const ACTION_NAMES={standing:'Standing for a quiet pause','shelf-reading':'Reading by the bookshelves','corner-reading':'Reading in a corner armchair',billiards:'Playing billiards',planning:'Planning at the table',research:'Researching project references',reviewing:'Reviewing project work',typing:'Typing on keyboard',reading:'Reading project notes','library-reading':'Reading in the library',quiet:'Sitting quietly',lounge:'Chilling in the team lounge','reception-rest':'Relaxing in reception',focusing:'Checking a review checklist',water:'Drinking water',eating:'Eating lunch',coffee:'Having coffee',arcade:'Playing an arcade game',pingpong:'Playing table tennis',resting:'Taking a quiet break',reports:'Waiting for team reports',input:'Waiting for your input',walking:'Walking between rooms'};
// Tight alpha bounds exclude adjacent rows and keep seated feet on one anchor.
const SEATED_FRAMES=[
 [[71,31,81,141],[215,36,81,138],[365,35,82,139],[512,31,80,143],[658,31,77,143],[804,31,79,143],[953,33,81,141],[1098,31,86,141]],
 [[71,188,73,142],[222,191,78,145],[363,190,78,146],[514,188,74,147],[660,188,73,146],[807,188,74,146],[955,188,74,145],[1109,187,79,143]],
 [[71,345,80,144],[219,354,81,140],[360,353,84,141],[512,349,77,146],[657,350,75,144],[805,350,77,145],[953,351,77,145],[1106,345,81,144]],
 [[64,505,89,142],[212,511,87,142],[361,511,89,142],[503,508,95,146],[649,508,95,145],[797,508,95,145],[944,508,95,146],[1102,505,89,142]],
 [[71,665,80,141],[218,669,82,140],[360,669,87,140],[512,668,78,142],[658,668,77,142],[805,668,77,142],[953,671,77,140],[1107,665,80,141]],
 [[72,821,80,142],[224,823,80,145],[357,823,83,145],[514,824,74,145],[660,823,73,146],[806,823,75,146],[955,826,73,143],[1109,820,78,143]],
 [[71,977,78,133],[217,983,84,135],[361,983,84,135],[511,979,79,137],[657,978,78,138],[803,979,79,137],[951,981,82,135],[1108,977,79,133]],
 [[65,1124,87,120],[211,1127,88,122],[363,1127,87,122],[503,1124,96,125],[647,1122,97,127],[794,1122,98,127],[945,1123,95,126],[1102,1123,87,121]]
];
const SIDE_FRAMES=[
 [[40,19,98,155],[209,19,80,155],[351,19,96,155],[518,20,79,154],[664,19,97,155],[829,20,81,154],[968,20,93,154],[1132,20,79,154]],
 [[40,176,95,155],[213,174,77,157],[354,175,94,156],[520,176,78,155],[664,175,90,156],[825,175,80,156],[970,175,91,156],[1130,175,77,156]],
 [[40,333,97,157],[207,331,82,159],[351,333,97,156],[517,335,81,156],[663,334,97,156],[825,333,81,157],[969,333,93,157],[1129,333,81,157]],
 [[40,492,98,154],[195,491,94,155],[349,492,97,154],[504,492,95,154],[663,492,98,154],[824,492,97,154],[969,492,97,154],[1126,492,93,154]],
 [[40,650,96,154],[207,650,83,155],[351,650,97,154],[516,650,83,155],[660,650,101,155],[820,650,84,155],[965,650,96,155],[1125,650,83,155]],
 [[39,806,98,156],[211,805,77,157],[352,806,96,156],[518,807,80,155],[659,806,99,156],[823,808,82,154],[968,807,94,155],[1129,807,80,155]],
 [[40,963,97,151],[207,962,81,152],[352,963,95,151],[517,962,81,152],[663,963,97,151],[825,962,82,152],[968,963,94,151],[1132,962,79,152]],
 [[34,1115,102,139],[193,1114,97,140],[346,1116,102,138],[502,1114,98,140],[662,1116,101,138],[822,1114,99,140],[967,1115,101,139],[1124,1114,101,140]]
];
const DIRECTION_FRAMES=[
 [[61,29,91,151],[210,30,94,149],[362,29,88,151],[509,31,95,148],[666,31,95,148],[807,31,90,150],[953,31,95,150],[1093,32,91,147]],
 [[61,187,87,154],[215,188,92,153],[364,188,83,153],[506,188,91,153],[665,188,95,153],[815,187,85,155],[946,185,87,157],[1093,188,95,153]],
 [[57,348,91,153],[211,351,93,150],[361,348,88,153],[507,350,94,152],[666,350,95,151],[808,351,91,151],[951,350,93,153],[1095,350,93,151]],
 [[49,509,109,150],[201,509,105,150],[354,509,103,150],[505,509,105,151],[659,509,101,150],[799,509,103,151],[949,510,102,151],[1094,509,103,150]],
 [[59,667,90,150],[208,667,94,150],[362,667,86,150],[506,667,96,150],[666,667,95,148],[811,668,88,149],[950,668,93,149],[1094,667,93,148]],
 [[62,819,84,153],[212,821,91,152],[363,819,82,153],[506,820,92,153],[669,821,92,152],[813,821,89,153],[950,820,88,154],[1093,821,91,153]],
 [[58,979,94,142],[210,979,93,143],[362,977,87,144],[506,979,94,143],[664,978,95,143],[806,980,94,142],[948,979,96,143],[1096,978,94,143]],
 [[50,1123,111,130],[203,1124,102,129],[354,1124,99,129],[505,1124,101,129],[663,1124,94,129],[799,1123,103,130],[947,1123,103,130],[1093,1124,99,129]]
];
const hash=id=>[...id].reduce((n,c)=>((n*31+c.charCodeAt(0))>>>0),0);
const shade=(hex,f)=>'#'+[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)].map(n=>Math.max(0,Math.min(255,Math.round(n*f))).toString(16).padStart(2,'0')).join('');

export class OfficeScene{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.workers=new Map();this.agents=[];this.theme='cozy';this.zoom=1;this.pan={x:0,y:0};this.width=1000;this.height=600;this.scale=1;this.offset={x:0,y:0};this.lastTime=null;this.now=0;this.hits=[];this.roomHits=[];this.selectedRoom=null;this.reduced=false;this.reservations=new Map();this.deskAssignments=new Map();this.company='';this.roomHeight=1040;this.floorHeight=2200;
  this.sprite=new Image();this.spriteReady=false;this.sprite.onload=()=>{this.spriteReady=true;};this.sprite.src='/assets/office-workers-v1.png';this.walkSprite=new Image();this.walkReady=false;this.walkSprite.onload=()=>{this.walkReady=true;};this.walkSprite.src='/assets/office-workers-walk-v1.png';this.sideSprite=new Image();this.sideReady=false;this.sideSprite.onload=()=>{this.sideReady=true;};this.sideSprite.src='/assets/office-workers-side-walk-v3.png';this.seatedSprite=new Image();this.seatedReady=false;this.seatedSprite.onload=()=>{this.seatedReady=true;};this.seatedSprite.src='/assets/office-workers-seated-v1.png';this.directionSeated=new Image();this.directionSeatedReady=false;this.directionSeated.onload=()=>{this.directionSeatedReady=true;};this.directionSeated.src='/assets/office-workers-seated-directions-v2.png';
  this.activityFrames=ACTIVITY_FRAMES;this.activitySprite=new Image();this.activityReady=false;this.activitySprite.onload=()=>{this.activityReady=true;};this.activitySprite.src='/assets/office-workers-thinking-writing-v1.png';
  this.leisureFrames=LEISURE_FRAMES;this.leisureSprite=new Image();this.leisureReady=false;this.leisureSprite.onload=()=>{this.leisureReady=true;};this.leisureSprite.src='/assets/office-workers-leisure-v1.png';
  this.roomAgentLimit=24;this.reservationRooms=new Map();this.hiddenAgents=[];
  this.obstacles=[];this.items=[];this.seats=[];this.buildFurniture();
 }
 project(x,y,z=0){return{x,y:y-z};}
 polygon(points,color){const c=this.ctx;c.beginPath();c.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();}
 line(points,color,width=1){const c=this.ctx;c.beginPath();c.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 rect(x,y,w,h,color,z=0){this.polygon([this.project(x,y,z),this.project(x+w,y,z),this.project(x+w,y+h,z),this.project(x,y+h,z)],color);}
 box(x,y,w,d,h,color,z=0){const a=this.project(x,y,z+h),b=this.project(x+w,y,z+h),e=this.project(x,y+d,z+h),f=this.project(x+w,y+d,z+h);this.polygon([e,f,this.project(x+w,y+d,z),this.project(x,y+d,z)],shade(color,.83));this.polygon([b,f,this.project(x+w,y+d,z),this.project(x+w,y,z)],shade(color,.67));this.polygon([a,b,f,e],color);}
 circle(x,y,rx,ry,color){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 round(x,y,w,h,r,color){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
 item(type,x,y,w=0,d=0,extra={}){this.items.push({type,x,y,w,d,...extra});if(w&&d&&extra.block!==false)this.obstacles.push({x:x-7,y:y-7,w:w+14,h:d+14,chairId:extra.chairId});}
 buildFurniture(count=18){
  this.obstacles=[];this.items=[];this.seats=[];this.spots={};this.zones=[];this.reservations.clear();this.reservationRooms.clear();
  const podKinds=['cross','three','cross','three','cross'];let capacity=18;
  while(capacity<count){podKinds.push('cross');capacity+=4;}
  // Grow the work area in both directions. Shared rooms have bounded widths,
  // rather than receiving most of the extra footprint for every new desk row.
  let columns=3,best=Infinity;
  for(let cols=3;cols<=Math.max(3,podKinds.length);cols++){
   const rows=Math.ceil(podKinds.length/cols),width=cols*440+2180,height=rows*400+720;
   if(cols!==Math.max(3,Math.ceil(podKinds.length/rows)))continue;
   if(width<height*2)continue;
   const score=Math.abs(Math.log(width/height/2.46))+(cols*rows-podKinds.length)*.012;
   if(score<best){best=score;columns=cols;}
  }
  const rows=Math.ceil(podKinds.length/columns),H=rows*400+100;
  const officeW=columns*440+80,cafeX=officeW+30,cafeW=620,gameX=cafeX+cafeW+30,gameW=740,libraryX=gameX+gameW+30,libraryW=650;
  this.roomHeight=H;this.floorHeight=H+620;this.floorWidth=libraryX+libraryW;
  const W=this.floorWidth,lower=H+130,flexWidth=W-2040;
  const lowerW=[650,700,590,Math.floor(flexWidth/2)],gap=25;let lowerX=0;
  this.rooms=[{id:'office',label:'WORK PODS',x:0,y:0,w:officeW,h:H},{id:'cafeteria',label:'CAFETERIA',x:cafeX,y:0,w:cafeW,h:H},{id:'game',label:'GAME ROOM',x:gameX,y:0,w:gameW,h:H},{id:'library',label:'LIBRARY',x:libraryX,y:0,w:libraryW,h:H}];
  for(const [i,id]of ['meeting','quiet','reception','focus','studio'].entries()){const width=i<4?lowerW[i]:W-lowerX;this.rooms.push({id,label:{meeting:'TEAM LOUNGE',quiet:'QUIET ROOM',reception:'RECEPTION',focus:'FOCUS ROOM',studio:'PLANNING STUDIO'}[id],x:lowerX,y:lower,w:width,h:490});lowerX+=width+gap;}
  for(const room of this.rooms)room.purpose=ROOM_PURPOSES[room.id];
  const spot=(action,x,y,room,seated=false,facing='front')=>{(this.spots[action]||=[]).push({x,y,room,action,seated,facing,seatAnchor:seated});};
  const chair=(cx,cy,room,actions,color='#cd9573',facing='front')=>{const chairId=room+':'+cx+':'+cy;this.item('orientedChair',cx-33,cy-32,66,64,{color,facing,chairId});for(const action of actions){spot(action,cx,cy,room,true,facing);this.spots[action].at(-1).chairId=chairId;}return chairId;};
  // Balance partial rows, so a single pod never leaves a whole row vacant.
  const centers=[];
  for(let row=0;row<rows;row++){
   const rowCount=Math.floor(podKinds.length/rows)+(row<podKinds.length%rows?1:0);
   for(let col=0;col<rowCount;col++)centers.push([officeW/2+(col-(rowCount-1)/2)*440,270+row*400]);
  }
  const faceFromAngle=angle=>{const dx=-Math.cos(angle),dy=-Math.sin(angle);if(Math.abs(dx)<.1)return dy<0?'back':'front';if(Math.abs(dy)<.1)return dx<0?'left':'right';return dy<0?(dx<0?'nw':'ne'):(dx<0?'sw':'se');};
  for(let pod=0;pod<podKinds.length;pod++){
   const kind=podKinds[pod],[cx,cy]=centers[pod];
   this.zones.push({x:cx-178,y:cy-168,w:356,h:334,label:'WORK BAY '+String(pod+1).padStart(2,'0'),color:pod%2?'#c6d4c0':'#e4c6a0'});
   const rotation=pod===3?Math.PI:0;this.item('deskPod',cx,cy,0,0,{kind,index:pod,rotation});
   this.obstacles.push({x:cx-107,y:cy-77,w:214,h:154});
   const angles=kind==='three'?[-Math.PI*.75,-Math.PI*.25,Math.PI*.5]:[-Math.PI*.5,0,Math.PI*.5,Math.PI];
   for(const baseAngle of angles){const angle=baseAngle+rotation,x=cx+Math.cos(angle)*145,y=cy+Math.sin(angle)*145,facing=faceFromAngle(angle);const chairId=chair(x,y,'office',[],'#7b9294',facing);this.seats.push({x,y,room:'office',action:'typing',seated:true,facing,seatAnchor:true,chairId,pod});}
   this.item('divider',cx-174,cy-181,260,8,{color:'#91a798'});this.item('plant',cx+152,cy+143);
  }
  this.item('shelf',27,22,160,32);this.item('plant',officeW-55,48);
  this.item('cabinet',cafeX+25,25,cafeW-134,48);this.item('fridge',cafeX+cafeW-90,27,62,65);
  for(let y=245;y<=H-260;y+=320)for(let col=0;col<2;col++){const x=cafeX+64+col*265;this.item('roundTable',x,y,136,100);chair(x+26,y+143,'cafeteria',['eating','coffee'],'#b69b7a','back');chair(x+112,y-50,'cafeteria',['eating','coffee'],'#b69b7a','front');}
  this.item('water',cafeX+23,H-111,30,36);for(let i=0;i<3;i++)spot('water',cafeX+84+i*65,H-68,'cafeteria');this.item('plant',cafeX+cafeW-56,H-78);
  for(let i=0;i<3;i++){const x=gameX+42+i*129;this.item('arcade',x,63,65,58,{color:['#8da779','#cf8667','#719dac'][i]});spot('arcade',x+33,160,'game',false,'back');}
  this.gameRows=[];
  for(let y=292;y<=H-400;y+=440){
   this.gameRows.push(y);this.item('pool',gameX+75,y,205,151);const pool=this.items.at(-1);
   for(const [x,facing]of [[gameX+32,'right'],[gameX+330,'left']]){spot('billiards',x,y+78,'game',false,facing);this.spots.billiards.at(-1).table=pool;}
   this.item('pingpong',gameX+415,y+31,200,154);for(let i=0;i<2;i++)spot('pingpong',gameX+385,y+68+i*73,'game',false,'right');
  }
  this.item('coffeeTable',gameX+230,H-168,112,64);chair(gameX+145,H-110,'game',['resting'],'#879fae','right');chair(gameX+415,H-110,'game',['resting'],'#879fae','left');chair(gameX+280,H-240,'game',['resting'],'#879fae','front');
  for(let i=0;i<3;i++){this.item('shelf',libraryX+24+i*160,29,130,33);spot('shelf-reading',libraryX+85+i*160,155,'library',false,'front');}
  this.item('divider',libraryX+80,252,libraryW-160,8,{color:'#a0ad93'});this.libraryTables=[];
  for(let y=466;y<=H-190;y+=400){
   this.libraryTables.push(y);this.item('coffeeTable',libraryX+libraryW/2-55,y-33,110,66);
   for(const [dx,dy,facing]of [[-125,0,'right'],[125,0,'left'],[0,-105,'front'],[0,112,'back']])chair(libraryX+libraryW/2+dx,y+dy,'library',['reading','library-reading','resting','research'],'#a4a68b',facing);
  }
  for(const [x,y,facing]of [[libraryX+libraryW-75,340,'sw'],[libraryX+libraryW-110,H-65,'nw']])chair(x,y,'library',['library-reading','corner-reading'],'#91a18c',facing);
  this.item('plant',W-52,H-81);
  const room=id=>this.rooms.find(r=>r.id===id),meeting=room('meeting'),quiet=room('quiet'),reception=room('reception'),focus=room('focus'),studio=room('studio');
  this.item('roundTable',meeting.x+218,lower+150,210,144,{meeting:true});this.item('board',meeting.x+35,lower+29,163,9,{block:false});
  for(const [dx,dy,facing]of [[0,-130,'front'],[178,0,'left'],[0,140,'back'],[-178,0,'right']])chair(meeting.x+323+dx,lower+222+dy,'meeting',['reports','lounge'],'#829c91',facing);
  this.item('plant',meeting.x+meeting.w-56,lower+58);
  const nooks=[[quiet.x+166,lower+145],[quiet.x+520,lower+145],[quiet.x+345,lower+363]];
  for(const [cx,cy]of nooks){this.item('roundTable',cx-35,cy-26,70,52);for(const [dx,dy,facing]of [[0,-76,'front'],[112,0,'left'],[0,76,'back'],[-112,0,'right']])chair(cx+dx,cy+dy,'quiet',['reading','resting','quiet'],'#bc997e',facing);}
  this.item('shelf',quiet.x+quiet.w-145,lower+17,115,29);this.item('plant',quiet.x+quiet.w-53,lower+421);
  this.item('reception',reception.x+60,lower+76,reception.w-130,67);this.item('plant',reception.x+reception.w-60,lower+46);this.item('water',reception.x+reception.w-75,lower+362,29,35);
  this.item('coffeeTable',reception.x+218,lower+278,108,67);chair(reception.x+137,lower+311,'reception',['input','reception-rest'],'#bba07d','right');chair(reception.x+402,lower+311,'reception',['input','reception-rest'],'#bba07d','left');chair(reception.x+274,lower+420,'reception',['input','reception-rest'],'#bba07d','back');
  const focusDesks=Math.floor((focus.w-90)/145);
  for(let i=0;i<focusDesks;i++){this.item('desk',focus.x+55+i*145,lower+91,106,49,{index:i,chairless:true});chair(focus.x+111+i*145,lower+174,'focus',['reading','reviewing','focusing'],'#849b9c','back');if(i<focusDesks-1)this.item('divider',focus.x+183+i*145,lower+40,8,228,{color:'#99aaa0'});}
  this.item('plant',focus.x+focus.w-53,lower+397);this.item('shelf',focus.x+45,lower+340,130,29);
  this.item('board',studio.x+35,lower+31,studio.w-90,9,{block:false});this.planningTables=[];
  const planningTables=Math.max(1,Math.floor(studio.w/440));
  for(let i=0;i<planningTables;i++){
   const cx=studio.x+studio.w*(i+.5)/planningTables;this.planningTables.push(cx);this.item('roundTable',cx-83,lower+171,166,118,{meeting:true});
   for(const [dx,dy,facing]of [[-116,215,'right'],[116,215,'left'],[0,336,'back']]){
    chair(cx+dx,lower+dy,'studio',['planning'],'#829c91',facing);
    this.spots.planning.at(-1).writingSurface={x:cx+(facing==='right'?-63:facing==='left'?63:0),y:lower+(facing==='back'?245:199),angle:this.chairAngle(facing)};
   }
  }
  this.item('plant',W-54,lower+409);
  // Low storage stays at the perimeter, leaving chair approaches and aisles open.
  this.item('credenza',libraryX+32,H-73,165,30);
  this.item('credenza',meeting.x+34,lower+435,166,27);
  this.item('credenza',studio.x+34,lower+425,142,28);
  this.windows=this.windowLayout();
  this.lights=this.lightLayout();
  for(const lamp of this.lights.filter(light=>light.kind==='floor'))this.obstacles.push({x:lamp.x-14,y:lamp.y-10,w:28,h:25});
  const wall=(x,y,w,h)=>this.obstacles.push({x,y,w,h,wall:true});
  const top=this.rooms.slice(0,4),bottom=this.rooms.slice(4);
  for(const r of top.slice(0,-1)){wall(r.x+r.w,0,30,H-190);wall(r.x+r.w,H-70,30,70);}
  for(const r of top){const door=r.x+r.w/2;wall(r.x,H,door-70-r.x,20);wall(door+70,H,r.x+r.w-door-70,20);}
  for(const r of bottom){const door=r.x+r.w/2;wall(r.x,lower-20,door-70-r.x,20);wall(door+70,lower-20,r.x+r.w-door-70,20);}
  for(const r of bottom.slice(0,-1)){wall(r.x+r.w,lower,25,150);wall(r.x+r.w,lower+290,25,200);}
  // Seeded clear spots vary standing pauses without moving desks or blocking doors.
  const occupied=[...this.seats,...Object.values(this.spots).flat()];
  for(const room of this.rooms.filter(room=>room.id!=='quiet')){
   let seed=hash('standing:'+room.id),added=0;
   for(let attempt=0;attempt<70&&added<3;attempt++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=room.x+55+(seed/4294967296)*(room.w-110);
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=room.y+100+(seed/4294967296)*(room.h-165);
    if([-24,0,24].some(dx=>[-24,0,24].some(dy=>this.blocked(x+dx,y+dy)))||occupied.some(p=>Math.hypot(p.x-x,p.y-y)<75))continue;
    spot('standing',x,y,room.id,false,['front','right','left'][added%3]);occupied.push({x,y});added++;
   }
  }
 }
 itemDepth(item){return item.type==='orientedChair'?item.y-20:item.type==='deskPod'?item.y-45:item.y+item.d;}
 windowLayout(){
  const windows=[];
  for(const room of this.rooms.slice(0,4)){const sign=this.roomSign(room);for(const [left,right]of [[room.x+28,sign.x-22],[sign.x+sign.w+22,room.x+room.w-28]]){
   const span=right-left;if(span<90)continue;const count=Math.max(1,Math.floor(span/200));
   for(let i=0;i<count;i++){const w=Math.min(150,span/count-20);windows.push({x:left+span*(i+.5)/count-w/2,y:-60,w,h:48,room:room.id,sun:room.id==='library'&&right===room.x+room.w-28&&i===count-1});}
  }}return windows;
 }
 lightLayout(){
  const lights=[];
  for(const room of this.rooms){
   const columns=Math.max(1,Math.floor(room.w/450));
   for(let y=room.y?95:180;y<room.h-100;y+=400)for(let i=0;i<columns;i++)lights.push({kind:'ceiling',x:room.x+room.w*(i+.5)/columns,y:room.y+y,radius:room.y?220:260});
   for(const x of [room.x+22,room.x+room.w-22])lights.push({kind:'wall',x,y:room.y+(room.y?215:room.h-180),radius:135});
  }
  for(let x=140;x<this.floorWidth;x+=350)lights.push({kind:'hall',x,y:this.roomHeight+76,radius:210});
  const quiet=this.rooms.find(room=>room.id==='quiet');
  for(const [dx,dy]of [[245,202],[599,202],[424,415]])lights.push({kind:'floor',x:quiet.x+dx,y:quiet.y+dy,radius:125});
  return lights;
 }
 glow(x,y,radius,color,alpha=1){
  const c=this.ctx;c.save();c.globalAlpha=alpha;
  const g=c.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,color);g.addColorStop(.35,color.replace(/,[\d.]+\)$/,',0.12)'));g.addColorStop(1,color.replace(/,[\d.]+\)$/,',0)'));c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);c.restore();
 }
 drawWindow(o){
  const c=this.ctx,night=this.theme==='night',cozy=this.theme==='cozy';
  this.rect(o.x-6,o.y-6,o.w+12,o.h+12,night?'#7a8989':'#dcd6be');
  const sky=c.createLinearGradient(0,o.y,0,o.y+o.h);sky.addColorStop(0,night?'#081523':cozy?'#b56e79':'#a3ddea');sky.addColorStop(.6,night?'#10283b':cozy?'#f5a761':'#d6f0ec');sky.addColorStop(1,night?'#1c3240':cozy?'#ffdc94':'#fffbe0');c.fillStyle=sky;c.fillRect(o.x,o.y,o.w,o.h);
  if(cozy&&o.sun)this.circle(o.x+o.w*.78,o.y+o.h*.65,11,11,'#ffe9b8');
  this.rect(o.x,o.y+o.h-9,o.w,9,night?'#0b1722':'#8c9c8070');
  this.line([{x:o.x+o.w/2,y:o.y},{x:o.x+o.w/2,y:o.y+o.h}],night?'#647b81':'#eae3cc',3);
  this.line([{x:o.x,y:o.y+o.h/2},{x:o.x+o.w,y:o.y+o.h/2}],night?'#647b81':'#eae3cc',3);
  this.rect(o.x-10,o.y+o.h+3,o.w+20,9,night?'#718387':'#e6d6b6');
 }
 drawDaylight(){
  if(this.theme==='night')return;const c=this.ctx,cozy=this.theme==='cozy';c.save();c.beginPath();c.rect(0,0,this.floorWidth,this.roomHeight);c.clip();
  for(const o of this.windows){const length=cozy?370:250,slant=cozy?155:45;const beam=c.createLinearGradient(0,0,0,length);beam.addColorStop(0,cozy?'#ffb55764':'#fffbe458');beam.addColorStop(1,cozy?'#ffc17400':'#fffbe400');
   this.polygon([{x:o.x,y:8},{x:o.x+o.w,y:8},{x:o.x+o.w+slant,y:length},{x:o.x+slant,y:length}],beam);
   for(let i=1;i<3;i++)this.line([{x:o.x+o.w*i/3,y:8},{x:o.x+o.w*i/3+slant,y:length}],cozy?'#7b644b12':'#72877d0c',3);
  }c.restore();
 }
 drawRug(x,y,w,h,color){
  this.round(x+4,y+6,w,h,8,'#213f3b15');this.round(x,y,w,h,7,color);this.round(x+8,y+8,w-16,h-16,4,shade(color,1.09));
  this.line([{x:x+16,y:y+16},{x:x+w-16,y:y+16},{x:x+w-16,y:y+h-16},{x:x+16,y:y+h-16},{x:x+16,y:y+16}],shade(color,.85),2);
  for(let i=0;i<5;i++)this.rect(x+18,y+24+i*7,w-36,2,shade(color,1.16));
 }
 drawRoomDetails(){
  const night=this.theme==='night';
  for(const room of this.rooms){const {x,y,w,h,id}=room;
   this.rect(x+15,y+9,w-30,6,night?'#80908d':'#e1d8bd');
   if(id==='cafeteria'){for(let tx=x+20;tx<x+w-20;tx+=45)for(let ty=y+105;ty<y+h-25;ty+=45){this.rect(tx,ty,42,42,night?'#b9b3990b':'#fff6d216');}this.drawRug(x+26,y+98,w-60,62,night?'#5f6253':'#9aaa86');}
   if(id==='game')for(const row of this.gameRows)this.drawRug(x+28,row-39,w-56,265,night?'#3b565d':'#7c9b8d');
   if(id==='library')for(const cy of this.libraryTables)this.drawRug(x+w/2-195,cy-161,390,325,night?'#536358':'#bac0a0');
   if(id==='meeting')this.drawRug(x+95,y+64,w-190,352,night?'#48606a':'#91aaa9');
   if(id==='quiet'){for(const [dx,dy]of [[166,145],[520,145],[345,363]])this.drawRug(x+dx-145,y+dy-105,290,205,night?'#696451':'#c8b594');}
   if(id==='reception')this.drawRug(x+80,y+216,w-150,240,night?'#696454':'#cfb98c');
   if(id==='focus')this.drawRug(x+32,y+50,w-64,230,night?'#4a625d':'#b8c5ad');
   if(id==='studio')for(const cx of this.planningTables)this.drawRug(cx-190,y+105,380,318,night?'#506358':'#a5b799');
   // Framed geometric prints are decor, independent of recorded session data.
   if(['library','quiet','meeting','studio'].includes(id)){const px=x+w-99,py=y+35;this.rect(px,py,58,65,'#927659');this.rect(px+5,py+5,48,55,night?'#62756c':'#eee2c4');this.circle(px+30,py+25,13,13,'#c78d65');this.polygon([{x:px+8,y:py+54},{x:px+25,y:py+31},{x:px+49,y:py+54}],'#799887');}
  }
 }
 screenSources(){
  const screens=[];
  for(const o of this.items){
   if(o.type==='deskPod')for(const base of o.kind==='three'?[-Math.PI*.75,-Math.PI*.25,Math.PI*.5]:[-Math.PI/2,0,Math.PI/2,Math.PI]){const a=base+(o.rotation||0),seat={x:o.x+Math.cos(a)*145,y:o.y+Math.sin(a)*145};screens.push({x:o.x+Math.cos(a)*58,y:o.y+Math.sin(a)*58,angle:a,seat,pod:true});}
   if(o.type==='desk')screens.push({x:o.x+62,y:o.y-37,angle:0,seat:{x:o.x+56,y:o.y+83},pod:false});
  }
  const seatedWorkers=[...this.workers.values()].filter(worker=>worker.agent.status==='working'&&worker.seated);
  return screens.map((screen,i)=>({...screen,active:seatedWorkers.some(worker=>Math.hypot(worker.x-screen.seat.x,worker.y-screen.seat.y)<38),phase:i*1.73}));
 }
 screenIntensity(screen){return screen.active?(this.reduced?1:.96+.04*Math.sin(this.now*.008+screen.phase)*Math.sin(this.now*.003+screen.phase)):.24;}
 drawLighting(){
  const c=this.ctx,night=this.theme==='night',cozy=this.theme==='cozy';c.save();c.beginPath();c.rect(0,-92,this.floorWidth,this.floorHeight+92);c.clip();
  if(night)this.rect(0,-92,this.floorWidth,this.floorHeight+92,'#06112079');
  else if(cozy)this.rect(0,0,this.floorWidth,this.floorHeight,'#c7772910');
  for(const o of this.lights){const power=night?1:cozy?.74:.18;
   this.glow(o.x,o.y+28,o.radius,night?'rgba(255,216,154,0.32)':'rgba(255,190,106,0.30)',power);
   if(o.kind==='floor'){this.circle(o.x,o.y+9,14,8,'#344b47');this.line([{x:o.x,y:o.y+7},{x:o.x,y:o.y-40}],'#91836a',5);this.circle(o.x,o.y-44,23,17,night?'#fae3b1':'#f0d4a2');this.circle(o.x,o.y-44,10,7,'#fff4d5');}
   else{const width=o.kind==='ceiling'?74:o.kind==='hall'?44:12,height=o.kind==='wall'?28:8;this.round(o.x-width/2-4,o.y-height/2-4,width+8,height+8,4,'#354b4f');this.round(o.x-width/2,o.y-height/2,width,height,2,night?'#fff0c9':cozy?'#ffdf9b':'#eff6e4');}
  }
  if(cozy)for(const o of this.windows)this.glow(o.x+o.w/2,18,150,'rgba(255,168,76,0.32)');
  if(night)for(const screen of this.screenSources()){const intensity=this.screenIntensity(screen);this.glow(screen.x,screen.y,screen.active?115:48,'rgba(112,213,240,0.45)',intensity);this.glow(screen.seat.x,screen.seat.y-22,screen.active?62:24,'rgba(124,207,229,0.24)',intensity);
   c.save();c.translate(screen.x,screen.y);c.rotate(screen.angle);c.globalAlpha=.65+.35*intensity;
   if(screen.pod){this.round(-3,-22,6,44,1,screen.active?'#a2e6ef':'#52808a');c.globalAlpha=intensity;for(let i=0;i<4;i++)this.rect(-2,-17+i*9,2,i%2?10:7,'#e2fff5');}
   else{this.round(-17,-10,34,20,1,screen.active?'#a2e6ef':'#52808a');c.globalAlpha=intensity;for(let i=0;i<3;i++)this.rect(-13,-6+i*5,20-i*4,1,'#e2fff5');}c.restore();
  }c.restore();
 }
 workerConnections(){
  return [...this.workers.values()].flatMap(worker=>{const planner=this.workers.get(worker.agent.parentId);return planner&&planner!==worker?[[planner,worker]]:[];});
 }
 drawWorkerConnections(){
  const c=this.ctx,s=Math.max(this.scale,.18);c.save();c.strokeStyle=this.theme==='night'?'#c1d5c733':'#526f6329';c.lineWidth=.8/s;c.lineCap='round';c.setLineDash([4/s,6/s]);
  for(const [planner,worker]of this.workerConnections()){const lift=Math.min(240,Math.hypot(worker.x-planner.x,worker.y-planner.y)*.3);c.beginPath();c.moveTo(planner.x,planner.y-45);c.quadraticCurveTo((planner.x+worker.x)/2,Math.min(planner.y,worker.y)-45-lift,worker.x,worker.y-45);c.stroke();}c.restore();
 }
 drawEntities(selected,hover){
  this.drawWorkerConnections();
  this.overlays=[];this.surfaceOverlays=[];this.headAnchors??=new Map();this.headAnchors.clear();
  const entities=[...this.items.map(item=>({depth:this.itemDepth(item),draw:()=>this.drawItem(item)})),...[...this.workers.values()].map(worker=>({depth:worker.y+2,draw:()=>this.drawWorker(worker,selected,hover)}))];
  for(const item of this.items.filter(item=>item.type==='orientedChair'))entities.push({depth:item.y+95,draw:()=>this.drawChairForeground(item)});
  entities.sort((a,b)=>a.depth-b.depth);for(const entity of entities)entity.draw();for(const surface of this.surfaceOverlays)surface();this.surfaceOverlays=null;this.drawLighting();for(const overlay of this.overlays)overlay();this.overlays=null;
 }

 fit(width=this.width,height=this.height,reset=false){this.width=width;this.height=height;const bounds=this.overview?{left:-16,right:1770,top:-100,bottom:Math.ceil((this.projects?.length||1)/3)*300+30}:{left:-16,right:1755,top:-115,bottom:727};this.scale=Math.min((width-46)/(bounds.right-bounds.left),(height-88)/(bounds.bottom-bounds.top))*this.zoom;this.offset={x:width/2-(bounds.left+bounds.right)/2*this.scale,y:height/2-(bounds.top+bounds.bottom)/2*this.scale};if(reset)this.pan={x:0,y:0};}
 admitAgents(agents){
  const limit=this.roomAgentLimit,spaces={office:limit,studio:Math.min(limit,this.spots.planning.length),reception:Math.min(limit,this.spots.input.length),meeting:Math.min(limit,this.spots.reports.length)};
  const breakPlaces=new Map();
  for(const place of Object.values(this.spots).flat())if(!['office','studio'].includes(place.room)&&place.seated){if(!breakPlaces.has(place.room))breakPlaces.set(place.room,new Set());breakPlaces.get(place.room).add(place.chairId);}
  let breaks=[...breakPlaces.values()].reduce((sum,seats)=>sum+Math.min(limit,seats.size),0);
  // A newly recorded main session displaces subagents before another main
  // session. Never fabricate a replacement session or change recorded status.
  const priority=[...agents].sort((a,b)=>Number(!!a.parentId)-Number(!!b.parentId)||Math.max(Number(b.lastSeen)||0,Number(b.updatedAt)||0)-Math.max(Number(a.lastSeen)||0,Number(a.updatedAt)||0)||String(a.id).localeCompare(String(b.id)));
  const admitted=new Set();
  for(const agent of priority){
   let room=agent.status==='working'?(agent.kind==='planning'&&spaces.studio>0?'studio':'office'):agent.status==='waiting'?'reception':agent.status==='delegating'?'meeting':null;
   if(room){if(spaces[room]<=0)continue;spaces[room]--;}
   else{if(breaks<=0)continue;breaks--;}
   admitted.add(agent.id);
  }
  return agents.filter(agent=>admitted.has(agent.id));
 }
 setAgents(records){
  let agents=this.admitAgents(records),rebuilt=false;
  // Allocate tables for admitted workers, so hidden subagents cannot enlarge
  // the building. Recheck once the larger studio has its extra tables.
  if(this.seats.length<Math.max(18,agents.length)){this.buildFurniture(Math.max(18,agents.length));rebuilt=true;agents=this.admitAgents(records);}
  this.hiddenAgents=records.filter(agent=>!agents.some(visible=>visible.id===agent.id));
  this.agents=agents;const keep=new Set(agents.map(a=>a.id));for(const [id,worker]of this.workers){if(!keep.has(id)){if(worker.claim){this.reservations.delete(worker.claim);this.reservationRooms.delete(worker.claim);}this.workers.delete(id);this.deskAssignments.delete(id);}}
  const required=Math.max(18,agents.length);if(this.seats.length<required){this.buildFurniture(required);rebuilt=true;}
  if(this.lastRoomAgentLimit!==this.roomAgentLimit&&this.seats.length>required+8){
   this.buildFurniture(required);rebuilt=true;
   const occupied=new Set([...this.deskAssignments.values()].filter(desk=>desk<this.seats.length));
   for(const [id,desk]of this.deskAssignments)if(desk>=this.seats.length){let available=0;while(occupied.has(available))available++;this.deskAssignments.set(id,available);occupied.add(available);}
  }
  if(rebuilt||this.lastRoomAgentLimit!==this.roomAgentLimit){this.reservations.clear();this.reservationRooms.clear();for(const worker of this.workers.values()){
   // Rebuilt partitions can cover an old seat or arrival point. Re-enter from
   // the clear corridor while keeping the worker's assigned workstation.
   Object.assign(worker,this.arrivalPosition(worker.desk),{targetKey:null,claim:null,destination:null,departingChair:null,path:[],pathFailed:false,action:'walking',seated:false});
  }}
  this.lastRoomAgentLimit=this.roomAgentLimit;
  const used=new Set(this.deskAssignments.values());for(const a of agents){let desk=this.deskAssignments.get(a.id);if(desk===undefined){desk=0;while(used.has(desk))desk++;used.add(desk);this.deskAssignments.set(a.id,desk);}
   let worker=this.workers.get(a.id);if(!worker){worker={id:a.id,...this.arrivalPosition(desk),action:'walking',room:'reception',seed:hash(a.id),path:[],destination:null,targetKey:null,desk,claim:null,stalled:0};this.workers.set(a.id,worker);}worker.agent=a;worker.desk=desk;
  }
 }
 arrivalPosition(desk){const columns=Math.max(1,Math.floor((this.floorWidth-110)/49));return{x:55+(desk%columns)*49,y:this.roomHeight+50+(Math.floor(desk/columns)%2)*40};}
 reservePlace(worker,target,key,desired){
  let occupied=0;for(const [claim,room]of this.reservationRooms)if(room===target.room&&this.reservations.has(claim))occupied++;
  if(occupied>=this.roomAgentLimit)return null;
  this.reservations.set(key,worker.id);this.reservationRooms.set(key,target.room);worker.claim=key;return{...target,desired};
 }
 blocked(x,y,ignoreChair=null){const ignored=Array.isArray(ignoreChair)?ignoreChair:[ignoreChair];return x<15||y<20||x>this.floorWidth-20||y>this.floorHeight-20||this.obstacles.some(r=>!(r.chairId&&ignored.includes(r.chairId))&&x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);}
 findPath(start,target,avoid=[]){
  const step=20,cols=Math.ceil(this.floorWidth/step)+1,rows=Math.ceil(this.floorHeight/step);const snap=p=>({x:Math.max(1,Math.min(cols-2,Math.round(p.x/step))),y:Math.max(1,Math.min(rows-2,Math.round(p.y/step)))});const s=snap(start),t=snap(target),startKey=s.y*cols+s.x,targetKey=t.y*cols+t.x;
  const queue=[startKey],parents=new Map([[startKey,null]]);let cursor=0,found=false;
  while(cursor<queue.length){const key=queue[cursor++];if(key===targetKey){found=true;break;}const x=key%cols,y=Math.floor(key/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*cols+nx;if(nx<1||ny<1||nx>=cols-1||ny>=rows-1||parents.has(k))continue;if(k!==targetKey&&(this.blocked(nx*step,ny*step,[target.chairId,start.departingChair])||avoid.some(other=>Math.hypot(nx*step-other.x,ny*step-other.y)<33)))continue;parents.set(k,key);queue.push(k);}}
  if(!found)return [];const route=[];let key=targetKey;while(key!==startKey){route.unshift({x:(key%cols)*step,y:Math.floor(key/cols)*step});key=parents.get(key);}route.push({x:target.x,y:target.y});return route;
 }
 desired(worker,time){const a=worker.agent,s=worker.seed,phase=Math.floor((time+s%15000)/18000);
  // Decorative outings have time to arrive and settle before the next one.
  if(['idle','unknown'].includes(a.status)&&worker.destination?.visualStatus===a.status&&worker.claim&&this.reservations.get(worker.claim)===worker.id&&!worker.pathFailed&&(worker.path.length||time-(worker.arrivedAt??time)<12000))return worker.destination.desired;
  if(a.status==='working'&&a.kind==='planning')return 'planning';
  if(a.status==='working'){if(['reading','research'].includes(a.kind))return 'research';if(a.kind==='reviewing')return 'reviewing';return 'typing';}
  if(a.status==='delegating')return phase%4===3?'coffee':'reports';
  if(a.status==='waiting')return 'input';
  if(a.status==='unknown')return ['library-reading','standing','coffee','shelf-reading','quiet','standing','reception-rest','lounge','water'][(phase+s)%9];
  return ['standing','eating','arcade','shelf-reading','billiards','quiet','coffee','standing','pingpong','library-reading','reception-rest','lounge','corner-reading','focusing','water'][(phase+s)%15];
 }
 choose(worker,time){
  const desired=this.desired(worker,time);if(worker.destination?.desired===desired&&worker.claim&&this.reservations.get(worker.claim)===worker.id)return worker.destination;
  if(worker.claim){this.reservations.delete(worker.claim);this.reservationRooms.delete(worker.claim);worker.claim=null;}
  const atDesk=['typing','desk-reading'].includes(desired)||(worker.agent.status==='working'&&['research','reviewing'].includes(desired));
  if(atDesk){const target={...this.seats[worker.desk],action:desired==='desk-reading'?'reading':desired},place=this.reservePlace(worker,target,'desk:'+worker.desk,desired);if(place)return place;}
  const spots=atDesk?[]:this.spots[desired]||[];const begin=worker.seed%Math.max(1,spots.length);for(let i=0;i<spots.length;i++){const target=spots[(begin+i)%spots.length],key=target.x+':'+target.y;const owner=this.reservations.get(key);if(owner&&owner!==worker.id)continue;const place=this.reservePlace(worker,target,key,desired);if(place)return place;}
  if(['planning','research','reviewing'].includes(desired)){const place=this.reservePlace(worker,{...this.seats[worker.desk],action:desired},'desk:'+worker.desk,desired);if(place)return place;}
  // Full furniture never makes characters stack; overflow workers keep walking in the hallway.
  const patrol=Math.floor(time/10000)+(worker.roamCycle||0);
  return{x:100+(worker.desk%25)*80+(patrol%2?40:0),y:this.roomHeight+55+(Math.floor(worker.desk/25)%2)*40,room:'reception',action:'walking',desired,seated:false};
 }
 isWorkerSolid(worker){return worker.action!=='walking';}
 returningToWork(worker){return worker.agent.status==='working'&&['typing','planning','research','reviewing','reading'].includes(worker.destination?.action);}
 workerDialogue(worker){
  const a=worker.agent,title=typeof a.title==='string'?a.title.trim():'';
  if(worker.action!=='walking'&&worker.room==='quiet')return '...';
  if(worker.action!=='walking'&&worker.room==='reception'&&worker.seated)return 'Taking a breather.';
  if(worker.action!=='walking'&&worker.room==='meeting'&&worker.seated)return 'A little lounge time.';
  if(a.status!=='working'&&worker.action!=='walking'){
   const activityLines={standing:'Stretching my legs.',coffee:'A warm coffee break.',water:'Just a sip.',eating:'Time for a bite.','library-reading':'One more page.','corner-reading':'A quiet reading corner.','shelf-reading':'Found a good book.',arcade:'One more round.',billiards:'Lining up the shot.',pingpong:'Your serve.',focusing:'Checking each detail.'};
   if(activityLines[worker.action])return activityLines[worker.action];
  }
  if(a.status==='working'){
   const action=worker.destination?.action||worker.action,planning=a.kind==='planning'||action==='planning'||worker.room==='studio',research=action==='research'||['research','reading'].includes(a.kind),review=action==='reviewing'||a.kind==='reviewing';
   const fallback=planning?'Brainstorming task approach':research?'Researching project references':review?'Reviewing project work':'Working on recorded task';
   // Public titles can contain pasted prompts. Reject instructions, lists,
   // paths and opaque identifiers rather than displaying a prompt excerpt.
   if(!title||title.length>180||/[\r\n<>`]|https?:\/\/|[A-Za-z]:[\\/]|@|_/i.test(title)||/\b(?:AGENTS\.md|instructions|these are|you are|keep the|run npm|only projects|project list|environment_context)\b/i.test(title)||(title.match(/[,;|]/g)||[]).length>1)return fallback;
   let phrase=title.replace(/[.,!?:;()[\]"]/g,' ').replace(/\s+/g,' ').trim();
   phrase=phrase.replace(/^(?:please\s+|can you\s+|could you\s+|help me\s+|i want (?:you )?to\s+|we need to\s+)/i,'');
   const verb=phrase.match(/^(fix|repair|debug|resolve|build|create|add|implement|improve|update|change|make|refactor|plan|design|research|review|test)\b\s*/i)?.[1]?.toLowerCase();
   if(verb)phrase=phrase.slice(verb.length).trim();
   phrase=phrase.replace(/^(?:(?:the|a|an|some|new|in|option|for|to)\s+)+/i,'');
   const words=phrase.split(' ');
   if(words.some(word=>word.length>20||!/^\p{L}[\p{L}\p{N}'’-]*$/u.test(word)))return fallback;
   // Stop at a clause boundary; preserve a short subject from the title.
   const end=words.findIndex(word=>/^(?:and|but|so|that|which|when|where|with|using|should|must|until|because|is|are)$/i.test(word));
   const subject=(end>=0?words.slice(0,end):words).slice(0,3).join(' ');
   if(!subject||subject.length>42)return fallback;
   const prefix=planning?'Brainstorming':research?'Researching':review?'Reviewing':['fix','repair','debug','resolve'].includes(verb)?'Fixing':['build','create','add','implement'].includes(verb)?'Building':['improve','update','change','make','refactor'].includes(verb)?'Updating':'Working on';
   return `${prefix} ${/^[A-Z]{2}/.test(subject)?subject:subject.charAt(0).toLowerCase()+subject.slice(1)}`;
  }
  const lines={delegating:['Waiting on the team.','Reports first, coffee next.'],waiting:['Ready when you are.','I need your input.'],idle:['That turn is wrapped up.','Time for a little break.'],unknown:['No new signal yet.','A quiet moment.']};
  return (lines[a.status]||lines.unknown)[Math.floor((this.now+worker.seed%12000)/14000)%2];
 }
 stationaryWorkerAt(worker,x=worker.x,y=worker.y){return [...this.workers.values()].some(other=>other.id!==worker.id&&this.isWorkerSolid(other)&&Math.hypot(x-other.x,y-other.y)<30);}
 update(time){const dt=Math.min(.06,Math.max(0,(time-(this.lastTime??time))/1000));this.lastTime=time;this.now=time;this.speakerId=this.agents.length?this.agents[Math.floor(time/5000)%this.agents.length].id:null;
  for(const worker of this.workers.values()){
   const target=this.choose(worker,time),key=target.x+':'+target.y+':'+target.action;if(key!==worker.targetKey){worker.departingChair=worker.destination?.chairId||worker.departingChair;worker.destination={...target,visualStatus:worker.agent.status};worker.arrivedAt=null;worker.targetKey=key;worker.path=this.findPath(worker,target);worker.pathFailed=!worker.path.length&&Math.hypot(worker.x-target.x,worker.y-target.y)>30;}
   worker.running=!!worker.path.length&&this.returningToWork(worker)&&!this.reduced;
   const next=worker.path[0];if(next&&!this.reduced){let budget=dt*(worker.running?(620+worker.seed%80)/2:95+worker.seed%25);
    // Walking characters pass through bodies. Static routes and reserved
    // destinations remain intact; stationary activity owns its occupied place.
    // Spend the full frame distance across waypoints, so a fast return is not
    // limited by the grid's 20-pixel cells. Keep every turn in the static route.
    while(worker.path.length&&budget>0){const point=worker.path[0],dx=point.x-worker.x,dy=point.y-worker.y,d=Math.hypot(dx,dy),step=Math.min(d,budget);worker.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';worker.x+=d?dx/d*step:0;worker.y+=d?dy/d*step:0;worker.walkDistance=(worker.walkDistance||0)+step;budget-=step;if(d<=step)worker.path.shift();else break;}
    worker.stalled=0;
    worker.action='walking';worker.seated=false;
   }else if(next&&this.reduced){worker.action='walking';worker.seated=false;}else if(!worker.pathFailed){if(worker.destination.action!=='walking'&&this.stationaryWorkerAt(worker)){worker.action='walking';worker.seated=false;continue;}worker.action=worker.destination.action;worker.room=worker.destination.room;worker.seated=!!worker.destination.seated;worker.arrivedAt??=time;if(worker.action==='walking'&&!worker.claim){worker.roamCycle=(worker.roamCycle||0)+1;worker.targetKey=null;}}else{worker.action='walking';worker.seated=false;worker.stalled+=dt;if(worker.stalled>1){worker.path=this.findPath(worker,worker.destination);worker.pathFailed=!worker.path.length;worker.stalled=0;}}
  }
 }
 getActivity(id){const w=this.workers.get(id);return w?{room:ROOM_NAMES[w.room],purpose:ROOM_PURPOSES[w.room],animation:w.running&&w.action==='walking'?'Running back to work':ACTION_NAMES[w.action],visualPose:workerAnimation(w,this.now,this.reduced).description,decorative:!['reports','input'].includes(w.action)}:null;}
 getRoomInfo(id){const room=this.rooms.find(room=>room.id===id);if(!room)return null;const places=[...this.seats,...Object.values(this.spots).flat()].filter(place=>place.room===id);return {...room,name:ROOM_NAMES[id],decorative:['cafeteria','game','quiet'].includes(id),capacity:new Set(places.map(place=>place.x+':'+place.y)).size,occupants:[...this.workers.values()].filter(worker=>worker.room===id&&worker.action!=='walking').map(worker=>worker.agent)};}
 drawPlant(x,y){this.box(x,y,23,22,20,'#b57e55');const p=this.project(x+11,y+11,20);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;this.circle(p.x+Math.cos(a)*10,p.y-17+Math.sin(a)*9,10,18,['#62895e','#86a56c','#70955f'][i%3]);}this.line([{x:p.x,y:p.y},{x:p.x,y:p.y-25}],'#668354',3);}
 chairAngle(facing){return {front:0,right:-Math.PI/2,back:Math.PI,left:Math.PI/2,ne:-Math.PI*.75,se:-Math.PI*.25,sw:Math.PI*.25,nw:Math.PI*.75}[facing]||0;}
 drawChair(o){const c=this.ctx;c.save();c.translate(o.x+33,o.y+32);c.rotate(this.chairAngle(o.facing));this.round(-35,-27,73,67,10,'#253b3833');this.round(-32,-31,64,61,9,shade(o.color,.65));this.round(-23,-19,46,44,8,shade(o.color,1.12));this.round(-32,-32,64,15,6,shade(o.color,.84));this.round(-33,-17,9,43,4,shade(o.color,.94));this.round(24,-17,9,43,4,shade(o.color,.94));this.line([{x:-18,y:-10},{x:18,y:-10}],shade(o.color,1.3),2);this.line([{x:-20,y:25},{x:20,y:25}],shade(o.color,.96),2);this.rect(-17,28,7,5,'#435954');this.rect(10,28,7,5,'#435954');c.restore();}
 drawChairForeground(o){if(!['back','ne','nw'].includes(o.facing))return;const c=this.ctx;c.save();c.translate(o.x+33,o.y+32);c.rotate(this.chairAngle(o.facing));this.round(-32,-32,64,16,6,shade(o.color,.84));c.restore();}
 drawDeskPod(o){const c=this.ctx;c.save();c.translate(o.x,o.y);c.rotate(o.rotation||0);const wood=THEMES[this.theme].desk;
  const workstation=(angle,inner,outer,halfWidth)=>{c.save();c.rotate(angle);this.polygon([{x:inner+4,y:-halfWidth+6},{x:outer+4,y:-halfWidth+10},{x:outer+4,y:halfWidth+2},{x:inner+4,y:halfWidth+6}],'#263a383b');this.polygon([{x:inner,y:-halfWidth},{x:outer,y:-halfWidth+4},{x:outer,y:halfWidth-4},{x:inner,y:halfWidth}],wood);this.line([{x:inner,y:-halfWidth},{x:outer,y:-halfWidth+4},{x:outer,y:halfWidth-4},{x:inner,y:halfWidth}],shade(wood,.73),3);this.line([{x:inner+6,y:-halfWidth+5},{x:outer-6,y:-halfWidth+9}],shade(wood,1.2),2);for(let i=0;i<3;i++)this.line([{x:inner+8,y:35+i*5},{x:outer-8,y:35+i*5}],shade(wood,.94),1);this.round(65,-29,39,57,4,'#648078');this.round(52,-27,12,54,3,'#273e47');this.rect(55,-22,4,44,'#a3c3b2');this.rect(45,-4,7,8,'#455e62');this.round(80,-20,18,40,2,'#3e555d');for(let i=0;i<4;i++)this.line([{x:84,y:-15+i*9},{x:94,y:-15+i*9}],'#b0bdb2',1);this.circle(94,31,7,8,'#ede5d0');this.circle(94,31,4,5,'#876343');this.rect(27,30,23,18,'#f5ecd7');for(let i=0;i<3;i++)this.rect(30,34+i*4,14-i*2,1,'#b8a583');c.restore();};
  if(o.kind==='three'){for(const angle of [-Math.PI*.75,-Math.PI*.25,Math.PI*.5])workstation(angle,12,111,56);this.circle(0,0,25,25,'#759084');for(const angle of [-Math.PI*.75,-Math.PI*.25,Math.PI*.5])this.line([{x:0,y:0},{x:Math.cos(angle)*115,y:Math.sin(angle)*115}],'#57746c',6);}
  else{for(const angle of [-Math.PI/2,0,Math.PI/2,Math.PI])workstation(angle,8,111,53);this.line([{x:-113,y:0},{x:113,y:0}],'#6b8173',6);this.line([{x:0,y:-113},{x:0,y:113}],'#6b8173',6);this.circle(0,0,18,18,'#86a36d');}
  c.restore();}
 drawMeetingTable(o){
  const c=this.ctx,{x,y,w,d}=o,center=this.project(x+w/2,y+d/2,31),night=this.theme==='night';
  this.circle(center.x+4,center.y+37,w*.51,d*.48,'#233c3a26');
  this.box(x+w/2-15,y+d/2-13,30,26,31,'#7a6550');
  c.save();c.translate(center.x,center.y);c.scale(w/210,d/144);
  // A continuous rim and a thick front edge give the oval a solid tabletop.
  this.circle(0,9,105,72,night?'#6e5542':'#826047');this.circle(0,0,105,72,'#d4b681');
  this.circle(0,-2,101,68,night?'#a4825d':'#c79e6e');this.circle(0,-3,96,63,night?'#977453':'#b98e61');
  c.save();c.beginPath();c.ellipse(0,-3,95,62,0,0,Math.PI*2);c.clip();
  for(let line=-52;line<60;line+=13){c.beginPath();c.moveTo(-110,line);c.quadraticCurveTo(0,line+6,110,line-2);c.strokeStyle=night?'#c6a47926':'#e7c69745';c.lineWidth=1.5;c.stroke();}c.restore();
  // Individual place settings make this a working meeting table.
  for(const [px,py,angle]of [[0,-41,0],[64,0,Math.PI/2],[0,40,Math.PI],[-64,0,-Math.PI/2]]){
   c.save();c.translate(px,py);c.rotate(angle);
   this.round(-14,-16,28,32,2,'#856e51');this.rect(-12,-15,25,28,'#f5ead0');this.rect(-12,-15,4,28,'#718c7d');
   for(let i=0;i<3;i++)this.rect(-5,-7+i*6,14-i*3,1.5,'#b3a17a');
   this.circle(23,9,7,4.5,'#795c4433');this.circle(22,7,6,4,'#f7edda');this.circle(22,7,3.8,2.4,'#786048');
   this.line([{x:27,y:5},{x:30,y:5},{x:30,y:9},{x:27,y:9}],'#f7edda',1.7);c.restore();
  }
  this.circle(0,-2,22,16,'#708d79');this.circle(0,-3,18,12,'#8da28a');this.circle(0,-4,7,5,'#eadfc5');
  this.circle(-4,-12,7,3.5,'#a6b18a');this.circle(5,-15,4,7,'#739267');this.circle(6,-9,7,3.5,'#94aa7c');
  c.restore();
 }
 drawItem(o){const c=this.ctx,t=THEMES[this.theme];const{x,y,w,d,type}=o;
  if(type==='plant'){this.drawPlant(x,y);return;}
  if(type==='orientedChair'){this.drawChair(o);return;}
  if(type==='deskPod'){this.drawDeskPod(o);return;}
  if(type==='divider'){this.box(x,y,w,d,35,o.color);this.box(x-1,y-1,w+2,d+2,3,'#dfdcc6',35);if(w>d)for(let dx=12;dx<w-6;dx+=18)this.rect(x+dx,y+d-32,2,26,shade(o.color,.9));return;}
  if(type==='credenza'){this.box(x,y,w,d,30,'#9b7e60');this.box(x,y,w,d,4,'#d3b28a',30);for(let i=0;i<3;i++){this.rect(x+5+i*w/3,y+d-26,w/3-10,23,'#b69973');this.rect(x+19+i*w/3,y+d-15,16,2,'#506359');}this.box(x+12,y+6,33,20,3,'#6c8d83',34);this.box(x+16,y+5,33,20,3,'#d6c49d',37);this.box(x+w-36,y+9,17,15,13,'#e9d9b7',34);this.circle(x+w-28,y-1,13,12,'#86a075');return;}
  if(type==='armchair'){
   this.box(x+7,y+5,w-14,d-9,12,o.color);this.box(x+6,y,w-12,11,46,shade(o.color,.87));this.box(x,y+8,11,d-10,26,shade(o.color,.93));this.box(x+w-11,y+8,11,d-10,26,shade(o.color,.93));this.rect(x+12,y+17,w-24,d-27,shade(o.color,1.12),14);return;
  }
  if(type==='roundTable'){
   if(o.meeting){this.drawMeetingTable(o);return;}
   const p=this.project(x+w/2,y+d/2,31);this.circle(p.x+3,p.y+35,w/2+6,d/2+3,'#263b3826');this.box(x+w/2-10,y+d/2-10,20,20,31,'#aa8d68');this.circle(p.x,p.y+5,w/2,d/2,'#8f775b');this.circle(p.x,p.y,w/2,d/2,o.meeting?'#84a59e':'#e3be8f');this.circle(p.x,p.y,w/2-7,d/2-6,o.meeting?'#94b1a4':'#edc999');this.rect(x+w/2-20,y+d/2-13,33,23,'#f4edd7',33);for(let i=0;i<3;i++)this.rect(x+w/2-16,y+d/2-9+i*5,22-i*4,1,'#a3ae91',33);this.box(x+w/2+24,y+d/2+4,7,7,8,'#f7e6c7',32);return;
  }
  if(type==='desk'){
   this.rect(x-5,y+4,w+10,d+72,'#54715e13');this.box(x+8,y+5,9,d-5,32,shade(t.desk,.8));this.box(x+w-18,y+5,9,d-5,32,shade(t.desk,.8));this.box(x,y,w,d,5,t.desk,32);
   this.box(x+39,y+3,45,8,34,'#3f5b5f',37);this.rect(x+44,y+12,35,2,'#bfdcbd',62);this.box(x+44,y+12,36,1,22,'#8fbdb1',38);this.line([this.project(x+48,y+13,53),this.project(x+65,y+13,53)],'#dae5c8',2);this.box(x+42,y+27,35,12,2,'#46686b',37);this.box(x+6,y+14,21,22,1,'#f6ebd6',37);this.box(x+92,y+12,8,8,8,'#f3dec2',37);
   if(!o.chairless){this.box(x+35,y+65,40,34,15,'#668e8d');this.box(x+35,y+87,40,10,39,'#658784');}return;
  }
  if(type==='cabinet'){
   this.box(x,y,w,d,37,'#dab897');for(let i=0;i<Math.floor(w/69);i++){this.box(x+8+i*69,y+3,58,1,27,'#b99976');this.line([this.project(x+34+i*69,y+5,16),this.project(x+42+i*69,y+5,16)],'#756451',2);}this.box(x,y,w,d,5,'#eee3ce',37);this.box(x+26,y+9,37,30,38,'#485b5b',42);this.box(x+104,y+6,65,33,29,'#b9c3b8',42);this.box(x+110,y+39,52,1,20,'#728d86',45);for(let i=0;i<3;i++)this.box(x+w-45+i*13,y+14,9,9,10,'#cf8766',42);return;
  }
  if(type==='fridge'){this.box(x,y,w,d,97,'#dbe2d7');this.line([this.project(x+5,y+d+1,60),this.project(x+w-5,y+d+1,60)],'#a6b5ac',2);this.box(x+w-12,y+d+1,4,4,20,'#7c9691',29);return;}
  if(type==='water'){this.box(x,y,w,d,54,'#e0e6dc');this.box(x+8,y+8,20,25,33,'#81becb',54);this.box(x+6,y+d+1,24,1,15,'#607f86',20);this.box(x+13,y+d+2,9,3,6,'#e7e5d5',23);return;}
  if(type==='dining'||type==='meetingTable'||type==='coffeeTable'){
   const h=type==='coffeeTable'?19:32;this.box(x+5,y+5,8,d-9,h,shade(t.wood,.8));this.box(x+w-12,y+5,8,d-9,h,shade(t.wood,.8));this.box(x,y,w,d,5,type==='meetingTable'?'#809f9b':'#e1bc89',h);
   if(type==='dining'){for(let i=0;i<2;i++){const p=this.project(x+25+i*60,y+25,h+6);this.circle(p.x,p.y,11,5,'#f4ebd8');this.circle(p.x,p.y,7,3,'#91a46b');this.box(x+46+i*42,y+17,6,6,8,'#d59364',h+5);this.box(x+18+i*62,y+d+9,28,22,13,'#b49673');this.box(x+18+i*62,y+d+27,28,7,33,'#aa8d6b');}}
   if(type==='meetingTable'){this.rect(x+60,y+20,40,25,'#eae7d3',h+6);this.box(x+130,y+28,28,4,22,'#486065',h+5);for(let i=0;i<6;i++)this.box(x+4+i*52,y+d+10,26,23,14,'#698e87');}
   if(type==='coffeeTable'){this.box(x+22,y+17,9,9,8,'#f6e6cb',h+5);this.rect(x+49,y+9,28,24,'#becbd0',h+5);}return;
  }
  if(type==='arcade'){
   this.box(x,y,w,d,94,o.color);this.box(x+7,y+d+1,w-14,1,37,'#354b52',44);this.box(x+12,y+d+3,w-24,1,26,'#94c7b7',50);this.box(x+5,y+d-9,w-10,20,9,shade(o.color,.8),32);this.box(x+21,y+d+1,8,8,10,'#ce6c59',40);this.box(x+42,y+d+3,5,5,3,'#e7c96e',42);
   const playing=[...this.workers.values()].some(worker=>worker.action==='arcade'&&Math.hypot(worker.x-(x+33),worker.y-160)<38),tick=this.reduced?0:this.now*(playing?.004:.0006);
   this.rect(x+14,y+d-70,w-28,21,playing?'#254d65':'#527974');
   this.rect(x+18+Math.sin(tick)*4,y+d-55,10,3,playing?'#ffe0a0':'#90b8a0');this.rect(x+w-22,y+d-67+Math.sin(tick*1.4)*5,3,7,'#a3d8c3');this.circle(x+w/2+Math.cos(tick)*9,y+d-61+Math.sin(tick)*4,2,2,'#f2e8bf');
   if(playing&&this.theme==='night')this.glow(x+w/2,y+d-58,66,'rgba(110,214,235,0.28)');return;
  }
  if(type==='pool'||type==='pingpong'){
   const col=type==='pool'?'#5d956e':'#5d9e89';this.box(x+8,y+8,12,d-16,37,'#7e725b');this.box(x+w-20,y+8,12,d-16,37,'#7e725b');this.box(x,y,w,d,7,type==='pool'?'#9a7851':'#dae5d7',37);this.rect(x+7,y+7,w-14,d-14,col,45);
   if(type==='pool'){
    for(const [dx,dy]of [[6,6],[w-6,6],[6,d-6],[w-6,d-6],[w/2,6],[w/2,d-6]]){const p=this.project(x+dx,y+dy,46);this.circle(p.x,p.y,5,3,'#3a594a');}
    const player=[...this.workers.values()].find(worker=>worker.action==='billiards'&&worker.destination?.table===o),phase=this.reduced?0:((this.now+(player?.seed||0)%7000)%12000)/12000,shot=Math.min(1,Math.max(0,(phase-.5)*3));
    for(let i=0;i<4;i++){const p=player&&i===0?this.project(x+30+(w-60)*(player.destination.facing==='left'?1-shot:shot),y+d/2,46):this.project(x+50+i*18,y+45+(i%2)*18,46);this.circle(p.x,p.y,4,3,['#f1e3c7','#e1b265','#cc6d55','#5c7c9c'][i]);}
   }
   else{this.line([this.project(x+w/2,y+7,46),this.project(x+w/2,y+d-7,46)],'#e5ead8',2);this.box(x+w/2-1,y-2,2,d+4,10,'#dedfca',46);const p=this.project(x+34,y+31,47);this.circle(p.x,p.y,6,3,'#d77561');}return;
  }
  if(type==='sofa'){this.box(x,y,w,d,16,o.color);this.box(x,y+d-12,w,12,40,shade(o.color,.9));this.box(x,y,12,d,29,shade(o.color,.96));this.box(x+w-12,y,12,d,29,shade(o.color,.96));for(let i=0;i<3;i++)this.rect(x+15+i*(w-30)/3,y+3,(w-36)/3,d-19,shade(o.color,1.08),17);return;}
  if(type==='shelf'){this.box(x,y,w,d,70,'#9e7b59');this.rect(x+5,y+d-67,w-10,62,'#6c5947');for(let row=0;row<2;row++){for(let i=0;i<Math.floor(w/14)-1;i++){const height=18+i%3*3;this.box(x+8+i*13,y+d+1,8,1,height,['#6e9290','#cc9970','#d6bf76','#91a273'][i%4],14+row*32);this.rect(x+10+i*13,y+d-height-12-row*32,4,2,'#ead9ad');}this.rect(x+3,y+d-14-row*32,w-6,5,'#bb9970');}return;}
  if(type==='board'){this.box(x,y,w,5,56,'#d2b18a',20);this.box(x+5,y+7,w-10,1,46,'#e7ece0',25);for(let i=0;i<3;i++)this.line([this.project(x+12,y+9,63-i*12),this.project(x+45+(i%2)*30,y+9,63-i*12)],'#779c8b',2);return;}
  if(type==='reception'){this.box(x,y,w,d,50,'#8ca7a0');this.box(x-3,y-2,w+6,d+6,5,'#ddd1ad',50);this.box(x+130,y+13,44,6,28,'#405d63',55);this.box(x+30,y+13,20,20,1,'#efead5',55);return;}
 }
 drawBuilding(){const c=this.ctx,t=THEMES[this.theme],H=this.roomHeight,h=this.floorHeight,w=this.floorWidth;c.save();c.shadowColor='#263c452d';c.shadowBlur=28;c.shadowOffsetY=18;this.rect(-10,-4,w+20,h+15,'#94a38f',-17);c.restore();this.box(0,0,w,h,14,'#aea78f',-14);
  this.rect(0,0,w,h,t.wood);for(const room of this.rooms){const color=t[room.id]||t.office;this.rect(room.x,room.y,room.w,room.h,color);for(let x=room.x;x<room.x+room.w;x+=28){this.line([this.project(x,room.y),this.project(x,room.y+room.h)],shade(color,.94),1);for(let y=room.y+((x/28)%2)*90;y<room.y+room.h;y+=180)this.line([this.project(x,y),this.project(Math.min(x+28,room.x+room.w),y)],shade(color,.95),1);}}
  for(const zone of this.zones||[]){this.round(zone.x,zone.y,zone.w,zone.h,16,this.theme==='night'?'#a0af9844':zone.color);c.fillStyle=this.theme==='night'?'#d4dece':'#758773';c.font='bold 12px Segoe UI';c.fillText(zone.label,zone.x+14,zone.y+16);}
  this.drawRoomDetails();this.drawDaylight();
  this.rect(0,H+30,w,130,shade(t.trim,.97));for(let x=0;x<w;x+=80)this.line([this.project(x,H+30),this.project(x,H+160)],shade(t.trim,.92),1);
  this.box(0,0,w,10,92,t.wall);this.box(0,0,10,h,92,shade(t.wall,.84));
  // Wall signs get a dedicated panel, flanked by windows rather than covering them.
  for(const o of this.windows)this.drawWindow(o);

  for(const wall of this.obstacles.filter(r=>r.wall)){this.box(wall.x,wall.y,wall.w,wall.h,wall.h===20&&wall.y>H?68:29,shade(t.wall,1.1));this.rect(wall.x,wall.y+wall.h-4,wall.w,4,shade(t.trim,.85));}
  const corridor=this.project(w/2,H+83);c.font='bold 17px Segoe UI';c.fillStyle='#8e8b70';c.textAlign='center';c.fillText(this.company||"MARVIN'S OFFICE",corridor.x,corridor.y);c.textAlign='left';
 }
 roomSign(room){
  this.wallSigns??=new WeakMap();if(this.wallSigns.has(room))return this.wallSigns.get(room);
  const c=this.ctx,upper=room.y===0,span=upper?room.w-64:room.w/2-90;c.save();c.font='bold 22px Segoe UI';const textWidth=c.measureText(room.label).width;c.restore();
  const w=Math.min(span,Math.max(170,textWidth+54)),fontSize=Math.min(22,22*(w-54)/Math.max(1,textWidth)),center=upper?room.x+room.w/2:room.x+(room.w/2-70)/2;
  const sign={x:center-w/2,y:room.y-(upper?68:80),w,h:46,fontSize};this.wallSigns.set(room,sign);return sign;
 }
 drawRoomLabels(){
  const c=this.ctx,night=this.theme==='night';
  for(const room of this.rooms){const sign=this.roomSign(room),{x,y,w,h}=sign;c.save();
   this.round(x+3,y+5,w,h,4,'#243c3a38');this.round(x,y,w,h,4,night?'#aa9b78':'#bda47a');this.round(x+3,y+3,w-6,h-6,2,night?'#354e59':'#44695b');
   this.line([{x:x+9,y:y+7},{x:x+w-9,y:y+7}],night?'#6f8a8d':'#7d9a83',1.5);
   for(const dx of [10,w-10])for(const dy of [10,h-10]){this.circle(x+dx,y+dy,2,2,'#e1d3a4');}
   c.font='bold '+sign.fontSize+'px Segoe UI';c.textAlign='center';c.textBaseline='middle';c.fillStyle=night?'#e0e8db':'#f6efda';c.fillText(room.label,x+w/2,y+h/2+1,w-38);c.restore();
  }
 }
 drawSeatedCharacter(colorIndex,frame,x,y,size=98){
  const c=this.ctx;
  if(this.seatedReady){const image=this.seatedSprite,[sx,sy,sw,sh]=SEATED_FRAMES[colorIndex%8][frame],unit=image.naturalWidth/1254,factor=size/(1254/8);c.imageSmoothingEnabled=false;c.drawImage(image,sx*unit,sy*unit,sw*unit,sh*unit,x-sw*factor/2,y-sh*factor,sw*factor,sh*factor);}
  else{const s=size/98;this.round(x-13*s,y-59*s,26*s,43*s,4*s,'#5d4159');this.round(x-10*s,y-83*s,20*s,25*s,5*s,'#d7ad89');}
 }
 drawWorker(worker,selected,hover){const c=this.ctx,a=worker.agent,p=this.project(worker.x,worker.y),moving=worker.action==='walking';this.circle(p.x,p.y,15,6,'#253a3b25');if(selected===a.id||hover===a.id){c.strokeStyle='#d67d61';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,21,9,0,0,Math.PI*2);c.stroke();}
  const animation=workerAnimation(worker,this.now,this.reduced);
  this.headAnchors??=new Map();this.headAnchors.set(worker.id,{x:p.x,y:p.y-(worker.seated?76:90)});
  const cycle=Math.floor((worker.walkDistance||0)/18)%2;let frame=moving?(worker.direction==='left'?5:worker.direction==='right'?4:1+cycle):worker.seated?6:['coffee','water','eating'].includes(worker.action)?7:0;
  const bob=this.reduced?0:moving?Math.sin(this.now*(worker.running ? .015 : .016)+worker.seed)*(worker.running?2.5:1.1):animation.pose==='typing'?Math.sin(this.now*.012)*.6:['quiet','relax','reading','standing'].includes(animation.pose)?animation.pulse*.4:0;
  if(moving&&worker.running&&!this.reduced){const trail=worker.direction==='left'?1:worker.direction==='right'?-1:0;for(let i=0;i<2;i++){const x=p.x+trail*(23+i*9),y=p.y-12-i*8;this.line([{x,y},{x:x+trail*9,y:y+2}],this.theme==='night'?'#d4dece77':'#627c6977',2);}}
  drawActivityProps(this,worker,animation,'background');
  const activityDrawn=drawActivityCharacter(this,worker,animation);
  if(!activityDrawn&&this.spriteReady){let image=this.sprite;if(!moving&&!worker.seated&&worker.action==='standing'){frame=worker.destination?.facing==='right'?3:worker.destination?.facing==='left'?5:0;}else if(!moving&&worker.action==='arcade'&&this.walkReady){image=this.walkSprite;frame=6;}else if(moving&&this.sideReady&&['left','right'].includes(worker.direction)){image=this.sideSprite;frame=(worker.direction==='left'?4:0)+Math.floor((worker.walkDistance||0)/14)%4;}else if(moving&&this.walkReady){image=this.walkSprite;frame=({front:0,right:2,left:4,back:6}[worker.direction]||0)+cycle;}else if(worker.seated&&this.directionSeatedReady&&worker.destination?.facing){image=this.directionSeated;frame=({front:0,right:1,back:2,left:3,ne:4,se:5,sw:6,nw:7}[worker.destination.facing]??0);}else if(worker.seated&&this.seatedReady){image=this.seatedSprite;frame=worker.destination?.frame??(worker.action==='typing'?0:3);}const cellW=image.naturalWidth/8,cellH=image.naturalHeight/8,row=a.colorIndex%8;c.imageSmoothingEnabled=false;if(image===this.seatedSprite||image===this.sideSprite||image===this.directionSeated){const [sx,sy,sw,sh]=(image===this.sideSprite?SIDE_FRAMES:image===this.directionSeated?DIRECTION_FRAMES:SEATED_FRAMES)[row][frame],unit=image.naturalWidth/1254,factor=98/(1254/8);if(worker.seated&&worker.destination?.seatAnchor){const facing=worker.destination.facing,anchorX={right:.42,left:.58,ne:.44,se:.42,sw:.58,nw:.56}[facing]??.5,anchorY=['right','left'].includes(facing)?.66:.72;this.headAnchors.set(worker.id,{x:p.x+sw*factor*(.5-anchorX),y:p.y-8-sh*factor*anchorY+bob});c.drawImage(image,sx*unit,sy*unit,sw*unit,sh*unit,p.x-sw*factor*anchorX,p.y-8-sh*factor*anchorY+bob,sw*factor,sh*factor);}else c.drawImage(image,sx*unit,sy*unit,sw*unit,sh*unit,p.x-sw*factor/2,p.y-sh*factor+bob,sw*factor,sh*factor);}else c.drawImage(image,frame*cellW,row*cellH,cellW,cellH,p.x-49,p.y-92+bob,98,98);}else if(!activityDrawn){this.round(p.x-8,p.y-33,16,25,4,'#81a094');this.round(p.x-7,p.y-49,14,17,5,'#d7ad89');}
  drawActivityProps(this,worker,animation);
  if(selected===a.id||hover===a.id){const label=a.name.length>15?a.name.slice(0,14)+'…':a.name;c.font=`${10/Math.max(this.scale,.18)}px Segoe UI`;const lw=c.measureText(label).width+25;const lh=22/Math.max(this.scale,.18);this.round(p.x-lw/2,p.y+8,lw,lh,5,this.theme==='night'?'#eef0e3f2':'#fffdf3f0');c.fillStyle='#496358';c.fillText(label,p.x-lw/2+8,p.y+8+lh*.72);}
  const unread=Number(a.unreadCompletionAt)>0,textScale=Math.max(this.scale,.18),head=this.headAnchors.get(worker.id),attentionY=animation.thought?Math.min(p.y-86-10/textScale,head.y-38-10/textScale):p.y-86-10/textScale;
  if(animation.thought){const draw=()=>drawThoughtBubble(this,worker);if(this.overlays)this.overlays.push(draw);else draw();}
  const speaking=!animation.thought&&((worker.id===this.speakerId&&this.now%5000<3500)||animation.pose==='quiet'),message=this.workerDialogue(worker);
  if(speaking){const draw=()=>{c.font=`${10/textScale}px Segoe UI`;const lines=[];for(const word of message.split(' ')){const last=lines.length-1;if(last<0||c.measureText(lines[last]+' '+word).width>190/textScale)lines.push(word);else lines[last]+=' '+word;}const bw=Math.max(...lines.map(line=>c.measureText(line).width),45/textScale)+24/textScale,bh=(23+lines.length*13)/textScale,bottom=unread?p.y-86-36/textScale:p.y-108;this.round(p.x-bw/2,bottom-bh,bw,bh,7/textScale,a.status==='waiting'?'#f4d698':'#fffdf0');c.fillStyle='#889582';c.font=`bold ${7/textScale}px Segoe UI`;c.fillText('VISUAL',p.x-bw/2+12/textScale,bottom-bh+12/textScale);c.fillStyle='#526d58';c.font=`${10/textScale}px Segoe UI`;for(const [index,line]of lines.entries())c.fillText(line,p.x-bw/2+12/textScale,bottom-bh+(26+index*13)/textScale);};if(this.overlays)this.overlays.push(draw);else draw();}
  if(unread){const draw=()=>{this.circle(p.x,attentionY,10/textScale,10/textScale,'#855120');this.circle(p.x,attentionY-1/textScale,8.5/textScale,8.5/textScale,'#f7c45f');c.font=`bold ${14/textScale}px Segoe UI`;c.fillStyle='#4c351d';c.textAlign='center';c.fillText('!',p.x,attentionY+4/textScale);c.textAlign='left';};if(this.overlays)this.overlays.push(draw);else draw();this.hits.push({id:a.id,x:this.offset.x+this.pan.x+p.x*this.scale,y:this.offset.y+this.pan.y+attentionY*this.scale,r:12*this.scale/textScale});}
  this.hits.push({id:a.id,x:this.offset.x+this.pan.x+p.x*this.scale,y:this.offset.y+this.pan.y+(p.y-36)*this.scale,r:35*this.scale});
 }
 drawOverview(selected,hover){const c=this.ctx,t=THEMES[this.theme];this.floorHits=[];for(let i=0;i<(this.projects?.length||0);i++){
  const project=this.projects[i],x=(i%3)*560,y=Math.floor(i/3)*465,w=525,d=420;
  this.box(x,y,w,d,12,'#aaa88d',-12);this.rect(x,y,w,d,t.office);this.box(x,y,w,7,68,t.wall);this.box(x,y,7,d,68,shade(t.wall,.84));
  for(let px=x+22;px<x+w;px+=30)this.line([this.project(px,y+4),this.project(px,y+d)],shade(t.office,.94),1);
  const label=this.project(x+30,y+32,29);c.font='bold 20px Segoe UI';c.fillStyle='#f1ead9';c.fillText(project.name,label.x,label.y);
  this.drawPlant(x+463,y+60);this.drawItem({type:'sofa',x:x+350,y:y+302,w:135,d:39,color:'#bf916e'});this.drawItem({type:'water',x:x+471,y:y+328,w:30,d:34});
  const agents=this.agents.filter(a=>a.projectPath===project.path);for(let seat=0;seat<4;seat++){
   const sx=x+50+(seat%2)*168,sy=y+97+Math.floor(seat/2)*151;this.drawItem({type:'desk',x:sx,y:sy,w:106,d:49,index:seat});const a=agents[seat];if(a){const waiting=['idle','unknown','delegating'].includes(a.status);const drift=this.reduced?0:Math.sin(this.now*.001+(hash(a.id)%99))*16;this.drawWorker({agent:a,x:waiting?x+372+drift:sx+56,y:waiting?y+260+seat*31:sy+78,seed:hash(a.id),action:waiting?'walking':'typing',direction:'front'},selected,hover);}}
  const summary=this.project(x+22,y+d-18);c.font='14px Segoe UI';c.fillStyle='#647668';c.fillText(`${agents.length} recent coworker${agents.length===1?'':'s'} · enter floor ↗`,summary.x,summary.y);
  const a=this.project(x,y),b=this.project(x+w,y+d);this.floorHits.push({path:project.path,left:this.offset.x+this.pan.x+a.x*this.scale,top:this.offset.y+this.pan.y+(a.y-40)*this.scale,right:this.offset.x+this.pan.x+b.x*this.scale,bottom:this.offset.y+this.pan.y+b.y*this.scale});
 }}
 render(time,selected=null,hover=null){this.update(time);const c=this.ctx,dpr=Math.min(devicePixelRatio||1,2);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,this.width,this.height);this.hits=[];this.roomHits=[];c.save();c.translate(this.offset.x+this.pan.x,this.offset.y+this.pan.y);c.scale(this.scale,this.scale);if(this.overview){this.drawOverview(selected,hover);c.restore();return this.hits;}this.drawBuilding();
  this.drawEntities(selected,hover);
  this.drawRoomLabels();
  c.restore();return this.hits;
 }
}
