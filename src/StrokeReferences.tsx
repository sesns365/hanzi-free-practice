'use client';
import {useState} from 'react';
export default function StrokeReferences({character}:{character?:string}){
 const [message,setMessage]=useState('');
 return <details className="rounded-xl border p-4 text-sm text-slate-600"><summary className="font-bold cursor-pointer text-slate-900">教育部筆順查詢</summary><div className="mt-3 space-y-3"><p>參考來源：教育部。</p><div className="flex flex-wrap gap-3 items-center">{character&&<button type="button" className="border-2 rounded-lg bg-white p-2 font-bold text-blue-900" onClick={async()=>{try{await navigator.clipboard.writeText(character);setMessage(`已複製「${character}」，可貼到參考網站查詢。`)}catch{setMessage(`請複製「${character}」到參考網站查詢。`)}}}>複製「{character}」</button>}<a className="underline text-blue-900" href="https://stroke-order.learningweb.moe.edu.tw/searchW.jsp?la=0" target="_blank" rel="noreferrer">教育部筆順查詢</a></div>{message&&<p role="status">{message}</p>}</div></details>;
}
