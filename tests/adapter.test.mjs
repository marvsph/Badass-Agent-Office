import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvents, describeTool, normalPath } from '../adapter.mjs';
const now=Date.now(),ts=new Date(now-1000).toISOString();
const event=(type,payload)=>({type,timestamp:ts,payload});

test('timeline includes edit counts and command outcomes without paths or output',()=>{
 const result=parseEvents([
  event('event_msg',{type:'patch_apply_end',success:true,changes:{'PRIVATE-PATH-A':{diff:'PRIVATE-DIFF'},'PRIVATE-PATH-B':{}}}),
  event('event_msg',{type:'exec_command_end',exit_code:1,command:'PRIVATE-COMMAND',aggregated_output:'PRIVATE-OUTPUT'}),
  event('event_msg',{type:'exec_command_end',exit_code:0,aggregated_output:'PRIVATE-OUTPUT'}),
 ],now);
 assert.ok(result.activityLog.some(e=>e.detail==='Updated 2 files.'));assert.ok(result.activityLog.some(e=>e.detail==='The command finished with exit code 1.'));assert.ok(result.activityLog.some(e=>e.detail==='The command completed successfully.'));assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
});
test('completed turn stays idle despite later usage records',()=>{
  const result=parseEvents([event('event_msg',{type:'task_complete'}),event('event_msg',{type:'token_count',info:{total_token_usage:{total_tokens:250}}})],now);
  assert.equal(result.status,'idle');assert.equal(result.totalTokens,250);
});
test('quiet work becomes unknown, not idle',()=>{
  const result=parseEvents([event('event_msg',{type:'task_started'})],now+300000);
  assert.equal(result.status,'unknown');
});
test('asynchronous preference does not imply agent stopped working',()=>{
  assert.equal(describeTool('request_user_input_async').waiting,false);
  assert.equal(describeTool('request_user_input').waiting,true);
});
test('wrapper calls classify observed tools without returning arguments',()=>{
  const input='await tools.apply_patch("SECRET-PAYLOAD");';
  const result=parseEvents([event('response_item',{type:'custom_tool_call',name:'exec',input})],now);
  assert.equal(result.kind,'coding');assert.equal(result.status,'working');
  assert.equal(JSON.stringify(result).includes('SECRET-PAYLOAD'),false);
});
test('reasoning and tool output contents never leave the parser',()=>{
  const result=parseEvents([event('response_item',{type:'reasoning',summary:'PRIVATE-REASONING'}),event('response_item',{type:'function_call_output',output:'SECRET-OUTPUT'})],now);
  assert.equal(JSON.stringify(result).includes('PRIVATE-REASONING'),false);
  assert.equal(JSON.stringify(result).includes('SECRET-OUTPUT'),false);
});
test('explicit final answer marks a finished turn',()=>{
  assert.equal(parseEvents([event('response_item',{type:'message',role:'assistant',channel:'final',content:'PRIVATE-CONTENT'})],now).status,'idle');
});
test('Windows namespaced paths match normal local paths',()=>{
  assert.equal(normalPath('\\\\?\\C:\\Users\\developer\\Desktop\\Example'),'C:\\Users\\developer\\Desktop\\Example');
});
test('waiting for subagents is distinct from waiting for user input',()=>{
  const wait=event('response_item',{type:'function_call',name:'wait_agent',call_id:'wait-1'});
  assert.equal(parseEvents([wait],now).status,'delegating');
  const done=event('response_item',{type:'function_call_output',call_id:'wait-1',output:'PRIVATE-REPORT'});
  const result=parseEvents([wait,done],now);assert.equal(result.status,'working');assert.equal(result.activity,'Reviewing team updates');
  assert.ok(!JSON.stringify(result).includes('PRIVATE-REPORT'));
});

test('recorded reasoning and plan tools report planning without inspecting private content',()=>{
  const privateContent={get content(){throw new Error('Reasoning must not be read');}};
  for(const entry of [
    event('response_item',{type:'reasoning'}),
    event('event_msg',{type:'agent_reasoning',text:'PRIVATE-THOUGHTS'}),
    event('response_item',{type:'function_call',name:'update_plan',arguments:'PRIVATE-PLAN'}),
  ]){
    if(entry.payload.type==='reasoning')Object.defineProperty(entry.payload,'content',Object.getOwnPropertyDescriptor(privateContent,'content'));
    const result=parseEvents([entry],now);
    assert.equal(result.status,'working');assert.equal(result.kind,'planning');assert.equal(result.activity,'Planning');
    assert.equal(JSON.stringify(result).includes('PRIVATE-'),false);
    assert.equal(parseEvents([entry],now+300000).status,'unknown','quiet planning expires like other work');
    assert.equal(parseEvents([entry,event('event_msg',{type:'task_complete'})],now).status,'idle');
  }
});
