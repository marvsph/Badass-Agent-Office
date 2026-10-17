export function installOfficeTasks({getState,onUpdate=()=>{}}){
 const el=id=>document.getElementById(id),html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let job=null,posting=false;
 const state=()=>getState(),project=()=>state().world?.projects.find(p=>p.path===state().project);
 const provider=()=>el('task-provider').value||'codex';
 const available=()=>!!state().world?.runner?.providers?.find(p=>p.id===provider())?.available;
 const busy=()=>!!job&&['starting','running'].includes(job.status);
 function choices(){
  const catalog=state().world?.runner?.catalog?.[provider()],models=catalog?.models||[];
  el('task-model-options').innerHTML=models.map(m=>`<option value="${html(m.id)}">${html(m.label)}</option>`).join('');
  const old=el('task-effort').value,known=models.find(m=>m.id===el('task-model').value),efforts=known?.efforts?.length?known.efforts:catalog?.efforts||['low','medium','high'];
  el('task-effort').innerHTML='<option value="">Provider default</option>'+efforts.map(e=>`<option value="${html(e)}">${html(e==='xhigh'?'Extra high':e[0].toUpperCase()+e.slice(1))}</option>`).join('');
  el('task-effort').value=efforts.includes(old)?old:'';el('send-prompt').disabled=posting||busy()||!project()||!available();
  el('task-provider-note').textContent=!state().world?.runner?.providers?'Restart the local office server to load the task controls.':available()?'Uses the selected provider’s local login.':'This provider’s local CLI is unavailable. Install it and sign in before sending.';
 }
 function taskList(){
  const tasks=(state().world?.runner?.tasks||[]).filter(t=>t.projectPath===state().project);
  el('office-task-history').innerHTML='<option value="">Choose an office task</option>'+tasks.map(t=>`<option value="${html(t.id)}">${html(t.provider==='claude'?'Claude Code':'Codex')} · ${html(t.status)} · ${html(t.model||'Default model')} · ${html(t.id.slice(0,8))}</option>`).join('');
  el('office-task-history').value=job?.id||'';el('office-task-history').disabled=posting;
 }
 function display(value){
  job=value;el('task-status').textContent=value.error||`${value.provider==='claude'?'Claude Code':'Codex'} · ${value.activity||value.status}${value.status==='completed'?' · completed':''}`;
  el('stop-task').hidden=!busy();el('task-reply').hidden=!value.reply&&!value.history?.length;
  el('task-reply').textContent=[...(value.history||[]),value.reply].filter(Boolean).join('\n\n──────── Follow-up ────────\n\n');
  el('task-followup-section').hidden=false;el('send-followup').disabled=posting||!value.canFollowup;
  el('task-followup-note').textContent=busy()?'Follow-ups are available after this turn finishes.':value.canFollowup?'Continues this office task with the same provider, model, effort, and project permissions.':'This task has no resumable session yet.';
  choices();taskList();
 }
 async function request(url,payload){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Office-Token':state().world?.csrfToken},body:JSON.stringify(payload)}),value=await response.json();
  if(!response.ok)throw new Error(value.error||'Could not submit the instruction.');return value;
 }
 async function open(){
  el('prompt-project').textContent=project()?`Project floor: ${project().name}`:'Select a project floor before sending a task.';
  if(job?.projectPath!==state().project){job=null;el('task-status').textContent='';el('task-reply').textContent='';el('task-reply').hidden=true;el('stop-task').hidden=true;}
  el('task-followup-section').hidden=!job;choices();taskList();
  if(!project())el('task-status').textContent='Choose a project floor first.';
  el('prompt-dialog').showModal();el('prompt-text').focus();
  if(job)await poll();
 }
 async function send(){
  if(posting||busy()||!project()||!available())return;
  const prompt=el('prompt-text').value.trim();if(!prompt){el('task-status').textContent='Write an instruction first.';return;}
  posting=true;choices();el('task-status').textContent='Starting your task…';
  try{display(await request('/api/tasks',{prompt,projectPath:state().project,mode:el('task-mode').value,provider:provider(),model:el('task-model').value.trim(),effort:el('task-effort').value}));onUpdate();}
  catch(error){el('task-status').textContent=error.message;}finally{posting=false;choices();if(job)el('send-followup').disabled=!job.canFollowup;}
 }
 async function followup(){
  if(posting||!job?.canFollowup)return;
  const prompt=el('task-followup-text').value.trim();if(!prompt){el('task-status').textContent='Write a follow-up message first.';return;}
  posting=true;el('send-followup').disabled=true;
  try{display(await request(`/api/tasks/${job.id}/followup`,{prompt}));el('task-followup-text').value='';onUpdate();}
  catch(error){el('task-status').textContent=error.message;}finally{posting=false;choices();if(job)el('send-followup').disabled=!job.canFollowup;}
 }
 async function poll(){if(!job)return;try{const response=await fetch(`/api/tasks/${job.id}`);if(response.ok)display(await response.json());}catch{/* Keep the last result until the next local poll. */}}
 el('open-prompt').addEventListener('click',open);el('close-prompt').addEventListener('click',()=>el('prompt-dialog').close());el('send-prompt').addEventListener('click',send);el('send-followup').addEventListener('click',followup);
 el('task-provider').addEventListener('change',()=>{el('task-model').value='';el('task-effort').value='';choices();});el('task-model').addEventListener('input',choices);
 el('office-task-history').addEventListener('change',async()=>{const id=el('office-task-history').value;if(!id)return;const owned=state().world?.runner?.tasks?.find(t=>t.id===id&&t.projectPath===state().project);if(!owned)return;job=owned;await poll();});
 el('stop-task').addEventListener('click',async()=>{if(!job||posting)return;try{display(await request(`/api/tasks/${job.id}/cancel`,{}));onUpdate();}catch(error){el('task-status').textContent=error.message;}});
 setInterval(()=>{if(busy())poll();},1500);
 return {open,poll};
}
