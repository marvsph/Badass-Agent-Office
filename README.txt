AGENT OFFICE

OPEN
Extract the downloaded ZIP, then double-click Open Agent Office.cmd in this folder.
The Windows launcher opens the office without typing terminal commands.
Visit http://127.0.0.1:4317. Refresh an existing browser tab after source updates.
Node.js 24 or later is required. If Node.js is not installed, run this in
PowerShell: winget install OpenJS.NodeJS.LTS  (then open a new terminal).
The runtime uses no third-party dependencies; npm ci is only for tests.

BUILDING
The office is at the top of the dashboard. All project floors live on one map.
Drag to explore; choose a project in the sidebar to move the camera to its floor.
Click Configure to set your office name, upload a PNG/JPEG/WebP logo under 512 KB,
and add, edit, or remove floors with absolute local project folder paths.
Optional floor names default to their folder names. Duplicate and overlapping
folders are rejected; Git worktrees share their main repository floor.
Your settings and logo are saved locally in ignored .agent-office/config.json.
New installations start empty. Empty projects keep their floors; records from
unconfigured projects cannot add floors or enter the office reports.
The floor list starts expanded; click its heading to collapse or expand it.
Floor navigation ranks projects by their current active worker count, highest
first, with alphabetical ties. The continuous map keeps its stable floor order.
Unviewed recorded completions stay above active floors with an amber ! badge.
Opening a floor keeps its worker updates available to inspect. Inspecting a
worker marks that worker and its recorded descendants read. Unrelated workers
stay unread. Clicking the floor's ! marks all
updates on that floor read without moving the camera. Hidden tabs do not acknowledge
new completions. Read markers stay in this browser's local storage across reloads,
and an unread badge survives worker expiry without restoring the expired worker.
Scroll or use +/- to zoom. Fit recenters the selected floor.
Each floor has work pods, cafeteria, game room, library, team lounge, quiet room,
reception, focus room, and planning studio. Workers have individual workstations
and reserve furniture seats. Cross desks and three-person clusters follow the
top-view references, with dividers, round tables, and wide aisles.
Normal floors are 3400 by 1380 world units; extra pods are added when needed.
Walking uses front, back, and four-frame left/right sprite cycles. Seated poses support
keyboard work, reading, coffee, and meals. The new seated atlas includes front,
back, left, right, and four diagonal views aligned to each rotated chair.
Project floors use straight rectangular
layouts with camera fit including the title. Routes avoid walls and furniture.
Moving peers can pass in corridors; working, resting, and seated characters
keep exclusive occupied places. Destination seats remain reserved during travel.
Subagents inherit their spawning project's office, including nested subagents.
Linked Git worktrees share the main repository office. Dated task folders and audit worktrees are grouped into their parent offices.

REAL ACTIVITY AND ANIMATION
Workers represent local Codex, Claude Code, and Copilot CLI session records.
Only sessions with activity in the last six hours have workers on the floor.
Older workers leave automatically and return if their session records activity
again. Earlier records shows their metadata in the people list without adding
them back to the canvas. Boss reports retain the recorded session history.
Supported IDE sessions appear when they use those same local records. Remote
machines, unsupported chat windows, and providers without readable local records
are not detected automatically. An open window is not evidence of active work.
The observer reads records without modifying them. New sessions can take about
15 seconds to be discovered; existing event changes are checked every 2 seconds.
Quiet records remain unknown. Finished turns trigger break animations. A recorded
wait for subagent reports sends the worker to the team lounge. Coffee, meals,
walking, game play, and dialogue are visual decoration, not model telemetry or
messages authored by the real agent. The inspector separates these from status.
Active pod workers stay at their own reserved desks, including reading, research
and reviews; working no longer triggers decorative water or break trips.
Recorded planning still uses the Planning Studio, with overflow at owned desks.
Return-to-work running is half its previous speed, about three times walking,
following the same furniture-safe routes and reserved seats. Worker speech stays within five
words, uses short public task-title phrases, and never displays pasted prompts.
Planning speech uses brainstorming phrases; work pods describe the task.
Finished workers display an unread ! above their head and in the people list.
Click the worker or its marker to inspect its real recorded update.
Generic provider names get stable office aliases from a larger first/last-name
pool. Existing recorded names are kept; alias inspectors also show Recorded name.
Selected workers show a matching pixel portrait. Below their status, the work
description shows the recorded task title and observed activity types.
Large meeting tables have raised wood rims, individual notebooks and cups, and
a small planted centerpiece; chair placements and reserved activity spots stay fixed.

BOSS ROOM
The central Boss room sits above the project floors. Its sidebar and toolbar
buttons return to the building view. Click the room for a cross-project report:
worker/session totals, recorded input requests, pending team reports, statuses,
and latest recorded activity labels. Project rows open floors; Inspect opens a
real worker's existing details. Quiet activity stays unknown and a disconnected
observer explicitly labels last observed data. The reporter starts no tasks.
The report lives in a scrollable right sidebar beside the office. Hide reports
expands the canvas; Show reports or clicking the Boss room opens it again.
The sidebar remembers your choice. On small screens it opens over the canvas.
One decorative seated boss writes and reads reports at the executive desk;
this character is not a real session and does not change any worker totals.
The executive suite has a front-facing desk with its boss seated behind it,
visitor chairs, a reference shelf, and a compact board of recorded totals.
The boss's native hands rest above the desktop; his chair aligns behind him.
His decorative routine cycles through writing, reading, walking to the window,
a cigar break with drifting smoke, visiting the reference shelf, and surveying
the office before returning to his desk. Reduced motion keeps him seated.
The decorative boss never becomes a session worker or changes report counts.

ROOM PURPOSES
Room names appear on framed wall signs with windows fitted around them. Hover
over any room or its sign to see its purpose in a pill at the canvas's top right.
Descriptions stay off the floor and disappear during dragging or pointer exit.
Select a floor, then click a room to
inspect its use, activity places, and workers currently shown there.
Work pods handle active implementation, research and reviews. The library and
focus room offer reading places outside active pod work; the studio handles
recorded planning, with overflow at each worker's reserved table. The team lounge represents
recorded waits for team reports, and reception represents requests for your input.
The cafeteria, game room, and quiet room provide decorative break activities.
Room placement and break animations never change the real recorded status.

INSTRUCTIONS
New instruction opens a composer for the selected project. Press Send to launch
a separate Codex task using your local Codex login. Review-only is the default;
project edits are an explicit alternative. Existing conversations are not steered.
Responses are displayed as they arrive. Stop this task stops only that office run.
The prompt is sent to Codex through stdin. No API key is requested or stored here.
The selected runtime may use its normal account/billing. No task starts on page
load or simply by inspecting a worker. Approvals in existing apps stay there.

PRIVACY
The server accepts only localhost requests. Observer output contains session and
project identities, activity labels, and reported usage. Reasoning, transcript
text, tool arguments, command output, credentials, and account records are excluded.
Prompt submission requires the current local-page token and origin, a known
workspace, bounded input, and a supported permission mode. Responses from office
runs stay in memory until the local server stops.

ART
Worker sprite atlases are in public/assets. They share eight worker identities
across standing, walking, seated, directional, work, and leisure poses.
The runtime reads each atlas's dimensions and preserves transparent alpha.
Frame layouts and animation notes are documented in public/assets/README.md.

CHECKS
npm test verifies activity parsing, provider states, prompt validation, continuous
floor navigation, parent project grouping, desk ownership, movement, seat reservations, and separation.
node scripts/render-preview.mjs renders the actual canvas to output/office-preview.png.
Add 1124 704 boss night to preview the Boss room, or 900 550 boss-desk cozy
for a close view of its seated pose and desk. A final timestamp argument selects
an animation moment for visual checks.
The optional native canvas package is a development dependency for visual checks.
The app itself does not require it to run.

ENVIRONMENT
AGENT_OFFICE_CODEX_HOME: alternate local Codex data folder.
AGENT_OFFICE_CLAUDE_HOME: alternate Claude projects folder.
AGENT_OFFICE_COPILOT_HOME: alternate Copilot session-state folder.
AGENT_OFFICE_CODEX_BIN: explicit Codex executable location.
AGENT_OFFICE_CONFIG: alternate local settings file.
AGENT_OFFICE_PORT: alternate port for npm start; the desktop launcher uses 4317.

STOP
A terminal-started server stops with Ctrl+C. The desktop launcher starts it hidden.
Closing the browser does not stop the server. Stop only the node server.mjs process
whose listener is this office's localhost port and whose files belong to this folder.
