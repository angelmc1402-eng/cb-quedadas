export const APP_URL='https://angelmc1402-eng.github.io/cb-quedadas/';
export const API_URL='https://cb-quedadas-club.capitanmoreno.chatgpt.site';
export const planUrl=(id:string)=>APP_URL+'?plan='+encodeURIComponent(id);
export const apiUrl=(path:string)=>API_URL+path;
export const apiFetch=(path:string,init:RequestInit={})=>fetch(apiUrl(path),init);
