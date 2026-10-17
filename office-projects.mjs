import { assignProjectOffices } from './project-grouping.mjs';

// The office roster is explicit: session discovery must never add extra floors.
// Fresh installations start empty; personal paths live in ignored local settings.
export const officeProjects = [];

export function selectOfficeProjects(records, { projects = officeProjects, ancestors = [], resolveWorkspace } = {}) {
  const roster = new Map(projects.map(project => [project.path.toLowerCase(), { ...project, count: 0, active: 0 }]));
  const sessions = assignProjectOffices(records, { ancestors, resolveWorkspace, projectRoots: projects.map(project => project.path) })
    .filter(session => roster.has(session.projectPath.toLowerCase()))
    .map(session => {
      const project = roster.get(session.projectPath.toLowerCase());
      project.count++;
      if (['working', 'delegating', 'waiting'].includes(session.status)) project.active++;
      return { ...session, projectPath: project.path, project: project.name };
    });
  return { sessions, projects: [...roster.values()] };
}
