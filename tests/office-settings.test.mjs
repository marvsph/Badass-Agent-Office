import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Configure loads local settings, edits floors, saves with the page token and applies safe branding',async()=>{
  const elements=new Map(),listeners=new Map();
  const el=id=>{
    if(!elements.has(id))elements.set(id,{value:'',hidden:false,disabled:false,open:false,textContent:'',innerHTML:'',dataset:{},attrs:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},addEventListener:(event,fn)=>listeners.set(id+':'+event,fn),showModal(){this.open=true;},close(){this.open=false;},focus(){}});
    return elements.get(id);
  };
  const initial={officeName:'Studio',logo:null,revision:'revision-1',projects:[{name:'Original',path:'C:/Projects/original'}]};
  let saved=null,updated=0;
  const context=vm.createContext({document:{getElementById:el},AbortSignal,Image:class{},fetch:async(url,options)=>{
    assert.equal(url,'/api/configuration');
    if(!options?.method)return{ok:true,json:async()=>structuredClone(initial)};
    assert.equal(options.headers['X-Office-Token'],'local-token');saved=JSON.parse(options.body);
    return{ok:true,json:async()=>({...saved,revision:'revision-2'})};
  }});
  vm.runInContext(fs.readFileSync(new URL('../public/office-settings.js',import.meta.url),'utf8').replace(/^export /gm,''),context);
  context.updated=()=>updated++;
  vm.runInContext("installOfficeSettings({token:()=> 'local-token',onSaved:updated})",context);
  await listeners.get('configure:click')();assert.equal(el('configure-dialog').open,true);assert.equal(el('configuration-office-name').value,'Studio');
  listeners.get('configuration-office-name:input')({target:{value:'My Office'}});
  listeners.get('add-floor:click')();assert.match(el('configuration-floors').innerHTML,/Floor 2/);
  const input=listeners.get('configuration-floors:input');
  input({target:{dataset:{floorIndex:'1',floorField:'path'},value:'C:/Projects/new'}});
  input({target:{dataset:{floorIndex:'1',floorField:'name'},value:'New floor'}});
  listeners.get('configuration-floors:click')({target:{closest:()=>({dataset:{removeFloor:'0'}})}});
  let prevented=false;
  await listeners.get('configuration-form:submit')({preventDefault(){prevented=true;}});
  assert.ok(prevented);assert.equal(saved.officeName,'My Office');assert.deepEqual(saved.projects,[{name:'New floor',path:'C:/Projects/new'}]);assert.equal(saved.revision,'revision-1');assert.equal(updated,1);assert.equal(el('configure-dialog').open,false);
  vm.runInContext("applyOfficeBranding({name:'<script>Office</script>',logoUrl:'/api/office-logo?v=abc'})",context);
  assert.equal(el('brand-name').textContent,'<script>Office</script>');assert.equal(el('brand-logo').src,'/api/office-logo?v=abc');assert.equal(el('brand-default').hidden,true);
  vm.runInContext('applyOfficeBranding({name:"Office",logoUrl:null})',context);assert.equal(el('brand-logo').hidden,true);
  await listeners.get('setup-configure:click')();
  input({target:{dataset:{floorIndex:'0',floorField:'name'},value:'<img onerror="alert(1)">'}});
  listeners.get('add-floor:click')();assert.doesNotMatch(el('configuration-floors').innerHTML,/<img/);assert.match(el('configuration-floors').innerHTML,/&lt;img/);
  listeners.get('cancel-configuration:click')();assert.equal(updated,1,'Cancel starts no task or save');
});
