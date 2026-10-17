// Runs before `npm start` so an old Node.js fails with a clear message
// instead of a confusing "node:sqlite" import error.
const required = 24;
const major = Number(process.versions.node.split('.')[0]);
if (major < required) {
  console.error(`\nAgent Office needs Node.js ${required} or later. This computer has Node.js ${process.versions.node}.`);
  console.error('Install the current LTS from https://nodejs.org/ or, on Windows, run:');
  console.error('  winget install OpenJS.NodeJS.LTS');
  console.error('Then open a new terminal and run npm start again.\n');
  process.exit(1);
}
