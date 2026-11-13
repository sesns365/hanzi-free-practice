import radicals from './radicals.json';
import {radicalStrokes} from './teaching-settings';
// Explicit glyph forms only. Descriptive notes may mention variants unrelated to this character.
const forms:Record<string,string[]>={卩:['㔾'],人:['亻'],刀:['刂'],心:['忄','⺗'],手:['扌'],水:['氵','氺'],火:['灬'],犬:['犭'],示:['礻'],衣:['衤'],艸:['艹','⺾','⺿'],竹:['⺮'],网:['罒','罓'],肉:['⺼'],阜:['阝'],邑:['阝'],辵:['辶','⻌','⻍'],食:['飠'],金:['釒'],糸:['糹'],玉:['王'],攴:['攵'],爪:['爫'],老:['耂'],足:['⻊']};
const variants=new Set(Object.values(forms).flat());
// A teacher's all-red grouping alone is not evidence that the character is its own radical.
export function isWholeCharacterRadical(char:string,count:number,settings:any={}){
 const source=(radicals as any)[char];
 const allStrokes=(indices:number[]|undefined)=>Array.isArray(indices)&&indices.length===count&&Array.from({length:count},(_,i)=>i).every(i=>indices.includes(i));
 return count>0&&source?.radical===char&&allStrokes(source.strokes)&&allStrokes(radicalStrokes(char,count,settings));
}
export function radicalVariantAnswer(char:string,settings:any={}):boolean|null{
 if(typeof settings.radicalVariantOverrides?.[char]==='boolean')return settings.radicalVariantOverrides[char];
 const r=(radicals as any)[char];if(!r?.strokes?.length)return null;
 const custom=settings.componentGroups?.[char];
 if(custom&&JSON.stringify(custom.flatMap((g:number,i:number)=>g===0?[i]:[]))!==JSON.stringify(r.strokes))return null;
 if(variants.has(r.radical))return true;
 if(char===r.radical)return false;
 if(char==='卷')return true;
 if(['⺌','⺊','⺳','肀','丷'].includes(r.radical)||r.radical==='足')return null;
 const alternatives=forms[r.radical]||[];
 if(r.decomposition&&alternatives.some(v=>r.decomposition.includes(v)))return true;
 // These reduced counts identify common forms without interpreting the prose note.
 const reduced:Record<string,number[]>={水:[3],手:[3],心:[3],犬:[3],示:[4],衣:[5],艸:[3,4],阜:[2,3],邑:[2,3],辵:[3,4],网:[4,5],肉:[4]};
 if(reduced[r.radical]?.includes(r.strokes.length))return true;
 // Full bottom forms explicitly present in the reviewed source (notes also describe variants).
 if(['泉','漿','慈','恩','票'].includes(char))return false;
 if(r.decomposition?.includes(r.radical))return false;
 return alternatives.length?null:false;
}
export function checkRadicalAnswer(char:string,count:number,settings:any,mapping:number[],variantSelected:boolean){
 const marked=mapping.flatMap((v,i)=>v===0?[i]:[]),r=(radicals as any)[char];
 const custom=settings.componentGroups?.[char]?.length===count;
 const candidates:number[][]=[radicalStrokes(char,count,settings),...(!custom?r?.alternatives||[]:[])];
 const expected=candidates.filter(x=>x.length).sort((a,b)=>a.filter(i=>!marked.includes(i)).length+marked.filter(i=>!a.includes(i)).length-b.filter(i=>!marked.includes(i)).length-marked.filter(i=>!b.includes(i)).length)[0]||[];
 const radicalCorrect=expected.length>0&&expected.length===marked.length&&expected.every(i=>marked.includes(i));
 const variantExpected=radicalVariantAnswer(char,settings),variantEnabled=settings.paintVariantQuestion===true&&variantExpected!==null;
 const variantCorrect=variantEnabled?variantSelected===variantExpected:null;
 return {correct:radicalCorrect&&variantCorrect!==false,radicalCorrect,variantEnabled,variantSelected:variantEnabled?variantSelected:null,variantExpected:variantEnabled?variantExpected:null,variantCorrect,marked,expected};
}
