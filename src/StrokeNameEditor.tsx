// @ts-nocheck
'use client';
// 老師更正筆畫名稱：系統的筆畫名稱是依筆形判斷的，念錯時可在這裡逐筆改成課堂上的說法。
import React,{useEffect,useMemo,useState} from 'react';
import CurriculumPicker from './CurriculumPicker';
import {teachingCurriculum} from './curriculum-settings';
import {loadStrokeData} from './stroke-data';
import {strokeNamesFor,STROKE_NAMES,chineseNumber,strokeSpeechName} from './stroke-names';
import {speakText} from './speech';
import counts from './stroke-counts.json';
const button='rounded-xl border-2 bg-white px-3 py-2 font-bold disabled:opacity-40';
export default function StrokeNameEditor({settings,own={},disabled=false,onChange}){
 const lessons=useMemo(()=>teachingCurriculum(settings?.entryOverrides,settings?.customEntries,false,settings?.customLessons),[settings?.entryOverrides,settings?.customEntries,settings?.customLessons]);
 const keys=Object.keys(lessons),chars=id=>[...new Set((lessons[id]||[]).map(e=>e.word[e.targetIdx]).filter(c=>counts[c]))];
 const [lesson,setLesson]=useState(keys[0]),[char,setChar]=useState(()=>chars(keys[0])[0]||''),[data,setData]=useState(null),[defaults,setDefaults]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let stop=false;setData(null);setDefaults(null);setError('');if(!char)return;Promise.all([loadStrokeData(char),strokeNamesFor(char,counts[char])]).then(([d,names])=>{if(!stop){setData(d);setDefaults(names)}}).catch(e=>{if(!stop)setError(e.message)});return()=>{stop=true}},[char]);
 const fixed=settings?.strokeNameOverrides?.[char],custom=Array.isArray(fixed)&&fixed.length===counts[char],names=custom?fixed:defaults;
 const set=(index,name)=>{if(disabled||!data)return;const next=[...(names||Array(data.strokes.length).fill('橫'))];next[index]=name;onChange({...own,[char]:next})};
 const reset=()=>{if(disabled)return;onChange({...own,[char]:null})};
 const listen=()=>{if(names)speakText(names.map((name,i)=>chineseNumber(i+1)+'，'+strokeSpeechName(name)).join('。'),settings)};
 const changed=Object.entries(settings?.strokeNameOverrides||{}).filter(([,v])=>Array.isArray(v)).map(([c])=>c);
 return <div className="space-y-4">
  <p className="text-sm text-slate-600">名稱和課堂用語不同時，從選單改掉，改了就會自動儲存。</p>
  {!!changed.length&&<p className="text-sm text-slate-700">已更正的字：{changed.map(c=><button type="button" key={c} className="hanzi-kai mx-1 text-lg underline" onClick={()=>setChar(c)}>{c}</button>)}</p>}
  <CurriculumPicker includeCustom={false} lesson={lesson} onChange={id=>{setLesson(id);setChar(chars(id)[0]||'')}}/>
  <div className="flex flex-wrap gap-2">{chars(lesson).map(c=><button type="button" key={c} aria-pressed={char===c} className={button+' text-xl'+(char===c?' border-blue-600 text-blue-800':'')+(Array.isArray(settings?.strokeNameOverrides?.[c])?' bg-sky-100':'')} onClick={()=>setChar(c)}>{c}</button>)}</div>
  {!char?<p>這一課沒有可設定的字。</p>:error?<p role="alert" className="text-red-800">{error}</p>:!data?<p role="status">正在載入筆畫…</p>:<>
   <div className="flex flex-wrap items-center gap-3"><b className="text-lg">「{char}」共 {data.strokes.length} 筆・{custom?'已更正':'系統名稱'}</b><button type="button" className={button} onClick={listen}>🔊 試聽整個字</button>{custom&&<button type="button" className={button} disabled={disabled} onClick={reset}>改回系統名稱</button>}</div>
   {!names&&<p className="text-amber-900">這個字沒有系統筆畫名稱，播放時只會念第幾筆；可以在下面逐筆選擇名稱。</p>}
   <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.strokes.map((_,i)=><li key={i} className="flex items-center gap-3 rounded-xl border p-2"><svg viewBox="0 0 1100 1100" className="h-20 w-20 shrink-0 rounded-lg border bg-white" aria-hidden="true"><g transform="translate(38,955) scale(1,-1)">{data.strokes.map((p,j)=><path key={j} d={p} fill={j===i?'#dc2626':j<i?'#94a3b8':'#e2e8f0'}/>)}</g></svg><label className="min-w-0 flex-1 font-bold">第 {i+1} 筆<select className="mt-1 block w-full rounded-lg border-2 bg-white p-2 font-normal disabled:bg-slate-100" disabled={disabled} value={names?.[i]||''} onChange={e=>set(i,e.target.value)}>{!names&&<option value="">（未設定）</option>}{STROKE_NAMES.map(name=><option key={name} value={name}>{name}</option>)}</select></label></li>)}</ol></>}
 </div>;
}
