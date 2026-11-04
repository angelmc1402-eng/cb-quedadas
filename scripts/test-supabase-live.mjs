// Receives the gateway key on stdin only; never writes or prints it.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
process.stdin.setRawMode?.(true);process.stdin.resume();console.log('Ready for gateway key on stdin (hidden).');
const key=await new Promise(resolve=>{let input='';const receive=c=>{input+=c.toString();if(input.includes('\n')){process.stdin.off('data',receive);process.stdin.setRawMode?.(false);process.stdin.pause();resolve(input.trim())}};process.stdin.on('data',receive)});
const base='https://gboasldsdeqbzcnmolpp.supabase.co/functions/v1/cb-api';
const device=randomUUID(),other=randomUUID();
async function request(path,method='GET',body,dev=device,authorized=true){return fetch(base+path,{method,headers:{...(authorized?{'x-cb-gateway':key}:{}),'x-device':dev,...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});}
assert.equal((await request('/health','GET',undefined,device,false)).status,401);
let r=await request('/health');assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).backend,'supabase');
const plan={title:'[QA] C&B integration',date:'2026-12-31',time:'20:30',category:'En casa',location:'QA',city:'Murcia',budget:0,description:'Temporary automated verification; removed after testing.',status:'Propuesto'};
r=await request('/data','POST',{action:'plan',member:'Ángel',plan});assert.equal(r.status,200,await r.clone().text());const {id}=await r.json();console.log('QA_PLAN_ID='+id);
assert.equal((await request('/data','POST',{action:'plan',member:'Ángel',plan:{...plan,id,title:'No permitido'}},other)).status,403);
for(const answer of ['yes','maybe'])assert.equal((await request('/data','POST',{action:'rsvp',member:'Mikete',plan:id,answer})).status,200);
assert.equal((await request('/data','POST',{action:'availability',member:'Ángel',date:'2099-12-31',answer:'yes'})).status,200);
assert.equal((await request('/data','POST',{action:'comment',member:'Ángel',plan:id,text:'QA temporal'})).status,200);
const fd=new FormData();fd.set('member','Ángel');fd.set('plan',id);fd.set('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64')],'qa.png',{type:'image/png'}));
r=await request('/photos','POST',fd);assert.equal(r.status,200,await r.clone().text());
r=await request('/data');const d=await r.json();assert.ok(d.plans.find(p=>p.id===id)?.mine);assert.equal(d.rsvps.filter(p=>p.plan===id).length,1);assert.ok(!('owner' in d.plans[0]));const photo=d.photos.find(p=>p.plan===id);assert.ok(photo?.mine);
assert.equal((await request('/photos/'+photo.id)).status,200);
assert.equal((await request('/photos/'+photo.id,'DELETE',undefined,other)).status,403);
assert.equal((await request('/photos/'+photo.id,'DELETE')).status,200);
assert.equal((await request('/photos/'+photo.id)).status,404);
console.log('PASS live Supabase: gateway auth, writes, edit permissions, RSVP, availability, comments, storage upload/read/delete.');
