// Documentation artwork uses the real renderer and sprites with synthetic data.
// Never imports the observer or reads personal settings or session records.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.devicePixelRatio = 1;
globalThis.Image = class {};
const { BuildingScene } = await import('../public/building-scene.js');
const width = 1800, height = 900;
const canvas = createCanvas(width, height);
const scene = new BuildingScene(canvas);
const project = { name: 'The Launchpad', path: '/demo/launchpad' };
scene.projects = [project];
scene.activeProject = project.path;
scene.officeName = 'Badass Agent Office';
const states = [
  ['working', 'working'], ['working', 'research'], ['working', 'reviewing'],
  ['working', 'planning'], ['waiting', 'waiting'], ['delegating', 'team-wait'],
  ['idle', 'done'], ['idle', 'done'], ['idle', 'done'], ['idle', 'done'],
  ['working', 'working'], ['working', 'working'], ['working', 'planning'],
  ['working', 'reading'], ['idle', 'done'], ['working', 'working'],
];
scene.setAgents(states.map(([status, kind], i) => ({
  id: `readme-demo-${i}`, name: `Demo worker ${i + 1}`, project: project.name,
  projectPath: project.path, status, kind, colorIndex: i % 8,
  title: 'Build the next big thing', activityLog: [],
})));
const sprites = [
  ['sprite', 'spriteReady', 'office-workers-v1.png'],
  ['walkSprite', 'walkReady', 'office-workers-walk-v1.png'],
  ['seatedSprite', 'seatedReady', 'office-workers-seated-v1.png'],
  ['sideSprite', 'sideReady', 'office-workers-side-walk-v3.png'],
  ['directionSeated', 'directionSeatedReady', 'office-workers-seated-directions-v2.png'],
  ['activitySprite', 'activityReady', 'office-workers-thinking-writing-v1.png'],
  ['leisureSprite', 'leisureReady', 'office-workers-leisure-v1.png'],
];
for (const [property, ready, filename] of sprites) {
  const sprite = await loadImage(fileURLToPath(new URL(`../public/assets/${filename}`, import.meta.url)));
  Object.defineProperty(sprite, 'naturalWidth', { get: () => sprite.width });
  Object.defineProperty(sprite, 'naturalHeight', { get: () => sprite.height });
  for (const floor of [scene.bossPainter, ...scene.floors.values()]) {
    floor[property] = sprite;
    floor[ready] = true;
  }
}
scene.fit(width, height, true);
for (let frame = 0; frame < 2400; frame++) {
  for (const floor of scene.floors.values()) floor.update(frame * 16.667);
}
scene.scale = scene.targetScale;
scene.offset = { ...scene.targetOffset };
scene.render(40000);
const ctx = canvas.getContext('2d');
ctx.globalCompositeOperation = 'destination-over';
ctx.fillStyle = '#e9eee8';
ctx.fillRect(0, 0, width, height);
const destination = new URL('../docs/assets/office-preview.png', import.meta.url);
await fs.mkdir(new URL('../docs/assets/', import.meta.url), { recursive: true });
await fs.writeFile(destination, canvas.toBuffer('image/png'));
console.log('Rendered docs/assets/office-preview.png using synthetic demo workers.');
