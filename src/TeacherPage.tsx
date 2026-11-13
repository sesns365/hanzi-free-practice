// @ts-nocheck
// 老師專區：練習預設、逐字設定、自訂字單、派課連結、設定檔。所有設定都存在這台裝置。
import React, {useCallback, useEffect, useRef, useState} from 'react';
import QRCode from 'qrcode';
import TeachingContent from './TeachingContent';
import TeachingSettings from './TeachingSettings';
import {validateTeachingEntry} from './curriculum-settings';
import {getBook, getLessonMeta} from './curriculum-source';
import {loadLocalSettings, saveLocalSettings, EMPTY_LOCAL_SETTINGS, practiceBooks, isHanzi, pinHash, exportSettings, parseSettingsFile} from './local-settings';

const tab = 'rounded-xl border-2 bg-white px-4 py-3 font-bold';
const btn = 'rounded-xl border-2 bg-white px-4 py-2 font-bold hover:bg-blue-50 disabled:opacity-40';
const field = 'mt-1 block w-full rounded-xl border-2 bg-white p-2';
const card = 'space-y-4 rounded-2xl border bg-white p-5';
const TABS = [['general', '練習預設'], ['content', '逐字教材與讀音'], ['parts', '逐字部件與部首答案'], ['lists', '自訂字單'], ['links', '派課連結'], ['file', '設定檔與共用']];
const STEPS = [['writing', '直接書寫'], ['parts', '畫部件、組部件、書寫']], MODES = [['free', '自由書寫'], ['guided', '筆順引導']], HINTS = [['none', '不顯示底字'], ['pale', '淡色底字'], ['partial', '部分字形']];
const lessonLabel = id => `第 ${getLessonMeta(id)?.number || ''} 課・${getLessonMeta(id)?.title || id}`;
const Options = ({rows}) => rows.map(([value, label]) => <option key={value} value={value}>{label}</option>);
const BookOptions = () => practiceBooks.map(book => <option key={book.id} value={book.id}>{book.label}</option>);

function General({settings, commit}) {
  const [pin, setPin] = useState(''), [note, setNote] = useState('');
  const set = patch => { try { commit(patch); setNote('已儲存。'); } catch (e) { setNote(e.message); } };
  const check = (key, label, help) => <label className="flex items-start gap-3 rounded-xl border p-3"><input type="checkbox" className="mt-1" checked={settings[key]} onChange={e => set({[key]: e.target.checked})} /><span><strong>{label}</strong>{help && <span className="block text-sm text-slate-600">{help}</span>}</span></label>;
  const savePin = () => {
    if (!/^\d{4,8}$/.test(pin)) { setNote('密碼請輸入 4 到 8 個數字。'); return; }
    set({pinHash: pinHash(pin)}); setPin(''); setNote('老師密碼已設定。之後進入老師專區需要輸入密碼。');
  };
  return <div className="space-y-5">
    <section className={card}><h3 className="text-xl font-bold">學生打開時的練習方式</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>練習步驟<select className={field} value={settings.practiceSteps} onChange={e => set({practiceSteps: e.target.value})}><Options rows={STEPS} /></select></label>
        <label>書寫方式<select className={field} value={settings.writingMode} onChange={e => set({writingMode: e.target.value})}><Options rows={MODES} /></select></label>
        <label>字形提示<select className={field} value={settings.writingHint} onChange={e => set({writingHint: e.target.value})}><Options rows={HINTS} /></select></label>
      </div>
      {check('simpleMode', '預設使用簡易畫面', '書寫時只留下提示、清除重寫、保存字跡與換字，說明文字放大。')}
      {check('lockPractice', '鎖定練習方式，學生不能自己更改', '沒有鎖定時，學生可以在選字畫面調整，並記住自己上次的選擇。')}
    </section>
    <section className={card}><h3 className="text-xl font-bold">學生打開時的版本與課次</h3>
      <p className="text-sm text-slate-600">有指定時，學生一打開就是這個版本與課次；沒有指定時，會記住這台裝置上次選的版本與課次。</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>教材版本<select className={field} value={settings.defaultBookId} onChange={e => set({defaultBookId: e.target.value, defaultLessonId: ''})}><option value="">不指定</option><BookOptions /></select></label>
        <label>課次<select className={field} disabled={!settings.defaultBookId} value={settings.defaultLessonId} onChange={e => set({defaultLessonId: e.target.value})}><option value="">不指定</option><option value="all">整冊版本生字</option>{settings.defaultBookId && getBook(settings.defaultBookId).lessons.map(id => <option key={id} value={id}>{lessonLabel(id)}</option>)}</select></label>
      </div>
    </section>
    <section className={card}><h3 className="text-xl font-bold">共用載具：用座號分開紀錄</h3>
      <p className="text-sm text-slate-600">填入班級人數後，學生開始前要先點自己的座號，字跡紀錄、星星進度和練習方式就會各自分開。填 0 表示不分座號。這裡只用座號，不會儲存學生姓名。</p>
      <label className="block w-40">班級人數<input type="number" min="0" max="60" className={field} value={settings.seatCount} onChange={e => set({seatCount: Math.max(0, Math.min(60, Math.floor(Number(e.target.value) || 0)))})} /></label>
    </section>
    <section className={card}><h3 className="text-xl font-bold">老師密碼</h3>
      <p className="text-sm text-slate-600">{settings.pinHash ? '已設定密碼。' : '尚未設定密碼：學生點頁尾的「老師專區」也進得來，建議設定。'}密碼只是防止學生誤入，請不要使用其他地方的重要密碼。</p>
      <div className="flex flex-wrap items-end gap-3"><label>{settings.pinHash ? '更換密碼' : '設定密碼'}（4 到 8 個數字）<input type="password" inputMode="numeric" autoComplete="off" maxLength={8} className={field + ' w-48'} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /></label><button type="button" className={btn} onClick={savePin}>儲存密碼</button>{settings.pinHash && <button type="button" className={btn} onClick={() => { set({pinHash: ''}); setNote('已取消老師密碼。'); }}>取消密碼</button>}</div>
    </section>
    <p role="status" className="text-blue-800">{note}</p>
  </div>;
}

function Lists({settings, commit}) {
  const [editing, setEditing] = useState(null), [name, setName] = useState(''), [chars, setChars] = useState(''), [note, setNote] = useState('');
  const clean = [...new Set([...chars].filter(isHanzi))];
  const begin = list => { setEditing(list ? list.id : 'new'); setName(list?.name || ''); setChars(list?.chars || ''); setNote(''); };
  const save = () => {
    if (!name.trim() || !clean.length) { setNote('請填字單名稱，並至少輸入一個國字。'); return; }
    const item = {id: editing === 'new' ? 'list-' + Date.now().toString(36) : editing, name: name.trim().slice(0, 20), chars: clean.slice(0, 200).join('')};
    const next = editing === 'new' ? [...settings.customLists, item] : settings.customLists.map(list => list.id === editing ? item : list);
    try { commit({customLists: next}); setEditing(null); setNote('字單已儲存，學生的選字畫面會出現這個字單。'); } catch (e) { setNote(e.message); }
  };
  const remove = list => { if (!window.confirm(`要刪除字單「${list.name}」嗎？`)) return; try { commit({customLists: settings.customLists.filter(item => item.id !== list.id)}); setNote('已刪除字單。'); } catch (e) { setNote(e.message); } };
  return <section className={card}><h3 className="text-xl font-bold">自訂字單</h3>
    <p className="text-sm text-slate-600">為個別學生或小組準備課本以外的字。字單會出現在學生選字畫面的「老師的字單」，點一下就開始練習。課本沒有的字沒有語詞例句，少數罕用字沒有筆順資料時只能自由書寫。</p>
    {settings.customLists.length > 0 && <ul className="space-y-2">{settings.customLists.map(list => <li key={list.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><span><strong>{list.name}</strong><span className="ml-2 text-slate-600">{[...list.chars].length} 字</span><span className="mt-1 block text-xl">{list.chars}</span></span><span className="flex gap-2"><button type="button" className={btn} onClick={() => begin(list)}>修改</button><button type="button" className={btn + ' text-red-800'} onClick={() => remove(list)}>刪除</button></span></li>)}</ul>}
    {editing ? <div className="space-y-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
      <label className="block">字單名稱（最多 20 字，請不要寫學生全名）<input className={field} maxLength={20} value={name} onChange={e => setName(e.target.value)} placeholder="例如：第一組加強字" /></label>
      <label className="block">生字（直接連續輸入，重複的字和標點會自動去掉）<textarea className={field + ' text-2xl'} rows={3} value={chars} onChange={e => setChars(e.target.value)} placeholder="例如：學習快樂" /></label>
      <p className="text-sm">共 {clean.length} 個字{clean.length > 200 ? '，只保留前 200 個' : ''}</p>
      <div className="flex gap-2"><button type="button" className={btn + ' border-blue-700 text-blue-800'} onClick={save}>儲存字單</button><button type="button" className={btn} onClick={() => setEditing(null)}>取消</button></div>
    </div> : <button type="button" className={btn + ' border-blue-700 text-blue-800'} onClick={() => begin(null)}>新增字單</button>}
    <p role="status" className="text-blue-800">{note}</p>
  </section>;
}

function Links({settings}) {
  const [book, setBook] = useState(settings.defaultBookId || practiceBooks[0].id), [lesson, setLesson] = useState(''), [list, setList] = useState('');
  const [steps, setSteps] = useState(''), [mode, setMode] = useState(''), [hint, setHint] = useState(''), [start, setStart] = useState(true), [lock, setLock] = useState(false), [qr, setQr] = useState(''), [note, setNote] = useState('');
  const params = new URLSearchParams();
  const chosenList = settings.customLists.find(item => item.id === list);
  if (chosenList) params.set('chars', chosenList.chars); else { params.set('book', book); if (lesson) params.set('lesson', lesson); if (start && lesson && lesson !== 'all') params.set('start', '1'); }
  if (steps) params.set('steps', steps); if (mode) params.set('mode', mode); if (hint) params.set('hint', hint); if (lock) params.set('lock', '1');
  const url = location.origin + location.pathname + '?' + params.toString();
  useEffect(() => { let stop = false; QRCode.toDataURL(url, {width: 360, margin: 2}).then(data => { if (!stop) setQr(data); }).catch(() => { if (!stop) setQr(''); }); return () => { stop = true; }; }, [url]);
  const copy = async () => { try { await navigator.clipboard.writeText(url); setNote('已複製連結。'); } catch { setNote('無法自動複製，請長按或選取上方連結手動複製。'); } };
  return <section className={card}><h3 className="text-xl font-bold">派課連結與 QR Code</h3>
    <p className="text-sm text-slate-600">選好範圍和練習方式，把連結傳給學生或把 QR Code 印出來貼在桌上，學生打開就直接進到這一課。逐字設定與字單內容仍以各載具上的設定為準。</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <label>老師字單<select className={field} value={list} onChange={e => setList(e.target.value)}><option value="">不用字單，選課次</option>{settings.customLists.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>教材版本<select className={field} disabled={!!chosenList} value={book} onChange={e => { setBook(e.target.value); setLesson(''); }}><BookOptions /></select></label>
      <label>課次<select className={field} disabled={!!chosenList} value={lesson} onChange={e => setLesson(e.target.value)}><option value="">只指定版本</option><option value="all">整冊版本生字</option>{getBook(book).lessons.map(id => <option key={id} value={id}>{lessonLabel(id)}</option>)}</select></label>
      <label>練習步驟<select className={field} value={steps} onChange={e => setSteps(e.target.value)}><option value="">不指定</option><Options rows={STEPS} /></select></label>
      <label>書寫方式<select className={field} value={mode} onChange={e => setMode(e.target.value)}><option value="">不指定</option><Options rows={MODES} /></select></label>
      <label>字形提示<select className={field} value={hint} onChange={e => setHint(e.target.value)}><option value="">不指定</option><Options rows={HINTS} /></select></label>
    </div>
    <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2"><input type="checkbox" disabled={!!chosenList || !lesson || lesson === 'all'} checked={start} onChange={e => setStart(e.target.checked)} />打開後直接開始整課練習</label><label className="flex items-center gap-2"><input type="checkbox" checked={lock} onChange={e => setLock(e.target.checked)} />學生不能更改練習方式</label></div>
    <div className="flex flex-wrap items-start gap-5"><div className="min-w-0 flex-1 space-y-3"><p className="break-all rounded-xl border bg-slate-50 p-3 text-sm">{url}</p><div className="flex flex-wrap gap-2"><button type="button" className={btn + ' border-blue-700 text-blue-800'} onClick={copy}>複製連結</button>{qr && <a className={btn} href={qr} download="派課QRCode.png">下載 QR Code</a>}</div><p role="status" className="text-blue-800">{note}</p></div>{qr && <img src={qr} alt="派課連結 QR Code" className="h-44 w-44 rounded-xl border" />}</div>
  </section>;
}

function SettingsFile({settings, commit, onReplace}) {
  const [note, setNote] = useState(''), input = useRef(null);
  const download = () => {
    try {
      const {version, text} = exportSettings(settings), link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([text], {type: 'application/json'})); link.download = 'class-settings.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      commit({sharedVersion: version}); setNote('已下載 class-settings.json。');
    } catch (e) { setNote(e.message || '設定檔製作失敗。'); }
  };
  const load = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const parsed = parseSettingsFile(await file.text());
    if (!parsed) { setNote('這不是本站匯出的設定檔，沒有匯入。'); return; }
    if (!window.confirm('匯入後，這台裝置目前的老師設定會整份換成設定檔的內容。要匯入嗎？')) return;
    try { onReplace(saveLocalSettings(parsed.settings)); setNote('已匯入設定檔。'); } catch (e) { setNote(e.message); }
  };
  const clear = () => {
    if (!window.confirm('要清除這台裝置上所有老師設定（含逐字設定、字單、密碼），恢復成原始狀態嗎？這個動作無法復原。')) return;
    // 保留已套用的共用版本，否則下次開啟又會被網站上的共用設定檔蓋回來。
    try { onReplace(saveLocalSettings({...EMPTY_LOCAL_SETTINGS, sharedVersion: settings.sharedVersion})); setNote('已清除這台裝置的老師設定。'); } catch (e) { setNote(e.message); }
  };
  return <div className="space-y-5">
    <section className={card}><h3 className="text-xl font-bold">一次設定，所有載具套用</h3>
      <ol className="list-decimal space-y-2 pl-6"><li>在這台裝置把所有老師設定調整好。</li><li>按「匯出設定檔」，會下載一個 <code>class-settings.json</code>。</li><li>到 GitHub 儲存庫的 <code>public</code> 資料夾，用這個檔案取代原本的 <code>class-settings.json</code>（Add file → Upload files）。</li><li>等一兩分鐘網站更新後，每台載具下次開啟就會自動換成這份設定。</li></ol>
      <p className="text-sm text-slate-600">之後要改設定，改完再匯出、上傳一次即可。載具只會在網站上的設定檔比較新時整份更換；更換時，那台載具上自己改過的老師設定會被取代，學生的練習紀錄不受影響。設定檔放在公開的儲存庫，任何人都看得到內容，請不要在字單名稱或教學提醒裡寫學生姓名。</p>
      <div className="flex flex-wrap gap-2"><button type="button" className={btn + ' border-blue-700 text-blue-800'} onClick={download}>匯出設定檔</button><button type="button" className={btn} onClick={() => input.current?.click()}>匯入設定檔到這台裝置</button><input ref={input} type="file" accept="application/json,.json" hidden onChange={load} /></div>
      <p className="text-sm text-slate-600">{settings.sharedVersion ? `這台裝置目前對應的設定檔版本：${new Date(settings.sharedVersion).toLocaleString('zh-TW')}` : '這台裝置還沒有匯出或套用過設定檔。'}</p>
    </section>
    <section className={card}><h3 className="text-xl font-bold">清除</h3><button type="button" className={btn + ' text-red-800'} onClick={clear}>清除這台裝置的所有老師設定</button></section>
    <p role="status" className="text-blue-800">{note}</p>
  </div>;
}

export default function TeacherPage({settings, onChange, onDirty}) {
  const [view, setView] = useState('general'), [dirty, setDirty] = useState(false), [resetKey, setResetKey] = useState(0);
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
    markDirty(false); setView(next);
  };
  const replace = saved => { onChange(saved); markDirty(false); setResetKey(k => k + 1); };
  const counts = {content: Object.keys(settings.entryOverrides).length, parts: new Set([...Object.keys(settings.componentGroups), ...Object.keys(settings.radicalVariantOverrides)]).size, lists: settings.customLists.length};
  return <section aria-label="老師專區" className="space-y-5">
    <div className="space-y-3 rounded-2xl border bg-white p-5">
      <h2 className="text-2xl font-bold">老師專區</h2>
      <p>這裡的設定存在這台裝置的這個瀏覽器，之後在同一台載具開啟都會套用。要讓其他載具也套用，請看「設定檔與共用」。</p>
      {!settings.pinHash && <p className="rounded-xl bg-amber-50 p-3 text-amber-950">尚未設定老師密碼，學生也能進到這一頁。可在「練習預設」最下方設定。</p>}
      <div role="tablist" aria-label="老師設定類別" className="flex flex-wrap gap-2">{TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} className={tab + (view === id ? ' border-blue-700 text-blue-800' : '')} onClick={() => choose(id)}>{label}{counts[id] > 0 && <span className="ml-2 text-sm font-normal">{id === 'lists' ? `${counts[id]} 份` : `已調整 ${counts[id]} 字`}</span>}</button>)}</div>
    </div>
    {view === 'general' && <General key={resetKey} settings={settings} commit={commit} />}
    {view === 'content' && <TeachingContent key={'content' + resetKey} initial={settings} api={contentApi} onDirty={markDirty} />}
    {view === 'parts' && <>
      <label className="flex items-center gap-3 rounded-2xl border bg-white p-4"><input type="checkbox" checked={settings.paintVariantQuestion} onChange={e => { try { commit({paintVariantQuestion: e.target.checked}); } catch (error) { window.alert(error.message); } }} /><span><strong>畫部件時，請學生判斷部首是否為變形部首</strong><span className="block text-sm text-slate-600">開啟後，下方每個字的「變形部首答案」才會用來檢查；這個開關勾選後立即儲存。</span></span></label>
      <TeachingSettings key={'parts' + resetKey} partsOnly initial={settings} api={partsApi} onDirty={markDirty} />
    </>}
    {view === 'lists' && <Lists key={resetKey} settings={settings} commit={commit} />}
    {view === 'links' && <Links key={resetKey} settings={settings} />}
    {view === 'file' && <SettingsFile settings={settings} commit={commit} onReplace={replace} />}
  </section>;
}
