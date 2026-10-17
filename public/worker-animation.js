// Decorative animation state never changes a recorded agent or its destination.
export function workerAnimation(worker,time=0,reduced=false){
 const clock=reduced?0:time+(worker.seed||0)%7000;
 const phase=(clock%12000)/12000,frame=reduced?0:Math.floor(clock/420)%2;
 const pulse=reduced?0:Math.sin(clock*.004);
 const base={pose:'rest',frame,phase,pulse,thought:false,description:'Relaxing in an armchair'};
 if(worker.action==='walking')return {...base,pose:'walking',description:'Walking between rooms'};
 if(worker.action==='standing')return {...base,pose:'standing',description:'Standing for a quiet pause'};
 if(worker.action==='shelf-reading')return {...base,pose:'reading',description:'Standing and reading by the bookshelves'};
 if(worker.action==='billiards')return {...base,pose:'billiards',description:phase<.5?'Lining up a billiards shot':'Taking a billiards shot'};
 if(worker.room==='quiet')return {...base,pose:'quiet',description:'Sitting quietly'};
 if(worker.room==='reception'&&worker.seated)return {...base,pose:'relax',description:'Relaxing in reception'};
 if(worker.room==='meeting'&&worker.seated)return {...base,pose:'relax',description:'Chilling in the team lounge'};
 if(worker.action==='planning')return {...base,pose:phase<.58?'writing':'thinking',thought:phase>=.58,description:phase<.58?'Writing a plan':'Thinking through a plan'};
 if(worker.room==='focus'||['reviewing','focusing'].includes(worker.action))return {...base,pose:phase<.72?'checking':'thinking',thought:phase>=.72,description:phase<.72?'Checking a review checklist':'Thinking through a review'};
 if(['reading','research','library-reading','corner-reading'].includes(worker.action))return {...base,pose:'reading',description:'Reading and turning pages'};
 if(['water','coffee'].includes(worker.action))return {...base,pose:'drinking',description:worker.action==='water'?'Taking a sip of water':'Sipping coffee'};
 if(worker.action==='eating')return {...base,pose:'eating',description:'Taking a bite'};
 if(worker.action==='arcade')return {...base,pose:'gaming',description:'Playing at the arcade'};
 if(worker.action==='pingpong')return {...base,pose:'pingpong',description:'Returning a table-tennis shot'};
 if(worker.action==='typing')return {...base,pose:phase<.84?'typing':'thinking',thought:phase>=.84,description:phase<.84?'Typing on keyboard':'Thinking at the work table'};
 return base;
}
