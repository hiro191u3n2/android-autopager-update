const sleep = ms => new Promise(r=>setTimeout(r,ms));
export async function connect() {
  const pages = await (await fetch('http://127.0.0.1:9444/json/list')).json();
  const url=pages.find(p=>p.type==='page').webSocketDebuggerUrl;
  const socket = new WebSocket(url);
  await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
  let seq=0; const pending=new Map(), handlers=new Map();
  socket.onmessage = event=>{
    const m=JSON.parse(event.data);
    if(m.id){ const p=pending.get(m.id); if(!p)return;pending.delete(m.id);if(m.error)p.j(Error(m.error.message));else p.r(m.result);return; }
    for(const fn of handlers.get(m.method)||[]) fn(m.params);
  };
  const send=(method,params={})=>new Promise((r,j)=>{const id=++seq;pending.set(id,{r,j});socket.send(JSON.stringify({id,method,params}));});
  const on=(method,fn)=>handlers.set(method,[...(handlers.get(method)||[]),fn]);
  const val=async expression=>{const v=await send('Runtime.evaluate',{expression,returnByValue:true});if(v.exceptionDetails)throw Error(v.exceptionDetails.exception?.description||v.exceptionDetails.text);return v.result.value;};
  await send('Page.enable');await send('Runtime.enable');
  return {send,on,val,close:()=>socket.close()};
}
export {sleep};
