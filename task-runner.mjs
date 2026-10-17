import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const jobs=new Map();
const active=job=>job.processOpen||['starting','running'].includes(job.status);
const sessionId=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const effortLevels={codex:['low','medium','high','xhigh','max','ultra'],claude:['low','medium','high','xhigh','max']};
export function findCodex(){
 const candidates=[];if(process.env.AGENT_OFFICE_CODEX_BIN)candidates.push(process.env.AGENT_OFFICE_CODEX_BIN);
 for(const folder of (process.env.PATH||'').split(path.delimiter))candidates.push(path.join(folder,process.platform==='win32'?'codex.exe':'codex'));
 if(process.platform==='win32'){const root=path.join(os.homedir(),'.vscode','extensions');try{for(const folder of fs.readdirSync(root).filter(s=>s.startsWith('openai.chatgpt-')).sort().reverse())candidates.push(path.join(root,folder,'bin','windows-x86_64','codex.exe'));}catch{}}
 return candidates.find(file=>{try{return fs.statSync(file).isFile();}catch{return false;}})||null;
}
export function findClaude(){
 const candidates=[process.env.AGENT_OFFICE_CLAUDE_BIN,...(process.env.PATH||'').split(path.delimiter).map(folder=>path.join(folder,process.platform==='win32'?'claude.exe':'claude')),path.join(os.homedir(),'.local','bin',process.platform==='win32'?'claude.exe':'claude'),path.join(os.homedir(),'.claude','local',process.platform==='win32'?'claude.exe':'claude')];
 return candidates.find(file=>{try{return !!file&&fs.statSync(file).isFile();}catch{return false;}})||null;
}
export function modelCatalog(){
 let codex=[];
 try{const cache=JSON.parse(fs.readFileSync(path.join(process.env.AGENT_OFFICE_CODEX_HOME||process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'models_cache.json'),'utf8'));codex=(cache.models||[]).filter(m=>typeof m.slug==='string'&&!/review/i.test(m.slug)&&m.visibility!=='hidden').slice(0,30).map(m=>({id:m.slug,label:m.display_name||m.slug,efforts:(m.supported_reasoning_levels||[]).map(e=>e.effort).filter(e=>effortLevels.codex.includes(e))}));}catch{/* An unavailable cache leaves the CLI default and custom model field. */}
 return {codex:{models:codex,efforts:effortLevels.codex},claude:{models:['sonnet','opus','haiku'].map(id=>({id,label:id[0].toUpperCase()+id.slice(1),efforts:effortLevels.claude})),efforts:effortLevels.claude}};
}
export function validateTask(payload,projects){
 if(typeof payload.prompt!=='string'||!payload.prompt.trim()||payload.prompt.length>20000)throw new Error('Write an instruction between 1 and 20,000 characters.');
 const project=projects.find(p=>p.path===payload.projectPath);if(!project)throw new Error('Choose a detected project floor first.');
 if(!['read-only','workspace-write'].includes(payload.mode))throw new Error('Choose review-only or project-edit permissions.');
 if(!path.isAbsolute(project.path)||!fs.existsSync(project.path))throw new Error('The project folder is unavailable.');
 const provider=payload.provider||'codex',model=payload.model||'',effort=payload.effort||'';
 if(!['codex','claude'].includes(provider))throw new Error('Choose Codex or Claude Code.');
 if(typeof model!=='string'||model.length>120||(model&&!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(model)))throw new Error('Choose a model or enter its model ID.');
 if(effort&&!effortLevels[provider].includes(effort))throw new Error('Choose a supported thinking effort.');
 const known=modelCatalog()[provider].models.find(item=>item.id===model);if(effort&&known?.efforts.length&&!known.efforts.includes(effort))throw new Error('This model does not list that thinking effort.');
 return {prompt:payload.prompt.trim(),projectPath:project.path,mode:payload.mode,provider,model,effort};
}
export const runnerInfo=()=>({available:!!findCodex()||!!findClaude(),provider:'Codex',providers:[{id:'codex',name:'Codex',available:!!findCodex()},{id:'claude',name:'Claude Code',available:!!findClaude()}],catalog:modelCatalog(),running:[...jobs.values()].filter(active).length,tasks:[...jobs.values()].slice(-20).reverse().map(j=>({id:j.id,threadId:j.threadId||null,projectPath:j.projectPath,provider:j.provider,status:publicJob(j).status,model:j.model,effort:j.effort}))});
export function consumeTaskEvent(job,event){
 if(job.provider==='claude'){
  if(event.type==='system'&&event.subtype==='init'&&sessionId.test(event.session_id)){job.threadId=event.session_id;job.status='running';job.activity='Task started';}
  if(event.type==='assistant'){job.activity='Working on your instruction';const text=(event.message?.content||[]).filter(block=>block.type==='text').map(block=>typeof block.text==='string'?block.text:'').join('\n');if(text)job.reply=text.slice(0,50000);}
  if(event.type==='result'){if(sessionId.test(event.session_id))job.threadId=event.session_id;if(event.is_error){job.status='failed';job.error='Claude Code could not finish. Check its login, version, and project permissions in Claude Code.';}else{if(typeof event.result==='string')job.reply=event.result.slice(0,50000);job.status='completed';job.activity='Turn finished';job.completedAt=Date.now();}}
  return;
 }
 if(event.type==='thread.started'){job.threadId=event.thread_id;job.status='running';job.activity='Task started';}
 if(event.type==='item.started')job.activity='Working on your instruction';
 if(event.type==='item.completed'&&event.item?.type==='agent_message')job.reply=String(event.item.text||'').slice(0,50000);
 if(event.type==='turn.completed'){job.status='completed';job.activity='Turn finished';job.completedAt=Date.now();}
 if(event.type==='turn.failed'||event.type==='error'){job.status='failed';job.error='Codex could not finish. Check its login and project permissions in Codex.';}
}
export function publicJob(job){if(!job)return null;return {id:job.id,status:job.processOpen&&job.status==='completed'?'running':job.status,activity:job.activity,threadId:job.threadId||null,reply:job.reply||'',history:job.history||[],error:job.error||null,startedAt:job.startedAt,completedAt:job.completedAt||null,projectPath:job.projectPath,provider:job.provider||'codex',model:job.model||'',effort:job.effort||'',mode:job.mode,canFollowup:!active(job)&&sessionId.test(job.threadId||'')};}
export const getTask=id=>publicJob(jobs.get(id));
export function buildTaskArgs(request,threadId=null){
 if(threadId&&!sessionId.test(threadId))throw new Error('This task has no resumable session yet.');
 if(request.provider==='claude'){
  const args=['--print','--restricted','--output-format','stream-json','--verbose','--input-format','text','--permission-mode',request.mode==='read-only'?'plan':'acceptEdits','--permission-prompts','none','--tools',request.mode==='read-only'?'Read,Glob,Grep':'Read,Glob,Grep,Edit,Write','--disallowedTools','mcp__*','--setting-sources',''];
  if(request.model)args.push('--model',request.model);if(request.effort)args.push('--effort',request.effort);if(threadId)args.push('--resume',threadId);return args;
 }
 const args=threadId?['exec','resume','--json','--skip-git-repo-check','-c',`sandbox_mode=${JSON.stringify(request.mode)}`]:['exec','--json','--color','never','--sandbox',request.mode,'--skip-git-repo-check','-C',request.projectPath];
 if(request.model)args.push('--model',request.model);if(request.effort)args.push('-c',`model_reasoning_effort=${JSON.stringify(request.effort)}`);if(threadId)args.push(threadId);args.push('-');return args;
}
function launch(job,request,threadId,spawnProcess=spawn,executableOverride=null){
 const executable=executableOverride||(request.provider==='claude'?findClaude():findCodex());if(!executable)throw new Error(`The local ${request.provider==='claude'?'Claude Code':'Codex'} CLI is unavailable. Install and sign in to it first.`);
 const args=buildTaskArgs(request,threadId);Object.assign(job,{status:'starting',activity:`Starting local ${request.provider==='claude'?'Claude Code':'Codex'}`,reply:'',error:null,completedAt:null,processOpen:true});
 // Prompts go through stdin, never through a shell or process command line.
 let child;try{child=spawnProcess(executable,args,{cwd:request.projectPath,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});}catch{job.processOpen=false;job.status='failed';throw new Error('Could not start the local task process.');}job.child=child;jobs.set(job.id,job);
 let pending='';child.stdout.on('data',chunk=>{if(job.child!==child||job.status==='cancelled')return;pending+=chunk.toString();if(pending.length>2000000)pending=pending.slice(-1000000);const lines=pending.split('\n');pending=lines.pop();for(const line of lines){try{consumeTaskEvent(job,JSON.parse(line));}catch{}}});
 child.stderr.on('data',()=>{}); // Runtime logs may include paths or secrets; never expose them in the UI.
 child.on('error',()=>{if(job.child!==child)return;job.processOpen=false;if(job.status!=='cancelled'){job.status='failed';job.error='Could not start the local task process.';}});
 child.stdin.on('error',()=>{});
 child.on('close',code=>{if(job.child!==child)return;job.processOpen=false;if(job.status==='cancelled')return;if(pending){try{consumeTaskEvent(job,JSON.parse(pending));}catch{}}if(code!==0){job.status='failed';job.error ||= 'The agent exited before finishing. Check its login, CLI version, and project permissions in its own app.';}else if(job.status!=='failed')job.status='completed';job.completedAt=Date.now();});
 child.stdin.end(request.prompt+'\n');
 if(jobs.size>30){const old=[...jobs.values()].find(j=>!['starting','running'].includes(j.status));if(old)jobs.delete(old.id);}
 return publicJob(job);
}
export function startTask(payload,projects,options={}){
 const request=validateTask(payload,projects);if([...jobs.values()].some(j=>j.projectPath===request.projectPath&&active(j)))throw new Error('An office task is already running on this floor. Wait for it or stop it first.');
 const job={id:randomUUID(),...request,startedAt:Date.now(),history:[]};delete job.prompt;
 return launch(job,request,null,options.spawnProcess,options.executable);
}
export function followupTask(id,payload,projects,options={}){
 const job=jobs.get(id);if(!job)throw new Error('This office task is unavailable.');if(active(job))throw new Error('Wait for this turn to finish before sending a follow-up.');if(!sessionId.test(job.threadId||''))throw new Error('This task has no resumable session yet.');
 const request=validateTask({prompt:payload.prompt,projectPath:job.projectPath,mode:job.mode,provider:job.provider,model:job.model,effort:job.effort},projects);
 if([...jobs.values()].some(j=>j!==job&&j.projectPath===job.projectPath&&active(j)))throw new Error('Another office task is running on this floor.');
 const history=job.history;if(job.reply)job.history=[...(history||[]),job.reply].slice(-6);
 try{return launch(job,request,job.threadId,options.spawnProcess,options.executable);}catch(error){job.history=history;throw error;}
}
export function stopTask(id){const job=jobs.get(id);if(!job)return null;if(['starting','running'].includes(job.status)){
  job.status='cancelled';job.activity='Stopped by you';job.completedAt=Date.now();
  if(process.platform==='win32'&&job.child.pid){const stop=spawn('taskkill.exe',['/PID',String(job.child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});stop.on('error',()=>job.child.kill());}else job.child.kill('SIGTERM');
 }return publicJob(job);}
