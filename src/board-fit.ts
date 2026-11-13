'use client';
import {useEffect} from 'react';
// 學生寫字畫面共用：依螢幕算出「不捲動時格子最大可以多大」（--board-fit），
// 並在換字、換步驟、換題或改變大小時，只捲動剛好的距離讓整個格子露出來，不被底部按鈕列擋住。
// 視窗大小改變（例如 iPad 捲動時網址列伸縮）只重算大小、不捲動，避免和學生自己捲動互相拉扯。
const SURFACES='.student-workspace .paint-surface, .student-workspace .assembly-surface, .student-workspace .writing-surface, .student-workspace .recall-surface, .student-workspace .assessment-surface';
export function useBoardFit(deps:unknown[],wordSelector='.student-workspace .practice-word'){
 useEffect(()=>{if(typeof document==='undefined'||typeof window==='undefined')return;let frame=0;
  const visible=()=>[...(document.querySelectorAll?.(SURFACES)||[])].find((x:any)=>x.getBoundingClientRect?.().height>0) as HTMLElement|undefined;
  const place=(scroll=true,round=0)=>{const el=visible();if(!el)return;const ws=el.closest?.('.student-workspace') as HTMLElement|null,r=el.getBoundingClientRect(),barEl=document.querySelector?.('.practice-next-step'),barH=barEl?Math.max(barEl.getBoundingClientRect?.().height||0,48):0,word=document.querySelector?.(wordSelector)?.getBoundingClientRect?.();
   if(ws?.classList.contains('free-practice-writing')&&window.innerWidth>=680){const reserve=el.classList.contains('writing-surface')?45:el.classList.contains('assembly-surface')?55:90,available=Math.max(160,Math.floor(window.innerHeight-(r.top+window.scrollY)-barH-reserve));if(ws.style.getPropertyValue('--free-board-fit')!==available+'px')ws.style.setProperty('--free-board-fit',available+'px');return}
   if(ws?.style&&word&&word.height){const fit=Math.max(260,Math.min(760,Math.round(window.innerHeight-barH-24-(r.top-word.top))));if(ws.style.getPropertyValue('--board-fit')!==fit+'px'){ws.style.setProperty('--board-fit',fit+'px');if(round<2){frame=window.requestAnimationFrame?.(()=>place(scroll,round+1))||0;return}}}
   if(!scroll)return;
   const limit=window.innerHeight-barH-8,large=ws?.dataset?.boardSize==='l',keep=!large&&word&&word.height?word.top-8:r.top-8;if(r.bottom>limit&&keep>0)window.scrollBy?.({top:Math.min(r.bottom-limit,keep),behavior:'smooth'})};
  const timer=setTimeout(()=>place(true),document.querySelector?.('.free-practice-writing')?0:300);let resizeTimer:any,lastW=window.innerWidth,lastH=window.innerHeight;
  const resize=()=>{const w=window.innerWidth,h=window.innerHeight,turned=w!==lastW;if(!turned&&Math.abs(h-lastH)<120)return;lastW=w;lastH=h;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>place(turned),150)};
  const sizeChange=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>place(true),50)};
  window.addEventListener?.('resize',resize);window.addEventListener?.('board-size-change',sizeChange);
  return()=>{clearTimeout(timer);clearTimeout(resizeTimer);if(frame)window.cancelAnimationFrame?.(frame);window.removeEventListener?.('resize',resize);window.removeEventListener?.('board-size-change',sizeChange)}},deps);
}
