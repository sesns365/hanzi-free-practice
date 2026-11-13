// @ts-nocheck
import {speakText} from './speech';
import {strokeNamesFor,chineseNumber,loadStrokeNames,strokeSpeechName} from './stroke-names';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// 筆順速度越慢，筆與筆之間也停久一點，讓學生有時間看清楚。
export const strokeDelay=(speed=1)=>Math.round(Math.min(1500,1000/Math.min(1,Math.max(.3,Number(speed)||1))));
// 老師開啟筆畫報讀時先把名稱資料載好，播放時才不必等。
export function preloadStrokeNames(settings){if(settings?.strokeNarration)loadStrokeNames().catch(()=>{})}
/**
 * 播放整個字的筆順。
 * 沒開報讀：沿用 HanziWriter 的整字動畫。
 * 開啟報讀：一筆一筆播放，每一筆開始時念出「第幾筆、筆畫名稱」（例如：一，橫），念完且寫完才換下一筆。
 * active() 回傳 false 表示這次播放已被取消；paused() 回傳 true 時先停在目前這一筆。
 */
export function playStrokeOrder(writer,{char,count,settings,active=()=>true,paused,onStroke,onComplete}){
 if(!writer)return;
 if(!settings?.strokeNarration||!count){writer.animateCharacter({onComplete:()=>{if(active())onComplete?.()}});return;}
 (async()=>{
  const names=await strokeNamesFor(char,count,settings);
  if(!active())return;
  try{await writer.hideCharacter({duration:0})}catch{}
  for(let i=0;i<count;i++){
   while(active()&&paused?.())await wait(150);
   if(!active())return;
   const name=names?.[i]||'';
   onStroke?.(i,name);
   const speech=new Promise(resolve=>{
    let done=false;const finish=()=>{if(!done){done=true;clearTimeout(timer);resolve(null)}};
    const timer=setTimeout(finish,4500);
    const started=speakText(chineseNumber(i+1)+(name?'，'+strokeSpeechName(name):''),settings,status=>{if(status==='done'||status==='error'||status==='cancelled')finish()});
    if(!started)finish();
   });
   const stroke=new Promise(resolve=>{try{Promise.resolve(writer.animateStroke(i,{onComplete:()=>resolve(null)})).catch(()=>resolve(null))}catch{resolve(null)}});
   await Promise.all([speech,stroke]);
   if(!active())return;
   await wait(Math.round(strokeDelay(settings.animationSpeed)*.3));
  }
  if(active())onComplete?.();
 })();
}
