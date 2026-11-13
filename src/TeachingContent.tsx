// @ts-nocheck
"use client";
import {speakText,cancelSpeech} from './speech';
import React,{useEffect,useState,useRef} from 'react';
import {Volume2,Save} from 'lucide-react';
import {curriculumEntries,validateTeachingEntry,wordSpeech,targetSpeech} from './curriculum-settings';
import {speechOverridesAfterEdit} from './custom-import';
import CurriculumPicker from './CurriculumPicker';
import {RubyWord} from './Zhuyin';
import SentenceEditor from './SentenceEditor';
const button='border-2 rounded-xl px-4 py-2 bg-white font-bold disabled:opacity-40';
const keys=[...new Set(curriculumEntries.map(e=>e.lesson))];
const entryDraft=(id,override)=>({...curriculumEntries.find(e=>e.id===id),teachingNote:'',speechWord:'',speechCharacter:'',...override});
const copyOverride=value=>value?{...value}:null;
const reviewFields=[['word','練習語詞'],['targetIdx','目標生字位置'],['pinyin','語詞注音'],['sentence','例句'],['meaning','語詞解釋'],['teachingNote','教學提醒'],['speechWord','語詞報讀文字'],['speechCharacter','目標生字報讀文字']];
function reviewValue(entry,key){
 if(key==='targetIdx')return Number.isInteger(entry.targetIdx)&&entry.word?.[entry.targetIdx]?`第 ${entry.targetIdx+1} 字：${entry.word[entry.targetIdx]}`:'尚未選擇有效位置';
 if(key==='speechWord'&&!entry[key])return `使用練習語詞：${entry.word}`;
 if(key==='speechCharacter'&&!entry[key])return `使用目標生字：${entry.character}`;
 return entry[key]||'（留白）';
}
export default function TeachingContent({initial,api,onSaved,onDirty}){
 const firstId=curriculumEntries[0].id;
 const saveLock=useRef(false),dirtyRef=useRef(false),composing=useRef(null),baseline=useRef(copyOverride(initial?.entryOverrides?.[firstId])),overridesRef=useRef(initial?.entryOverrides||{}),reviewRef=useRef(null),reviewTitle=useRef(null),saveButton=useRef(null),focusAfterReview=useRef(false);
 const [overrides,setOverrides]=useState(initial?.entryOverrides||{}),[lesson,setLesson]=useState(keys[0]),[id,setId]=useState(firstId),[draft,setDraft]=useState(()=>entryDraft(firstId,initial?.entryOverrides?.[firstId])),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[review,setReview]=useState(null);
 const markDirty=value=>{dirtyRef.current=value;setDirty(value)};
 const original=curriculumEntries.find(e=>e.id===id);
 useEffect(()=>{onDirty?.(dirty||busy)},[dirty,busy,onDirty]);
 useEffect(()=>{
  const latest=initial?.entryOverrides||{};overridesRef.current=latest;setOverrides(latest);
  // Refresh the list, but keep the current draft's original comparison baseline.
  if(!dirtyRef.current&&!saveLock.current&&!reviewRef.current){baseline.current=copyOverride(latest[id]);setDraft(entryDraft(id,latest[id]));}
 },[initial?.entryOverrides]);
 useEffect(()=>{if(review){reviewTitle.current?.focus({preventScroll:true});reviewTitle.current?.scrollIntoView({block:'nearest'});}else if(focusAfterReview.current){focusAfterReview.current=false;saveButton.current?.focus();}},[review]);
 useEffect(()=>{const warn=e=>{if(dirtyRef.current||saveLock.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[]);
 const change=(k,v)=>{if(saveLock.current||reviewRef.current)return;cancelSpeech();setDraft(d=>({...d,[k]:v,...(['speechWord','speechCharacter'].includes(k)?{speechResetNote:''}:{})}));markDirty(true);setMessage('尚未儲存本字修改。')};
 const changeWord=(word,complete=false)=>{
  if(saveLock.current||reviewRef.current)return;cancelSpeech();const started=composing.current;
  setDraft(d=>{
   if(started&&!complete)return {...d,word};
   const previous=started||d;if(word===previous.word)return d.word===word?d:{...d,word};
   // Publisher entries have a fixed target character. Preserve its speech and manual annotations.
   const speech=speechOverridesAfterEdit({word:previous.word},{word,speechWord:d.speechWord});
   const targetIdx=word[previous.targetIdx]===original.character?previous.targetIdx:word.indexOf(original.character);
   return {...d,...speech,targetIdx};
  });markDirty(true);setMessage('尚未儲存本字修改。');
 };
 const choose=next=>{if(saveLock.current||reviewRef.current||composing.current||next===id)return;if(dirtyRef.current&&!window.confirm('本字修改尚未儲存，要離開本字嗎？'))return;cancelSpeech();setLesson(curriculumEntries.find(e=>e.id===next).lesson);setId(next);baseline.current=copyOverride(overridesRef.current[next]);setDraft(entryDraft(next,baseline.current));markDirty(false);setMessage('')};
 useEffect(()=>()=>cancelSpeech(),[]);
 const listen=text=>speakText(text,initial);
 const save=async reset=>{
  if(saveLock.current||reviewRef.current)return;if(composing.current){setMessage('請先完成中文選字，再儲存本字教材。');return;}saveLock.current=true;cancelSpeech();setBusy(true);
  try{
   const entry=reset?null:validateTeachingEntry(id,draft),r=await api({action:'saveTeachingEntry',id,entry,baseEntry:copyOverride(baseline.current)});
   overridesRef.current=r.entryOverrides;setOverrides(r.entryOverrides);baseline.current=copyOverride(r.entryOverrides[id]);setDraft(entryDraft(id,baseline.current));markDirty(false);
   const savedMessage=reset?'已恢復本字原始教材。':'本字教材已儲存在這台裝置，回到自由練習就會套用。';setMessage(savedMessage);
   try{await onSaved?.()}catch(e){setMessage(savedMessage+' 班級資料暫時無法更新，請稍後重新載入。');}
  }catch(e){
   if(e.response?.code==='teaching_entry_conflict'&&Object.hasOwn(e.response,'currentEntry')){const next={latest:copyOverride(e.response.currentEntry),reset};reviewRef.current=next;setReview(next);markDirty(true);setMessage('本字已在其他分頁更新，這次尚未儲存。請先比對下方內容。');}
   else setMessage(e.message);
  }finally{saveLock.current=false;setBusy(false)}
 };
 const resolveReview=useLatest=>{
  if(saveLock.current||!reviewRef.current)return;const current=reviewRef.current;baseline.current=copyOverride(current.latest);
  const next={...overridesRef.current};if(current.latest)next[id]=copyOverride(current.latest);else delete next[id];overridesRef.current=next;setOverrides(next);
  if(useLatest){setDraft(entryDraft(id,current.latest));markDirty(false);setMessage('已採用最新已儲存教材，不需要再儲存。');}
  else{markDirty(true);setMessage(current.reset?'已保留目前草稿。若仍要恢復原始教材，請再次按「恢復本字原始教材」；保留草稿則按「儲存本字教材」。':'已保留我的完整修改，尚未儲存。請確認後再按「儲存本字教材」。');}
  reviewRef.current=null;focusAfterReview.current=true;setReview(null);
 };
 if(!draft)return <p>載入逐字教材…</p>;
 return <section className="space-y-5"><fieldset disabled={busy||!!review} className="min-w-0 space-y-5"><div className="bg-white border rounded-2xl p-5 space-y-4"><h2 className="text-2xl font-bold">逐字教材與讀音</h2><p>修改書寫語詞、注音、例句和字形記憶提醒；本課生字保留原字。</p><CurriculumPicker includeCustom={false} lesson={lesson} onChange={l=>choose(curriculumEntries.find(x=>x.lesson===l).id)}/><div className="flex flex-wrap gap-2">{curriculumEntries.filter(e=>e.lesson===lesson).map(e=><button key={e.id} onClick={()=>choose(e.id)} className={button+(e.id===id?' border-blue-600 text-blue-800':'')}>{e.character}{overrides[e.id]&&<span className="text-xs ml-1">已自訂</span>}</button>)}</div></div>
 <div className="bg-white border rounded-2xl p-5 space-y-4"><h3 className="font-bold text-xl">「{original.character}」的教學內容</h3>{original.source==='supplement'&&<p className="text-amber-900 rounded-lg bg-amber-50 p-3">此語詞為參考題庫補充，請依課本確認語境與讀音後使用。{original.sourceWord&&`附件原詞：${original.sourceWord}`}</p>}<div className="grid md:grid-cols-2 gap-4"><label>練習語詞<input maxLength={8} value={draft.word} className="border-2 rounded-xl p-3 w-full block" onCompositionStart={()=>{if(!saveLock.current&&!reviewRef.current)composing.current={word:draft.word,targetIdx:draft.targetIdx}}} onCompositionEnd={e=>{changeWord(e.currentTarget.value,true);composing.current=null}} onChange={e=>changeWord(e.target.value)}/></label><label>目標生字位置<select value={draft.targetIdx} className="border-2 rounded-xl p-3 w-full block" onChange={e=>change('targetIdx',+e.target.value)}>{[...draft.word].map((c,i)=>c===original.character&&<option key={i} value={i}>第{i+1}字：{c}</option>)}</select></label></div>
 {draft.speechResetNote&&<p role="status" className="rounded-xl bg-amber-50 p-3 text-amber-900">{draft.speechResetNote}</p>}
 <label className="block">語詞注音（每字一組，以空格分隔；可修改破音字）<input value={draft.pinyin} maxLength={100} className="border-2 rounded-xl p-3 w-full block" onChange={e=>change('pinyin',e.target.value)}/></label><div className="flex flex-wrap gap-3 items-end">{[...draft.word].map((c,i)=><label key={i} className="text-xl">{c}<input aria-label={`${c}第${i+1}字注音`} className="block border rounded-lg p-2 text-base w-28" value={draft.pinyin.split(' ')[i]||''} onChange={e=>{const p=draft.pinyin.split(' ');p[i]=e.target.value.replace(/\s/g,'');change('pinyin',p.join(' '))}}/></label>)}</div>
 <label className="block">語詞解釋<textarea rows={2} maxLength={300} value={draft.meaning} onChange={e=>change('meaning',e.target.value)} className="border-2 rounded-xl p-3 w-full"/></label><label className="block">本字教學提醒／部件記憶口訣<textarea rows={2} maxLength={300} value={draft.teachingNote} onChange={e=>change('teachingNote',e.target.value)} className="border-2 rounded-xl p-3 w-full"/></label><p className="text-sm text-slate-600">語詞解釋與教學提醒會出現在自由練習的「看詞義與老師說明」。</p></div>
 <SentenceEditor entry={draft} originalSentence={original.sentence||''} settings={initial} disabled={busy||!!review} onChange={sentence=>change('sentence',sentence)}/>
 <div className="bg-white border rounded-2xl p-5 space-y-4"><h3 className="font-bold text-xl">破音字報讀調整</h3><p>裝置若念錯，可在下方填同音字代讀，畫面仍保留原語詞；請試聽確認。</p><div className="grid md:grid-cols-2 gap-4"><label>語詞報讀文字（留白使用原語詞）<input maxLength={40} value={draft.speechWord} placeholder={draft.word} className="border-2 rounded-xl p-3 w-full" onChange={e=>change('speechWord',e.target.value)}/></label><label>目標生字報讀文字（留白使用原字）<input maxLength={12} value={draft.speechCharacter} placeholder={original.character} className="border-2 rounded-xl p-3 w-full" onChange={e=>change('speechCharacter',e.target.value)}/></label></div><div className="flex flex-wrap gap-3"><button className={button} onClick={()=>listen(wordSpeech(draft))}><Volume2 size={18} className="inline mr-2"/>試聽語詞</button><button className={button} onClick={()=>listen(targetSpeech(draft))}><Volume2 size={18} className="inline mr-2"/>試聽目標字指示</button></div><div className="border rounded-xl p-4"><span className="text-sm">學生語詞預覽</span><div className="text-4xl py-3"><RubyWord word={draft.word} pinyin={draft.pinyin}/></div></div></div>
 </fieldset>{review&&<section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5 space-y-4" aria-label="比對本字最新教材"><h3 ref={reviewTitle} tabIndex={-1} className="font-bold text-xl outline-none">本字已在其他分頁更新</h3><p>目前草稿完整保留。請比對後選擇要保留的版本；保留我的修改後，仍需再按儲存才會套用。</p>{review.latest===null&&<p className="font-bold">最新版本已恢復為原始教材。</p>}<div className="space-y-3">{reviewFields.map(([key,label])=><div key={key} className="rounded-xl border bg-white p-3"><h4 className="font-bold">{label}</h4><div className="mt-2 grid gap-3 md:grid-cols-2">{[['我的修改',draft],['最新已儲存教材',entryDraft(id,review.latest)]].map(([title,entry])=><div key={title} className="min-w-0"><p className="text-sm text-slate-600">{title}</p><p className="mt-1 whitespace-pre-wrap break-words">{reviewValue(entry,key)}</p></div>)}</div></div>)}</div><div className="flex flex-wrap gap-3"><button type="button" className={button+' border-blue-700 text-blue-800'} disabled={busy} onClick={()=>resolveReview(false)}>保留我的修改，稍後儲存</button><button type="button" className={button} disabled={busy} onClick={()=>resolveReview(true)}>採用最新已儲存教材</button></div></section>}<div className="sticky bottom-0 bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-center"><button ref={saveButton} disabled={busy||!!review} className={button+' border-blue-700 text-blue-800'} onClick={()=>save(false)}><Save className="inline mr-2" size={18}/>{busy?'儲存中…':'儲存本字教材'}</button><button disabled={busy||!!review} className={button} onClick={()=>{if(saveLock.current||reviewRef.current)return;if(window.confirm('要恢復本字的原始教材嗎？'))return save(true)}}>恢復本字原始教材</button><p role="status" className="text-blue-800">{message}</p></div></section>;
}
