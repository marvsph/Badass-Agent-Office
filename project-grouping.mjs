import fs from 'node:fs';
import path from 'node:path';

const cache=new Map();
const normalize=value=>path.normalize(String(value||'').replace(/^\\\\\?\\/,''));

// Read only Git location metadata. Linked worktrees share the main repo office.
export function repositoryWorkspace(value){
 const cwd=normalize(value),cached=cache.get(cwd.toLowerCase());
 if(cached&&Date.now()-cached.time<300000)return cached.path;
 // Historical logs can outlive a removed linked worktree. This conventional
 // sibling name is only merged when its main repository still exists.
 const worktree=cwd.match(/^(.*)\.worktrees[\\/]/i);
 if(worktree){try{if(fs.existsSync(path.join(worktree[1],'.git'))){const result=repositoryWorkspace(worktree[1]);cache.set(cwd.toLowerCase(),{path:result,time:Date.now()});return result;}}catch{}}
 let folder=cwd,result=cwd;
 for(let depth=0;folder&&depth<16;depth++){
  const marker=path.join(folder,'.git');
  try{
   const stat=fs.statSync(marker);
   if(stat.isDirectory()){result=folder;break;}
   const pointer=fs.readFileSync(marker,'utf8').trim().match(/^gitdir:\s*(.+)$/m);
   if(pointer){const gitdir=path.resolve(folder,pointer[1]);let common=gitdir;try{common=path.resolve(gitdir,fs.readFileSync(path.join(gitdir,'commondir'),'utf8').trim());}catch{}
    if(path.basename(common).toLowerCase()==='.git')result=path.dirname(common);else result=folder;
    break;
   }
  }catch{}
  const parent=path.dirname(folder);if(parent===folder)break;folder=parent;
 }
 cache.set(cwd.toLowerCase(),{path:result,time:Date.now()});return result;
}

export function assignProjectOffices(sessions,{ancestors=[],resolveWorkspace=repositoryWorkspace,projectRoots}={}){
 const records=new Map([...ancestors,...sessions].map(record=>[record.id,record]));
 // Match nested task folders against offices from every provider. A Claude
 // folder may belong to another Claude project with no Codex record at all.
 const workspaces=[...new Set(projectRoots??[...records.values()].map(record=>resolveWorkspace(record.projectPath||record.cwd||'')).filter(Boolean))].sort((a,b)=>a.length-b.length);
 const officeFor=value=>workspaces.find(root=>value.toLowerCase()===root.toLowerCase()||value.toLowerCase().startsWith((root.endsWith(path.sep)?root:root+path.sep).toLowerCase()))||value;
 const resolved=new Map();
 const resolve=(record,trail=new Set())=>{
  if(resolved.has(record.id))return resolved.get(record.id);
  const own=officeFor(resolveWorkspace(record.projectPath||record.cwd||''));
  if(trail.has(record.id))return own;
  const next=new Set(trail);next.add(record.id);
  const parent=record.parentId&&records.get(record.parentId);
  const workspace=parent?resolve(parent,next):own;
  resolved.set(record.id,workspace||own);return workspace||own;
 };
 return sessions.map(session=>{const projectPath=resolve(session);return {...session,projectPath,project:path.basename(projectPath)};});
}
