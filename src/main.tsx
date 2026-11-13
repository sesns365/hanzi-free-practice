import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LogOut, Settings2, Sparkles, UserRound} from 'lucide-react';
import './globals.css';
import FreePractice from './FreePractice';
import TeacherPage from './TeacherPage';
import {getBook, getLessonMeta} from './curriculum-source';
import {loadLocalSettings, syncSharedSettings, practiceBooks, isHanzi, pinHash} from './local-settings';

const base = import.meta.env.BASE_URL;
const nav = 'inline-flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-base font-bold';
const SEAT_KEY = 'free-practice-seat', TEACHER_KEY = 'free-practice-teacher';
const session = {
  get: (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } },
  set: (key: string, value: string | null) => { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch {} },
};

// 派課連結的網址參數：?book=版本&lesson=課次&steps=…&mode=…&hint=…&start=1&lock=1&chars=指定生字
const query = new URLSearchParams(location.search);
const oneOf = (key: string, allowed: string[]) => allowed.includes(query.get(key) || '') ? query.get(key)! : '';
const urlBook = practiceBooks.some(book => book.id === query.get('book')) ? query.get('book')! : '';
let urlLesson = urlBook ? query.get('lesson') || '' : '';
// 課次可以寫完整代號，也可以只寫第幾課。
if (urlBook && /^\d+$/.test(urlLesson)) urlLesson = getBook(urlBook).lessons.find(id => getLessonMeta(id)?.number === Number(urlLesson)) || '';
const INITIAL = {
  book: urlBook, lesson: urlLesson,
  steps: oneOf('steps', ['writing', 'parts']), mode: oneOf('mode', ['free', 'guided']), hint: oneOf('hint', ['none', 'pale', 'partial']),
  start: query.get('start') === '1', lock: query.get('lock') === '1',
  simple: query.has('simple') ? query.get('simple') === '1' : undefined,
  chars: [...new Set([...(query.get('chars') || '')].filter(isHanzi))].slice(0, 200),
};

function App() {
  const [ready, setReady] = useState(false), [local, setLocal] = useState(loadLocalSettings);
  const [view, setView] = useState<'practice' | 'settings'>('practice');
  const [teacher, setTeacher] = useState(() => session.get(TEACHER_KEY) === '1'), [gate, setGate] = useState(false), [pin, setPin] = useState(''), [pinError, setPinError] = useState('');
  const [seat, setSeat] = useState<string | null>(() => session.get(SEAT_KEY));
  const settingsDirty = useRef(false), leavePractice = useRef<null | ((destination?: string) => void)>(null), afterLeave = useRef<'settings' | 'seat' | 'gate'>('settings');
  const registerExit = useCallback((fn: any) => { leavePractice.current = fn; }, []);
  const markDirty = useCallback((value: boolean) => { settingsDirty.current = value; }, []);

  // 開啟時先看網站上有沒有比較新的共用設定檔；連不上就直接用這台裝置的設定。
  useEffect(() => { let stop = false; syncSharedSettings(loadLocalSettings()).then(next => { if (stop) return; if (next) setLocal(next); setReady(true); }); return () => { stop = true; }; }, []);
  useEffect(() => { if (ready && query.get('teacher') === '1') requestTeacher(); }, [ready]);

  const needSeat = local.seatCount > 0 && !seat;
  const chooseSeat = (value: string | null) => { session.set(SEAT_KEY, value); setSeat(value); };
  // 書寫中有未保存的字跡時，沿用自由練習原本的「離開前保存」提醒，確認後才真的離開。
  const leaveThen = (target: 'settings' | 'seat' | 'gate') => {
    afterLeave.current = target;
    if (view === 'practice' && !needSeat && leavePractice.current) leavePractice.current('exit'); else finishLeave();
  };
  const finishLeave = () => {
    if (afterLeave.current === 'seat') chooseSeat(null);
    else if (afterLeave.current === 'gate') { setPin(''); setPinError(''); setGate(true); }
    else setView('settings');
  };
  const requestTeacher = () => {
    if (teacher || !loadLocalSettings().pinHash) { session.set(TEACHER_KEY, '1'); setTeacher(true); leaveThen('settings'); }
    else leaveThen('gate');
  };
  const submitPin = (event: React.FormEvent) => {
    event.preventDefault();
    if (pinHash(pin) !== loadLocalSettings().pinHash) { setPinError('密碼不對，請再試一次。'); setPin(''); return; }
    session.set(TEACHER_KEY, '1'); setTeacher(true); setGate(false); setView('settings');
  };
  const openPractice = () => {
    if (settingsDirty.current && !window.confirm('老師設定尚未儲存，要離開嗎？')) return false;
    settingsDirty.current = false; setLocal(loadLocalSettings()); setView('practice'); return true;
  };
  const leaveTeacher = () => { if (view === 'settings' && !openPractice()) return; session.set(TEACHER_KEY, null); setTeacher(false); };

  const studentId = seat && seat !== 'guest' ? 'seat-' + seat : undefined;
  let body: React.ReactNode;
  if (!ready) body = <p role="status" className="p-8 text-center text-lg">正在載入…</p>;
  else if (gate) body = <form onSubmit={submitPin} className="mx-auto max-w-md space-y-4 rounded-2xl border-2 bg-white p-6">
    <h2 className="text-2xl font-bold">老師專區</h2>
    <label className="block font-bold">請輸入老師密碼<input type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={8} className="mt-2 block w-full rounded-xl border-2 p-3 text-2xl" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /></label>
    {pinError && <p role="alert" className="text-red-800">{pinError}</p>}
    <div className="flex gap-2"><button type="submit" className={nav + ' border-blue-700 text-blue-800'}>進入</button><button type="button" className={nav} onClick={() => setGate(false)}>回到練習</button></div>
  </form>;
  else if (view === 'settings' && teacher) body = <TeacherPage settings={local} onChange={setLocal} onDirty={markDirty} />;
  else if (needSeat) body = <section aria-label="選擇座號" className="space-y-5 rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 sm:p-8">
    <h2 className="text-2xl font-bold text-violet-950">請點你的座號</h2>
    <div className="seat-grid">{Array.from({length: local.seatCount}, (_, i) => String(i + 1)).map(n => <button type="button" key={n} aria-label={`座號 ${n}`} onClick={() => chooseSeat(n)}>{n}</button>)}</div>
    <button type="button" className={nav} onClick={() => chooseSeat('guest')}>我沒有座號（訪客）</button>
  </section>;
  else body = <FreePractice key={studentId || 'guest'} settings={local} studentId={studentId} initial={INITIAL} showExit={false} onExit={finishLeave} onRegisterExit={registerExit} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <span className="inline-flex items-center gap-2 text-xl font-bold"><img src={base + 'icon.svg'} alt="" width="32" height="32" />自由練字板</span>
        <nav aria-label="主選單" className="flex flex-wrap items-center gap-2">
          {ready && !gate && view === 'practice' && local.seatCount > 0 && seat && <><span className="inline-flex items-center gap-1 rounded-xl bg-violet-100 px-3 py-2 font-bold text-violet-950"><UserRound size={18} />{seat === 'guest' ? '訪客' : `座號 ${seat}`}</span><button type="button" className={nav} onClick={() => leaveThen('seat')}>換人</button></>}
          {teacher && <>
            <button type="button" aria-current={view === 'practice' ? 'page' : undefined} className={nav + (view === 'practice' ? ' border-violet-700 text-violet-900' : '')} onClick={() => view !== 'practice' && openPractice()}><Sparkles size={18} />自由練習</button>
            <button type="button" aria-current={view === 'settings' ? 'page' : undefined} className={nav + (view === 'settings' ? ' border-blue-700 text-blue-800' : '')} onClick={() => view !== 'settings' && leaveThen('settings')}><Settings2 size={18} />老師專區</button>
            <button type="button" className={nav} onClick={leaveTeacher}><LogOut size={18} />離開老師模式</button>
          </>}
        </nav>
        <img src={base + 'se365-logo.png'} alt="特工365" width="44" height="44" className="se365-logo" />
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">{body}</main>
      <footer className="py-6 text-center text-base text-slate-600">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3">
          <span>由特工 365 製作</span>
          <span aria-hidden="true">·</span>
          <a className="underline" href={base + 'licenses/moe-standard-kai.txt'} target="_blank" rel="noreferrer">字型與筆順資料：中華民國教育部</a>
          <span aria-hidden="true">·</span>
          <span>僅供教學，非營利使用</span>
          {!teacher && ready && !gate && <><span aria-hidden="true">·</span><button type="button" className="underline" onClick={requestTeacher}>老師專區</button></>}
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

// 離線快取：第一次開啟時，等快取程式接手後把已載入的檔案再抓一次存起來，下次沒網路也能開。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const warm = () => [location.href, ...performance.getEntriesByType('resource').map(entry => entry.name)].filter(url => url.startsWith(new URL(base, location.href).href)).forEach(url => { fetch(url).catch(() => {}); });
    if (!navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', warm, {once: true});
    navigator.serviceWorker.register(base + 'sw.js').catch(() => {});
  });
}
