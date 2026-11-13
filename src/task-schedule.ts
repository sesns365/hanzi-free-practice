import {LESSON_META,isCustomLesson} from './curriculum-source';
// 任務的開放與關閉時間。key 為「類型:課次」，類型有 practice（練習）、pretest（前測）、posttest（後測）。
// 值為 null 或沒有這個 key 表示不限時間；openAt／closeAt 為毫秒時間戳，可只設其中一個。
// 與其他設定相同，依「個別學生 → 分組 → 全班」的順序，由最接近學生的那一層決定。
export const TASK_KINDS=['practice','pretest','posttest'] as const;
export type TaskKind=typeof TASK_KINDS[number];
// repeat:'weekly' 表示每週同一時段重複開放（需同時設定開放與關閉時間，且一次不超過七天）。
export type TaskWindow={openAt:number|null;closeAt:number|null;repeat?:'weekly';lastCloseAt?:number|null};
const WEEK=7*86400000;
// 每週重複的時間：換算成「目前這一次」或「下一次」的開放與關閉時間；lastCloseAt 是最近一次已經過去的關閉時間。
export function resolveWindow(window:TaskWindow|null|undefined,now=Date.now()):TaskWindow|null{
 if(!window)return null;
 if(window.repeat!=='weekly'||window.openAt==null||window.closeAt==null)return window;
 if(now<window.openAt)return {openAt:window.openAt,closeAt:window.closeAt,repeat:'weekly',lastCloseAt:window.lastCloseAt??null};
 const k=Math.floor((now-window.openAt)/WEEK),openAt=window.openAt+k*WEEK,closeAt=window.closeAt+k*WEEK;
 return now<closeAt?{openAt,closeAt,repeat:'weekly',lastCloseAt:k>0?closeAt-WEEK:window.lastCloseAt??null}:{openAt:openAt+WEEK,closeAt:closeAt+WEEK,repeat:'weekly',lastCloseAt:closeAt};
}
export type TaskSchedule=Record<string,TaskWindow|null>;
export const TASK_KIND_LABELS:Record<string,string>={practice:'書寫練習',pretest:'前測',posttest:'後測'};
export const taskKey=(kind:string,lesson:string)=>kind+':'+lesson;
// 「這一課的書寫練習不派發」的記號：前測、後測需要課次保持開放學習，所以只停用練習時用這個記號，不去關閉課次。
export const OFF_WINDOW:TaskWindow={openAt:null,closeAt:1};
export const isOffWindow=(window:TaskWindow|null|undefined)=>!!window&&window.closeAt===1;
export const practiceOff=(teaching:any,lesson:string)=>isOffWindow(teaching?.taskSchedule?.[taskKey('practice',lesson)]);
const validLesson=(id:string)=>isCustomLesson(id)||Object.hasOwn(LESSON_META,id);
const stamp=(value:unknown)=>value===null||value===undefined?null:Number.isSafeInteger(value)&&(value as number)>0&&(value as number)<4102444800000?value as number:NaN;
export function validateTaskSchedule(value:unknown):TaskSchedule{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>3000)throw Error('任務時間格式不正確。');
 const out:TaskSchedule={};
 for(const [key,window]of Object.entries(value as Record<string,any>)){
  const split=key.indexOf(':'),kind=key.slice(0,split),lesson=key.slice(split+1);
  if(split<1||!(TASK_KINDS as readonly string[]).includes(kind)||!validLesson(lesson))throw Error('任務時間須指定有效的類型與課次。');
  if(window===null){out[key]=null;continue;}
  if(!window||typeof window!=='object'||Array.isArray(window))throw Error('任務時間格式不正確。');
  const openAt=stamp(window.openAt),closeAt=stamp(window.closeAt);
  if(Number.isNaN(openAt)||Number.isNaN(closeAt))throw Error('任務的開放或關閉時間不正確。');
  if(openAt!==null&&closeAt!==null&&closeAt<=openAt)throw Error('關閉時間必須晚於開放時間。');
  if(window.repeat!==undefined&&window.repeat!==null){if(window.repeat!=='weekly'||openAt===null||closeAt===null||closeAt-openAt>WEEK-60000)throw Error('每週重複需要同時設定開放與關閉時間，而且一次不能超過七天。');out[key]={openAt,closeAt,repeat:'weekly'};continue;}
  out[key]=openAt===null&&closeAt===null?null:{openAt,closeAt};
 }
 return out;
}
export function taskWindow(teaching:any,kind:string,lesson:string,now=Date.now()):TaskWindow|null{
 const window=teaching?.taskSchedule?.[taskKey(kind,lesson)];
 if(!window||(window.openAt==null&&window.closeAt==null))return null;
 return window.repeat==='weekly'?resolveWindow({openAt:window.openAt??null,closeAt:window.closeAt??null,repeat:'weekly'},now):{openAt:window.openAt??null,closeAt:window.closeAt??null};
}
export type TaskState='open'|'upcoming'|'closed';
export function windowState(raw:TaskWindow|null|undefined,now=Date.now()):TaskState{
 const window=resolveWindow(raw,now);
 if(!window)return 'open';
 if(window.openAt!=null&&now<window.openAt)return 'upcoming';
 if(window.closeAt!=null&&now>=window.closeAt)return 'closed';
 return 'open';
}
export const taskState=(teaching:any,kind:string,lesson:string,now=Date.now())=>windowState(taskWindow(teaching,kind,lesson,now),now);
export const scheduleBlocks=(teaching:any,kind:string,lesson:string,now=Date.now())=>taskState(teaching,kind,lesson,now)!=='open';
// 時間一律以臺北時間顯示與輸入，不受裝置時區影響。
export const TASK_TIME_ZONE='Asia/Taipei';
const TAIPEI_OFFSET=8*3600000;
export function formatTaskTime(value:number|null|undefined,timeZone:string|undefined=TASK_TIME_ZONE){
 if(value==null)return '';
 try{return new Date(value).toLocaleString('zh-TW',{timeZone:timeZone||TASK_TIME_ZONE,month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false})}catch{return new Date(value).toISOString().slice(0,16).replace('T',' ')}
}
export function scheduleNotice(teaching:any,kind:string,lesson:string,now=Date.now(),timeZone:string|undefined='Asia/Taipei'){
 const window=taskWindow(teaching,kind,lesson,now),state=windowState(window,now);
 if(state==='upcoming')return `老師設定這項${TASK_KIND_LABELS[kind]||'任務'}在 ${formatTaskTime(window!.openAt,timeZone)} 開放，時間到了再來。`;
 if(state==='closed')return `這項${TASK_KIND_LABELS[kind]||'任務'}已在 ${formatTaskTime(window!.closeAt,timeZone)} 關閉。`;
 return '';
}
// 學生畫面上的簡短說明，例如「11/20（四）16:00 截止」。
export function windowHint(raw:TaskWindow|null|undefined,now=Date.now(),timeZone?:string){
 const window=resolveWindow(raw,now),state=windowState(window,now);
 if(!window||isOffWindow(window))return '';
 if(state==='upcoming')return formatTaskTime(window.openAt,timeZone)+' 開放';
 if(state==='closed')return '已於 '+formatTaskTime(window.closeAt,timeZone)+' 關閉';
 return window.closeAt!=null?formatTaskTime(window.closeAt,timeZone)+' 截止':'';
}
// datetime-local 欄位的值（一律視為臺北時間）與時間戳互轉。
export function toLocalInput(value:number|null|undefined){
 if(value==null)return '';
 return new Date(value+TAIPEI_OFFSET).toISOString().slice(0,16);
}
export function fromLocalInput(value:string):number|null{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value||''))return null;
 const time=Date.parse(value.slice(0,16)+':00+08:00');
 return Number.isFinite(time)?time:null;
}
// 臺北時間「幾天後的幾點整」。
export function taipeiTime(daysAhead:number,hour:number,now=Date.now()){
 const local=new Date(now+TAIPEI_OFFSET);
 return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()+daysAhead,hour)-TAIPEI_OFFSET;
}
