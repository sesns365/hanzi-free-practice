import React from 'react';
export function Zhuyin({text,highlightIndex,spaced=false}:{text:string;highlightIndex?:number;spaced?:boolean}){return <span className="inline-flex flex-wrap justify-center items-center gap-x-5 gap-y-3" style={spaced?{columnGap:"clamp(1.8rem, 6vw, 4.5rem)"}:undefined} aria-label={text}>{text.trim().split(/\s+/).map((syllable,i)=>{const symbols=syllable.replace(/[ˊˇˋ˙]/g,''),tone=syllable.match(/[ˊˇˋ˙]/)?.[0];return <span key={i} data-target={highlightIndex===i?'true':undefined} className={'relative inline-flex flex-col text-[.6em] leading-tight pr-[.6em] '+(highlightIndex===i?'text-blue-700':'')}>{tone==='˙'&&<span className="text-center leading-none">˙</span>}{[...symbols].map((c,j)=><span key={j} className="relative">{c}{j===symbols.length-1&&tone&&tone!=='˙'&&<span className="absolute left-full -top-[.15em]">{tone}</span>}</span>)}</span>})}</span>}
export function RubyWord({word,pinyin='',showPinyin=true,size='sm'}:{word:string;pinyin?:string;showPinyin?:boolean;size?:string}){return <span className={'inline-flex flex-wrap justify-center gap-2 font-bold '+(size==='lg'?'text-6xl':'text-3xl')}>{[...word].map((c,i)=><span key={i} className="inline-flex gap-1 items-center"><span>{c}</span>{showPinyin&&<Zhuyin text={pinyin.split(' ')[i]||''}/>}</span>)}</span>}

export function AssessmentWord({word,pinyin,targetIdx,showContextPinyin=true}:{word:string;pinyin:string;targetIdx:number;showContextPinyin?:boolean}){
 const syllables=pinyin.trim().split(/\s+/),target=word[targetIdx];
 return <span className="hanzi-kai inline-flex max-w-full flex-wrap items-center justify-center gap-x-6 gap-y-4" aria-label="語詞題目，藍色注音是要寫的字">{[...word].map((char,i)=>{
  // Repeated target characters must not reveal the answer elsewhere in the word.
  const masked=char===target;
  return <span key={i} className="inline-flex items-center gap-1" data-assessment-target={i===targetIdx?'true':undefined}>{masked?<Zhuyin text={syllables[i]||''} highlightIndex={i===targetIdx?0:undefined}/>:<><span>{char}</span>{showContextPinyin&&<span className="text-[.5em]"><Zhuyin text={syllables[i]||''}/></span>}</>}</span>;
 })}</span>;
}
