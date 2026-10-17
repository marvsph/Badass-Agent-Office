import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {validateTask,consumeTaskEvent,publicJob,buildTaskArgs,startTask,followupTask,getTask,stopTask} from '../task-runner.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),projects=[{path:root}];
test('task request is limited to detected workspaces and bounded permissions',()=>{
 const prompt='Keep this literal: $(do-not-execute) & <text>';
 assert.equal(validateTask({prompt,projectPath:root,mode:'read-only'},projects).prompt,prompt);
 assert.throws(()=>validateTask({prompt,projectPath:path.dirname(root),mode:'read-only'},projects));
 assert.throws(()=>validateTask({prompt,projectPath:root,mode:'danger-full-access'},projects));
});
test('task display retains public replies but never process handles or reasoning',()=>{
 const job={id:'task',status:'starting',startedAt:1,projectPath:root,child:{secret:'PRIVATE-PROCESS'}};
 consumeTaskEvent(job,{type:'item.completed',item:{type:'reasoning',text:'PRIVATE-REASONING'}});
 consumeTaskEvent(job,{type:'item.completed',item:{type:'agent_message',text:'Public reply'}});
 consumeTaskEvent(job,{type:'turn.completed'});const result=publicJob(job);
 assert.equal(result.reply,'Public reply');assert.equal(result.status,'completed');assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});

test('provider settings use bounded arguments and stdin rather than prompt arguments',()=>{
 const request=validateTask({prompt:'PRIVATE-INSTRUCTION',projectPath:root,mode:'read-only',provider:'codex',model:'custom-model',effort:'high'},projects);
 const args=buildTaskArgs(request);assert.ok(args.includes('custom-model'));assert.ok(args.includes('model_reasoning_effort="high"'));assert.equal(args.at(-1),'-');
 assert.equal(args[args.indexOf('--sandbox')+1],'read-only');
 const thread='12345678-1234-1234-1234-123456789abc',resume=buildTaskArgs(request,thread);
 assert.deepEqual(resume.slice(0,2),['exec','resume']);assert.ok(resume.includes('sandbox_mode="read-only"'));assert.equal(resume.at(-2),thread);
 const claude=buildTaskArgs({...request,provider:'claude',model:'sonnet',mode:'workspace-write'},thread);
 assert.ok(claude.includes('--restricted'));assert.equal(claude[claude.indexOf('--permission-mode')+1],'acceptEdits');assert.equal(claude[claude.indexOf('--tools')+1],'Read,Glob,Grep,Edit,Write');assert.ok(claude.includes('mcp__*'));
 const review=buildTaskArgs({...request,provider:'claude'});assert.equal(review[review.indexOf('--permission-mode')+1],'plan');assert.equal(review[review.indexOf('--tools')+1],'Read,Glob,Grep');
 for(const list of [args,resume,claude,review])assert.doesNotMatch(list.join(' '),/PRIVATE-INSTRUCTION|bypass|danger-full-access|dangerously|Bash/);
 for(const patch of [{provider:'shell'},{effort:'unlimited'},{model:'--unsafe'},{model:'$(echo secret)'}])assert.throws(()=>validateTask({...request,...patch},projects));
 assert.throws(()=>buildTaskArgs(request,'latest'));
});

function fixture(){
 const calls=[];
 return {calls,executable:'fixture-agent',spawnProcess(executable,args,options){const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=text=>child.input=text;child.kill=()=>{};calls.push({executable,args,options,child});return child;}};
}
const sendEvent=(child,event)=>child.stdout.emit('data',JSON.stringify(event)+'\n');

test('follow-ups resume only office-owned sessions with the original project and permissions',()=>{
 const mock=fixture(),thread='12345678-1234-1234-1234-123456789abc';
 const job=startTask({prompt:'First instruction',projectPath:root,mode:'read-only',provider:'codex',model:'custom-model',effort:'high'},projects,mock),first=mock.calls[0];
 assert.equal(first.options.shell,false);assert.equal(first.options.windowsHide,true);assert.equal(first.options.cwd,root);assert.equal(first.child.input,'First instruction\n');
 assert.throws(()=>followupTask(job.id,{prompt:'Too soon'},projects,mock),/finish/);
 sendEvent(first.child,{type:'thread.started',thread_id:thread});sendEvent(first.child,{type:'item.completed',item:{type:'agent_message',text:'First public reply'}});sendEvent(first.child,{type:'turn.completed'});
 assert.equal(getTask(job.id).canFollowup,false,'wait for process exit as well as turn completion');first.child.emit('close',0);assert.equal(getTask(job.id).canFollowup,true);
 assert.throws(()=>followupTask(job.id,{prompt:'Missing project'},[],mock),/detected project/);
 assert.throws(()=>followupTask(thread,{prompt:'Unowned session'},projects,mock),/unavailable/);
 const next=followupTask(job.id,{prompt:'Follow-up',provider:'claude',mode:'danger-full-access',projectPath:path.dirname(root)},projects,mock),second=mock.calls[1];
 assert.equal(next.id,job.id);assert.equal(next.provider,'codex');assert.equal(next.mode,'read-only');assert.deepEqual(next.history,['First public reply']);assert.equal(second.child.input,'Follow-up\n');assert.ok(second.args.includes(thread));assert.ok(second.args.includes('sandbox_mode="read-only"'));
 first.child.emit('close',1);assert.equal(getTask(job.id).status,'starting','late events from the previous process cannot end a follow-up');
 assert.throws(()=>startTask({prompt:'Collision',projectPath:root,mode:'read-only'},projects,mock),/already running/);
 stopTask(job.id);sendEvent(second.child,{type:'turn.completed'});second.child.emit('close',0);assert.equal(getTask(job.id).status,'cancelled');
});

test('Claude replies and errors exclude thinking, tool inputs, and runtime logs',()=>{
 const job={id:'claude',provider:'claude',status:'starting'};
 const privateBlock={type:'thinking',get text(){throw Error('Private thinking must not be accessed');}};
 consumeTaskEvent(job,{type:'system',subtype:'init',session_id:'12345678-1234-1234-1234-123456789abc'});
 consumeTaskEvent(job,{type:'assistant',message:{content:[privateBlock,{type:'tool_use',input:'PRIVATE-INPUT'},{type:'text',text:'Public reply'}]}});
 consumeTaskEvent(job,{type:'result',is_error:false,result:'Finished'});assert.equal(publicJob(job).reply,'Finished');assert.equal(publicJob(job).canFollowup,true);assert.doesNotMatch(JSON.stringify(publicJob(job)),/PRIVATE/);
 consumeTaskEvent(job,{type:'result',is_error:true,result:'PRIVATE-ERROR'});assert.doesNotMatch(JSON.stringify(publicJob(job)),/PRIVATE/);
 const codex={};consumeTaskEvent(codex,{type:'turn.failed',error:{message:'PRIVATE-CLI-OUTPUT'}});assert.doesNotMatch(JSON.stringify(publicJob(codex)),/PRIVATE/);
});
