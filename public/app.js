import {installOfficeTasks} from './office-tasks.js';
import { BuildingScene } from './building-scene.js';
import { buildBossReport } from './boss-report.js';
import { hasRecentActivity, recentWorkers, rankProjectsByActivity } from './session-visibility.js';
import { observeFloorAttention, viewFloorAttention, viewSessionAttention, sessionUnreadCompletion } from './floor-attention.js';
import { nameWorkers } from './worker-names.js';
import { profileSprite, recordedWorkDescription, recordedActivityDetail } from './worker-profile.js';
import { installOfficeSettings, applyOfficeBranding } from './office-settings.js';
const $ = id => document.getElementById(id);
const canvas = $('office'), ctx = canvas.getContext('2d');
const officeScene = new BuildingScene(canvas);
const colors = ['#609b92','#d78465','#839fbe','#bc9563','#a099b9','#859e68','#4c668c','#ce7865'];
const statusNames = { working:'At work', waiting:'Needs your input', idle:'Turn finished', unknown:'Quiet / unknown', delegating:'Waiting for team reports' };
const sessionStatusName = agent => agent.status==='working'&&agent.kind==='planning'?'Planning':statusNames[agent.status];
const activityIcons = { planning:'\u25c7', coding:'⌨', terminal:'›_', research:'⌕', collaborating:'↗', reading:'▤', working:'✦', reviewing:'▦', done:'✓', waiting:'!', quiet:'·' };
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const stored = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key,value); } catch { /* storage may be unavailable */ } };
const savedAttention = () => { try { return JSON.parse(stored('ao-floor-attention','{}')); } catch { return {}; } };
let floorAttention=savedAttention();
const state = { world:null, agents:[], project:stored('ao-project',''), theme:stored('ao-theme','cozy'), history:false, selected:null, connected:false, floor:0, initialFloor:false, reportsOpen:stored('ao-reports',window.matchMedia('(max-width: 1000px)').matches?'hidden':'open')==='open' };
let width=800, height=455, scale=1, zoom=1, pan={x:0,y:0}, drag=null, hits=[], hover=null, frameTime=0;
let dimensions={w:13,h:10}, fetching=false, lastGood=0;
let roomHoverPointer=null,roomHoverKey='';
const camera={x:400,y:100};
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const relative = ts => { if (!ts) return 'Not reported'; const seconds=Math.max(0,Math.round((Date.now()-ts)/1000)); return seconds<5?'just now':seconds<60?`${seconds}s ago`:seconds<3600?`${Math.floor(seconds/60)}m ago`:`${Math.floor(seconds/3600)}h ago`; };
const fullTime = ts => ts ? new Date(ts).toLocaleString([], { dateStyle:'medium',timeStyle:'short' }) : 'Not reported';
const number = num => num===null||num===undefined?'Not reported':Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(num);

function portrait(agent) { return `<span class="portrait" style="--person-color:${colors[agent.colorIndex]}"><i class="head"></i><i class="shirt"></i></span>`; }
function pixelProfile(agent){const s=profileSprite(agent.colorIndex);return `<span class="pixel-profile" role="img" aria-label="Pixel portrait of ${escape(agent.name)}" style="width:${s.width*s.scale}px;height:${s.height*s.scale}px;background-size:${s.atlasSize*s.scale}px ${s.atlasSize*s.scale}px;background-position:${-s.x*s.scale}px ${-s.y*s.scale}px"></span>`;}
function visibleAgents(includeHistory=false,now=Date.now()) {
  let sessions=includeHistory?[...(state.world?.sessions||[])]:recentWorkers(state.world?.sessions||[],now);
  if(state.project) sessions=sessions.filter(a=>a.projectPath===state.project);
  return sessions.sort((a,b)=>Number(!!a.parentId)-Number(!!b.parentId)||b.lastSeen-a.lastSeen);
}

function updateInterface() {
  applyOfficeBranding(state.world?.office);
  officeScene.officeName=state.world?.office?.name || 'Agent Office';
  $('setup-state').hidden=!state.world||!!state.world.projects?.length;
  const now=Date.now();
  if(state.world){let attention=observeFloorAttention(floorAttention,state.world.projects,state.world.sessions,now);
    const inspected=state.world.sessions.find(a=>a.id===state.selected);
    if(document.visibilityState==='visible'&&inspected)attention=viewSessionAttention(attention,inspected,state.world.sessions);
    storeFloorAttention(attention);
  }
  const report=buildBossReport(state.world);
  officeScene.report=report;
  officeScene.connected=state.connected;
  officeScene.activeProject=state.project;
  officeScene.projects=state.world?.projects || [];
  const buildingAgents=recentWorkers(state.world?.sessions||[],now).map(a=>({...a,unreadCompletionAt:sessionUnreadCompletion(floorAttention,a)}));
  officeScene.roomAgentLimit=state.world?.office?.roomAgentLimit??24;
  officeScene.setAgents(buildingAgents);
  state.agents=[...officeScene.floors.values()].flatMap(floor=>floor.agents).filter(agent=>!state.project||agent.projectPath===state.project);
  const listedAgents=visibleAgents(state.history,now);
  const hiddenAgents=buildingAgents.filter(agent=>(!state.project||agent.projectPath===state.project)&&!state.agents.some(visible=>visible.id===agent.id));
  renderFloorNavigation(now);
  const levels=Math.max(1,Math.ceil(state.agents.length/16));
  state.floor=Math.min(state.floor,levels-1);
  $('office-level').innerHTML=Array.from({length:levels},(_,i)=>`<option value="${i}">Wing ${i+1}</option>`).join('');
  $('office-level').value=state.floor;
  $('office-level').hidden=true;
  const counts={working:0,waiting:0,idle:0,unknown:0,delegating:0};
  for(const a of state.agents) counts[a.status]++;
  $('stat-team').textContent=state.agents.length; $('stat-working').textContent=counts.working;
  $('stat-waiting').textContent=counts.waiting; $('stat-idle').textContent=counts.idle;
  $('team-count').textContent=listedAgents.length;
  $('team-heading-label').textContent=state.history?'SESSION RECORDS':'RECENT SESSIONS';
  $('team').innerHTML=listedAgents.length?listedAgents.map(a=>`<button class="person ${state.selected===a.id?'selected':''}" data-agent="${escape(a.id)}" aria-label="Inspect ${escape(a.name)}: ${escape(a.title)}${sessionUnreadCompletion(floorAttention,a)?', finished work to review':''}">${portrait(a)}<span class="person-meta"><strong>${escape(a.name)}${a.parentId?' <span>↳</span>':''}</strong><small>${escape(a.provider||'Codex')} · ${escape(a.activity)}${hasRecentActivity(a,now)?'':' · Earlier record'}</small></span>${sessionUnreadCompletion(floorAttention,a)?`<span class="worker-attention" title="Recorded turn finished ${escape(fullTime(sessionUnreadCompletion(floorAttention,a)))}" aria-hidden="true">!</span>`:''}<i class="dot ${a.status}"></i></button>`).join(''):'<p class="empty-list">No session activity in the last 6 hours.</p>';
  const project=state.world?.projects.find(p=>p.path===state.project);
  $('floor-name').textContent=project?.name || 'Boss room · all projects';
  $('boss-focus').setAttribute('aria-pressed',String(!state.project));
  $('boss-focus-toolbar').setAttribute('aria-pressed',String(!state.project));
  $('boss-nav-count').textContent=[...officeScene.floors.values()].reduce((sum,floor)=>sum+floor.agents.length,0);
  $('floor-subtitle').textContent=`${state.agents.length} coworker${state.agents.length===1?'':'s'} · ${hiddenAgents.length?`${hiddenAgents.length} off floor · `:''}${state.connected?'Activity in last 6h':'Connection paused'}`;
  $('empty-state').hidden=!state.project||state.agents.length>0;
  $('connection-label').textContent=state.connected?'Connected to your agents':'Connection paused';
  $('provider-summary').textContent=(state.world?.providers||[]).map(p=>`${p.name}: ${p.count} local sessions`).join(' · ');
  $('offline').hidden=state.connected;
  $('last-sync').textContent=lastGood?`Observed ${relative(lastGood)}`:'Waiting for first update';
  const entries=state.agents.flatMap(a=>a.activityLog.map(e=>({...e,agent:a}))).sort((a,b)=>b.timestamp-a.timestamp).slice(0,4);
  $('activity-feed').innerHTML=entries.length?entries.map(e=>`<div class="activity-row"><span class="activity-badge">${activityIcons[e.kind]||'✦'}</span><div class="activity-text"><strong>${escape(e.agent.name)}</strong> · ${escape(e.label)}<span>${escape(e.agent.title)}</span></div><span class="activity-time">${relative(e.timestamp)}</span></div>`).join(''):'<p class="helper">Activity will appear as your agents work.</p>';
  renderBossReport(report);
  if(state.selected) showDetail(state.selected,false);
  else if(state.room) showRoomDetail(state.room.projectPath,state.room.id,false);
  fit(false);
}

function renderBossReport(report) {
  const root=$('boss-report');
  root.setAttribute('data-connected',String(state.connected));
  $('boss-sync').innerHTML=`<span class="live-dot"></span>${state.connected?'Observed':'Last observed'} ${escape(relative(lastGood))}`;
  $('boss-metrics').innerHTML=[['Projects',report.totals.projects],['Session records',report.totals.workers],['Project sessions',report.totals.sessions],['Subagents',report.totals.subagents]].map(([label,value])=>`<div class="boss-metric"><strong>${value}</strong><span>${label}</span></div>`).join('');
  $('boss-status').innerHTML=Object.entries(statusNames).map(([key,label])=>`<span><i class="dot ${key}"></i>${report.counts[key]} ${escape(label.toLowerCase())}</span>`).join('');
  $('boss-coverage').textContent=`${report.coverage} Missing signals remain unknown. “Latest updates” are recorded activity labels, not a generated report or a worker's private conversation.${state.connected?'':' Connection paused; these are the last observed records.'}`;
  // Leave keyboard focus and interactive rows stable while the user reads them.
  if(typeof root.contains==='function' && root.contains(document.activeElement) && document.activeElement.matches?.('[data-boss-agent], [data-boss-floor]'))return;
  $('boss-updates').innerHTML=report.updates.length?report.updates.map(update=>`<div class="boss-update"><span class="activity-badge" aria-hidden="true">${activityIcons[update.kind]||'✦'}</span><div class="boss-update-copy"><strong>${escape(update.agent.name)}</strong> · ${escape(update.label)}<small>${escape(update.project)} · ${escape(update.agent.title)} · ${relative(update.timestamp)}</small></div><button class="boss-inspect" type="button" data-boss-agent="${escape(update.agent.id)}" aria-label="Inspect ${escape(update.agent.name)} in ${escape(update.project)}">Inspect</button></div>`).join(''):'<p class="boss-empty">No activity events were available in these local records. Their current status remains unknown.</p>';
  $('boss-attention').innerHTML=report.attention.length?report.attention.slice(0,8).map(agent=>`<div class="boss-attention"><i class="dot waiting" aria-hidden="true"></i><div class="boss-attention-copy"><strong>${escape(agent.name)}</strong> · ${escape(agent.activity)}<small>${escape(agent.project)} · ${relative(agent.lastSeen)}</small></div><button class="boss-inspect" type="button" data-boss-agent="${escape(agent.id)}" aria-label="Inspect recorded input request from ${escape(agent.name)}">Inspect</button></div>`).join(''):`<p class="boss-empty">No recorded requests for your input. ${report.counts.delegating} workers are waiting for team reports; ${report.counts.unknown} have no confirmed current signal.</p>`;
  $('boss-project-reports').innerHTML=report.projects.map(project=>`<article class="boss-project-card"><div class="boss-project-heading"><h4>${escape(project.name)}</h4><button class="boss-inspect" type="button" data-boss-floor="${escape(project.path)}" aria-label="Open ${escape(project.name)} project floor">Floor ↗</button></div><p class="boss-numbers">${project.sessions.length} workers · ${project.counts.working} at work · ${project.counts.waiting} need input<br>${project.counts.delegating} team reports · ${project.counts.unknown} unknown</p><p class="boss-record">${project.latest?`${escape(project.latest.agent.name)} · ${escape(project.latest.label)}<small>${relative(project.latest.timestamp)}</small>`:'No activity events available'}</p></article>`).join('');
}

function setProjects(projects) {
  const selected=state.project;
  const counts=new Map();
  for(const worker of recentWorkers(state.world?.sessions||[]))counts.set(worker.projectPath,(counts.get(worker.projectPath)||0)+1);
  $('project').innerHTML='<option value="">Boss room · all projects</option>'+rankProjectsByActivity(projects,state.world?.sessions,Date.now(),floorAttention).map(p=>`<option value="${escape(p.path)}">${p.unreadAt?'! ':''}${escape(p.name)} (${counts.get(p.path)||0})</option>`).join('');
  if(selected&&!projects.some(p=>p.path===selected)) state.project='';
  state.initialFloor=true;
  $('project').value=state.project;
}

function storeFloorAttention(attention){if(JSON.stringify(attention)!==JSON.stringify(floorAttention)){floorAttention=attention;save('ao-floor-attention',JSON.stringify(attention));}}
function markFloorViewed(projectPath){storeFloorAttention(viewFloorAttention(floorAttention,projectPath));}
function renderFloorNavigation(now=Date.now()){
  setProjects(state.world?.projects||[]);
  $('building-floors').innerHTML=rankProjectsByActivity(state.world?.projects,state.world?.sessions,now,floorAttention).map(p=>`<div class="floor-row ${state.project===p.path?'selected':''} ${p.unreadAt?'needs-attention':''}"><button type="button" class="floor-link ${state.project===p.path?'selected':''} ${p.unreadAt?'needs-attention':''}" data-floor="${escape(p.path)}" aria-label="${escape(p.name)}, ${p.active} active workers${p.unreadAt?', finished work to review':''}"><span aria-hidden="true">&#9638;</span><b>${escape(p.name)}</b><small title="Active workers">${p.active}</small></button>${p.unreadAt?`<button type="button" class="floor-attention" data-read-floor="${escape(p.path)}" aria-label="Mark all notifications in ${escape(p.name)} as read" title="Mark all notifications on this floor as read">!</button>`:''}</div>`).join('');
}

async function fetchWorld() {
  if(fetching)return;fetching=true;
  try {
    const response=await fetch('/api/world',{signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw new Error('Unavailable');
    const world=await response.json();
    world.sessions=nameWorkers(world.sessions||[]);
    state.world=world;state.connected=!!world.connected;lastGood=world.observedAt;updateInterface();
  } catch {
    state.connected=false;
    // Retain the scene while making stale observations explicit.
    updateInterface();
  } finally {fetching=false;}
}

function showDetail(id, open=true) {
  const a=state.world?.sessions.find(a=>a.id===id);
  if(!a) {closeDetail();return;}
  if(open){storeFloorAttention(viewSessionAttention(floorAttention,a,state.world.sessions));updateInterface();}
  if(a.projectPath!==state.project){state.project=a.projectPath;$('project').value=state.project;state.floor=0;state.selected=null;updateInterface();fit();}
  const index=state.agents.findIndex(item=>item.id===id);
  if(index>=0&&Math.floor(index/16)!==state.floor){state.floor=Math.floor(index/16);$('office-level').value=state.floor;}
  state.selected=id;state.room=null;
  $('detail').setAttribute('aria-label','Agent details');
  const parent=state.world.sessions.find(p=>p.id===a.parentId);
  const animation=officeScene.getActivity(id);
  const recent=hasRecentActivity(a);
  const hidden=recent&&!officeScene.floors.get(a.projectPath)?.workers.has(id);
  const work=recordedWorkDescription(a);
  const rows=[['Provider',a.provider||'Codex'],['Project',a.project],['Observed activity',a.activity],['Room',animation?.room||(hidden?'Off floor: room limit':recent?'Entering the office':'Not on the floor')],['Animation',animation?.visualPose||animation?.animation||(hidden?'Hidden to keep rooms within their limit':recent?'Arriving':'Hidden after 6 hours without activity')],['Role',a.role],['Model',a.model],['Reported tokens',number(a.tokens)],['Last observed',relative(a.lastSeen)]];
  if(parent)rows.splice(2,0,['Team lead',parent.name]);
  if(a.recordedName&&a.recordedName!==a.name)rows.splice(1,0,['Recorded name',a.recordedName]);
  if(animation?.purpose)rows.splice(4,0,['Room purpose',animation.purpose]);
  $('detail-content').innerHTML=`<div class="detail-portrait">${pixelProfile(a)}</div><span class="eyebrow coral">YOUR LITTLE COWORKER</span><h2>${escape(a.name)}</h2><p class="task-title">${escape(a.provider||'Codex')} &middot; ${escape(a.project)}</p><span class="status-chip"><i class="dot ${a.status}"></i>${sessionStatusName(a)}${state.connected?'':' · last observed'}</span><section class="work-summary" aria-label="Recorded work"><span class="eyebrow">RECORDED WORK</span><p class="work-description">${escape(work.task)}</p><p class="work-evidence">${escape(work.activity)}</p></section><div class="detail-data">${rows.map(([k,v])=>`<div><label>${escape(k)}</label><span>${escape(v)}</span></div>`).join('')}</div><span class="eyebrow">RECENT ACTIVITY</span><div class="timeline">${a.activityLog.map(e=>`<div class="timeline-item">${escape(e.label)}<span class="timeline-detail">${escape(recordedActivityDetail(e))}</span><small>${fullTime(e.timestamp)}</small></div>`).join('')||'<p class="helper">No activity events available.</p>'}</div><p class="detail-note">Session ${escape(a.id.slice(0,8))}<br>Activity is inferred from recorded events. Break activities are visual animations. Recorded status remains above. Existing conversations are controlled in their original app.</p>`;
  $('detail').hidden=false;$('detail-backdrop').hidden=false;
  for(const el of document.querySelectorAll('.person'))el.classList.toggle('selected',el.dataset.agent===id);
  if(open)$('close-detail').focus();
}
function showRoomDetail(projectPath,id,open=true){
  const floor=officeScene.floors.get(projectPath),room=floor?.getRoomInfo(id);if(!room)return;
  state.selected=null;state.room={projectPath,id};
  $('detail').setAttribute('aria-label','Room details');
  $('detail-content').innerHTML=`<span class="eyebrow coral">A PLACE FOR EVERY TASK</span><h2>${escape(room.name)}</h2><p class="task-title">${escape(room.purpose)}</p><div class="detail-data"><div><label>Project</label><span>${escape(floor.company)}</span></div><div><label>Use</label><span>${room.decorative?'Decorative break area':'Destination for recorded activity'}</span></div><div><label>Activity places</label><span>${room.capacity}</span></div><div><label>Here now</label><span>${room.occupants.length}</span></div></div><span class="eyebrow">WORKERS IN THIS ROOM</span>${room.occupants.map(agent=>`<button type="button" class="person" data-room-agent="${escape(agent.id)}">${portrait(agent)}<span class="person-meta"><strong>${escape(agent.name)}</strong><small>${escape(agent.activity)}</small></span><i class="dot ${agent.status}"></i></button>`).join('')||'<p class="helper">No workers here right now. This room stays available when its activity is needed.</p>'}<p class="detail-note">Room placement is a visual representation of recorded activity. Meals, games and quiet breaks are decorative animations. Inspect a worker for its real recorded status. Full rooms send active workers back to their own work tables.</p>`;
  $('detail').hidden=false;$('detail-backdrop').hidden=false;if(open)$('close-detail').focus();
}
function closeDetail(){state.selected=null;state.room=null;$('detail').hidden=true;$('detail-backdrop').hidden=true;document.querySelectorAll('.person').forEach(el=>el.classList.remove('selected'));}

function fit(reset=true){officeScene.zoom=zoom;officeScene.pan=pan;officeScene.fit(width,height,reset);pan=officeScene.pan;scale=officeScene.scale;}
function resize(){clearRoomHover();const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);fit();}
function render(time){frameTime=time;officeScene.theme=state.theme;officeScene.reduced=reduced;officeScene.pan=pan;hits=officeScene.render(time,state.selected,hover);updateRoomHover();requestAnimationFrame(render);}
function clearRoomHover(){roomHoverPointer=null;roomHoverKey='';$('room-hover').hidden=true;}
function updateRoomHover(){
  if(!roomHoverPointer||drag){$('room-hover').hidden=true;return;}
  const {x,y}=roomHoverPointer;if(x<0||y<0||x>width||y>height){clearRoomHover();return;}
  const hit=officeScene.roomAt(x,y,{allFloors:true}),room=hit&&officeScene.floors.get(hit.projectPath)?.rooms.find(room=>room.id===hit.id),boss=officeScene.bossHit;
  let name=room?.label,purpose=room?.purpose,key=room?hit.projectPath+':'+hit.id:'';
  if(!room&&boss&&x>=boss.left&&x<=boss.right&&y>=boss.top&&y<=boss.bottom){name='BOSS ROOM';purpose='Building reports & decorative routine';key='boss';}
  if(!key){roomHoverKey='';$('room-hover').hidden=true;return;}
  if(roomHoverKey!==key){$('room-hover-name').textContent=name;$('room-hover-purpose').textContent=purpose;roomHoverKey=key;}
  $('room-hover').hidden=false;
}
function hitAt(x,y){return hits.slice().reverse().find(h=>Math.hypot(x-h.x,y-h.y)<Math.max(18,h.r));}
canvas.addEventListener('pointerdown',e=>{clearRoomHover();drag={x:e.clientX,y:e.clientY,pan:{...pan},moved:false};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
canvas.addEventListener('pointermove',e=>{const rect=canvas.getBoundingClientRect();if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved)pan={x:drag.pan.x+dx,y:drag.pan.y+dy};}else{const x=e.clientX-rect.left,y=e.clientY-rect.top,hit=hitAt(x,y),boss=officeScene.bossHit;roomHoverPointer={x,y};updateRoomHover();hover=hit?.id||null;canvas.style.cursor=hover||officeScene.roomAt(x,y)||(boss&&x>=boss.left&&x<=boss.right&&y>=boss.top&&y<=boss.bottom)?'pointer':'grab';}});
canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const rect=canvas.getBoundingClientRect(),hit=hitAt(e.clientX-rect.left,e.clientY-rect.top);if(hit)showDetail(hit.id);else{const x=e.clientX-rect.left,y=e.clientY-rect.top,boss=officeScene.bossHit;if(boss&&x>=boss.left&&x<=boss.right&&y>=boss.top&&y<=boss.bottom){openBossReport();}else{const room=officeScene.roomAt(x,y);if(room)showRoomDetail(room.projectPath,room.id);else{const floor=officeScene.floorHits?.find(f=>x>=f.left&&x<=f.right&&y>=f.top&&y<=f.bottom);if(floor)enterFloor(floor.path);}}}}drag=null;canvas.classList.remove('dragging');const rect=canvas.getBoundingClientRect();roomHoverPointer={x:e.clientX-rect.left,y:e.clientY-rect.top};updateRoomHover();});
canvas.addEventListener('pointercancel',()=>{drag=null;clearRoomHover();canvas.classList.remove('dragging');});
canvas.addEventListener('pointerleave',()=>{hover=null;clearRoomHover();});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.5,Math.min(3,zoom*(e.deltaY>0?.92:1.08)));fit(false);},{passive:false});
function setTheme(theme){state.theme=['cozy','fresh','night'].includes(theme)?theme:'cozy';save('ao-theme',state.theme);document.body.classList.toggle('night-mode',state.theme==='night');document.body.classList.toggle('fresh-mode',state.theme==='fresh');document.querySelectorAll('.theme').forEach(button=>{const on=button.dataset.theme===state.theme;button.classList.toggle('active',on);button.setAttribute('aria-pressed',on);});}
$('detail-content').addEventListener('click',e=>{const button=e.target.closest('[data-room-agent]');if(button)showDetail(button.dataset.roomAgent);});
$('team').addEventListener('click',e=>{const button=e.target.closest('[data-agent]');if(button)showDetail(button.dataset.agent);});
function enterFloor(value){state.project=value;state.floor=0;save('ao-project',value);$('project').value=value;zoom=1;closeDetail();updateInterface();fit();}
$('project').addEventListener('change',e=>enterFloor(e.target.value));
$('building-floors').addEventListener('click',e=>{const read=e.target.closest('[data-read-floor]');if(read){e.stopPropagation();markFloorViewed(read.dataset.readFloor);updateInterface();return;}const button=e.target.closest('[data-floor]');if(button)enterFloor(button.dataset.floor);});
function setReportsOpen(open){state.reportsOpen=open;save('ao-reports',open?'open':'hidden');$('boss-report').hidden=!open;$('office-body').classList.toggle('reports-hidden',!open);$('toggle-reports').setAttribute('aria-expanded',String(open));$('toggle-reports').textContent=open?'Hide reports':'Show reports';}
function openBossReport(){setReportsOpen(true);$('boss-sidebar-close').focus();}
function hideBossReport(){setReportsOpen(false);$('toggle-reports').focus();}
$('toggle-reports').addEventListener('click',()=>state.reportsOpen?hideBossReport():openBossReport());
$('boss-sidebar-close').addEventListener('click',hideBossReport);
$('boss-focus').addEventListener('click',()=>{enterFloor('');openBossReport();});
$('boss-focus-toolbar').addEventListener('click',()=>{enterFloor('');openBossReport();});
$('boss-report').addEventListener('click',e=>{const agent=e.target.closest('[data-boss-agent]'),floor=e.target.closest('[data-boss-floor]');if(agent)showDetail(agent.dataset.bossAgent);else if(floor){enterFloor(floor.dataset.bossFloor);canvas.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});}});
$('office-level').addEventListener('change',e=>{state.floor=Number(e.target.value);updateInterface();});
$('show-history').addEventListener('change',e=>{state.history=e.target.checked;updateInterface();fit();});
document.querySelectorAll('.theme').forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.theme)));
$('zoom-in').addEventListener('click',()=>{zoom=Math.min(3,zoom*1.15);fit(false);});$('zoom-out').addEventListener('click',()=>{zoom=Math.max(.5,zoom/1.15);fit(false);});$('fit').addEventListener('click',()=>{zoom=1;fit();});
$('refresh').addEventListener('click',fetchWorld);$('close-detail').addEventListener('click',closeDetail);$('detail-backdrop').addEventListener('click',closeDetail);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('configure-dialog').open){if(!$('detail').hidden)closeDetail();else if(!$('prompt-dialog').open&&!$('about-dialog').open&&state.reportsOpen)hideBossReport();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateInterface();});
$('about').addEventListener('click',()=>$('about-dialog').showModal());$('close-about').addEventListener('click',()=>$('about-dialog').close());
new ResizeObserver(resize).observe(canvas);
installOfficeTasks({getState:()=>state,onUpdate:fetchWorld});
installOfficeSettings({token:()=>state.world?.csrfToken,onSaved:async()=>{await fetchWorld();closeDetail();fit();}});
setTheme(state.theme);setReportsOpen(state.reportsOpen);resize();fetchWorld();setInterval(fetchWorld,2000);requestAnimationFrame(render);
