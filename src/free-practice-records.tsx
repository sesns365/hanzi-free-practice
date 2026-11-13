'use client';
import React,{useCallback,useEffect,useState} from 'react';
const baseKey='character-writing-free-records-v1';
// 登入的學生各自分開存放，避免共用平板時看到上一位同學的筆跡；未登入的訪客沿用原本位置。
const storageKey=(owner?:string)=>owner?baseKey+':'+owner:baseKey;
// 字跡圖片只保留最近幾筆，避免佔滿瀏覽器儲存空間；較舊的紀錄仍保留字、課次與時間。
export const MAX_SAVED_INK=60;
// 同一台裝置（所有學生合計）的字跡紀錄上限，保留空間給練習進度使用。
export const DEVICE_RECORD_CHARS=1500000;
function otherOwnersChars(key:string){let total=0;try{for(let i=0;i<(localStorage.length||0);i++){const k=localStorage.key?.(i);if(k&&k!==key&&k.startsWith(baseKey))total+=(localStorage.getItem(k)||'').length}}catch{}return total}
type RecordItem={id:string;character:string;book:string;lesson:string;at:string;ink?:string;sentAt?:string;writing?:{mode:string;lines:number[][][]}};
function read(key:string):RecordItem[]{const raw=localStorage.getItem(key);if(!raw)return [];const parsed=JSON.parse(raw);if(!Array.isArray(parsed))throw Error('invalid records');return parsed.filter(r=>r&&typeof r.id==='string'&&typeof r.character==='string'&&typeof r.book==='string'&&typeof r.lesson==='string'&&typeof r.at==='string')}
function keepRecentInk(list:RecordItem[]){let count=0;return list.map(r=>{if(!r.ink)return r;count++;if(count<=MAX_SAVED_INK)return r;const {ink,writing,...rest}=r;return rest})}
export function useFreePracticeRecords(owner?:string){
 const key=storageKey(owner);
 const [records,setRecords]=useState<RecordItem[]>([]),[error,setError]=useState('');
 useEffect(()=>{try{setRecords(read(key));setError('')}catch{setRecords([]);setError('無法讀取本機紀錄，請確認瀏覽器儲存功能。')}},[key]);
 const add=useCallback((character:string,book:string,lesson:string)=>{try{const id=crypto.randomUUID(),next=[{id,character,book,lesson,at:new Date().toISOString()},...read(key)];localStorage.setItem(key,JSON.stringify(next));setRecords(next);setError('');return id}catch{setError('無法儲存本機紀錄，請確認瀏覽器儲存空間。');return null}},[key]);
 const saveInk=useCallback((id:string,ink:string,writing?:RecordItem['writing'])=>{try{const old=read(key);if(!old.some(r=>r.id===id))throw Error('missing');const next=keepRecentInk(old.map(r=>r.id===id?{...r,ink,...(writing?{writing}:{})}:r)),text=JSON.stringify(next);if(text.length+otherOwnersChars(key)>DEVICE_RECORD_CHARS){setError('這台裝置保存的字跡已經太多，請先下載字跡總表，再刪除舊紀錄。');return false}localStorage.setItem(key,text);setRecords(next);setError('');return true}catch{setError('字跡未存入，請確認瀏覽器儲存空間，或先刪除舊紀錄。');return false}},[key]);
 const remove=useCallback((id:string)=>{try{const next=read(key).filter(r=>r.id!==id);localStorage.setItem(key,JSON.stringify(next));setRecords(next);setError('')}catch{setError('無法刪除本機紀錄，請稍後再試。')}},[key]);
 // 只清除目前使用者（這位學生、老師或訪客）的紀錄，不影響同一台裝置上的其他人。
 const removeAll=useCallback(()=>{try{localStorage.setItem(key,'[]');setRecords([]);setError('')}catch{setError('無法刪除本機紀錄，請稍後再試。')}},[key]);
 // 記下已交給老師的字跡，避免重複交。
 const markSent=useCallback((id:string)=>{try{const next=read(key).map(r=>r.id===id?{...r,sentAt:new Date().toISOString()}:r);localStorage.setItem(key,JSON.stringify(next));setRecords(next)}catch{}},[key]);
 return {records,error,add,remove,removeAll,saveInk,markSent};
}

const timeText=(iso:string)=>new Date(iso).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'});
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
function download(href:string,name:string){const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();if(href.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(href),1000)}
// 開頭是 = + - @ 的內容先加上單引號，避免 Excel 當成公式執行。
const csvCell=(raw:string)=>{const value=/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw;return /[",\n\r]/.test(value)?'"'+value.replace(/"/g,'""')+'"':value};
/** 紀錄清單（CSV，Excel 可直接開啟）。 */
export function recordsCsv(records:RecordItem[]){return '﻿'+[['國字','教材','課次','練習時間','保存字跡'],...records.map(r=>[r.character,r.book,r.lesson,timeText(r.at),r.ink?'有':'無'])].map(row=>row.map(csvCell).join(',')).join('\r\n')}
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})}
/** 把有保存字跡的紀錄排成一張總表圖片，方便老師列印或放入學習歷程。 */
export async function inkSheet(records:RecordItem[]){
 const inked=records.filter(r=>r.ink);if(!inked.length)return null;
 const cols=Math.min(5,inked.length),cell=220,label=52,pad=28,head=104,rows=Math.ceil(inked.length/cols);
 const canvas=document.createElement('canvas');canvas.width=pad*2+cols*cell;canvas.height=head+rows*(cell+label)+pad;
 const ctx=canvas.getContext('2d')!;const font='"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#0f172a';ctx.font=`bold 30px ${font}`;ctx.fillText('自由練習字跡紀錄',pad,50);
 ctx.font=`18px ${font}`;ctx.fillStyle='#334155';ctx.fillText(`下載日期：${today()}　共 ${inked.length} 個字`,pad,84);
 for(let i=0;i<inked.length;i++){
  const r=inked[i],x=pad+(i%cols)*cell,y=head+Math.floor(i/cols)*(cell+label);
  try{ctx.drawImage(await loadImage(r.ink!),x+8,y+8,cell-16,cell-16)}catch{}
  ctx.strokeStyle='#94a3b8';ctx.lineWidth=2;ctx.strokeRect(x+8,y+8,cell-16,cell-16);
  ctx.fillStyle='#0f172a';ctx.font=`bold 20px ${font}`;ctx.textAlign='center';ctx.fillText(`${r.character}　${new Date(r.at).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}`,x+cell/2,y+cell+28);ctx.textAlign='left';
 }
 return canvas.toDataURL('image/png');
}

const small='rounded-lg border px-3 py-1 font-bold';
export function FreePracticeRecords({records,error,remove,removeAll,onSubmit,onLoad}:{records:RecordItem[];error:string;remove:(id:string)=>void;removeAll?:()=>void;onSubmit?:(record:RecordItem)=>Promise<boolean>;onLoad?:(record:RecordItem)=>void}){
 const [status,setStatus]=useState(''),[sending,setSending]=useState(false);
 const unsent=records.filter(r=>r.ink&&!r.sentAt);
 const submit=async(list:RecordItem[])=>{if(!onSubmit||!list.length)return;setSending(true);setStatus('正在交給老師…');let ok=0;for(const r of list){if(await onSubmit(r))ok++;else break}setSending(false);setStatus(ok===list.length?`已交給老師 ${ok} 個字。`:`已交 ${ok} 個字，其餘暫時無法送出，請稍後再試。`)};
 const inkedCount=records.filter(r=>r.ink).length;
 const downloadSheet=async()=>{setStatus('正在製作字跡總表…');try{const href=await inkSheet(records);if(!href){setStatus('目前沒有保存字跡的紀錄。');return}download(href,`自由練習字跡總表_${today()}.png`);setStatus('已下載字跡總表。')}catch{setStatus('字跡總表製作失敗，請再試一次。')}};
 const downloadList=()=>{try{download(URL.createObjectURL(new Blob([recordsCsv(records)],{type:'text/csv;charset=utf-8'})),`自由練習紀錄_${today()}.csv`);setStatus('已下載紀錄清單。')}catch{setStatus('紀錄清單下載失敗，請再試一次。')}};
 const clearAll=()=>{if(removeAll&&window.confirm(`要刪除全部 ${records.length} 筆練習紀錄和字跡嗎？刪除後無法復原；需要保存的話，請先下載。`)){removeAll();setStatus('已刪除全部本機練習紀錄。')}};
 return <details className="rounded-xl border border-violet-200 bg-white p-3"><summary className="cursor-pointer font-bold">本機練習紀錄（{records.length}）</summary><p className="mt-2 text-sm text-slate-600">星星記錄本次進度；保存的字跡留在這台裝置的瀏覽器，清除瀏覽器資料可能一併刪除。</p>{error&&<p role="alert" className="mt-2 text-red-800">{error}</p>}
  {records.length>0&&<div className="mt-3 space-y-2"><div className="flex flex-wrap gap-2" role="group" aria-label="本機練習紀錄工具"><button type="button" className={small+' border-violet-700 text-violet-900'} disabled={!inkedCount} onClick={downloadSheet}>下載字跡總表（{inkedCount} 字）</button><button type="button" className={small+' border-violet-700 text-violet-900'} onClick={downloadList}>下載紀錄清單（Excel 可開啟）</button>{onSubmit&&<button type="button" className={small+' border-green-700 text-green-800'} disabled={sending||!unsent.length} onClick={()=>submit(unsent)}>全部交給老師（{unsent.length} 字）</button>}{removeAll&&<button type="button" className={small+' border-red-700 text-red-800'} onClick={clearAll}>刪除全部紀錄</button>}</div><p className="text-sm text-slate-600">字跡圖片只保留最近 {MAX_SAVED_INK} 個字；較舊的紀錄仍會保留字和時間。</p></div>}
  {status&&<p role="status" className="mt-2 text-sm text-violet-900">{status}</p>}
  {records.length?<ul className="mt-2 max-h-96 overflow-y-auto divide-y">{records.map(r=><li className="py-2" key={r.id}><div className="flex flex-wrap items-center gap-2"><strong className="text-xl">{r.character}</strong><span className="min-w-0 flex-1 text-sm">{r.book}・{r.lesson}・{timeText(r.at)}</span>{onLoad&&r.writing&&<button type="button" className={small+' border-violet-700 text-violet-900'} aria-label={'載入'+r.character+'的紀錄'} onClick={()=>onLoad(r)}>載入紀錄</button>}{onSubmit&&r.ink&&(r.sentAt?<span className="text-sm font-bold text-green-800">已交給老師</span>:<button type="button" className={small+' border-green-700 text-green-800'} disabled={sending} aria-label={`把${r.character}的字跡交給老師`} onClick={()=>submit([r])}>交給老師</button>)}{r.ink&&<button type="button" className={small} aria-label={`下載${r.character}的字跡`} onClick={()=>download(r.ink!,`${r.character}_手寫字跡_${new Date(r.at).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'})}.${r.ink!.startsWith('data:image/png')?'png':'jpg'}`)}>下載</button>}<button type="button" className={small} aria-label={`刪除${r.character}的練習紀錄`} onClick={()=>{if(window.confirm('刪除這筆紀錄及其中保存的字跡？'))remove(r.id)}}>刪除</button></div>{r.ink&&<details className="mt-2"><summary className="cursor-pointer text-blue-800">查看字跡</summary><img src={r.ink} alt={`${r.character}的手寫字跡`} className="mt-2 w-48 max-w-full rounded border"/></details>}</li>)}</ul>:<p className="mt-2 text-sm">尚無紀錄</p>}</details>
}
