import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { repositoryWorkspace } from './project-grouping.mjs';

export const defaultConfig = () => ({ officeName: 'Agent Office', logo: null, projects: [] });
export const configFile = process.env.AGENT_OFFICE_CONFIG || path.join(import.meta.dirname, '.agent-office', 'config.json');
export const MAX_LOGO_BYTES = 512 * 1024;

function name(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`${label} must be 1–80 characters without control characters.`);
  }
  return value.trim();
}

export function decodeLogo(logo) {
  if (logo === null || logo === '') return null;
  if (typeof logo !== 'string' || logo.length > MAX_LOGO_BYTES * 1.4) throw new Error('Logo must be a PNG, JPEG, or WebP image under 512 KB.');
  const match = logo.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error('Logo must be a PNG, JPEG, or WebP image under 512 KB.');
  const data = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'png' ? data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : match[1] === 'jpeg' ? data[0] === 255 && data[1] === 216 && data[2] === 255
    : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || data.length > MAX_LOGO_BYTES || data.toString('base64') !== match[2]) throw new Error('Logo is invalid or larger than 512 KB.');
  return { data, mime: `image/${match[1]}` };
}

const key = value => process.platform === 'win32' ? value.toLowerCase() : value;
const nested = (child, parent) => key(child).startsWith(key(parent.endsWith(path.sep) ? parent : parent + path.sep));

export async function validateConfig(input, { checkFolders = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid office settings.');
  const officeName = name(input.officeName, 'Office name');
  decodeLogo(input.logo);
  if (!Array.isArray(input.projects) || input.projects.length > 50) throw new Error('Add up to 50 project floors.');
  const projects = [];
  for (const [index, project] of input.projects.entries()) {
    const label = `Floor ${index + 1}`;
    if (!project || typeof project.path !== 'string' || project.path.length > 400 || /[\x00-\x1f\x7f]/.test(project.path) || !path.isAbsolute(project.path.trim())) {
      throw new Error(`${label}: enter an absolute folder path.`);
    }
    let folder = path.normalize(project.path.trim());
    if (checkFolders) {
      try {
        if (!(await fs.stat(folder)).isDirectory()) throw new Error();
        folder = repositoryWorkspace(await fs.realpath(folder));
      } catch { throw new Error(`${label}: folder does not exist or is not readable.`); }
    }
    if (projects.some(existing => key(existing.path) === key(folder) || nested(folder, existing.path) || nested(existing.path, folder))) {
      throw new Error(`${label}: this folder already belongs to another floor. Nested folders and Git worktrees share its floor.`);
    }
    if (project.name !== undefined && typeof project.name !== 'string') throw new Error(`${label} name must be text.`);
    projects.push({ name: name(project.name?.trim() || path.basename(folder) || folder, `${label} name`), path: folder });
  }
  return { officeName, logo: input.logo || null, projects };
}

export async function loadConfig(file = configFile) {
  try { return await validateConfig(JSON.parse(await fs.readFile(file, 'utf8')), { checkFolders: false }); }
  catch (error) {
    if (error.code === 'ENOENT') return defaultConfig();
    throw new Error('Cannot read office settings. Check .agent-office/config.json; it has not been changed.');
  }
}

export async function saveConfig(input, file = configFile) {
  const config = await validateConfig(input);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
  return config;
}

export function publicOffice(config) {
  const version = config.logo ? createHash('sha256').update(config.logo).digest('hex').slice(0, 16) : '';
  return { name: config.officeName, logoUrl: version ? `/api/office-logo?v=${version}` : null };
}

export const configRevision = config => createHash('sha256').update(JSON.stringify(config)).digest('hex');
