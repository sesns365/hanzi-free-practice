import counts from './stroke-counts.json';
import {fetchJSON} from './http-json';

export const MISSING_STROKES = '本字尚無筆畫資料，可先自由書寫、測驗或製作空白／描紅學習單。';
export async function loadStrokeData(character: string) {
  if (!character || !Object.hasOwn(counts, character)) throw new Error(MISSING_STROKES);
  const message = '筆順資料暫時無法載入，請稍後重試。';
  const data = await fetchJSON(import.meta.env.BASE_URL+`strokes/${character.codePointAt(0)!.toString(16).toUpperCase()}.json`, {}, message);
  if (!Array.isArray(data.strokes) || !data.strokes.length || !data.strokes.every((stroke: unknown) => typeof stroke === 'string') || !Array.isArray(data.medians) || data.medians.length !== data.strokes.length || !data.medians.every((line: unknown) => Array.isArray(line) && line.length && line.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)))) throw new Error(message);
  return data;
}
