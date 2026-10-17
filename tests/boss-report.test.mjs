import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildBossReport} from '../public/boss-report.js';

test('Boss reports group real sessions and preserve unknown signals',()=>{
  const world={connected:true,observedAt:1000,projects:[{path:'A',name:'Website'},{path:'B',name:'Tools'}],sessions:[
    {id:'lead',projectPath:'A',parentId:null,status:'working',activityLog:[{label:'Editing files',kind:'coding',timestamp:900}]},
    {id:'review',projectPath:'A',parentId:'lead',status:'delegating',activityLog:[{label:'Waiting for subagent reports',kind:'team-wait',timestamp:950}]},
    {id:'quiet',projectPath:'B',parentId:null,status:'unknown',activity:'No recent signal',activityLog:[]},
    {id:'review',projectPath:'A',parentId:'lead',status:'working',activityLog:[]},
  ]};
  const report=buildBossReport(world,1100);
  assert.deepEqual(report.totals,{projects:2,workers:3,sessions:2,subagents:1});
  assert.equal(report.counts.unknown,1);assert.equal(report.counts.working,1);
  assert.equal(report.counts.delegating,1);assert.equal(report.attention.length,0);
  assert.equal(report.updates[0].label,'Waiting for subagent reports');
  assert.equal(report.projects.find(p=>p.path==='B').latest,null);
  assert.equal(report.age,100);
});

test('Only recorded input requests enter Boss attention; stale data stays explicit',()=>{
  const report=buildBossReport({connected:false,observedAt:1000,sessions:[
    {id:'wait',projectPath:'A',project:'App',status:'waiting',lastSeen:900,activity:'Waiting for your approval',activityLog:[{label:'Waiting for your approval',timestamp:900}]},
    {id:'missing',projectPath:'A',project:'App',status:'something-new',lastSeen:980,activityLog:[]},
    {id:'done',projectPath:'B',project:'Book',status:'idle',activityLog:[{label:'Turn finished',timestamp:970},{label:'Starting a turn',timestamp:600}]},
  ]},2000);
  assert.equal(report.connected,false);assert.equal(report.age,1000);
  assert.deepEqual(report.attention.map(a=>a.id),['wait']);
  assert.equal(report.counts.unknown,1);assert.equal(report.counts.idle,1);
  assert.equal(report.updates[0].label,'Turn finished');
  assert.equal(report.projects[0].path,'A');
});

test('No records produce no simulated workers or updates',()=>{
  const report=buildBossReport(null);
  assert.equal(report.totals.workers,0);assert.equal(report.totals.projects,0);
  assert.deepEqual(report.updates,[]);assert.deepEqual(report.attention,[]);
  assert.equal(report.age,null);
});
