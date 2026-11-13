// 逐字設定只存在這台裝置的這個瀏覽器（localStorage），同一台載具之後開啟都會套用。
import strokeCounts from './stroke-counts.json';
import {validateTeachingEntry} from './curriculum-settings';

const KEY = 'free-practice-local-settings:v1';
export type LocalSettings = {
  entryOverrides: Record<string, any>;
  componentGroups: Record<string, number[]>;
  radicalVariantOverrides: Record<string, boolean>;
  paintVariantQuestion: boolean;
};
export const EMPTY_LOCAL_SETTINGS: LocalSettings = {entryOverrides: {}, componentGroups: {}, radicalVariantOverrides: {}, paintVariantQuestion: false};
const isObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

// 讀回時逐項檢查，資料壞掉的那一項就略過，其他照常套用。
export function cleanLocalSettings(value: unknown): LocalSettings {
  const out: LocalSettings = {entryOverrides: {}, componentGroups: {}, radicalVariantOverrides: {}, paintVariantQuestion: false};
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
