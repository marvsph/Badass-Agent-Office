import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assignProjectOffices,repositoryWorkspace} from '../project-grouping.mjs';

test('nested subagents inherit the spawning project even when their cwd changes',()=>{
 const root=path.resolve('parent-project'),other=path.resolve('dated-work-folder');
 const result=assignProjectOffices([{id:'root',projectPath:root},{id:'child',parentId:'root',projectPath:other},{id:'grandchild',parentId:'child',projectPath:path.join(other,'nested')}],{resolveWorkspace:value=>value});
 assert.ok(result.every(session=>session.projectPath===root));
});

test('missing parents preserve the known workspace and cyclic metadata terminates',()=>{
 const root=path.resolve('known-project');
 const result=assignProjectOffices([{id:'orphan',parentId:'unavailable',projectPath:root},{id:'a',parentId:'b',projectPath:root},{id:'b',parentId:'a',projectPath:root}],{resolveWorkspace:value=>value});
 assert.ok(result.every(session=>session.projectPath===root));
});

test('nested task folders from any provider share the detected project office',()=>{
 const root=path.resolve('Example Project'),task=path.join(root,'[06 - Work in Progress]','web-absorb-2026-10-14');
 const outside=path.resolve('outside-task'),unrelated=path.resolve('Example Project-other');
 const result=assignProjectOffices([
  {id:'claude:task',provider:'Claude',projectPath:task},
  {id:'claude:child',provider:'Claude',parentId:'claude:task',projectPath:outside},
  {id:'claude:project',provider:'Claude',projectPath:root},
  {id:'other',projectPath:unrelated},
 ],{resolveWorkspace:value=>value});
 assert.ok(result.slice(0,3).every(s=>s.projectPath===root));
 assert.equal(result[3].projectPath,unrelated,'similar names do not merge unrelated projects');
 assert.equal(new Set(result.map(s=>s.projectPath)).size,2,'neither the nested folder nor spawned outside cwd creates a floor');
});

test('Git worktrees join their repository office without modifying Git metadata',()=>{
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'office-git-grouping-')),repo=path.join(fixture,'main'),gitdir=path.join(repo,'.git'),tree=path.join(fixture,'audit-tree'),linked=path.join(gitdir,'worktrees','audit');
 try{fs.mkdirSync(linked,{recursive:true});fs.mkdirSync(tree);fs.writeFileSync(path.join(tree,'.git'),'gitdir: '+linked);fs.writeFileSync(path.join(linked,'commondir'),'../..');
  assert.equal(repositoryWorkspace(tree),repo);assert.equal(repositoryWorkspace(path.join(tree,'src')),repo);assert.equal(repositoryWorkspace(repo+'.worktrees'+path.sep+'removed-audit'),repo);assert.equal(fs.readFileSync(path.join(linked,'commondir'),'utf8'),'../..');
 }finally{const target=path.resolve(fixture);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(target,{recursive:true,force:true});}
});
