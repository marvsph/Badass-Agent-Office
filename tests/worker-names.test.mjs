import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nameWorkers} from '../public/worker-names.js';

test('untitled workers follow the recorded chat title and later title changes',()=>{
 const original={id:'chat',name:'untitled-1',provider:'Codex',title:'Office lighting polish'};
 const named=nameWorkers([original])[0];assert.equal(named.name,'Office lighting polish');assert.equal(named.recordedName,'untitled-1');assert.equal(original.name,'untitled-1');
 assert.equal(nameWorkers([{...named,title:'Renamed office chat'}])[0].name,'Renamed office chat');
 for(const title of ['Untitled-1','Codex session','# AGENTS.md <INSTRUCTIONS>'])assert.notEqual(nameWorkers([{...original,title}])[0].name,title);
});

test('generic provider workers get varied stable office names with recorded identity preserved',()=>{
  const original=Array.from({length:120},(_,i)=>({id:'worker-'+i,provider:['Codex','Claude','Copilot'][i%3],name:['Codex','Claude subagent','Copilot'][i%3],projectPath:'project'}));
  const named=nameWorkers(original);
  assert.ok(new Set(named.map(worker=>worker.name)).size>100);
  assert.ok(named.every((worker,i)=>worker.recordedName===original[i].name&&worker.name!==original[i].name));
  const reversed=new Map(nameWorkers([...original].reverse()).map(worker=>[worker.id,worker.name]));
  assert.ok(named.every(worker=>worker.name===reversed.get(worker.id)),'names do not change with session order');
  assert.deepEqual(nameWorkers(JSON.parse(JSON.stringify(named))),named,'refreshes preserve the same names');
  assert.equal(original[0].name,'Codex','observer metadata is not mutated');
});

test('explicit recorded agent names and all work metadata stay unchanged',()=>{
  const session={id:'named',name:'Reviewer Ada',title:'Review the dashboard',provider:'Codex',status:'working',tokens:52};
  assert.deepEqual(nameWorkers([session]),[session]);
  const generic={...session,id:'generic',name:'Subagent'};
  const named=nameWorkers([generic])[0];
  assert.equal(named.title,generic.title);assert.equal(named.status,generic.status);assert.equal(named.tokens,generic.tokens);
});
