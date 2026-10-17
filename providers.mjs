import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const cache=new Map(); let inventory=null,inventoryTime=0;
const clean=(v,max=180)=>String(v||'').replace(/[\x00-\x1f]/g,' ').slice(0,max);
function filesBelow(root,depth=3){const result=[];function visit(folder,level){if(level>depth)return;try{for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,entry.name);if(entry.isDirectory())visit(full,level+1);else if(entry.isFile()&&entry.name.endsWith('.jsonl')){const stat=fs.statSync(full);result.push({file:full,mtime:stat.mtimeMs,size:stat.size});}}}catch{}}visit(root,0);return result.sort((a,b)=>b.mtime-a.mtime).slice(0,80);}
function eventsFrom(file,size){const fd=fs.openSync(file,'r');try{const headSize=Math.min(size,64000),tailSize=Math.min(size,512000);const head=Buffer.alloc(headSize);fs.readSync(fd,head,0,headSize,0);let lines=head.toString('utf8').split('\n');if(size>headSize)lines.pop();if(size>headSize){const tail=Buffer.alloc(tailSize);fs.readSync(fd,tail,0,tailSize,size-tailSize);const more=tail.toString('utf8').split('\n');if(size>tailSize)more.shift();lines=lines.concat(more);}const seen=new Set(),events=[];for(const line of lines){try{const e=JSON.parse(line);const key=e.uuid||e.id;if(key&&seen.has(key))continue;if(key)seen.add(key);events.push(e);}catch{}}return events;}finally{fs.closeSync(fd);}}
export function parseProviderEvents(provider,events,describeTool,now=Date.now()){
  let projectPath='',title='',model='Not reported',status='unknown',activity='No recent signal',kind='quiet',lastSeen=0;
  const log=[];
  const add=(label,k,ts)=>{activity=label;kind=k;if(log.at(-1)?.label!==label)log.push({label,kind:k,timestamp:ts});};
  for(const e of events){const ts=Date.parse(e.timestamp)||0;if(ts)lastSeen=Math.max(lastSeen,ts);const data=e.data||{},msg=e.message||{};
    if(provider==='Claude'){
      if(e.cwd)projectPath=e.cwd;
      if(e.type==='ai-title')title=clean(e.aiTitle,240);
      if(e.type==='custom-title')title=clean(e.customTitle,240);
      if(msg.model)model=msg.model;
      if(e.type==='assistant'){
        const tools=(Array.isArray(msg.content)?msg.content:[]).filter(c=>c.type==='tool_use');
        for(const tool of tools){const d=describeTool(tool.name);status=d.waiting?'waiting':/^(Task|Agent)$/.test(tool.name)?'delegating':'working';add(status==='delegating'?'Waiting for subagent reports':d.label,status==='delegating'?'team-wait':d.kind,ts);}
        if(!tools.length){status=msg.stop_reason==='end_turn'||msg.stop_reason==='stop_sequence'?'idle':'working';if(status==='idle')add('Turn finished','done',ts);else if(Array.isArray(msg.content)&&msg.content.some(c=>['thinking','redacted_thinking'].includes(c.type)))add('Planning','planning',ts);}
      }
      if(e.type==='user'){status='working';const result=Array.isArray(msg.content)&&msg.content.some(c=>c.type==='tool_result');add(result?'Reviewing tool results':'New task received','working',ts);}
    }else{
      if(e.type==='session.start')projectPath=data.context?.cwd||data.context?.gitRoot||projectPath;
      if(e.type==='session.context_changed')projectPath=data.cwd||projectPath;
      if(data.model)model=data.model;
      if(e.type==='user.message'||e.type==='assistant.turn_start'){status='working';add(e.type==='user.message'?'New task received':'Working on a turn','working',ts);}
      if(e.type==='tool.execution_start'){const d=describeTool(data.toolName);status=d.waiting?'waiting':d.teamWait?'delegating':'working';add(d.label,d.kind,ts);}
      if(e.type==='permission.requested'){status='waiting';add('Waiting for your approval','waiting',ts);}
      if(e.type==='permission.completed'){status='working';add('Approval resolved','working',ts);}
      if(['assistant.turn_end','session.shutdown','abort'].includes(e.type)){status='idle';add(e.type==='abort'?'Turn interrupted':'Turn finished','done',ts);}
    }
  }
  if(['working','waiting','delegating'].includes(status)&&now-lastSeen>180000){status='unknown';activity='No recent signal';kind='quiet';}
  return {projectPath:clean(projectPath,400),title:title||`${provider} session`,model:clean(model),status,activity,kind,lastSeen,tokens:null,activityLog:log.slice(-12).reverse()};
}
export function providerSessions(describeTool){
  const roots=[{name:'Claude',root:process.env.AGENT_OFFICE_CLAUDE_HOME||path.join(os.homedir(),'.claude','projects')},{name:'Copilot',root:process.env.AGENT_OFFICE_COPILOT_HOME||path.join(os.homedir(),'.copilot','session-state')}];
  if(!inventory||Date.now()-inventoryTime>15000){inventory=roots.map(p=>({...p,connected:fs.existsSync(p.root),files:filesBelow(p.root)}));inventoryTime=Date.now();}
  const sessions=[],providers=[],ancestors=new Map();
  for(const provider of inventory){let count=0;for(const file of provider.files){try{
    const stat=fs.statSync(file.file),previous=cache.get(file.file);let parsed;
    if(previous?.mtime===stat.mtimeMs&&previous?.size===stat.size)parsed={...previous.value};
    else{parsed=parseProviderEvents(provider.name,eventsFrom(file.file,stat.size),describeTool);cache.set(file.file,{mtime:stat.mtimeMs,size:stat.size,value:parsed});}
    if(!parsed.projectPath)continue;
    if(['working','waiting','delegating'].includes(parsed.status)&&Date.now()-parsed.lastSeen>180000){parsed.status='unknown';parsed.activity='No recent signal';parsed.kind='quiet';}
    const nativeId=provider.name==='Copilot'?path.basename(path.dirname(file.file)):path.basename(file.file,'.jsonl');
    const isChild=file.file.includes(`${path.sep}subagents${path.sep}`);
    const parentNative=isChild?path.basename(path.dirname(path.dirname(file.file))):null;
    if(parentNative&&!ancestors.has(`claude:${parentNative}`)){
      const parentFile=path.join(path.dirname(path.dirname(path.dirname(file.file))),parentNative+'.jsonl');
      try{const stat=fs.statSync(parentFile),prior=cache.get(parentFile);let value=prior?.mtime===stat.mtimeMs&&prior?.size===stat.size?prior.value:parseProviderEvents('Claude',eventsFrom(parentFile,stat.size),describeTool);cache.set(parentFile,{mtime:stat.mtimeMs,size:stat.size,value});if(value.projectPath)ancestors.set(`claude:${parentNative}`,{id:`claude:${parentNative}`,projectPath:value.projectPath});}catch{}
    }
    sessions.push({id:`${provider.name.toLowerCase()}:${nativeId}`,provider:provider.name,name:isChild?`${provider.name} subagent`:provider.name,role:isChild?'Subagent':'Project session',parentId:parentNative?`claude:${parentNative}`:null,updatedAt:stat.mtimeMs,project:path.basename(parsed.projectPath),colorIndex:[...nativeId].reduce((s,c)=>s+c.charCodeAt(0),0)%8,...parsed});count++;
  }catch{/* A partial or locked provider file does not create fake activity. */}}
  providers.push({name:provider.name,connected:provider.connected,count});}
  return {sessions,providers,ancestors:[...ancestors.values()]};
}
