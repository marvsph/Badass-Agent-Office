import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { officeProjects, selectOfficeProjects } from '../office-projects.mjs';

const projects=['Website','Dashboard','Team Tools'].map(name=>({name,path:path.resolve('fixture-projects',name)}));
const select=(records,options={})=>selectOfficeProjects(records,{projects,...options});

test('filesystem root floors include nested project records',()=>{
  const root=path.parse(path.resolve('.')).root;
  const office=selectOfficeProjects([{id:'nested',projectPath:path.join(root,'workspace','project')}],{projects:[{name:'Root',path:root}],resolveWorkspace:value=>value});
  assert.equal(office.sessions[0].projectPath,root);
});

test('fresh installations have no personal roster; configured empty floors persist',()=>{
  assert.deepEqual(officeProjects,[]);
  assert.deepEqual(selectOfficeProjects([]).projects,[]);
  const office=select([]);
  assert.deepEqual(office.projects.map(project=>project.name),projects.map(project=>project.name));
  assert.ok(office.projects.every(project=>project.count===0&&project.active===0));
  assert.deepEqual(office.sessions,[]);
});

test('unlisted records cannot add floors, sessions, or counts',()=>{
  const root=projects[0].path;
  const office=select([
    {id:'allowed',projectPath:root.toUpperCase(),status:'working'},
    {id:'outside',projectPath:path.resolve(root,'..','Unlisted'),status:'working'},
    {id:'similar',projectPath:root+'-other',status:'working'},
  ],{resolveWorkspace:value=>value});
  assert.deepEqual(office.sessions.map(session=>session.id),['allowed']);
  assert.equal(office.sessions[0].projectPath,root);
  assert.equal(office.sessions[0].project,'Website');
  assert.equal(office.projects[0].count,1);
  assert.equal(office.projects[0].active,1);
  assert.equal(office.projects.length,3);
});

test('configured projects inherit nested workers and children with outside cwd',()=>{
  const root=projects[2].path;
  const office=select([
    {id:'parent',projectPath:root,status:'working'},
    {id:'nested',projectPath:path.join(root,'tasks','review'),status:'idle'},
    {id:'child',parentId:'parent',projectPath:path.resolve(root,'..','outside-task'),status:'waiting'},
  ],{resolveWorkspace:value=>value});
  assert.ok(office.sessions.every(session=>session.project==='Team Tools'&&session.projectPath===root));
  assert.deepEqual(office.sessions.map(session=>session.id),['parent','nested','child']);
  assert.deepEqual(office.projects.find(project=>project.name==='Team Tools'),{name:'Team Tools',path:root,count:3,active:2});
});

test('configured roots group nested tasks across providers without a root session',()=>{
  const root=projects[0].path,outside=path.resolve(root,'..','audit-task');
  const office=select([
    {id:'claude:task',provider:'Claude',projectPath:path.join(root,'work','dated-task')},
    {id:'codex:child',provider:'Codex',parentId:'claude:task',projectPath:outside},
    {id:'copilot:task',provider:'Copilot',projectPath:path.join(root,'nested-repository')},
    {id:'archived-child',parentId:'archived-parent',projectPath:outside},
    {id:'unlisted-child',parentId:'unlisted-parent',projectPath:root},
  ],{ancestors:[{id:'archived-parent',cwd:root},{id:'unlisted-parent',cwd:outside}],resolveWorkspace:value=>value});
  assert.deepEqual(office.sessions.map(session=>session.id),['claude:task','codex:child','copilot:task','archived-child']);
  assert.ok(office.sessions.every(session=>session.projectPath===root));
  assert.equal(office.projects[0].count,4);
});
