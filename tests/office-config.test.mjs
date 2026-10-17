import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadConfig,saveConfig,validateConfig,decodeLogo,defaultConfig,publicOffice} from '../office-config.mjs';

const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=';
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'office-config-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}

test('settings persist branding and project paths, and invalid updates preserve disk data',async t=>{
  const dir=await fixture(t),file=path.join(dir,'settings','config.json');
  assert.deepEqual(await loadConfig(file),defaultConfig());
  const config=await saveConfig({officeName:' Studio ',logo:png,projects:[{name:'',path:dir}]},file);
  assert.equal(config.officeName,'Studio');assert.equal(config.projects[0].name,path.basename(dir));
  assert.deepEqual(await loadConfig(file),config);
  await assert.rejects(saveConfig({...config,projects:[{path:path.join(dir,'missing')}]},file),/does not exist/);
  assert.deepEqual(await loadConfig(file),config);
  assert.equal(decodeLogo(config.logo).mime,'image/png');
  assert.match(publicOffice(config).logoUrl,/^\/api\/office-logo\?v=/);
  assert.equal(JSON.stringify(publicOffice(config)).includes(dir),false);
});

test('folder validation rejects relative paths, files, duplicate and nested floors',async t=>{
  const dir=await fixture(t),sub=path.join(dir,'nested');await fs.mkdir(sub);
  const config={officeName:'Office',logo:null,projects:[]};
  await assert.rejects(validateConfig({...config,projects:[{path:'relative'}]}),/absolute/);
  const file=path.join(dir,'file.txt');await fs.writeFile(file,'test');
  await assert.rejects(validateConfig({...config,projects:[{path:file}]}),/does not exist/);
  for(const second of [dir,sub])await assert.rejects(validateConfig({...config,projects:[{path:dir},{path:second}]}),/already belongs/);
  if(process.platform==='win32')await assert.rejects(validateConfig({...config,projects:[{path:dir},{path:dir.toUpperCase()}]}),/already belongs/);
  await assert.rejects(validateConfig({...config,officeName:'\nBad'}),/control/);
  await assert.rejects(validateConfig({...config,projects:Array.from({length:51},()=>({path:dir}))}),/50/);
});

test('room limits default for existing settings and reject invalid values without overwriting them',async t=>{
 const dir=await fixture(t),file=path.join(dir,'config.json'),base={officeName:'Office',logo:null,projects:[]};
 const saved=await saveConfig({...base,roomAgentLimit:12},file);
 assert.equal((await loadConfig(file)).roomAgentLimit,12);assert.equal(publicOffice(saved).roomAgentLimit,12);
 for(const roomAgentLimit of [0,-1,101,1.5,'24',NaN])await assert.rejects(saveConfig({...base,roomAgentLimit},file),/Room agent limit/);
 assert.deepEqual(await loadConfig(file),saved);
 assert.equal((await validateConfig(base)).roomAgentLimit,24);
});

test('worktree inputs use the main repository floor',async t=>{
  const dir=await fixture(t),main=path.join(dir,'main'),worktree=path.join(dir,'worktree');
  const gitdir=path.join(main,'.git','worktrees','branch');
  await fs.mkdir(gitdir,{recursive:true});await fs.mkdir(worktree);
  await fs.writeFile(path.join(worktree,'.git'),`gitdir: ${gitdir}`);
  await fs.writeFile(path.join(gitdir,'commondir'),'../..');
  const input={officeName:'Office',logo:null,projects:[{path:worktree}]};
  const config=await validateConfig(input);assert.equal(config.projects[0].path,main);
  await assert.rejects(validateConfig({...input,projects:[{path:main},{path:worktree}]}),/already belongs/);
});

test('logos exclude external URLs, active SVG, disguised files and oversized images',()=>{
  for(const invalid of ['https://example.com/logo.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,aGVsbG8=',png+'!', 'data:image/png;base64,'+'A'.repeat(800000)])assert.throws(()=>decodeLogo(invalid),/Logo/);
  assert.equal(decodeLogo(null),null);
});

test('missing folders can be loaded for correction; corrupt settings are never replaced',async t=>{
  const dir=await fixture(t),file=path.join(dir,'config.json');
  const config={officeName:'Office',logo:null,projects:[{name:'Removed',path:path.join(dir,'removed')}]};
  await fs.writeFile(file,JSON.stringify(config));assert.deepEqual(await loadConfig(file),{...config,roomAgentLimit:24});
  await fs.writeFile(file,'broken');await assert.rejects(loadConfig(file),/has not been changed/);
  assert.equal(await fs.readFile(file,'utf8'),'broken');
});
