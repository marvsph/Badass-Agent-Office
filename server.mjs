import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshot } from './adapter.mjs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { runnerInfo,startTask,getTask,stopTask,followupTask } from './task-runner.mjs';
import { loadConfig, saveConfig, publicOffice, decodeLogo, configRevision } from './office-config.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.AGENT_OFFICE_PORT || 4317);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.txt':'text/plain; charset=utf-8' };
const csrfToken = randomBytes(32).toString('hex');
let configuration = await loadConfig(), savingConfiguration = false;
const observe = () => snapshot({ projects: configuration.projects });
let latest = observe();
const timer = setInterval(() => { latest = observe(); }, 2000);
timer.unref();

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
  if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host)) { res.writeHead(403); return res.end('Local access only.'); }
  let pathname;
  try { pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname; } catch { res.writeHead(400); return res.end(); }
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  if(req.method==='POST'&&(pathname.startsWith('/api/tasks')||pathname==='/api/configuration')){
    const supplied=Buffer.from(String(req.headers['x-office-token']||''));const expected=Buffer.from(csrfToken);
    if(![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return json(403,{error:'Refresh the office before saving settings or sending an instruction.'});
    try{
      if(pathname==='/api/configuration'){
        if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(415,{error:'Office settings must be JSON.'});
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>750000)return json(413,{error:'Office settings are too large. Keep your logo under 512 KB.'});chunks.push(chunk);}
        const request=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(savingConfiguration||request.revision!==configRevision(configuration))return json(409,{error:'Office settings changed in another tab. Reopen Configure before saving.'});
        savingConfiguration=true;
        try{
          configuration=await saveConfig(request);latest=observe();
          return json(200,{...configuration,revision:configRevision(configuration)});
        }finally{savingConfiguration=false;}
      }
      if(pathname==='/api/tasks'){let body='';for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>32000)return json(413,{error:'Instruction is too long.'});}const request=JSON.parse(body);return json(202,startTask(request,latest.projects));}
      const followup=pathname.match(/^\/api\/tasks\/([a-f0-9-]{36})\/followup$/);if(followup){let body='';for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>32000)return json(413,{error:'Follow-up is too long.'});}return json(202,followupTask(followup[1],JSON.parse(body),latest.projects));}
      const cancel=pathname.match(/^\/api\/tasks\/([a-f0-9-]{36})\/cancel$/);if(cancel){const result=stopTask(cancel[1]);return json(result?200:404,result||{error:'Task not found.'});}
      return json(404,{error:'Task route not found.'});
    }catch(error){return json(400,{error:error.message});}
  }
  if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); return res.end('Method unavailable.'); }
  if (pathname === '/api/world') return json(200,{...latest,office:publicOffice(configuration),runner:runnerInfo(),csrfToken});
  if (pathname === '/api/configuration') return json(200,{...configuration,revision:configRevision(configuration)});
  if (pathname === '/api/office-logo') {
    const logo=decodeLogo(configuration.logo);
    if(!logo){res.writeHead(404);return res.end('No custom logo.');}
    res.writeHead(200,{'Content-Type':logo.mime});return res.end(logo.data);
  }
  const task=pathname.match(/^\/api\/tasks\/([a-f0-9-]{36})$/);if(task){const result=getTask(task[1]);return json(result?200:404,result||{error:'Task not found.'});}
  if (pathname === '/health') { res.writeHead(200, { 'Content-Type':'application/json' }); return res.end('{"ok":true}'); }
  try {
    const safePath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.resolve(root, '.' + safePath);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`Agent Office is already running, or port ${port} is busy.`);
  else console.error('Could not start Agent Office:', err.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Agent Office: http://127.0.0.1:${port}\nLocal Codex observer · ${latest.sessions.length} sessions found · Ctrl+C to stop`));
