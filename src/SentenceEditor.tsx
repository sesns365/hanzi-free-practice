'use client';
import {useRef} from 'react';
import {RotateCcw,Volume2} from 'lucide-react';
import {sentenceSpeech,sentenceText} from './curriculum-settings';
import {speakText,SpeechOptions} from './speech';

const button='inline-flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 font-bold disabled:opacity-40';
export default function SentenceEditor({entry,originalSentence,onChange,settings,disabled=false}:{entry:any;originalSentence:string;onChange:(value:string)=>void;settings?:SpeechOptions;disabled?:boolean}){
 const textarea=useRef<HTMLTextAreaElement>(null),sentence=entry.sentence||'',valid=!sentence.trim()||sentence.includes('[  ]');
 function insertWord(){
  const input=textarea.current;if(!input||disabled)return;
  const start=input.selectionStart??sentence.length,end=input.selectionEnd??start;
  onChange(sentence.slice(0,start)+'[  ]'+sentence.slice(end));
  requestAnimationFrame(()=>{input.focus();input.setSelectionRange(start+4,start+4)});
 }
 return <div className="rounded-2xl border bg-white p-5 space-y-4">
  <h3 className="font-bold text-xl">語詞例句</h3>
  <p id="sentence-help" className="text-sm text-slate-600">用下方按鈕插入語詞位置 [  ]，預覽與報讀會自動填入「{entry.word}」。留白則不提供例句。</p>
  <label className="block font-bold" htmlFor="teaching-sentence">編輯例句</label>
  <textarea ref={textarea} id="teaching-sentence" rows={3} maxLength={300} value={sentence} disabled={disabled} aria-describedby="sentence-help sentence-feedback" aria-invalid={!valid} onChange={e=>onChange(e.target.value)} className="block w-full rounded-xl border-2 p-3 font-normal disabled:bg-slate-100"/>
  <div className="flex flex-wrap gap-3">
   <button type="button" className={button} disabled={disabled||sentence.length>296} onMouseDown={e=>e.preventDefault()} onClick={insertWord}>插入語詞位置</button>
   <button type="button" className={button} disabled={disabled||!sentence.trim()||!valid} onClick={()=>speakText(sentenceSpeech(entry),settings)}><Volume2 size={18}/>試聽例句</button>
   <button type="button" className={button} disabled={disabled||sentence===originalSentence} onClick={()=>onChange(originalSentence)}><RotateCcw size={18}/>恢復預設例句</button>
  </div>
  <p id="sentence-feedback" role="status" className={'text-sm '+(valid?'text-slate-600':'text-red-800')}>{valid?'修改後請按「儲存本字教材」；恢復例句只調整這個欄位。':'請用「插入語詞位置」標記語詞，再試聽或儲存。'}</p>
  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-bold text-blue-900">例句預覽</p><p className="mt-2 whitespace-pre-wrap break-words text-lg leading-relaxed">{sentence.trim()?sentenceText(entry):'本字不提供例句。'}</p></div>
 </div>;
}
