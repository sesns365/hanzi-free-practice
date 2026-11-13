// 老師設定存在這台裝置的瀏覽器（localStorage）。
// 另外可以把匯出的設定檔放到網站的 class-settings.json，所有載具開啟時會自動換成那份設定。
import strokeCounts from './stroke-counts.json';
import {validateTeachingEntry} from './curriculum-settings';
import {BOOKS, CUSTOM_BOOK, getBook} from './curriculum-source';

const KEY = 'free-practice-local-settings:v1';
export type CustomList = {id: string; name: string; chars: string};
export type LocalSettings = {
  entryOverrides: Record<string, any>;
  componentGroups: Record<string, number[]>;
  radicalVariantOverrides: Record<string, boolean>;
  paintVariantQuestion: boolean;
  practiceSteps: 'writing' | 'parts';
  writingMode: 'free' | 'guided';
  writingHint: 'none' | 'pale' | 'partial';
  simpleMode: boolean;
  lockPractice: boolean;
  defaultBookId: string;
  defaultLessonId: string;
  seatCount: number;
  customLists: CustomList[];
  pinHash: string;
  // 這台裝置已經套用過的共用設定檔版本（匯出時間）。
  sharedVersion: number;
};
export const EMPTY_LOCAL_SETTINGS: LocalSettings = {entryOverrides: {}, componentGroups: {}, radicalVariantOverrides: {}, paintVariantQuestion: false, practiceSteps: 'writing', writingMode: 'free', writingHint: 'none', simpleMode: false, lockPractice: false, defaultBookId: '', defaultLessonId: '', seatCount: 0, customLists: [], pinHash: '', sharedVersion: 0};
const isObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const pick = <T,>(value: unknown, allowed: readonly T[], fallback: T) => allowed.includes(value as T) ? value as T : fallback;
export const isHanzi = (value: string) => /^[㐀-鿿]$/.test(value);
export const practiceBooks = BOOKS.filter(book => book.id !== CUSTOM_BOOK && book.lessons.length);

// 讀回時逐項檢查，資料壞掉的那一項就略過，其他照常套用。
export function cleanLocalSettings(value: unknown): LocalSettings {
  const out: LocalSettings = {...EMPTY_LOCAL_SETTINGS, entryOverrides: {}, componentGroups: {}, radicalVariantOverrides: {}, customLists: []};
  if (!isObject(value)) return out;
  if (isObject(value.entryOverrides)) for (const [id, entry] of Object.entries(value.entryOverrides)) {
    try { out.entryOverrides[id] = validateTeachingEntry(id, entry); } catch {}
  }
  if (isObject(value.componentGroups)) for (const [char, groups] of Object.entries(value.componentGroups)) {
    const count = (strokeCounts as Record<string, number>)[char];
    if (count && Array.isArray(groups) && groups.length === count && groups.every(g => Number.isInteger(g) && g >= 0 && g <= 7)) out.componentGroups[char] = groups;
  }
  if (isObject(value.radicalVariantOverrides)) for (const [char, answer] of Object.entries(value.radicalVariantOverrides)) {
    if ((strokeCounts as Record<string, number>)[char] && typeof answer === 'boolean') out.radicalVariantOverrides[char] = answer;
  }
  out.paintVariantQuestion = value.paintVariantQuestion === true;
  out.practiceSteps = pick(value.practiceSteps, ['writing', 'parts'] as const, 'writing');
  out.writingMode = pick(value.writingMode, ['free', 'guided'] as const, 'free');
  out.writingHint = pick(value.writingHint, ['none', 'pale', 'partial'] as const, 'none');
  out.simpleMode = value.simpleMode === true;
  out.lockPractice = value.lockPractice === true;
  if (typeof value.defaultBookId === 'string' && practiceBooks.some(book => book.id === value.defaultBookId)) {
    out.defaultBookId = value.defaultBookId;
    if (value.defaultLessonId === 'all' || getBook(out.defaultBookId).lessons.includes(value.defaultLessonId)) out.defaultLessonId = value.defaultLessonId;
  }
  out.seatCount = Number.isInteger(value.seatCount) && value.seatCount >= 0 && value.seatCount <= 60 ? value.seatCount : 0;
  if (Array.isArray(value.customLists)) for (const list of value.customLists.slice(0, 40)) {
    if (!isObject(list) || typeof list.name !== 'string' || typeof list.chars !== 'string') continue;
    const chars = [...new Set([...list.chars].filter(isHanzi))].slice(0, 200).join(''), name = list.name.trim().slice(0, 20);
    if (chars && name) out.customLists.push({id: typeof list.id === 'string' && list.id ? list.id.slice(0, 40) : 'list-' + out.customLists.length, name, chars});
  }
  out.pinHash = typeof value.pinHash === 'string' && /^[0-9a-f]{8}$/.test(value.pinHash) ? value.pinHash : '';
  out.sharedVersion = Number.isFinite(value.sharedVersion) && value.sharedVersion > 0 ? value.sharedVersion : 0;
  return out;
}
export function loadLocalSettings(): LocalSettings {
  try { return cleanLocalSettings(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return cleanLocalSettings({}); }
}
export function saveLocalSettings(value: LocalSettings): LocalSettings {
  const clean = cleanLocalSettings(value);
  try { localStorage.setItem(KEY, JSON.stringify(clean)); }
  catch { throw new Error('無法儲存到這台裝置，請確認瀏覽器沒有使用無痕模式，且儲存空間足夠。'); }
  return clean;
}

// 老師密碼只是避免學生誤入，不是資安防護：設定檔裡存的是雜湊值，不是密碼本身。
export function pinHash(pin: string) {
  let h = 0x811c9dc5;
  for (let round = 0; round < 500; round++) for (const ch of 'hanzi-free-practice:' + pin + ':' + round) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// 匯出：version 用匯出時間，載具看到比自己新的版本才會換。
export function exportSettings(settings: LocalSettings) {
  const {sharedVersion: _ignored, ...rest} = settings;
  const version = Date.now();
  return {version, text: JSON.stringify({app: 'hanzi-free-practice', version, exportedAt: new Date(version).toISOString(), ...rest}, null, 1)};
}
export function parseSettingsFile(text: string): {settings: LocalSettings; version: number} | null {
  let data: any;
  try { data = JSON.parse(text); } catch { return null; }
  if (!isObject(data) || data.app !== 'hanzi-free-practice' || !Number.isFinite(data.version) || data.version <= 0) return null;
  return {settings: cleanLocalSettings({...data, sharedVersion: data.version}), version: data.version};
}
// 網站上的共用設定檔比這台裝置套用過的新，就整份換成共用設定。
export async function syncSharedSettings(current: LocalSettings): Promise<LocalSettings | null> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'class-settings.json', {cache: 'no-store', signal: controller.signal});
    if (!response.ok) return null;
    const parsed = parseSettingsFile(await response.text());
    if (!parsed || parsed.version <= current.sharedVersion) return null;
    return saveLocalSettings(parsed.settings);
  } catch { return null; } finally { clearTimeout(timer); }
}
