// Front-facing portraits come from the same approved identity rows as floor workers.
const profileFrames = [
  [512,31,80,143], [514,188,74,147], [512,349,77,146], [503,508,95,146],
  [512,668,78,142], [514,824,74,145], [511,979,79,137], [503,1124,96,125],
];

export function profileSprite(colorIndex) {
  const row=Number.isFinite(Number(colorIndex))?((Math.floor(Number(colorIndex))%8)+8)%8:0;
  const [x,y,width,fullHeight]=profileFrames[row],height=Math.floor(fullHeight*.7),scale=Math.min(72/width,78/height);
  return {row,x,y,width,height,scale,atlasSize:1254};
}

const workKinds = {planning:'planning',coding:'file edits',terminal:'command runs',research:'research',reading:'file review',reviewing:'preview checks',collaborating:'team coordination'};
export function recordedActivityDetail(event){
 if(event?.detail)return String(event.detail);
 const details={planning:'Worked through the task approach.',coding:'Worked on changes to project files.',terminal:'Ran a command as part of the task.',research:'Looked up information for the task.',reading:'Reviewed project files and references.',reviewing:'Checked the project or preview.',collaborating:'Coordinated the task or requested a preference.','team-wait':'Waited for recorded child-agent updates.',waiting:'Requested input before continuing.',done:'The recorded turn ended.',working:'Continued the recorded task.'};
 return details[event?.kind]||'A session activity was recorded.';
}

export function recordedWorkDescription(session) {
  const raw=typeof session?.title==='string'?session.title.replace(/[\x00-\x1f]/g,' ').trim():'';
  const task=raw&&!/^(?:untitled session|(?:codex|claude|copilot) session)$/i.test(raw)&&!/(?:AGENTS\.md|<INSTRUCTIONS>|environment_context)/i.test(raw)
    ?raw.slice(0,240):'No specific task description was recorded.';
  const kinds=[...new Set((session?.activityLog||[]).map(event=>workKinds[event.kind]).filter(Boolean))].slice(0,4);
  if(!kinds.length&&workKinds[session?.kind])kinds.push(workKinds[session.kind]);
  const activities=kinds.length===1?kinds[0]:kinds.length===2?kinds.join(' and '):kinds.slice(0,-1).join(', ')+', and '+kinds.at(-1);
  return {task,activity:kinds.length?'Recorded activity includes '+activities+'.':'No detailed work activity was recorded.'};
}
