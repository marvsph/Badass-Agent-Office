import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

test('local configuration API requires origin/token, persists settings and refreshes floors without provider records',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'office-api-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const file=path.join(dir,'settings','config.json'),project=path.join(dir,'project');await fs.mkdir(project);
  const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const base=`http://127.0.0.1:${port}`;
  const start=async()=>{
    const child=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),windowsHide:true,stdio:'ignore',env:{...process.env,AGENT_OFFICE_PORT:String(port),AGENT_OFFICE_CONFIG:file,AGENT_OFFICE_CODEX_HOME:path.join(dir,'no-codex'),AGENT_OFFICE_CLAUDE_HOME:path.join(dir,'no-claude'),AGENT_OFFICE_COPILOT_HOME:path.join(dir,'no-copilot')}});
    const stop=async()=>{if(child.exitCode!==null||child.signalCode!==null)return;const exited=once(child,'exit');child.kill();await exited;};
    t.after(stop);
    for(let attempt=0;attempt<60;attempt++){
      try{if((await fetch(base+'/health')).ok)return stop;}catch{}
      if(child.exitCode!==null)throw new Error('Test office server did not start.');await delay(50);
    }
    throw new Error('Test office server did not become healthy.');
  };
  let stop=await start();
  const world=await (await fetch(base+'/api/world')).json();assert.equal(world.connected,false);assert.deepEqual(world.projects,[]);assert.ok(world.csrfToken);
  const original=await (await fetch(base+'/api/configuration')).json();
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=';
  const request={...original,officeName:'Test Studio',logo:png,projects:[{name:'My Project',path:project}]};
  const post=(body,headers={})=>fetch(base+'/api/configuration',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-Office-Token':world.csrfToken,...headers},body:JSON.stringify(body)});
  assert.equal((await post(request,{Origin:'https://outside.example'})).status,403);
  assert.equal((await post(request,{'X-Office-Token':'bad'})).status,403);
  const foreignHost=await new Promise((resolve,reject)=>{
    const req=httpRequest(base+'/api/configuration',{method:'POST',headers:{Host:'outside.example',Origin:base,'X-Office-Token':world.csrfToken}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end(JSON.stringify(request));
  });
  assert.equal(foreignHost,403);
  assert.equal((await post({...request,projects:[{path:'relative'}]})).status,400);
  const response=await post(request);assert.equal(response.status,200);const saved=await response.json();
  assert.equal((await post(request)).status,409,'stale tabs cannot overwrite new settings');
  const updated=await (await fetch(base+'/api/world')).json();
  assert.equal(updated.office.name,'Test Studio');assert.equal(updated.projects[0].name,'My Project');assert.equal(updated.projects[0].count,0);
  const logo=await fetch(base+updated.office.logoUrl);assert.equal(logo.headers.get('content-type'),'image/png');assert.ok((await logo.arrayBuffer()).byteLength>8);
  assert.equal((await fetch(base+'/.agent-office/config.json')).status,404);
  const task=await fetch(base+'/api/tasks',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-Office-Token':world.csrfToken},body:JSON.stringify({projectPath:dir,prompt:'Review',mode:'read-only'})});
  assert.equal(task.status,400,'tasks still reject folders outside configured floors');
  const followupRoute=base+'/api/tasks/12345678-1234-1234-1234-123456789abc/followup';
  const followup=(headers={})=>fetch(followupRoute,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-Office-Token':world.csrfToken,...headers},body:JSON.stringify({prompt:'Continue'})});
  assert.equal((await followup({Origin:'https://outside.example'})).status,403);
  assert.equal((await followup({'X-Office-Token':'bad'})).status,403);
  assert.equal((await followup()).status,400,'unknown sessions cannot be resumed through the office');
  await stop();stop=await start();
  const restored=await (await fetch(base+'/api/configuration')).json();assert.equal(restored.officeName,'Test Studio');assert.equal(restored.logo,png);assert.equal(restored.projects[0].path,project);
  const fresh=await (await fetch(base+'/api/world')).json();
  assert.equal((await post({...saved,projects:[],logo:null},{'X-Office-Token':fresh.csrfToken})).status,200);
  assert.deepEqual((await (await fetch(base+'/api/world')).json()).projects,[]);
  assert.equal((await fetch(base+'/api/office-logo')).status,404);
  await stop();
});
