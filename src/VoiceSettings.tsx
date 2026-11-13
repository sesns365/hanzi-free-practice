'use client';
import {useEffect,useRef,useState} from 'react';
import SpeechRateControl from './SpeechRateControl';
import {Volume2} from 'lucide-react';
import {chineseVoices,resolveVoice,speakText,cancelSpeech,SpeechOptions,SpeechStatus,hasTaiwanVoice} from './speech';

export default function VoiceSettings({settings,onChange,hideRate=false}:{hideRate?:boolean;settings:SpeechOptions;onChange:(change:SpeechOptions)=>void}){
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[supported,setSupported]=useState(true),[status,setStatus]=useState<SpeechStatus|null>(null);
 const generation=useRef(0),active=useRef(false);
 const settingsKey=JSON.stringify([settings.speechVoiceURI,settings.speechVoiceName,settings.speechVoiceLang,settings.speechRate]);
 useEffect(()=>{
  if(!('speechSynthesis'in window)){setSupported(false);return}
  const synth=window.speechSynthesis,refresh=()=>setVoices(chineseVoices(synth.getVoices()));refresh();synth.addEventListener('voiceschanged',refresh);
  return()=>synth.removeEventListener('voiceschanged',refresh);
 },[]);
 useEffect(()=>{
  setStatus(null);
  return()=>{generation.current++;if(active.current){active.current=false;cancelSpeech()}};
 },[settingsKey]);
 const preview=()=>{
  const token=++generation.current;active.current=true;setStatus('loading');
  speakText('今天一起練習生字，注意每個部件的位置。',settings,value=>{
   if(token!==generation.current)return;
   active.current=value==='loading'||value==='playing';setStatus(value==='cancelled'?null:value);
  });
 };
 const selected=settings.speechVoiceURI||'',available=voices.some(v=>v.voiceURI===selected),fallback=resolveVoice(voices,settings);
 const message=status==='loading'?'正在準備語音…':status==='playing'?'正在試聽…':status==='done'?'試聽完成；確定後請儲存教學設定。':status==='error'?'語音暫時無法播放，請再按「試聽語音」重試，或改選其他聲音。':'';
 return <section className="bg-white rounded-2xl border p-5 space-y-4">
  <h3 className="text-xl font-bold">語詞報讀語音</h3>
  <div className="flex flex-wrap items-end gap-4">
   <label className="min-w-64 flex-1">報讀聲音<select className="block w-full border-2 rounded-xl p-2 mt-1" value={selected} disabled={!supported} onChange={e=>{const v=voices.find(v=>v.voiceURI===e.target.value);onChange({speechVoiceURI:v?.voiceURI||'',speechVoiceName:v?.name||'',speechVoiceLang:v?.lang||'zh-TW'});setStatus(null)}}>
    <option value="">自動選擇（優先臺灣華語）</option>{selected&&!available&&<option value={selected}>{settings.speechVoiceName||'老師指定語音'}（此裝置未提供）</option>}{voices.map(v=><option value={v.voiceURI} key={v.voiceURI}>{v.name}（{v.lang}）</option>)}
   </select></label>
   {!hideRate&&<div className="min-w-64"><label htmlFor="voice-speech-rate">報讀速度</label><SpeechRateControl id="voice-speech-rate" value={settings.speechRate??.9} onChange={speechRate=>onChange({speechRate})}/></div>}
   <button type="button" disabled={!supported} className="border-2 rounded-xl px-4 py-2 bg-white font-bold disabled:opacity-40" onClick={preview}><Volume2 className="inline mr-2" size={18}/>試聽語音</button>
  </div>
  <p className="text-sm text-slate-600">套用至練習、語詞報讀與新開始的後測。語音依裝置提供；學生裝置若沒有指定聲音，會改用可用的華語語音。</p>
  {!supported?<p role="status">此瀏覽器不支援報讀，請改用支援語音的瀏覽器或裝置。</p>:selected&&!available&&fallback?<p role="status">本機試聽會使用：{fallback.name}。</p>:voices.length===0?<p role="status">尚未載入其他中文語音，目前使用系統預設報讀。</p>:null}
  {supported&&voices.length>0&&!hasTaiwanVoice(voices)&&<p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">這台裝置沒有臺灣華語語音，報讀會改用其他地區的華語，部分字詞讀音可能和課本不同。學生使用的平板或電腦也可能如此，建議先在學生裝置上按「聽語詞」試聽；需要時可在裝置的語言設定中加入「中文（臺灣）」語音。</p>}
  {message&&<p role={status==='error'?'alert':'status'} className={status==='error'?'text-red-800':'text-blue-800'}>{message}</p>}
 </section>;
}
