const JSON_HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};

function safeEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin');
    const permitted=typeof env.ALLOWED_ORIGIN==='string'&&env.ALLOWED_ORIGIN;
    if(origin&&origin!==permitted)return new Response('Forbidden origin',{status:403});
    const cors=origin?{'Access-Control-Allow-Origin':permitted,'Vary':'Origin'}:{};
    const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,...cors}});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600'}});
    const url=new URL(request.url),path=url.pathname;
    if(path==='/health'&&request.method==='GET')return respond({ok:true});
    if(!env.DB||!env.TRIP_ACCESS_CODE||!permitted)return respond({error:'Service is not configured'},503);
    const provided=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
    if(!safeEqual(provided,env.TRIP_ACCESS_CODE))return respond({error:'访问码不正确'},401);
    try{
      if(path==='/api/entries'&&request.method==='GET'){
        const {results}=await env.DB.prepare('SELECT id,name,amount_cents,who,created_at FROM expenses WHERE deleted_at IS NULL ORDER BY created_at ASC,id ASC LIMIT 500').all();
        return respond({entries:results});
      }
      if(path==='/api/entries'&&request.method==='POST'){
        let body;try{const raw=await request.text();if(raw.length>4096)return respond({error:'内容过长'},413);body=JSON.parse(raw)}catch{return respond({error:'JSON 无效'},400)}
        const {id,name,amount_cents,who=''}=body||{};
        if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||typeof name!=='string'||!name.trim()||name.trim().length>40||!Number.isSafeInteger(amount_cents)||amount_cents<1||amount_cents>100000000||typeof who!=='string'||who.length>20)return respond({error:'记账内容无效'},400);
        await env.DB.prepare('INSERT OR IGNORE INTO expenses(id,name,amount_cents,who,created_at) VALUES(?,?,?,?,?)').bind(id,name.trim(),amount_cents,who.trim(),new Date().toISOString()).run();
        return respond({ok:true},201);
      }
      const match=path.match(/^\/api\/entries\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
      if(match&&request.method==='DELETE'){
        await env.DB.prepare('UPDATE expenses SET deleted_at=? WHERE id=? AND deleted_at IS NULL').bind(new Date().toISOString(),match[1]).run();
        return respond({ok:true});
      }
      return respond({error:'Not found'},404);
    }catch{return respond({error:'服务暂时不可用，请稍后重试'},503)}
  }
};
