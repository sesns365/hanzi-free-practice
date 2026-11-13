import React from 'react';
import {createRoot} from 'react-dom/client';
import './globals.css';
import FreePractice from './FreePractice';

const base = import.meta.env.BASE_URL;

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-4 py-3 text-xl font-bold">生字自由練習</header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">
        <FreePractice showExit={false} onExit={() => {}} />
      </main>
      <footer className="py-6 text-center text-base text-slate-600">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3">
          <span>由特工 365 製作</span>
          <span aria-hidden="true">·</span>
          <a className="underline" href={base + 'licenses/moe-standard-kai.txt'} target="_blank" rel="noreferrer">字型與筆順資料：中華民國教育部</a>
          <span aria-hidden="true">·</span>
          <span>僅供教學，非營利使用</span>
          <span aria-hidden="true">·</span>
          <span>練習紀錄只存在這台裝置</span>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
