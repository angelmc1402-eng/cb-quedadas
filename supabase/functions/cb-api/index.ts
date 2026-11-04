import {members,categories} from '../../../app/data.ts';
import {gatewayHash} from './gateway-config.ts';
const digest=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const validDate=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const uuid=(v:string)=>/^[a-f0-9-]{36}$/.test(v);
const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const key=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const base=Deno.env.get('SUPABASE_URL')!;
const auth:Record<string,string>={apikey:key};if(!key.startsWith('sb_secret_'))auth.Authorization='Bearer '+key;
async function call(path:string,init:RequestInit={}){const r=await fetch(base+path,{...init,headers:{...auth,...init.headers},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Supabase '+r.status);if(r.status===204||r.headers.get('content-length')==='0')return null;const s=await r.text();return s?JSON.parse(s):null;}
const rows=(table:string,query='')=>call('/rest/v1/'+table+'?'+query);
const insert=(table:string,body:unknown,conflict='')=>call('/rest/v1/'+table+(conflict?'?on_conflict='+conflict:''),{method:'POST',headers:{'Content-Type':'application/json',Prefer:conflict?'resolution=merge-duplicates,return=minimal':'return=minimal'},body:JSON.stringify(body)});
const patch=(table:string,id:string,body:unknown)=>call('/rest/v1/'+table+'?id=eq.'+id,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});
const clean=(v:unknown,n:number)=>typeof v==='string'?v.trim().slice(0,n):'';
const objectPath=(id:string)=>'/storage/v1/object/cb-photos/'+id;
export async function handler(req:Request):Promise<Response>{try{
if(await digest(req.headers.get('x-cb-gateway')||'')!==gatewayHash)return reply({error:'Gateway no autorizado'},401);
const path=new URL(req.url).pathname.split('/cb-api')[1]||'/';
if(path==='/health')return reply({ok:true,backend:'supabase',database:!!await rows('plans','select=id&limit=1')});
if(path==='/migration'&&req.method==='GET'){const d=await rows('cb_metadata','name=eq.legacy_import&select=name');return reply({complete:d.length>0});}
if(path.startsWith('/import-file/')&&req.method==='POST'){const id=path.split('/').pop()!;if(!uuid(id))return reply({error:'ID no válido'},400);const r=await fetch(base+objectPath(id),{method:'POST',headers:{...auth,'Content-Type':req.headers.get('content-type')||'image/jpeg','x-upsert':'false'},body:await req.arrayBuffer()});if(!r.ok&&r.status!==409&&r.status!==400)throw Error('Importación de foto fallida');if(r.status===400){const e=await r.json();if(e.error!=='Duplicate')throw Error('Importación de foto fallida');}return reply({ok:true});}
if(path==='/import'&&req.method==='POST'){const payload=await req.json();await call('/rest/v1/rpc/cb_import_legacy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload})});return reply({ok:true});}
const device=req.headers.get('x-device')||'';const owner=await digest(device);
if(path==='/data'&&req.method==='GET'){
const [p,r,c,a,f]=await Promise.all([rows('plans','order=date.asc,time.asc&limit=1000'),rows('rsvps','limit=15000'),rows('comments','order=created.asc&limit=10000'),rows('availability','limit=15000'),rows('photos','order=created.asc&limit=5000')]);
return reply({plans:p.map((x:any)=>{const {owner:o,...rest}=x;return {...rest,mine:o===owner}}),rsvps:r,comments:c,availability:a,photos:f.map((x:any)=>{const {owner:o,type,...rest}=x;return {...rest,mine:o===owner}})});}
if(path.startsWith('/photos/')&&req.method==='GET'){const id=path.split('/').pop()!;if(!uuid(id))return reply({error:'No encontrada'},404);const metadata=await rows('photos','id=eq.'+id+'&select=type');if(!metadata.length)return reply({error:'No encontrada'},404);const r=await fetch(base+objectPath(id),{headers:auth});if(!r.ok)return reply({error:'No encontrada'},404);return new Response(r.body,{headers:{'Content-Type':metadata[0].type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});}
if(!/^[a-zA-Z0-9-]{30,80}$/.test(device))return reply({error:'No se reconoce este dispositivo. Recarga la página.'},400);
if(path.startsWith('/photos/')&&req.method==='DELETE'){const id=path.split('/').pop()!;if(!uuid(id))return reply({error:'No encontrada'},404);const p=await rows('photos','id=eq.'+id+'&select=owner');if(!p.length||p[0].owner!==owner)return reply({error:'Solo puedes retirar tus fotos desde el dispositivo donde las subiste'},403);const r=await fetch(base+objectPath(id),{method:'DELETE',headers:auth});if(!r.ok&&r.status!==404)throw Error('No se pudo borrar');await call('/rest/v1/photos?id=eq.'+id,{method:'DELETE'});return reply({ok:true});}
if(path==='/photos'&&req.method==='POST'){
if(Number(req.headers.get('content-length'))>5500000)return reply({error:'Máximo 5 MB por foto'},413);
const f=await req.formData();const file=f.get('file') as File;const plan=String(f.get('plan'));const member=String(f.get('member'));
if(!members.includes(member)||!uuid(plan)||!file||file.size>5242880||!['image/jpeg','image/png','image/webp'].includes(file.type))return reply({error:'Elige una foto JPG, PNG o WebP de hasta 5 MB y tu nombre'},400);
const bytes=await file.arrayBuffer();const u=new Uint8Array(bytes);const valid=(file.type==='image/jpeg'&&u[0]===255&&u[1]===216)||(file.type==='image/png'&&u[0]===137&&u[1]===80&&u[2]===78&&u[3]===71)||(file.type==='image/webp'&&new TextDecoder().decode(u.slice(8,12))==='WEBP');if(!valid)return reply({error:'El archivo no parece una imagen válida'},400);
if(!(await rows('plans','id=eq.'+plan+'&select=id')).length)return reply({error:'Plan inexistente'},404);
if((await rows('photos','plan=eq.'+plan+'&select=id&limit=100')).length>=100)return reply({error:'El álbum está lleno (100 fotos)'},400);
const id=crypto.randomUUID();const r=await fetch(base+objectPath(id),{method:'POST',headers:{...auth,'Content-Type':file.type,'x-upsert':'false'},body:bytes});if(!r.ok)throw Error('No se pudo subir');try{await insert('photos',{id,plan,member,owner,type:file.type,created:new Date().toISOString()})}catch(e){await fetch(base+objectPath(id),{method:'DELETE',headers:auth});throw e}return reply({ok:true});}
if(path==='/data'&&req.method==='POST'){
if(Number(req.headers.get('content-length'))>16000)return reply({error:'Petición demasiado grande'},413);const body=await req.json();const {member,action}=body;if(!members.includes(member))return reply({error:'Elige tu nombre en el club'},400);
if(action==='plan'){const p=body.plan;if(!p||!clean(p.title,100)||!validDate(p.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)||!categories.includes(p.category)||!['Murcia','Orihuela','Alrededores','Otro lugar'].includes(p.city)||!Number.isInteger(Number(p.budget))||p.budget<0||p.budget>10000||!['Propuesto','Confirmado','Cancelado'].includes(p.status))return reply({error:'Revisa título, fecha, hora y presupuesto.'},400);
const record={title:clean(p.title,100),date:p.date,time:p.time,category:p.category,location:clean(p.location,240),city:p.city,budget:Number(p.budget),description:clean(p.description,2000),status:p.status};
if(p.id){if(!uuid(p.id))return reply({error:'Plan inexistente'},404);const old=await rows('plans','id=eq.'+p.id+'&select=owner');if(!old.length||old[0].owner!==owner)return reply({error:'Solo quien creó el plan puede editarlo desde su dispositivo.'},403);await patch('plans',p.id,record);return reply({ok:true,id:p.id});}
const id=crypto.randomUUID();await insert('plans',{id,...record,creator:member,owner,created:new Date().toISOString()});return reply({ok:true,id});}
if(action==='availability'){if(!validDate(body.date)||!['yes','maybe','no',''].includes(body.answer))return reply({error:'Disponibilidad no válida'},400);await insert('availability',{date:body.date,member,answer:body.answer},'date,member');return reply({ok:true});}
if(!uuid(String(body.plan))||!(await rows('plans','id=eq.'+body.plan+'&select=id')).length)return reply({error:'Este plan no existe'},404);
if(action==='rsvp'){if(!['yes','maybe','no'].includes(body.answer))return reply({error:'Respuesta no válida'},400);await insert('rsvps',{plan:body.plan,member,answer:body.answer},'plan,member');return reply({ok:true});}
if(action==='comment'){const text=typeof body.text==='string'?body.text.trim():'';if(!text||text.length>1500)return reply({error:'Escribe entre 1 y 1.500 caracteres'},400);await insert('comments',{id:crypto.randomUUID(),plan:body.plan,member,body:text,created:new Date().toISOString()});return reply({ok:true});}
return reply({error:'Acción desconocida'},400);}
return reply({error:'Ruta desconocida'},404);
}catch(e){console.error('C&B API failure',e instanceof Error?e.message:'unknown');return reply({error:'No hemos podido completar la operación. Inténtalo de nuevo.'},503)}}
Deno.serve(handler);
