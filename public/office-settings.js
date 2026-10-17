const settingsElement = id => document.getElementById(id);
const settingsEscape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function applyOfficeBranding(office) {
  const name=office?.name || 'Agent Office';
  document.title=name;
  for(const id of ['brand-name','intro-office-name','scene-office-name'])settingsElement(id).textContent=name;
  settingsElement('office-brand').setAttribute('aria-label',`${name} home`);
  settingsElement('about-office-name').textContent=`Welcome to ${name}.`;
  settingsElement('owner-initial').textContent=name[0].toUpperCase();
  const logo=settingsElement('brand-logo'),url=office?.logoUrl;
  logo.hidden=!url;settingsElement('brand-default').hidden=!!url;
  if(url && logo.getAttribute?.('src')!==url)logo.src=url;
}

export function installOfficeSettings({token,onSaved}) {
  const el=settingsElement,dialog=el('configure-dialog');
  let draft=null,busy=false,logoReading=false,logoGeneration=0;
  const status=(message,error=false)=>{el('configuration-status').textContent=message;el('configuration-status').classList.toggle('settings-error',error);};
  const buttons=()=>{el('save-configuration').disabled=busy||logoReading||!draft;el('add-floor').disabled=busy||!draft||draft.projects.length>=50;};
  const previewLogo=()=>{el('logo-preview').hidden=!draft?.logo;if(draft?.logo)el('logo-preview').src=draft.logo;el('remove-logo').hidden=!draft?.logo;};
  const renderFloors=()=>{
    el('configuration-floors').innerHTML=draft.projects.map((floor,index)=>`<fieldset class="configuration-floor"><legend>Floor ${index+1}</legend><div class="floor-settings-heading"><label for="floor-name-${index}">Floor name <small>(optional)</small></label><button type="button" class="text-button remove-floor" data-remove-floor="${index}" aria-label="Remove floor ${index+1}">Remove</button></div><input id="floor-name-${index}" data-floor-index="${index}" data-floor-field="name" maxlength="80" value="${settingsEscape(floor.name)}" placeholder="Uses the folder name"><label for="floor-path-${index}">Project folder path</label><input id="floor-path-${index}" data-floor-index="${index}" data-floor-field="path" maxlength="400" required value="${settingsEscape(floor.path)}" placeholder="Absolute path to a local project folder" spellcheck="false"></fieldset>`).join('');
    el('no-configured-floors').hidden=!!draft.projects.length;
    buttons();
  };
  async function openSettings(){
    if(dialog.open)return;
    logoGeneration++;logoReading=false;draft=null;busy=true;buttons();status('Loading local settings…');dialog.showModal();
    el('configuration-form').hidden=true;
    try{
      const response=await fetch('/api/configuration',{signal:AbortSignal.timeout(7000)});
      if(!response.ok)throw new Error('Could not load office settings.');
      draft=await response.json();el('configuration-office-name').value=draft.officeName;el('configuration-logo').value='';
      renderFloors();previewLogo();el('configuration-form').hidden=false;status('');
    }catch(error){status(error.message,true);}finally{busy=false;buttons();}
  }
  el('configure').addEventListener('click',openSettings);
  el('setup-configure').addEventListener('click',openSettings);
  el('close-configure').addEventListener('click',()=>dialog.close());
  el('cancel-configuration').addEventListener('click',()=>dialog.close());
  el('configuration-office-name').addEventListener('input',event=>{if(draft)draft.officeName=event.target.value;});
  el('configuration-floors').addEventListener('input',event=>{
    const {floorIndex,floorField}=event.target.dataset;
    if(draft&&draft.projects[Number(floorIndex)]&&['name','path'].includes(floorField))draft.projects[Number(floorIndex)][floorField]=event.target.value;
  });
  el('configuration-floors').addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-floor]');
    if(button&&!busy){draft.projects.splice(Number(button.dataset.removeFloor),1);renderFloors();}
  });
  el('add-floor').addEventListener('click',()=>{
    if(!draft||busy||draft.projects.length>=50)return;
    draft.projects.push({name:'',path:''});renderFloors();el(`floor-path-${draft.projects.length-1}`).focus();
  });
  el('remove-logo').addEventListener('click',()=>{
    if(!draft||busy)return;
    logoGeneration++;logoReading=false;draft.logo=null;el('configuration-logo').value='';previewLogo();buttons();status('');
  });
  el('configuration-logo').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file||!draft||busy)return;
    const generation=++logoGeneration;
    logoReading=false;buttons();
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>512*1024){status('Choose a PNG, JPEG, or WebP image under 512 KB.',true);event.target.value='';return;}
    logoReading=true;buttons();
    try{
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this image.'));reader.readAsDataURL(file);});
      const image=new Image();image.src=data;await image.decode();
      if(generation!==logoGeneration)return;
      draft.logo=data;previewLogo();status('');
    }catch(error){if(generation===logoGeneration)status('Could not load this image. Choose another PNG, JPEG, or WebP.',true);}
    finally{if(generation===logoGeneration){logoReading=false;buttons();}}
  });
  el('configuration-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!draft||busy||logoReading)return;
    if(!token()){status('Refresh the office before saving settings.',true);return;}
    busy=true;buttons();el('configuration-fields').disabled=true;status('Saving local settings…');
    try{
      const response=await fetch('/api/configuration',{method:'POST',headers:{'Content-Type':'application/json','X-Office-Token':token()},body:JSON.stringify(draft),signal:AbortSignal.timeout(10000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not save office settings.');
      draft=result;await onSaved();dialog.close();
    }catch(error){status(error.message,true);}
    finally{busy=false;el('configuration-fields').disabled=false;buttons();}
  });
}
