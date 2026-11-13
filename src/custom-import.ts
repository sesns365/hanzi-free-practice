import {curriculumEntries} from './curriculum-settings';
import {CUSTOM_LESSON} from './curriculum-source';

const syllable = /^(?:˙?[ㄅ-ㄩ]{1,3}[ˊˇˋ]?|[ㄅ-ㄩ]{1,3}˙)$/;
// Speech overrides describe the former wording/target, so do not carry them to
// a different word or character. Call only after a committed input edit.
export function speechOverridesAfterEdit(previous: any, next: any) {
  const clearWord = previous.word !== next.word && !!next.speechWord;
  const clearTarget = previous.word?.[previous.targetIdx] !== next.word?.[next.targetIdx] && !!next.speechCharacter;
  return {...next, ...(clearWord ? {speechWord: ''} : {}), ...(clearTarget ? {speechCharacter: ''} : {}),
    ...((clearWord || clearTarget) ? {speechResetNote: '語詞或目標字已變更，已清除不再適用的代讀文字。請重新試聽，必要時再設定代讀。'} : {})};
}
export function suggestReading(word: string, entries: any[] = curriculumEntries) {
  const exact = entries.find(e => e.word === word && e.pinyin.trim().split(/\s+/).length === word.length);
  if (exact) return {pinyin: exact.pinyin, readingNote: '沿用題庫語詞注音，請確認讀音。'};
  const choices = new Map<string, Set<string>>();
  for (const e of entries) {
    const sounds = e.pinyin.trim().split(/\s+/);
    if (sounds.length !== e.word.length) continue;
    [...e.word].forEach((c, i) => {if (syllable.test(sounds[i])) {if (!choices.has(c)) choices.set(c, new Set());choices.get(c)!.add(sounds[i]);}});
  }
  const missing = [...word].filter(c => !choices.get(c)?.size);
  if (missing.length) return {pinyin: '', readingNote: `請補注音：${[...new Set(missing)].join('、')}。`};
  const multiple = [...word].filter(c => choices.get(c)!.size > 1);
  return {pinyin: [...word].map(c => [...choices.get(c)!][0]).join(' '), readingNote: multiple.length ? `有多種讀音：${[...new Set(multiple)].join('、')}，請依語詞確認。` : '依現有題庫帶入各字注音，請確認語詞讀音。'};
}

export function parseCustomImport(text: string, mode: string, lesson = CUSTOM_LESSON, suggestions = curriculumEntries) {
  if (!text.trim()) throw Error('請先輸入生字或語詞。');
  if (text.length > 10000) throw Error('一次輸入最多10,000字元。');
  const items: {word: string; targetIdx: number; pinyin?: string}[] = [];
  if (mode === 'characters') {
    const compact = text.replace(/[\s,，、;；。．.]+/g, '');
    if (!/^[\u3400-\u9fff]+$/.test(compact)) throw Error('連續生字請輸入國字，可用空格、換行、逗號或頓號分隔。');
    for (const character of compact) items.push({word: character, targetIdx: 0});
  } else if (mode === 'words') {
    text.split(/\r?\n/).forEach((line, index) => {
      if (!line.trim()) return;
      const parts = line.split(/[+＋\t]/).map(v => v.trim());
      const [word, target, pinyin] = parts;
      if (parts.length < 2 || parts.length > 3 || !/^[\u3400-\u9fff]{1,8}$/.test(word)) throw Error(`第${index + 1}行請用「語詞＋目標字」，例如：拖地＋拖。`);
      const targetIdx = /^[1-8]$/.test(target) ? Number(target) - 1 : /^[\u3400-\u9fff]$/.test(target) ? word.indexOf(target) : -1;
      if (targetIdx < 0 || targetIdx >= word.length) throw Error(`第${index + 1}行的目標字不在語詞中，請確認。`);
      items.push({word, targetIdx, pinyin});
    });
  } else throw Error('請選擇輸入方式。');
  const seen = new Set<string>();
  const unique = items.filter(e => {const key = `${e.word}|${e.targetIdx}`;if (seen.has(key)) return false;seen.add(key);return true;});
  if (!unique.length || unique.length > 80) throw Error('一次可加入1至80筆；較多生字請分批加入。');
  return {duplicates: items.length - unique.length, entries: unique.map(e => ({word: e.word, targetIdx: e.targetIdx, ...suggestReading(e.word, suggestions), ...(e.pinyin ? {pinyin: e.pinyin, readingNote: '已使用貼上的注音，請核對。'} : {}), lesson, enabled: true, version: 0, sentence: '', meaning: '', teachingNote: '', speechWord: '', speechCharacter: ''}))};
}
