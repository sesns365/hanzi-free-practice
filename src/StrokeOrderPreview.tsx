// @ts-nocheck
"use client";
import React,{useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,X} from 'lucide-react';
import {loadHanziWriter} from './hanzi-writer';
import {playStrokeOrder,preloadStrokeNames,strokeDelay} from './stroke-playback';
const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 bg-white px-4 py-2 font-bold hover:bg-blue-50 disabled:opacity-40';

export default function StrokeOrderPreview({char,data,animationSpeed=1,gridLineOpacity=.4,settings,onClose}){
 const dialog=useRef(null),box=useRef(null),writer=useRef(null),generation=useRef(0);
 const [attempt,setAttempt]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[playing,setPlaying]=useState(false),[paused,setPaused]=useState(false),[strokeLabel,setStrokeLabel]=useState('');
 const pauseRef=useRef(false);pauseRef.current=paused;
 useEffect(()=>{preloadStrokeNames(settings)},[settings?.strokeNarration]);
 const stop=()=>{generation.current++;writer.current?.pauseAnimation();writer.current?.hideCharacter();};
 const play=()=>{
  if(!writer.current)return;
  const token=++generation.current;setError('');setPlaying(true);setPaused(false);setStrokeLabel('');
  try{playStrokeOrder(writer.current,{char,count:data?.strokes?.length||0,settings:{...settings,animationSpeed},active:()=>token===generation.current,paused:()=>pauseRef.current,onStroke:(i,name)=>setStrokeLabel(`第 ${i+1} 筆${name?'：'+name:''}`),onComplete:()=>{setPlaying(false);setPaused(false);setStrokeLabel('');}})}
  catch{stop();setPlaying(false);setError('筆順暫時無法播放，可以重試，或關閉後繼續塗色。');}
 };
 useEffect(()=>{
  const element=dialog.current;element?.showModal?.();
  return()=>element?.close?.();
 },[]);
 useEffect(()=>{
  let cancelled=false;stop();setLoading(true);setError('');setPlaying(false);setPaused(false);
  loadHanziWriter().then(H=>{
   if(cancelled||!box.current)return;
   box.current.innerHTML='';
   writer.current=H.create(box.current,char,{width:400,height:400,padding:24,showCharacter:false,showOutline:false,strokeColor:'#2456a6',strokeAnimationSpeed:animationSpeed,delayBetweenStrokes:strokeDelay(animationSpeed),charDataLoader:(_,ok)=>ok(data)});
   // HanziWriter sets fixed dimensions only; its coordinate system must shrink with the dialog.
   box.current.querySelector?.('svg')?.setAttribute('viewBox','0 0 400 400');
   setLoading(false);play();
  }).catch(()=>{if(!cancelled){setLoading(false);setError('筆順暫時無法載入，可以重試，或關閉後繼續塗色。');}});
  return()=>{cancelled=true;stop();writer.current=null;};
 },[char,data,animationSpeed,attempt]);
 const close=()=>{stop();onClose();};
 return <dialog ref={dialog} aria-label={`「${char}」筆順示範`} onCancel={event=>{event.preventDefault();close();}} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(92vw,28rem)] overflow-y-auto overscroll-contain rounded-2xl border-2 border-blue-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
  <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">看筆順</h2><button type="button" className={button} onClick={close} autoFocus><X size={20} aria-hidden="true"/>關閉</button></div>
  <div className="relative mx-auto aspect-square w-full max-w-80 overflow-hidden rounded-xl border-2 border-[#c76868] bg-white" aria-label="筆順示範">
   <svg viewBox="0 0 400 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"><path d="M200 0V400M0 200H400" stroke="#b91c1c" strokeOpacity={gridLineOpacity} strokeDasharray="6 6"/></svg>
   <div ref={box} className="writer-layer absolute inset-0 pointer-events-none"/>
  </div>
  <p role={error?'alert':'status'} className={'my-3 text-center font-bold '+(error?'text-red-800':'text-blue-900')}>{error||(loading?'正在載入筆順…':playing?paused?'筆順已暫停。':strokeLabel||'跟著筆順看起點、方向與位置。':'筆順播放完成，可以關閉後繼續塗色。')}</p>
  <div className="flex flex-wrap justify-center gap-2">{error?<button type="button" className={button} onClick={()=>setAttempt(v=>v+1)}><RotateCcw size={18} aria-hidden="true"/>重試筆順</button>:playing?<button type="button" className={button} onClick={()=>{if(paused)writer.current?.resumeAnimation();else writer.current?.pauseAnimation();setPaused(v=>!v);}}>{paused?<Play size={18} aria-hidden="true"/>:<Pause size={18} aria-hidden="true"/>}{paused?'繼續播放':'暫停播放'}</button>:<button type="button" className={button} disabled={loading} onClick={play}><RotateCcw size={18} aria-hidden="true"/>再看一次</button>}</div>
  <p className="mt-3 text-center text-sm text-slate-600">關閉後會保留已塗顏色與部首檢查結果。</p>
 </dialog>;
}
