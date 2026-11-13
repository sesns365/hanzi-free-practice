// @ts-nocheck
let scriptPromise;
export function loadHanziWriter(){
 if(window.HanziWriter)return Promise.resolve(window.HanziWriter);
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=import.meta.env.BASE_URL+'hanzi-writer.js';
  let settled=false;
  const finish=success=>{
   if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;
   if(success)resolve(window.HanziWriter);
   else{scriptPromise=null;script.remove();reject(new Error('筆順工具載入失敗'));}
  };
  // A stalled request must release the shared promise so the existing retry controls work.
  const timer=setTimeout(()=>finish(false),15000);
  script.onload=()=>finish(!!window.HanziWriter);
  script.onerror=()=>finish(false);
  document.head.appendChild(script);
 });
 return scriptPromise;
}
