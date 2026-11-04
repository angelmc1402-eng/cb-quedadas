import {allowedOrigin,corsResponse,preflight} from '../../../api-access';
import {forwardSupabase} from '../../../supabase-gateway';
import {env} from 'cloudflare:workers';
async function handleGET(req:Request,{params}:{params:Promise<{id:string}>}){const forwarded=await forwardSupabase(req);if(forwarded)return forwarded;const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id)||!env.BUCKET)return new Response('No disponible',{status:404});const obj=await env.BUCKET.get(id);if(!obj)return new Response('Foto no encontrada',{status:404});return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}})}

async function handleDELETE(req:Request,{params}:{params:Promise<{id:string}>}){if(!allowedOrigin(req))return Response.json({error:'Origen no permitido'},{status:403});const forwarded=await forwardSupabase(req);if(forwarded)return forwarded;try{if(!allowedOrigin(req))return Response.json({error:'Origen no permitido'},{status:403});const {id}=await params;if(!env.DB||!env.BUCKET)return Response.json({error:'Álbum no disponible'},{status:503});const secret=req.headers.get('x-device')||'';const owner=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))).map(x=>x.toString(16).padStart(2,'0')).join('');const photo=await env.DB.prepare('SELECT owner FROM photos WHERE id=?').bind(id).first();if(!photo||photo.owner!==owner)return Response.json({error:'Solo puedes retirar tus fotos desde el dispositivo donde las subiste'},{status:403});await env.BUCKET.delete(id);await env.DB.prepare('DELETE FROM photos WHERE id=?').bind(id).run();return Response.json({ok:true});}catch{return Response.json({error:'No se pudo retirar la foto'},{status:500})}}

export async function GET(req:Request,ctx:{params:Promise<{id:string}>}){return corsResponse(req,await handleGET(req,ctx));}

export async function DELETE(req:Request,ctx:{params:Promise<{id:string}>}){return corsResponse(req,await handleDELETE(req,ctx));}

export function OPTIONS(req:Request){return preflight(req)}
