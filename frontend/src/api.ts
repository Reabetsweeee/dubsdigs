export type Role='student'|'landlord'|'admin'|'manager'|'support';
export type Session={access:string;role:Role;name:string};
export const session={get:():Session|null=>JSON.parse(localStorage.getItem('dd')||'null'),set:(v:Session)=>localStorage.setItem('dd',JSON.stringify(v)),clear:()=>localStorage.removeItem('dd')};
export async function api(path:string,opts:{method?:string;body?:unknown;auth?:boolean}={}):Promise<any>{
  const s=session.get();
  const r=await fetch('/api'+path,{method:opts.method||(opts.body?'POST':'GET'),headers:{'Content-Type':'application/json',...(s&&opts.auth!==false?{Authorization:'Bearer '+s.access}:{})},body:opts.body?JSON.stringify(opts.body):undefined});
  const data=r.status===204?null:await r.json().catch(()=>null);
  if(!r.ok){const m=data&&(data.detail||Object.values(data).flat().join(' '));throw new Error(m||r.statusText)}
  return data;
}
