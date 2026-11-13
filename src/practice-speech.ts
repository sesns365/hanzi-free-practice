import {sentenceSpeech,targetSpeech} from './curriculum-settings';

export type PracticeSpeechSettings={practiceWordSpeech?:boolean;practiceSentenceSpeech?:boolean;practiceAutoSpeech?:string};
export type PracticeSpeechKind='word'|'sentence'|'auto';

export function practiceSpeech(entry:any,settings:PracticeSpeechSettings={},kind:PracticeSpeechKind='auto'){
 if(!entry)return '';
 const word=settings.practiceWordSpeech!==false?targetSpeech(entry):'';
 const sentence=settings.practiceSentenceSpeech!==false?sentenceSpeech(entry):'';
 if(kind==='word')return word;
 if(kind==='sentence')return sentence;
 switch(settings.practiceAutoSpeech??'word'){
  case 'word':return word;
  case 'sentence':return sentence;
  case 'both':return word&&sentence?word+'。'+sentence:word||sentence;
  default:return '';
 }
}
