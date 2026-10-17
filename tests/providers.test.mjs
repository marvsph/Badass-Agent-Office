import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProviderEvents} from '../providers.mjs';
import {describeTool} from '../adapter.mjs';
const now=Date.now(),timestamp=new Date(now-100).toISOString();
test('Claude end-turn and workspace metadata are observed without chat content',()=>{
 const result=parseProviderEvents('Claude',[{type:'assistant',timestamp,cwd:'C:\\Project',message:{model:'claude-test',stop_reason:'end_turn',content:[{type:'text',text:'SECRET-REPLY'}]}}],describeTool,now);
 assert.equal(result.status,'idle');assert.equal(result.projectPath,'C:\\Project');assert.equal(JSON.stringify(result).includes('SECRET-REPLY'),false);
});
test('Copilot permission and turn completion are separate states',()=>{
 const entries=[{type:'session.start',timestamp,data:{context:{cwd:'C:\\Project'}}},{type:'permission.requested',timestamp,data:{permissionRequest:'PRIVATE'}}];
 assert.equal(parseProviderEvents('Copilot',entries,describeTool,now).status,'waiting');
 entries.push({type:'assistant.turn_end',timestamp,data:{}});assert.equal(parseProviderEvents('Copilot',entries,describeTool,now).status,'idle');
});
test('old provider work does not masquerade as an active window',()=>{
 const result=parseProviderEvents('Copilot',[{type:'assistant.turn_start',timestamp,data:{}}],describeTool,now+300000);
 assert.equal(result.status,'unknown');
});

test('provider planning uses block types and tool names without retaining private plans',()=>{
 const thinking={type:'thinking',get thinking(){throw new Error('Private thinking must not be read');}};
 const entries=[{type:'assistant',timestamp,message:{content:[thinking]}}];
 const result=parseProviderEvents('Claude',entries,describeTool,now);
 assert.equal(result.kind,'planning');assert.equal(result.activity,'Planning');assert.equal(result.status,'working');
 assert.equal(parseProviderEvents('Claude',entries,describeTool,now+300000).status,'unknown');
 const planTool=parseProviderEvents('Copilot',[{type:'tool.execution_start',timestamp,data:{toolName:'update_plan',arguments:'PRIVATE-PLAN'}}],describeTool,now);
 assert.equal(planTool.kind,'planning');assert.equal(JSON.stringify(planTool).includes('PRIVATE-PLAN'),false);
});
