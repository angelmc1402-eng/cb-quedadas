// Reuse the existing server gateway. Only the requested Pages origin gains browser access.
export const PAGES_ORIGIN='https://angelmc1402-eng.github.io';
export const allowedOrigin=(req:Request)=>{const origin=req.headers.get('origin');return origin===new URL(req.url).origin||origin===PAGES_ORIGIN};
export function corsResponse(req:Request,response:Response){const origin=req.headers.get('origin');if(origin!==PAGES_ORIGIN)return response;const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',PAGES_ORIGIN);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');headers.set('Access-Control-Allow-Headers','content-type, x-device');headers.set('Access-Control-Max-Age','3600');return new Response(response.body,{status:response.status,headers});}
export function preflight(req:Request){if(!allowedOrigin(req))return new Response(null,{status:403});return corsResponse(req,new Response(null,{status:204}));}
