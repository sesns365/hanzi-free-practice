// @ts-nocheck
import React, {useCallback, useState} from 'react';
import TeachingContent from './TeachingContent';
import TeachingSettings from './TeachingSettings';
import {validateTeachingEntry} from './curriculum-settings';
import {loadLocalSettings, saveLocalSettings, EMPTY_LOCAL_SETTINGS} from './local-settings';

const tab = 'rounded-xl border-2 bg-white px-4 py-3 font-bold';
const TABS = [['content', '逐字教材與讀音'], ['parts', '逐字部件與部首答案']];

export default function LocalSettingsPage({settings, onChange, onDirty}) {
  const [view, setView] = useState('content'), [dirty, setDirty] = useState(false), [note, setNote] = useState(''), [resetKey, setResetKey] = useState(0);
  const markDirty = useCallback(value => { setDirty(!!value); onDirty?.(!!value); }, [onDirty]);
  // 每次儲存都先讀回最新內容再合併，兩個分頁同時開著也不會互相蓋掉。
  const commit = patch => { const saved = saveLocalSettings({...loadLocalSettings(), ...patch}); onChange(saved); return saved; };
  const contentApi = async ({id, entry}) => {
    const next = {...loadLocalSettings().entryOverrides};
    if (entry) next[id] = validateTeachingEntry(id, entry); else delete next[id];
    return {entryOverrides: commit({entryOverrides: next}).entryOverrides};
  };
  const partsApi = async ({componentGroups, radicalVariantOverrides}) => {
    const saved = commit({componentGroups, radicalVariantOverrides});
    return {componentGroups: saved.componentGroups, radicalVariantOverrides: saved.radicalVariantOverrides};
  };
  const choose = next => {
    if (next === view) return;
    if (dirty && !window.confirm('目前的修改尚未儲存，要離開嗎？')) return;
    markDirty(false); setNote(''); setView(next);
  };
  const counts = [Object.keys(settings.entryOverrides).length, Object.keys(settings.componentGroups).length + Object.keys(settings.radicalVariantOverrides).filter(c => !settings.componentGroups[c]).length];
  const clearAll = () => {
    if (!window.confirm('要清除這台裝置上所有逐字設定，恢復成原始教材與預設部件嗎？這個動作無法復原。')) return;
    try { onChange(saveLocalSettings(EMPTY_LOCAL_SETTINGS)); markDirty(false); setResetKey(k => k + 1); setNote('已清除這台裝置的逐字設定。'); }
    catch (e) { setNote(e.message); }
  };
  return <section aria-label="逐字設定" className="space-y-5">
    <div className="space-y-3 rounded-2xl border bg-white p-5">
      <h2 className="text-2xl font-bold">逐字設定</h2>
      <p>這裡的修改只存在這台裝置的這個瀏覽器，之後在同一台載具開啟自由練習都會套用；換一台載具、換瀏覽器或清除瀏覽資料後需要重新設定。</p>
      <div role="tablist" aria-label="逐字設定類別" className="flex flex-wrap gap-2">{TABS.map(([id, label], i) => <button key={id} type="button" role="tab" aria-selected={view === id} className={tab + (view === id ? ' border-blue-700 text-blue-800' : '')} onClick={() => choose(id)}>{label}{counts[i] > 0 && <span className="ml-2 text-sm font-normal">已調整 {counts[i]} 字</span>}</button>)}</div>
      <div className="flex flex-wrap items-center gap-3"><button type="button" className="rounded-lg border px-3 py-2 text-sm text-red-800 disabled:opacity-40" disabled={!counts[0] && !counts[1] && !settings.paintVariantQuestion} onClick={clearAll}>清除這台裝置的所有逐字設定</button>{note && <p role="status" className="text-sm text-blue-800">{note}</p>}</div>
    </div>
    {view === 'content' && <TeachingContent key={'content' + resetKey} initial={settings} api={contentApi} onDirty={markDirty} />}
    {view === 'parts' && <>
      <label className="flex items-center gap-3 rounded-2xl border bg-white p-4"><input type="checkbox" checked={settings.paintVariantQuestion} onChange={e => { try { commit({paintVariantQuestion: e.target.checked}); setNote(''); } catch (error) { setNote(error.message); } }} /><span><strong>畫部件時，請學生判斷部首是否為變形部首</strong><span className="block text-sm text-slate-600">開啟後，下方每個字的「變形部首答案」才會用來檢查；這個開關勾選後立即儲存。</span></span></label>
      <TeachingSettings key={'parts' + resetKey} partsOnly initial={settings} api={partsApi} onDirty={markDirty} />
    </>}
  </section>;
}
