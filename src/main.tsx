import React, {useCallback, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Settings2, Sparkles} from 'lucide-react';
import './globals.css';
import FreePractice from './FreePractice';
import LocalSettingsPage from './LocalSettingsPage';
import {loadLocalSettings} from './local-settings';

const base = import.meta.env.BASE_URL;
const nav = 'inline-flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-base font-bold';

function App() {
  const [view, setView] = useState<'practice' | 'settings'>('practice');
  const [local, setLocal] = useState(loadLocalSettings);
  const settingsDirty = useRef(false), leavePractice = useRef<null | ((destination?: string) => void)>(null);
  const registerExit = useCallback((fn: any) => { leavePractice.current = fn; }, []);
  const markDirty = useCallback((value: boolean) => { settingsDirty.current = value; }, []);
  const openSettings = () => {
    // 書寫中有未保存的字跡時，沿用自由練習原本的「離開前保存」提醒。
    if (leavePractice.current) leavePractice.current('exit'); else setView('settings');
  };
  const openPractice = () => {
    if (settingsDirty.current && !window.confirm('逐字設定尚未儲存，要離開嗎？')) return;
    settingsDirty.current = false; setLocal(loadLocalSettings()); setView('practice');
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <span className="text-xl font-bold">生字自由練習</span>
        <nav aria-label="主選單" className="flex flex-wrap gap-2">
          <button type="button" aria-current={view === 'practice' ? 'page' : undefined} className={nav + (view === 'practice' ? ' border-violet-700 text-violet-900' : '')} onClick={() => view !== 'practice' && openPractice()}><Sparkles size={18} />自由練習</button>
          <button type="button" aria-current={view === 'settings' ? 'page' : undefined} className={nav + (view === 'settings' ? ' border-blue-700 text-blue-800' : '')} onClick={() => view !== 'settings' && openSettings()}><Settings2 size={18} />逐字設定</button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">
        {view === 'practice'
          ? <FreePractice settings={local} showExit={false} onExit={() => setView('settings')} onRegisterExit={registerExit} />
          : <LocalSettingsPage settings={local} onChange={setLocal} onDirty={markDirty} />}
      </main>
      <footer className="py-6 text-center text-base text-slate-600">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3">
          <span>由特工 365 製作</span>
          <span aria-hidden="true">·</span>
          <a className="underline" href={base + 'licenses/moe-standard-kai.txt'} target="_blank" rel="noreferrer">字型與筆順資料：中華民國教育部</a>
          <span aria-hidden="true">·</span>
          <span>僅供教學，非營利使用</span>
          <span aria-hidden="true">·</span>
          <span>練習紀錄與逐字設定只存在這台裝置</span>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
