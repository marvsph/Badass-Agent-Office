import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observeFloorAttention, viewFloorAttention, viewSessionAttention, unreadCompletion, sessionUnreadCompletion } from '../public/floor-attention.js';
import { rankProjectsByActivity, recentWorkers, WORKER_RECENCY_MS } from '../public/session-visibility.js';

const now = Date.UTC(2026, 9, 14, 16);
const projects = [{path:'A',name:'Alpha'},{path:'B',name:'Beta'}];
const finished = (timestamp=now-1000) => ({id:'worker',projectPath:'B',status:'idle',lastSeen:timestamp,activityLog:[{kind:'done',label:'Turn finished',timestamp}]});

test('unread completions remain above active floors until floor notifications are acknowledged',()=>{
  const sessions=[finished(),{id:'busy',projectPath:'A',status:'working',lastSeen:now}];
  const attention=observeFloorAttention({},projects,sessions,now);
  assert.deepEqual(rankProjectsByActivity(projects,sessions,now,attention).map(p=>p.path),['B','A']);
  const viewedOther=viewFloorAttention(attention,'A',now);
  assert.ok(unreadCompletion(viewedOther,'B'));
  const viewed=viewFloorAttention(viewedOther,'B',now);
  assert.equal(unreadCompletion(viewed,'B'),0);
  assert.deepEqual(rankProjectsByActivity(projects,sessions,now,viewed).map(p=>p.path),['A','B']);
});

test('refreshing, repeated polls and later usage metadata do not restore read markers',()=>{
  const completion=finished();
  const attention=viewFloorAttention(observeFloorAttention({},projects,[completion],now),'B',now);
  completion.lastSeen=now+10000;completion.updatedAt=now+10000;
  const reloaded=observeFloorAttention(JSON.parse(JSON.stringify(attention)),projects,[completion],now+10000);
  assert.equal(unreadCompletion(reloaded,'B'),0);
  completion.activityLog.push({kind:'done',label:'Turn finished',timestamp:now+11000});
  const later=observeFloorAttention(reloaded,projects,[completion],now+12000);
  assert.equal(unreadCompletion(later,'B'),now+11000);
});

test('pending attention survives worker expiry, missing records and page reload',()=>{
  const attention=observeFloorAttention({},projects,[finished()],now);
  const later=now+WORKER_RECENCY_MS+1;
  const reloaded=observeFloorAttention(JSON.parse(JSON.stringify(attention)),projects,[],later);
  assert.ok(unreadCompletion(reloaded,'B'));
  assert.deepEqual(recentWorkers([finished()],later),[],'pinning never restores an expired worker');
});

test('old history, interruptions, unknown signals and unlisted projects create no attention',()=>{
  const sessions=[finished(now-WORKER_RECENCY_MS-1),{...finished(),projectPath:'outside'},
    {...finished(),activityLog:[{kind:'done',label:'Turn interrupted',timestamp:now-1000}]},
    {projectPath:'A',status:'idle',lastSeen:now,activityLog:[]},
    {...finished(),activityLog:[{kind:'quiet',label:'No recent signal',timestamp:now-1000}]},
    {...finished(),activityLog:[{kind:'done',label:'Turn finished',timestamp:'bad'}]}];
  const attention=observeFloorAttention({'outside':{completedAt:now}},projects,sessions,now);
  assert.equal(unreadCompletion(attention,'A'),0);assert.equal(unreadCompletion(attention,'B'),0);
  assert.equal(attention.outside,undefined);
});

test('a completion stays unread if the worker starts another task before it is viewed',()=>{
  const session={...finished(),status:'working',lastSeen:now};
  const attention=observeFloorAttention({},projects,[session],now);
  assert.ok(unreadCompletion(attention,'B'));
  const input=JSON.stringify(attention);viewFloorAttention(attention,'B',now);
  assert.equal(JSON.stringify(attention),input,'acknowledgement preserves its input');
});

test('worker attention tracks only that worker\'s recorded completion and clears for the entire floor',()=>{
  const first=finished(), second={...finished(now-500),id:'second'};
  const other={...finished(now-700),id:'other',projectPath:'A'};
  const quiet={id:'quiet',projectPath:'B',status:'idle',lastSeen:now,activityLog:[]};
  const old={...finished(now-WORKER_RECENCY_MS-1),id:'old'};
  const sessions=[first,second,other,quiet,old];
  const attention=observeFloorAttention({},projects,sessions,now);
  assert.equal(sessionUnreadCompletion(attention,first),now-1000);
  assert.equal(sessionUnreadCompletion(attention,second),now-500);
  assert.equal(sessionUnreadCompletion(attention,quiet),0);
  assert.equal(sessionUnreadCompletion(attention,old),0,'new activity from a coworker cannot badge an old completion');
  const read=viewFloorAttention(attention,'B',now);
  for(const session of [first,second,quiet,old])assert.equal(sessionUnreadCompletion(read,session),0);
  assert.equal(sessionUnreadCompletion(read,other),now-700,'reading one floor leaves another floor unread');
});

test('worker completion metadata survives expiry and missing records without restoring a floor worker',()=>{
  const session=finished();
  const attention=observeFloorAttention({},projects,[session],now);
  const later=now+WORKER_RECENCY_MS+1;
  const reloaded=observeFloorAttention(JSON.parse(JSON.stringify(attention)),projects,[],later);
  assert.equal(sessionUnreadCompletion(reloaded,session),now-1000);
  assert.deepEqual(recentWorkers([session],later),[]);
  const read=viewFloorAttention(reloaded,'B',later);
  assert.equal(sessionUnreadCompletion(observeFloorAttention(read,projects,[session],later),session),0);
});

test('reading one worker preserves other unread updates and keeps its floor pinned',()=>{
  const older=finished(now-2000), latest={...finished(now-1000),id:'latest'};
  const sessions=[older,latest,{id:'busy',projectPath:'A',status:'working',lastSeen:now}];
  const attention=observeFloorAttention({},projects,sessions,now);
  const partial=viewSessionAttention(attention,latest);
  assert.equal(sessionUnreadCompletion(partial,latest),0);
  assert.equal(sessionUnreadCompletion(partial,older),now-2000);
  assert.equal(unreadCompletion(partial,'B'),now-2000,'older unread completion remains after newest is read');
  assert.deepEqual(rankProjectsByActivity(projects,sessions,now,partial).map(p=>p.path),['B','A']);
  const reload=observeFloorAttention(JSON.parse(JSON.stringify(partial)),projects,sessions,now);
  assert.equal(sessionUnreadCompletion(reload,latest),0);
  const read=viewSessionAttention(reload,older);
  assert.equal(unreadCompletion(read,'B'),0);
  assert.deepEqual(rankProjectsByActivity(projects,sessions,now,read).map(p=>p.path),['A','B']);
  const changed={...latest,activityLog:[...latest.activityLog,{kind:'done',label:'Turn finished',timestamp:now}]};
  assert.equal(sessionUnreadCompletion(observeFloorAttention(read,projects,[changed],now),changed),now);
});

test('legacy floor-only markers survive migration and can be cleared in bulk',()=>{
  const saved={B:{viewedAt:0,completedAt:now-3000}};
  const attention=observeFloorAttention(saved,projects,[],now);
  assert.equal(unreadCompletion(attention,'B'),now-3000);
  const newer=finished(now-1000);
  const learned=observeFloorAttention(attention,projects,[newer],now);
  const partial=viewSessionAttention(learned,newer);
  assert.equal(unreadCompletion(partial,'B'),now-3000,'legacy missing worker remains unread');
  assert.equal(unreadCompletion(viewFloorAttention(partial,'B',now),'B'),0);
  const matched=observeFloorAttention({B:{viewedAt:0,completedAt:now-1000}},projects,[newer],now);
  assert.equal(unreadCompletion(viewSessionAttention(matched,newer),'B'),0,'matching legacy event is attributed to its recorded worker');
});

test('opening a main worker acknowledges all recorded descendants without clearing other teams',()=>{
  const main={...finished(),id:'main'};
  const child={...finished(now-800),id:'child',parentId:'main'};
  const nested={...finished(now-600),id:'nested',parentId:'child'};
  const sibling={...finished(now-400),id:'sibling',parentId:'another-lead'};
  const unrelated={...finished(now-200),id:'unrelated',projectPath:'A'};
  const sessions=[main,child,nested,sibling,unrelated];
  const attention=observeFloorAttention({},projects,sessions,now);
  const original=JSON.stringify(attention);
  const read=viewSessionAttention(attention,main,sessions);
  for(const worker of [main,child,nested])assert.equal(sessionUnreadCompletion(read,worker),0);
  for(const worker of [sibling,unrelated])assert.ok(sessionUnreadCompletion(read,worker));
  assert.ok(unreadCompletion(read,'B'),'unrelated coworker keeps floor pinned');
  assert.equal(JSON.stringify(attention),original,'acknowledgement preserves input metadata');
  const childRead=viewSessionAttention(attention,child,sessions);
  assert.ok(sessionUnreadCompletion(childRead,main),'opening a child does not acknowledge its parent');
  assert.equal(sessionUnreadCompletion(childRead,nested),0);
});

test('recorded descendant links survive missing intermediate workers, expiry and reload',()=>{
  const main={id:'main',projectPath:'B',activityLog:[]};
  const child={id:'child',parentId:'main',projectPath:'B',activityLog:[]};
  const nested={...finished(),id:'nested',parentId:'child'};
  const sessions=[main,child,nested];
  const attention=observeFloorAttention({},projects,sessions,now);
  const later=now+WORKER_RECENCY_MS+1;
  const saved=observeFloorAttention(JSON.parse(JSON.stringify(attention)),projects,[main],later);
  assert.ok(unreadCompletion(saved,'B'));
  const read=viewSessionAttention(saved,main,[main]);
  assert.equal(sessionUnreadCompletion(read,nested),0,'main with no completion still acknowledges its missing descendant');
  assert.equal(unreadCompletion(read,'B'),0);
  assert.deepEqual(recentWorkers([nested],later),[],'acknowledgement never restores an expired worker');
});

test('descendant acknowledgement uses only recorded parent IDs and tolerates cycles',()=>{
  const main={...finished(),id:'main',parentId:'child'};
  const child={...finished(),id:'child',parentId:'main'};
  const sameName={...finished(),id:'unrelated',name:'main'};
  const attention=observeFloorAttention({},projects,[main,child,sameName],now);
  const read=viewSessionAttention(attention,main,[main,child,sameName]);
  assert.equal(sessionUnreadCompletion(read,main),0);
  assert.equal(sessionUnreadCompletion(read,child),0);
  assert.ok(sessionUnreadCompletion(read,sameName),'matching name or project does not invent a parent link');
});
