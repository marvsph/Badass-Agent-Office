export const WORKER_RECENCY_MS = 6 * 60 * 60 * 1000;

const activityTimestamp = value => {
  const time = Number(value);
  return Number.isFinite(time) && time > 0 ? time : 0;
};

export function hasRecentActivity(session, now = Date.now()) {
  const latest = Math.max(activityTimestamp(session?.lastSeen), activityTimestamp(session?.updatedAt));
  return latest > 0 && latest >= now - WORKER_RECENCY_MS;
}

export function recentWorkers(sessions = [], now = Date.now()) {
  return sessions.filter(session => hasRecentActivity(session, now));
}

export function floorUnreadCompletion(floor) {
  if (!floor) return 0;
  const viewedAt = activityTimestamp(floor.viewedAt);
  const completions = Object.entries(floor.completions || {});
  const latest = activityTimestamp(floor.completedAt);
  const legacy = activityTimestamp(floor.legacyCompletedAt ?? (completions.some(([,time]) => activityTimestamp(time) === latest) ? 0 : latest));
  let unread = legacy > viewedAt ? legacy : 0;
  for (const [id, value] of completions) {
    const time = activityTimestamp(value);
    if (time > Math.max(viewedAt, activityTimestamp(floor.readCompletions?.[id]))) unread = Math.max(unread, time);
  }
  return unread;
}

export function rankProjectsByActivity(projects = [], sessions = [], now = Date.now(), attention = {}) {
  const active = new Map();
  for (const worker of recentWorkers(sessions, now)) {
    if (['working', 'waiting', 'delegating'].includes(worker.status)) {
      active.set(worker.projectPath, (active.get(worker.projectPath) || 0) + 1);
    }
  }
  return projects.map(project => {
    const floor = attention?.[project.path];
    const unreadAt = floorUnreadCompletion(floor);
    return { ...project, active: active.get(project.path) || 0, unreadAt };
  }).sort((a, b) => Number(!!b.unreadAt) - Number(!!a.unreadAt) || b.unreadAt - a.unreadAt || b.active - a.active || a.name.localeCompare(b.name));
}
