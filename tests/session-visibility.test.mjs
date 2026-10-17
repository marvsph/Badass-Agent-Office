import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasRecentActivity,recentWorkers,rankProjectsByActivity,WORKER_RECENCY_MS} from '../public/session-visibility.js';

test('workers leave after six hours without activity, including the exact boundary',()=>{
  const now=Date.UTC(2026,9,14,16),cutoff=now-WORKER_RECENCY_MS;
  const sessions=[
    {id:'recent',lastSeen:cutoff+1},
    {id:'boundary',lastSeen:cutoff},
    {id:'expired',lastSeen:cutoff-1,updatedAt:cutoff-1},
    {id:'long-running',createdAt:now-7*86400000,lastSeen:now-1000},
  ];
  assert.deepEqual(recentWorkers(sessions,now).map(s=>s.id),['recent','boundary','long-running']);
  assert.equal(hasRecentActivity(sessions[1],now+1),false,'boundary worker leaves as time advances');
});

test('the newest valid session signal controls visibility; missing timestamps stay hidden',()=>{
  const now=Date.UTC(2026,9,14,16),old=now-WORKER_RECENCY_MS-1;
  assert.equal(hasRecentActivity({lastSeen:old,updatedAt:now},now),true);
  assert.equal(hasRecentActivity({lastSeen:now,updatedAt:old},now),true);
  assert.equal(hasRecentActivity({updatedAt:String(now)},now),true);
  for(const session of [{},{lastSeen:null},{lastSeen:'unknown',updatedAt:old},{lastSeen:Infinity},{lastSeen:-1}]){
    assert.equal(hasRecentActivity(session,now),false);
  }
});

test('visibility changes preserve archived session records and allow returning workers',()=>{
  const now=Date.UTC(2026,9,14,16),session={id:'returning',lastSeen:now-WORKER_RECENCY_MS-1};
  const history=[session];
  assert.deepEqual(recentWorkers(history,now),[]);
  assert.equal(history.length,1,'filtering does not delete the record');
  session.lastSeen=now;
  assert.deepEqual(recentWorkers(history,now),[session]);
});

test('project navigation ranks current active workers first without moving map floors',()=>{
  const now=Date.UTC(2026,9,14,16);
  const projects=[{name:'Alpha',path:'a',active:99},{name:'Beta',path:'b'},{name:'Gamma',path:'g'},{name:'Delta',path:'d'}];
  const sessions=[
    {projectPath:'b',status:'working',lastSeen:now},
    {projectPath:'g',status:'working',lastSeen:now},
    {projectPath:'g',status:'delegating',lastSeen:now},
    {projectPath:'g',status:'waiting',lastSeen:now},
    {projectPath:'a',status:'working',lastSeen:now-WORKER_RECENCY_MS-1},
    {projectPath:'a',status:'idle',lastSeen:now},
    {projectPath:'a',status:'unknown',lastSeen:now},
  ];
  assert.deepEqual(rankProjectsByActivity(projects,sessions,now).map(p=>[p.name,p.active]),[['Gamma',3],['Beta',1],['Alpha',0],['Delta',0]]);
  assert.deepEqual(projects.map(p=>p.name),['Alpha','Beta','Gamma','Delta'],'navigation sorting preserves map order');
  sessions[0].status='idle';
  assert.deepEqual(rankProjectsByActivity(projects,sessions,now).map(p=>p.name),['Gamma','Alpha','Beta','Delta'],'updated status changes ranking');
});
