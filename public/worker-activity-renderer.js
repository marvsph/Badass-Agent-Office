export function drawActivityCharacter(scene,worker,animation){
 const facing=worker.destination?.facing;
 if(animation.pose==='writing'&&worker.room==='studio'&&worker.destination?.writingSurface)return false;
 if(scene.leisureReady&&!worker.seated){
  const base=animation.pose==='gaming'?0:animation.pose==='billiards'?(facing==='left'?4:2):animation.pose==='reading'&&facing==='front'?6:null;
  const bounds=base===null?null:scene.leisureFrames?.[worker.agent.colorIndex%8]?.[base+animation.frame];
  if(bounds){const [sx,sy,sw,sh]=bounds,factor=90/sh;scene.ctx.imageSmoothingEnabled=false;scene.ctx.drawImage(scene.leisureSprite,sx,sy,sw,sh,worker.x-sw*factor/2,worker.y-90,sw*factor,90);return true;}
 }
 if(!scene.activityReady||!worker.seated||!['front','back'].includes(facing)||!['thinking','writing','checking'].includes(animation.pose))return false;
 const row=worker.agent.colorIndex%8,frame=(animation.pose==='thinking'?0:4)+(facing==='back'?2:0)+animation.frame;
 const bounds=scene.activityFrames?.[row]?.[frame];if(!bounds)return false;
 const [sx,sy,sw,sh]=bounds,factor=94/sh;
 scene.ctx.imageSmoothingEnabled=false;scene.ctx.drawImage(scene.activitySprite,sx,sy,sw,sh,worker.x-sw*factor/2,worker.y-8-94*.72,sw*factor,94);scene.headAnchors?.set(worker.id,{x:worker.x,y:worker.y-8-94*.72});return true;
}

export function drawReadingBook(scene,worker,animation,layer='foreground'){
 const facing=worker.destination?.facing||worker.direction||'front',behind=['back','ne','nw'].includes(facing);
 if((layer==='background')!==behind)return;
 const c=scene.ctx,angle=scene.chairAngle(facing),fx=-Math.sin(angle),fy=Math.cos(angle),side=['left','right'].includes(facing);
 c.save();c.translate(worker.x+fx*(side?25:22),worker.y-(worker.seated?13:40)+Math.min(0,fy)*16);c.rotate(angle);
 // The spread follows the reader's hands; profile views show a narrower plane.
 c.scale(1,side?.68:1);
 scene.round(-16,-10,32,24,2,'#725d49');scene.rect(-14,-9,28,21,'#f4e6c6');scene.rect(-1,-9,2,21,'#b8a683');
 for(let i=0;i<3;i++){scene.rect(-11,-5+i*5,7,1,'#97a092');scene.rect(4,-5+i*5,7,1,'#97a092');}
 if(animation.frame)scene.polygon([{x:1,y:-9},{x:11,y:-7},{x:1,y:12}],'#fff6dc');
 c.restore();
}

export function drawActivityProps(scene,worker,animation,layer='foreground'){
 if(animation.pose==='reading'){drawReadingBook(scene,worker,animation,layer);return;}
 if(layer==='background')return;
 if(animation.pose==='writing'&&worker.room==='studio'&&worker.destination?.writingSurface){const draw=()=>drawStudioWriting(scene,worker,animation);if(scene.surfaceOverlays)scene.surfaceOverlays.push(draw);else draw();return;}
 if(['walking','quiet','relax','rest','standing'].includes(animation.pose))return;
 const c=scene.ctx,facing=worker.destination?.facing||worker.direction||'front',angle=scene.chairAngle(facing),fx=-Math.sin(angle),fy=Math.cos(angle),skin=['#dba97d','#e8af85','#9c6448','#e8b287','#d3a073','#e6bb8c','#d4a071','#bc815f'][worker.agent.colorIndex%8];
 const wave=scene.reduced?0:animation.pulse;c.save();c.translate(worker.x,worker.y);
 if(['writing','checking'].includes(animation.pose)){
  const x=fx*22+(facing==='back'?21:0),y=-13+(fy>0?0:-4);
  scene.round(x-16,y-10,32,24,2,'#725d49');scene.rect(x-14,y-9,28,21,'#f4e6c6');
  for(let i=0;i<3;i++){scene.rect(x-9,y-5+i*5,14,1,'#a9ae90');if(animation.pose==='checking'&&i<1+Math.floor(animation.phase*3))scene.line([{x:x-12,y:y-5+i*5},{x:x-10,y:y-3+i*5},{x:x-7,y:y-7+i*5}],'#638d79',1.5);}
   const handX=x+9+wave*3,handY=y+3+animation.frame*2;scene.circle(handX+4,handY,4,3,skin);scene.line([{x:handX+4,y:handY-5},{x:handX-4,y:handY+4}],'#5d7566',3);scene.circle(handX-4,handY+4,1,1,'#4c4939');
 }
 if(animation.pose==='thinking'&&!['front','back'].includes(facing)){const x=fx*12,y=-51+wave;scene.circle(x,y,4,4,skin);scene.line([{x:x-fx*5,y:y+18},{x,y}],skin,4);}
 if(['drinking','eating'].includes(animation.pose)){
  const sip=scene.reduced?0:Math.max(0,Math.sin(animation.phase*Math.PI*4)),x=fx*20+(fx===0?-9+sip*6:0),y=-8-sip*18;
  scene.circle(x+7,y+4,4,4,skin);
  if(animation.pose==='eating'){scene.round(x-6,y-4,15,10,2,'#d5a467');scene.rect(x-5,y-1,13,2,'#8fa262');scene.rect(x-5,y+2,13,2,'#bb7755');if(sip>.8)scene.circle(x+3,y-2,3,3,skin);}
  else if(worker.action==='water'){scene.round(x-4,y-10,9,19,2,'#a1dae5');scene.rect(x-2,y-13,5,4,'#ececda');scene.rect(x-2,y-6,2,10,'#d9f0e6');}
  else{scene.round(x-6,y-7,12,14,2,'#f2ddba');scene.circle(x,y-7,6,2,'#775543');scene.line([{x:x+6,y:y-3},{x:x+10,y:y-3},{x:x+10,y:y+3},{x:x+6,y:y+3}],'#f2ddba',2);if(!scene.reduced)scene.line([{x:x-2,y:y-10},{x:x+wave*2,y:y-17}],'#f1e4c580',1);}
 }
 if(animation.pose==='gaming'){for(const dx of [-17,17]){const lift=(dx<0?animation.frame:1-animation.frame)*4;scene.line([{x:dx,y:-30},{x:dx,y:-44-lift}],skin,4);scene.circle(dx,-44-lift,4,3,skin);}}
 if(animation.pose==='pingpong'){scene.line([{x:15,y:-31},{x:22+wave*8,y:-45}],'#b09067',3);scene.circle(24+wave*8,-48,8,6,'#d87660');const travel=scene.reduced?.5:animation.phase;scene.circle(33+travel*52,-52-Math.sin(travel*Math.PI)*17,3,3,'#fff4d8');}
 c.restore();
 if(animation.pose==='billiards'){
  const cue=()=>{const direction=facing==='left'?-1:1,stroke=scene.reduced?0:animation.phase<.5?-7:Math.sin((animation.phase-.5)*Math.PI*2)*12,y=worker.y-39;
   scene.line([{x:worker.x-direction*(38-stroke),y:y+3},{x:worker.x+direction*(78+stroke),y:y-2}],'#75573d',4);
   scene.line([{x:worker.x-direction*(35-stroke),y:y+2},{x:worker.x+direction*(74+stroke),y:y-2}],'#dbb482',2);
   scene.circle(worker.x+direction*(79+stroke),y-2,2,2,'#8cbcc1');
  };
  if(scene.overlays)scene.overlays.push(cue);else cue();
 }
}

export function drawThoughtBubble(scene,worker){
 const c=scene.ctx,head=scene.headAnchors?.get(worker.id)||{x:worker.x,y:worker.y-(worker.seated?76:90)};
 c.save();c.translate(head.x,head.y-16.5);c.scale(.5,.5);
 c.beginPath();c.moveTo(-24,5);c.bezierCurveTo(-38,-29,34,-33,31,4);c.bezierCurveTo(30,19,-9,22,-18,16);c.quadraticCurveTo(-26,23,-35,20);c.quadraticCurveTo(-29,12,-24,5);c.fillStyle='#fff9e9';c.fill();c.strokeStyle='#485d55';c.lineWidth=1.3;c.stroke();
 const t=scene.reduced?0:scene.now*.0015+(worker.seed||0)%17;c.beginPath();for(let loop=0;loop<5;loop++){const a=loop*1.3+t*.18,rx=12+loop%3*3,ry=5+loop%2*4;for(let i=0;i<=40;i++){const q=i/40*Math.PI*2+t*.4,x=Math.cos(q)*rx,y=Math.sin(q)*ry,px=x*Math.cos(a)-y*Math.sin(a),py=x*Math.sin(a)+y*Math.cos(a)-1;if(i===0)c.moveTo(px,py);else c.lineTo(px,py);}}c.strokeStyle='#56695e';c.lineWidth=2;c.stroke();c.restore();
}

export function drawStudioWriting(scene,worker,animation){
 const c=scene.ctx,surface=worker.destination.writingSurface,facing=worker.destination.facing,skin=['#dba97d','#e8af85','#9c6448','#e8b287','#d3a073','#e6bb8c','#d4a071','#bc815f'][worker.agent.colorIndex%8];
 c.save();c.translate(surface.x,surface.y);c.rotate(surface.angle);
 scene.round(-14,-10,28,20,2,'#856e51');scene.rect(-12,-9,24,18,'#f5ead0');
 for(let i=0;i<3;i++)scene.rect(-8,-5+i*4,15-i*2,1,'#aaa17f');
 const x=5+(scene.reduced?0:animation.pulse*2),y=3+animation.frame*2;
 c.restore();
 // Points stay in floor coordinates; the context may already have a camera transform.
 const direction=facing==='right'?1:facing==='left'?-1:0,pen={x:surface.x+x-5,y:surface.y+y},hand={x:pen.x-direction*7,y:pen.y+2};
 if(direction)scene.line([{x:worker.x+direction*23,y:worker.y-8},hand],skin,4);
 scene.circle(hand.x,hand.y,3.5,3,skin);scene.line([hand,pen],'#516d61',2.5);scene.circle(pen.x,pen.y,1,1,'#4d503d');
}
