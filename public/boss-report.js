const STATES = new Set(['working', 'waiting', 'delegating', 'idle', 'unknown']);
const timestamp = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;

// The reporter aggregates the observer's public metadata. It never infers work
// from a moving character, turns quiet records into blockers, or reads chat text.
export function buildBossReport(world, now = Date.now()) {
  const unique = new Map();
  for (const session of world?.sessions || []) {
    if (session?.id && !unique.has(session.id)) unique.set(session.id, session);
  }
  const sessions = [...unique.values()];
  const projects = new Map((world?.projects || []).map(project => [project.path, {
    path: project.path, name: project.name, sessions: [], counts: {working:0, waiting:0, delegating:0, idle:0, unknown:0}, latest: null,
  }]));
  const counts = {working:0, waiting:0, delegating:0, idle:0, unknown:0};
  const updates = [], attention = [];
  let roots = 0, subagents = 0;
  for (const session of sessions) {
    const status = STATES.has(session.status) ? session.status : 'unknown';
    counts[status]++;
    if (session.parentId) subagents++; else roots++;
    let project = projects.get(session.projectPath);
    if (!project) {
      project = {path:session.projectPath, name:session.project || 'Unknown project', sessions:[], counts:{working:0, waiting:0, delegating:0, idle:0, unknown:0}, latest:null};
      projects.set(session.projectPath, project);
    }
    project.sessions.push(session); project.counts[status]++;
    const events = (session.activityLog || []).filter(event => event?.label && timestamp(event.timestamp));
    const latest = events.reduce((last, event) => !last || timestamp(event.timestamp) > timestamp(last.timestamp) ? event : last, null);
    if (latest) {
      const update = {agent:session, project:project.name, label:latest.label, kind:latest.kind, timestamp:timestamp(latest.timestamp)};
      updates.push(update);
      if (!project.latest || update.timestamp > project.latest.timestamp) project.latest = update;
    }
    if (status === 'waiting') attention.push(session);
  }
  return {
    observedAt: timestamp(world?.observedAt), connected: !!world?.connected,
    totals: {projects:projects.size, workers:sessions.length, sessions:roots, subagents}, counts,
    projects: [...projects.values()].sort((a,b) => b.counts.waiting-a.counts.waiting || b.counts.working-a.counts.working || a.name.localeCompare(b.name)),
    attention: attention.sort((a,b) => timestamp(b.lastSeen)-timestamp(a.lastSeen)),
    updates: updates.sort((a,b) => b.timestamp-a.timestamp).slice(0,6),
    coverage: world?.coverage || 'Supported local session records only.',
    age: timestamp(world?.observedAt) ? Math.max(0, now-timestamp(world.observedAt)) : null,
  };
}
