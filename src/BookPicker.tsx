// 版本／年級／學期三組按鈕，老師專區與學生端長得一樣。
import React, {useEffect, useState} from 'react';
import {PUBLISHERS, GRADE_NAMES} from './curriculum-source';
import {practiceBooks} from './local-settings';

export default function BookPicker({value, onChange, allowEmpty = false}: {value: string; onChange: (id: string) => void; allowEmpty?: boolean}) {
  const [publisher, setPublisher] = useState(''), [grade, setGrade] = useState(0);
  useEffect(() => { const book = practiceBooks.find(b => b.id === value); if (book) { setPublisher(book.publisher); setGrade(book.grade); } else if (!value) { setPublisher(''); setGrade(0); } }, [value]);
  const pick = (nextPublisher: string, nextGrade: number) => {
    setPublisher(nextPublisher); setGrade(nextGrade);
    const id = nextPublisher && nextGrade ? `${nextPublisher}-${nextGrade}a` : '', next = practiceBooks.some(b => b.id === id) ? id : '';
    if (next !== value && (next || allowEmpty)) onChange(next);
  };
  return <div className="book-picker" role="group" aria-label="選擇教材">
    <div><span className="book-picker-label">版本</span><div role="group" aria-label="版本" className="book-picker-options">{PUBLISHERS.map(p => <button type="button" key={p.id} aria-pressed={publisher === p.id} onClick={() => pick(p.id, grade)}>{p.name}</button>)}</div></div>
    <div><span className="book-picker-label">年級</span><div role="group" aria-label="年級" className="book-picker-options">{GRADE_NAMES.map((name, i) => <button type="button" key={name} aria-pressed={grade === i + 1} aria-label={`${name}年級`} onClick={() => pick(publisher, i + 1)}>{name}</button>)}</div></div>
    <div><span className="book-picker-label">學期</span><div role="group" aria-label="學期" className="book-picker-options"><button type="button" aria-pressed="true">上學期</button><button type="button" disabled title="下學期的生字資料尚未加入">下學期</button></div></div>
    {allowEmpty && (publisher || grade > 0) && <div className="self-end"><button type="button" className="rounded-xl border-2 bg-white px-3 py-2 font-bold" onClick={() => { setPublisher(''); setGrade(0); onChange(''); }}>不指定</button></div>}
  </div>;
}
