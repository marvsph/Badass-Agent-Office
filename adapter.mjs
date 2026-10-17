import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { providerSessions } from './providers.mjs';
import { selectOfficeProjects } from './office-projects.mjs';

export const codexHome = process.env.AGENT_OFFICE_CODEX_HOME || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const logCache = new Map();
const MAX_TAIL = 2 * 1024 * 1024;
const clean = (value, max = 150) => String(value || '').replace(/[\x00-\x1f]/g, ' ').slice(0, max);
export const normalPath = value => path.normalize(String(value || '').replace(/^\\\\\?\\/, ''));

export function describeTool(name = '', input = '') {
  const names = `${name} ${String(input).match(/tools\.[a-zA-Z_][\w]*/g)?.join(' ') || ''}`.toLowerCase();
  if (/request_user_input_async/.test(names)) return { label: 'Asking for a preference', kind: 'collaborating', waiting: false };
  if (/request_user_input|askuser/.test(names)) return { label: 'Waiting for your input', kind: 'waiting', waiting: true };
  if (/wait_agent/.test(names)) return { label: 'Waiting for subagent reports', kind: 'team-wait', teamWait: true };
  if (/update_plan|enterplanmode/.test(names)) return { label: 'Planning', kind: 'planning' };
  if (/apply_patch|patch|edit_file/.test(names)) return { label: 'Editing files', kind: 'coding' };
  if (/web__|web_run|web_search|search_query|fetch/.test(names)) return { label: 'Researching', kind: 'research' };
  if (/spawn_agent|send_message|followup_task|wait_agent|collaboration/.test(names)) return { label: 'Working with the team', kind: 'collaborating' };
  if (/exec_command|write_stdin|powershell|bash/.test(names)) return { label: 'Running a command', kind: 'terminal' };
  if (/cua|browser|screenshot/.test(names)) return { label: 'Checking the preview', kind: 'reviewing' };
  if (/read|search|rg|list/.test(names)) return { label: 'Reading project files', kind: 'reading' };
  return { label: 'Using a tool', kind: 'working' };
}

// Only public activity metadata is retained. Tool arguments, results, user text,
// reasoning content, credentials and rate-limit/account records never enter the API.
export function parseEvents(events, now = Date.now()) {
  let state = 'unknown', activity = 'No recent activity', kind = 'quiet';
  let lastSeen = 0, totalTokens = null, teamWaitCall = null;
  const activityLog = [];
  const add = (label, eventKind, timestamp, detail='') => {
    activity = label; kind = eventKind;
    if (activityLog.at(-1)?.label !== label || activityLog.at(-1)?.detail !== (detail||undefined) || timestamp - activityLog.at(-1).timestamp > 15000) {
      activityLog.push({ label, kind: eventKind, timestamp,...(detail?{detail}:{}) });
    }
  };
  for (const event of events) {
    const p = event.payload || {};
    const ts = Date.parse(event.timestamp) || 0;
    if (ts) lastSeen = Math.max(lastSeen, ts);
    if (event.type === 'token_usage_record') {
      const usage = p.thread_token_usage;
      const reported = usage?.total_tokens ?? usage?.totalTokens;
      if (Number.isFinite(reported)) totalTokens = reported;
    }
    if (event.type === 'event_msg') {
      switch (p.type) {
        case 'task_started': state = 'working'; add('Starting a turn', 'working', ts); break;
        case 'task_complete': state = 'idle'; add('Turn finished', 'done', ts); break;
        case 'turn_aborted': state = 'idle'; add('Turn interrupted', 'done', ts); break;
        case 'web_search_end': state = 'working'; add('Researching', 'research', ts); break;
        case 'patch_apply_end': {state = 'working';const count=p.changes&&typeof p.changes==='object'?Object.keys(p.changes).length:0;add(p.success === false ? 'An edit needs checking' : 'Editing files', 'coding', ts,p.success===false?'The file edit did not finish successfully.':count?`Updated ${count} ${count===1?'file':'files'}.`:'The worker applied a file edit.');break;}
        case 'exec_command_begin': state = 'working'; add('Running a command', 'terminal', ts); break;
        case 'exec_command_end': {const code=Number.isInteger(p.exit_code)?p.exit_code:null;state='working';add('Command finished','terminal',ts,code===0?'The command completed successfully.':code!==null?`The command finished with exit code ${code}.`:'The command finished.');break;}
        case 'user_message': state = 'working'; add('New task received', 'working', ts); break;
        case 'agent_reasoning': state = 'working'; add('Planning', 'planning', ts); break;
        case 'agent_message': break;
        case 'token_count': {
          const tokens = p.info?.total_token_usage?.total_tokens;
          if (Number.isFinite(tokens)) totalTokens = tokens;
          break;
        }
      }
    }
    if (event.type === 'response_item') {
      if (p.type === 'function_call' || p.type === 'custom_tool_call') {
        const description = describeTool(p.name, p.input || p.arguments);
        state = description.waiting ? 'waiting' : description.teamWait ? 'delegating' : 'working';
        teamWaitCall = description.teamWait ? p.call_id : null;
        add(description.label, description.kind, ts);
      } else if (['function_call_output','custom_tool_call_output'].includes(p.type) && teamWaitCall && p.call_id === teamWaitCall) {
        state = 'working'; teamWaitCall = null; add('Reviewing team updates', 'collaborating', ts);
      } else if (p.type === 'reasoning') {
        state = 'working'; // Observe its timestamp only; never inspect its content.
        add('Planning', 'planning', ts);
      } else if (p.type === 'message' && p.role === 'assistant' && p.channel === 'final') {
        state = 'idle'; add('Turn finished', 'done', ts);
      } else if (p.type === 'message' && p.role === 'assistant' && p.channel === 'commentary') {
        state = 'working';
      }
    }
  }
  // A quiet log does not prove that an agent is idle or waiting.
  if (['working','waiting','delegating'].includes(state) && now - lastSeen > 180000) {
    state = 'unknown'; activity = 'No recent signal'; kind = 'quiet';
  }
  return { status: state, activity, kind, lastSeen, totalTokens, activityLog: activityLog.slice(-30).reverse() };
}

function readLog(file) {
  if (!file) return null;
  const resolved = path.resolve(normalPath(file));
  const permitted = ['sessions', 'archived_sessions'].some(folder => {
    const root = path.resolve(codexHome, folder) + path.sep;
    return resolved.toLowerCase().startsWith(root.toLowerCase());
  });
  if (!permitted) return null;
  try {
    const stat = fs.statSync(resolved);
    const cached = logCache.get(resolved);
    if (cached?.size === stat.size && cached?.mtime === stat.mtimeMs) {
      const value = cached.value;
      if (['working','waiting','delegating'].includes(value.status) && Date.now() - value.lastSeen > 180000) {
        return { ...value, status: 'unknown', activity: 'No recent signal', kind: 'quiet' };
      }
      return value;
    } else {
      const size = Math.min(stat.size, MAX_TAIL);
      const buffer = Buffer.alloc(size);
      const fd = fs.openSync(resolved, 'r');
      try { fs.readSync(fd, buffer, 0, size, stat.size - size); }
      finally { fs.closeSync(fd); }
      let lines = buffer.toString('utf8').split('\n');
      if (stat.size > size) lines.shift();
      const events = [];
      for (const line of lines) {
        try { events.push(JSON.parse(line)); } catch { /* partial lines are retried on the next refresh */ }
      }
      const value = parseEvents(events);
      logCache.set(resolved, { size: stat.size, mtime: stat.mtimeMs, value });
      if (logCache.size > 200) logCache.delete(logCache.keys().next().value);
      return value;
    }
  } catch { return null; }
}

let metadataCache = null, metadataTime = 0;
function metadata() {
  if (metadataCache && Date.now() - metadataTime < 5000) return metadataCache;
  const files = fs.readdirSync(codexHome).filter(name => /^state_\d+\.sqlite$/.test(name))
    .sort((a,b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]));
  if (!files.length) throw new Error('Codex session index was not found.');
  const db = new DatabaseSync(path.join(codexHome, files[0]), { readOnly: true, timeout: 1000 });
  try {
    const cols = new Set(db.prepare('PRAGMA table_info(threads)').all().map(c => c.name));
    const optional = ['agent_nickname','agent_role','agent_path','model','tokens_used','source'].filter(c => cols.has(c));
    const rows = db.prepare(`SELECT id,rollout_path,cwd,title,updated_at${optional.length ? ','+optional.join(',') : ''} FROM threads WHERE archived=0 ORDER BY updated_at DESC LIMIT 120`).all();
    let edges = [];
    try { edges = db.prepare('SELECT parent_thread_id,child_thread_id FROM thread_spawn_edges').all(); } catch { /* older indexes may not contain edges */ }
    const parentEdges=new Map(edges.map(edge=>[edge.child_thread_id,edge.parent_thread_id])),known=new Set(rows.map(row=>row.id)),ancestors=[];
    let pending=rows.map(row=>{try{return parentEdges.get(row.id)||JSON.parse(row.source)?.subagent?.thread_spawn?.parent_thread_id;}catch{return parentEdges.get(row.id);}}).filter(Boolean);
    for(let depth=0;pending.length&&depth<12;depth++){
      const ids=[...new Set(pending)].filter(id=>!known.has(id));if(!ids.length)break;ids.forEach(id=>known.add(id));
      const parents=db.prepare(`SELECT id,cwd FROM threads WHERE id IN (${ids.map(()=>'?').join(',')})`).all(...ids);
      pending=[];for(const record of parents){const parentId=parentEdges.get(record.id)||null;ancestors.push({...record,parentId});if(parentId)pending.push(parentId);}
    }
    metadataCache = { rows, edges, ancestors };
    metadataTime = Date.now();
    return metadataCache;
  } finally { db.close(); }
}

export function snapshot({ projects } = {}) {
  try {
    let rows=[],edges=[],ancestors=[],codexConnected=true;
    try { ({rows,edges,ancestors}=metadata()); } catch { codexConnected=false; }
    const parents = new Map(edges.map(edge => [edge.child_thread_id, edge.parent_thread_id]));
    let sessions = rows.map((row, index) => {
      let source;
      try { source = JSON.parse(row.source); } catch { source = null; }
      const parentId = parents.get(row.id) || source?.subagent?.thread_spawn?.parent_thread_id || null;
      const observed = readLog(row.rollout_path);
      return {
        id: row.id, provider: 'Codex', name: clean(row.agent_nickname || row.agent_path?.split('/').filter(Boolean).at(-1) || (parentId ? 'Subagent' : 'Codex')),
        title: clean(row.title || 'Untitled session', 240), project: clean(path.basename(normalPath(row.cwd) || 'Unknown project')),
        projectPath: clean(normalPath(row.cwd), 400), parentId, role: clean(row.agent_role || (parentId ? 'Subagent' : 'Project session')),
        model: clean(row.model || 'Not reported'), updatedAt: row.updated_at * 1000,
        ...(observed || { status: 'unknown', activity: 'Session log unavailable', kind: 'quiet', lastSeen: row.updated_at * 1000, totalTokens: null, activityLog: [] }),
        tokens: observed?.totalTokens ?? (Number.isFinite(row.tokens_used) ? row.tokens_used : null),
        colorIndex: [...row.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 8,
      };
    });
    const others = providerSessions(describeTool);
    for (const s of others.sessions) {
      s.projectPath = normalPath(s.projectPath);
      s.project = path.basename(s.projectPath);
      sessions.push(s);
    }
    const office=selectOfficeProjects(sessions,{projects,ancestors:[...ancestors,...(others.ancestors||[])]});
    const connected=codexConnected||others.providers.some(p=>p.connected);
    return { connected, observedAt: Date.now(), ...office, providers: [{ name:'Codex', connected:codexConnected, count:rows.length }, ...others.providers], coverage: 'Local Codex, Claude Code, and Copilot CLI session records. Activity is inferred from recorded events; unsupported windows are not assumed active.', error: connected?null:'No supported local session records found.' };
  } catch {
    return { connected: false, observedAt: Date.now(), ...selectOfficeProjects([], {projects}), error: 'Cannot read local session records. Start a supported agent session, then refresh the office.', coverage: 'Local session records only.' };
  }
}
