import { WORKER_RECENCY_MS, floorUnreadCompletion } from './session-visibility.js';

const validTime = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;

// Keep only local timestamps and recorded parent IDs, never chat content.
export function observeFloorAttention(previous = {}, projects = [], sessions = [], now = Date.now()) {
  const next = Object.fromEntries(projects.map(project => {
    const saved = previous?.[project.path];
    const completions = Object.fromEntries(Object.entries(saved?.completions || {}).map(([id, time]) => [id, validTime(time)]).filter(([, time]) => time));
    const readCompletions = Object.fromEntries(Object.entries(saved?.readCompletions || {}).map(([id, time]) => [id, validTime(time)]).filter(([, time]) => time));
    const completedAt = validTime(saved?.completedAt);
    const legacyCompletedAt = validTime(saved?.legacyCompletedAt ?? (Object.values(completions).includes(completedAt) ? 0 : completedAt));
    const parentLinks = Object.fromEntries(Object.entries(saved?.parentLinks || {}).filter(([id, parentId]) => id && typeof parentId === 'string' && parentId));
    return [project.path, { viewedAt: validTime(saved?.viewedAt), completedAt, legacyCompletedAt, completions, readCompletions, parentLinks }];
  }));
  for (const session of sessions) {
    const floor = next[session.projectPath];
    if (!floor) continue;
    if (session.id && typeof session.parentId === 'string' && session.parentId) floor.parentLinks[session.id] = session.parentId;
    for (const event of session.activityLog || []) {
      const time = validTime(event.timestamp);
      if (event.kind === 'done' && event.label === 'Turn finished' && time >= now - WORKER_RECENCY_MS && time <= now) {
        floor.completedAt = Math.max(floor.completedAt, time);
        if (session.id) floor.completions[session.id] = Math.max(validTime(floor.completions[session.id]), time);
      }
    }
  }
  for (const floor of Object.values(next)) {
    if (Object.values(floor.completions).includes(floor.legacyCompletedAt)) floor.legacyCompletedAt = 0;
  }
  return next;
}

// Explicit bulk acknowledgement; merely navigating to a floor does not call this.
export function viewFloorAttention(attention, projectPath, now = Date.now()) {
  const floor = attention?.[projectPath];
  if (!floor) return attention;
  return { ...attention, [projectPath]: { ...floor, viewedAt: Math.max(floor.viewedAt, floor.completedAt, now) } };
}

export function unreadCompletion(attention, projectPath) {
  return floorUnreadCompletion(attention?.[projectPath]);
}

// A worker badge must refer to that worker's observed completion, never its status alone.
export function sessionUnreadCompletion(attention, session) {
  const floor = attention?.[session?.projectPath];
  const time = validTime(floor?.completions?.[session?.id]);
  return time > Math.max(validTime(floor?.viewedAt), validTime(floor?.readCompletions?.[session?.id])) ? time : 0;
}

export function viewSessionAttention(attention, session, sessions = []) {
  if (!session?.id) return attention;
  const parentLinks = new Map();
  for (const floor of Object.values(attention || {})) {
    for (const [id, parentId] of Object.entries(floor?.parentLinks || {})) parentLinks.set(id, parentId);
  }
  for (const worker of sessions) {
    if (worker.id && typeof worker.parentId === 'string' && worker.parentId) parentLinks.set(worker.id, worker.parentId);
  }
  const children = new Map();
  for (const [id, parentId] of parentLinks) {
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(id);
  }
  const viewed = new Set([session.id]), queue = [session.id];
  for (let i = 0; i < queue.length; i++) {
    for (const child of children.get(queue[i]) || []) {
      if (!viewed.has(child)) { viewed.add(child); queue.push(child); }
    }
  }
  let next = attention;
  for (const [path, floor] of Object.entries(attention || {})) {
    let readCompletions = floor.readCompletions;
    for (const [id, value] of Object.entries(floor.completions || {})) {
      const time = validTime(value);
      if (viewed.has(id) && time > validTime(readCompletions?.[id])) readCompletions = { ...readCompletions, [id]: time };
    }
    if (readCompletions !== floor.readCompletions) next = { ...next, [path]: { ...floor, readCompletions } };
  }
  return next;
}
