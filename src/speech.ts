export type SpeechOptions={speechVoiceURI?:string;speechVoiceName?:string;speechVoiceLang?:string;speechRate?:number};
export type SpeechStatus='loading'|'playing'|'done'|'error'|'cancelled';
export const chineseVoices=(voices:SpeechSynthesisVoice[])=>voices.filter(v=>/^(zh|cmn)(-|_|$)/i.test(v.lang)).sort((a,b)=>Number(/TW/i.test(b.lang))-Number(/TW/i.test(a.lang))||a.name.localeCompare(b.name));
// 是否有臺灣華語語音；沒有時會改用其他地區的華語，部分字詞讀音可能和課本不同。
export const hasTaiwanVoice=(voices:SpeechSynthesisVoice[])=>voices.some(v=>/^(zh|cmn)[-_](Hant[-_])?TW/i.test(v.lang)||/台灣|臺灣|Taiwan/i.test(v.name));
const mandarin=(v:SpeechSynthesisVoice)=>!/(HK|MO|yue)/i.test(v.lang);
export function resolveVoice(voices:SpeechSynthesisVoice[],settings:SpeechOptions={}){const list=chineseVoices(voices);return list.find(v=>settings.speechVoiceURI&&v.voiceURI===settings.speechVoiceURI)||list.find(v=>settings.speechVoiceName&&v.name===settings.speechVoiceName&&v.lang===settings.speechVoiceLang)||list.find(v=>/TW/i.test(v.lang))||list.find(v=>mandarin(v)&&v.lang===settings.speechVoiceLang)||list.find(mandarin);}
let request=0,stopWaiting:(()=>void)|undefined,notifyCancelled:(()=>void)|undefined;
export function cancelSpeech(){request++;stopWaiting?.();stopWaiting=undefined;const notify=notifyCancelled;notifyCancelled=undefined;if(typeof window!=='undefined'&&'speechSynthesis'in window)window.speechSynthesis.cancel();notify?.();}
export function speakText(text:string,settings:SpeechOptions={},status?:(value:SpeechStatus)=>void){
 if(typeof window==='undefined'||!('speechSynthesis'in window)){status?.('error');return false}
 cancelSpeech();const current=request,synth=window.speechSynthesis;
 const report=(value:SpeechStatus)=>{if(current!==request)return;if(value==='done'||value==='error')notifyCancelled=undefined;status?.(value)};
 notifyCancelled=()=>status?.('cancelled');report('loading');
 const play=(voices:SpeechSynthesisVoice[])=>{
  if(current!==request)return;const voice=resolveVoice(voices,settings),rate=Number.isFinite(settings.speechRate)?Math.max(.5,Math.min(1.2,settings.speechRate!)):.9;
  let utterance=0;
  const start=(chosen:SpeechSynthesisVoice|undefined,retry=false)=>{
   if(current!==request)return;const token=++utterance;let finished=false;
   const active=()=>current===request&&token===utterance&&!finished;
   const u=new SpeechSynthesisUtterance(text);u.lang=chosen?.lang||'zh-TW';if(chosen)u.voice=chosen;u.rate=rate;
   u.onstart=()=>{if(active())report('playing')};
   u.onend=()=>{if(!active())return;finished=true;report('done')};
   u.onerror=e=>{if(!active())return;finished=true;if(e.error==='canceled'||e.error==='interrupted'){report('error');return;}const fallback=resolveVoice(voices.filter(v=>v!==chosen));if(!retry&&chosen)start(fallback,true);else report('error')};
   try{synth.speak(u)}catch{if(active()){finished=true;report('error')}}
  };
  start(voice);
 };
 const voices=synth.getVoices();if(voices.length){play(voices);return true}
 let timer:ReturnType<typeof setTimeout>;const ready=()=>{const available=synth.getVoices();if(!available.length)return;cleanup();play(available)},cleanup=()=>{clearTimeout(timer);synth.removeEventListener('voiceschanged',ready);if(stopWaiting===cleanup)stopWaiting=undefined};stopWaiting=cleanup;synth.addEventListener('voiceschanged',ready);timer=setTimeout(()=>{cleanup();play(synth.getVoices())},500);return true;
}
