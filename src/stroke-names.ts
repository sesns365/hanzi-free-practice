// 筆畫名稱（播放筆順時報讀用）。資料檔 public/stroke-names.json 由 scripts/content/build-stroke-names.cjs 產生：
// 每個字是一串代碼，一個字母代表一筆。名稱依教育部筆順資料的筆形判斷，少數字可能與課本用語略有不同。
import {fetchJSON} from './http-json';
import {STROKE_NAMES} from './stroke-name-list';
export {STROKE_NAMES};
// 報讀筆畫名稱時，裝置語音容易把「撇」「挑」念成第一聲；改用只有第三聲讀音的同音字代讀，畫面仍顯示原字。
export const strokeSpeechName=(name:string)=>name.replaceAll('撇','苤').replaceAll('挑','窕');
const CODE='abcdefghijklmnopqrstuvwxyzABCDEFGH';
const DIGITS=['零','一','二','三','四','五','六','七','八','九'];
// 1→一、12→十二、25→二十五（筆畫數不會超過兩位數太多）。
export function chineseNumber(n:number){
 if(!Number.isInteger(n)||n<0||n>99)return String(n);
 if(n<10)return DIGITS[n];
 const tens=Math.floor(n/10),ones=n%10;
 return (tens===1?'':DIGITS[tens])+'十'+(ones?DIGITS[ones]:'');
}
let cache:Promise<Record<string,string>>|null=null;
export function loadStrokeNames():Promise<Record<string,string>>{
 if(!cache)cache=fetchJSON(import.meta.env.BASE_URL+'stroke-names.json',{},'筆畫名稱暫時無法載入。').then(data=>data&&typeof data==='object'?data as Record<string,string>:{}).catch(error=>{cache=null;throw error});
 return cache;
}
export function decodeStrokeNames(code:string|undefined,count:number):string[]|null{
 if(typeof code!=='string'||code.length!==count)return null;
 const names=[...code].map(letter=>STROKE_NAMES[CODE.indexOf(letter)]);
 return names.every(Boolean)?names:null;
}
// 沒有名稱資料或筆畫數對不上時回傳 null，播放時就只念「第幾筆」。
export async function strokeNamesFor(char:string,count:number,settings?:any):Promise<string[]|null>{
 // 老師在後台更正過的名稱優先。
 const fixed=settings?.strokeNameOverrides?.[char];if(Array.isArray(fixed)&&fixed.length===count)return fixed;
 try{return decodeStrokeNames((await loadStrokeNames())[char],count)}catch{return null}
}
