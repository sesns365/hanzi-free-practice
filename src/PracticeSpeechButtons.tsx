'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2} from 'lucide-react';
import {practiceSpeech,PracticeSpeechSettings} from './practice-speech';
import {speakText,cancelSpeech,SpeechOptions,SpeechStatus,chineseVoices,hasTaiwanVoice} from './speech';

export default function PracticeSpeechButtons({entry,settings={}}:{entry:any;settings?:PracticeSpeechSettings&SpeechOptions}){
 const word=practiceSpeech(entry,settings,'word'),sentence=practiceSpeech(entry,settings,'sentence');
 const [supported,setSupported]=useState(true),[status,setStatus]=useState<SpeechStatus|null>(null),[label,setLabel]=useState('');
 const generation=useRef(0),active=useRef(false);
 const speechKey=JSON.stringify([entry?.id,entry?.targetIdx,word,sentence,settings.speechVoiceURI,settings.speechVoiceName,settings.speechVoiceLang,settings.speechRate]);
 const [missingTaiwanVoice,setMissingTaiwanVoice]=useState(false);
 useEffect(()=>{setSupported('speechSynthesis'in window)},[]);
 // 裝置沒有臺灣華語語音時，提醒發音可能和課本不同。
 useEffect(()=>{if(typeof window==='undefined'||!('speechSynthesis'in window))return;const synth=window.speechSynthesis;const check=()=>{const all=synth.getVoices();setMissingTaiwanVoice(all.length>0&&!hasTaiwanVoice(chineseVoices(all)))};check();synth.addEventListener?.('voiceschanged',check);return()=>synth.removeEventListener?.('voiceschanged',check)},[]);
 useEffect(()=>{
  setStatus(null);setLabel('');
  return()=>{generation.current++;if(active.current){active.current=false;cancelSpeech()}};
 },[speechKey]);
 const play=(text:string,buttonLabel:string)=>{
  const token=++generation.current;active.current=true;setLabel(buttonLabel);setStatus('loading');
  speakText(text,settings,value=>{
   if(token!==generation.current)return;
   active.current=value==='loading'||value==='playing';setStatus(value==='cancelled'?null:value);
  });
 };
 if(!word&&!sentence)return null;
 const message=!supported?'此瀏覽器不支援報讀，請老師協助。':status==='loading'?'正在準備語音…':status==='playing'?`${label}播放中…`:status==='done'?'報讀完成。':status==='error'?`語音暫時無法播放，請再按「${label}」重試。`:'';
 return <div className="flex flex-wrap justify-center gap-3" role="group" aria-label="書寫練習報讀">
  {([['word','聽語詞',word],['sentence','聽例句',sentence]] as const).filter(([, ,text])=>text).map(([kind,buttonLabel,text])=><button key={kind} type="button" disabled={!supported} aria-pressed={label===buttonLabel&&(status==='loading'||status==='playing')} className={'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-base font-bold hover:bg-blue-50 disabled:opacity-40 '+(label===buttonLabel&&(status==='loading'||status==='playing')?'border-blue-600 bg-blue-100 text-blue-900':'bg-white')} onClick={()=>play(text,buttonLabel)}><Volume2 size={20}/>{buttonLabel}</button>)}
  {supported&&missingTaiwanVoice&&<p className="speech-toast speech-toast-note">這台裝置沒有臺灣語音，讀音可能和課本不一樣，請以老師的讀音為準。</p>}
  {message&&<p role={status==='error'?'alert':'status'} className={status==='error'?'speech-toast':'sr-only'}>{message}</p>}
 </div>;
}
