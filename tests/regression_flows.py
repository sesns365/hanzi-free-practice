from playwright.sync_api import sync_playwright
import json,subprocess,time,sys,os
srv=subprocess.Popen([sys.executable,'-m','http.server','8765'],cwd='/tmp/site',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
U='http://localhost:8765/free-practice/'
errs=[]
def watch(pg):
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('dialog',lambda d: d.accept())
def step(name,ok,extra=''): print(('PASS ' if ok else 'FAIL ')+name,extra)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':1280,'height':1000},accept_downloads=True); pg=ctx.new_page(); watch(pg)
    pg.goto(U); pg.wait_for_selector('section[aria-label="自由練習選字"]')
    step('學生看不到老師專區按鈕', pg.locator('header button:has-text("老師專區")').count()==0)
    step('標題與圖示', '自由練字板' in pg.title() and pg.locator('header img').count()==2)
    pg.locator('footer button:has-text("老師專區")').click(); pg.wait_for_selector('section[aria-label="老師專區"]')
    step('未設密碼可進入並有提醒', pg.locator('text=尚未設定老師密碼，學生也進得來').count()==1)
    pg.locator('select').nth(1).select_option('guided')   # 書寫方式
    pg.locator('label:has-text("預設使用簡易畫面") input').check()
    pg.locator('label:has-text("鎖定練習方式") input').check()
    pg.get_by_role('button',name='康軒').click(); pg.get_by_role('button',name='二年級').click()
    pg.locator('label:has-text("課次") select').select_option(index=2)
    pg.locator('label:has-text("班級人數") input').fill('3')
    pg.locator('input[type=password]').fill('1234'); pg.get_by_role('button',name='儲存密碼').click()
    pg.screenshot(path='/home/claude/a1.png',full_page=True)
    pg.get_by_role('tab',name='自訂字單').click(); pg.get_by_role('button',name='新增字單').click()
    pg.locator('input[placeholder^="例如：第一組"]').fill('加強字'); pg.locator('textarea').fill('學習，快樂學'); pg.get_by_role('button',name='儲存字單').click()
    step('字單儲存', pg.locator('li:has-text("加強字")').count()==1, pg.locator('li:has-text("加強字")').inner_text().replace('\n',' '))
    pg.get_by_role('tab',name='派課連結').click(); pg.wait_for_timeout(500)
    pg.locator('label:has-text("課次") select').nth(1).select_option(index=2); pg.wait_for_timeout(500)
    link=pg.locator('p.break-all').inner_text(); step('派課連結', 'book=' in link and 'start=1' in link, link); step('QR', pg.locator('img[alt*="QR"]').count()==1)
    pg.screenshot(path='/home/claude/a2.png',full_page=True)
    pg.get_by_role('tab',name='設定檔與共用').click()
    with pg.expect_download() as d: pg.get_by_role('button',name='匯出設定檔').click()
    path=d.value.path(); exported=json.load(open(path,encoding='utf8'))
    step('匯出設定檔', exported['app']=='hanzi-free-practice' and exported['seatCount']==3 and exported['writingMode']=='guided' and exported['customLists'][0]['chars']=='學習快樂' and len(exported['pinHash'])==8 and '1234' not in json.dumps(exported), str({k:exported[k] for k in ['version','seatCount','defaultBookId','defaultLessonId','lockPractice','simpleMode']}))
    pg.screenshot(path='/home/claude/a3.png',full_page=True)
    pg.get_by_role('button',name='回到練習').click(); pg.wait_for_selector('section[aria-label="選擇座號"]')
    step('座號選擇', pg.locator('.seat-grid button').count()==3); pg.screenshot(path='/home/claude/a4.png')
    pg.locator('.seat-grid button').nth(1).click(); pg.wait_for_selector('section[aria-label="自由練習選字"]')
    step('預設版本課次', pg.locator('.book-picker button[aria-pressed=true]').all_inner_texts()==['康軒','二','上學期'] and pg.locator('.lesson-options button[aria-pressed=true]').count()==1)
    step('鎖定練習方式', pg.locator('text=練習方式由老師設定').count()==1 and pg.locator('summary:has-text("練習設定")').count()==0)
    step('老師的字單', pg.locator('button:has-text("加強字（4 字）")').count()==1)
    pg.screenshot(path='/home/claude/a5.png',full_page=True)
    # 密碼
    pg.locator('footer button:has-text("老師專區")').click(); pg.locator('input[type=password]').fill('9999'); pg.get_by_role('button',name='進入').click()
    step('錯誤密碼擋下', pg.locator('text=密碼不對').count()==1)
    pg.locator('input[type=password]').fill('1234'); pg.get_by_role('button',name='進入').click(); pg.wait_for_selector('section[aria-label="老師專區"]')
    step('正確密碼進入', True)
    # 改成自由書寫、不鎖定，測自動保存與進度
    pg.locator('select').nth(1).select_option('free'); pg.locator('label:has-text("鎖定練習方式") input').uncheck()
    pg.get_by_role('button',name='回到練習').click(); pg.wait_for_selector('section[aria-label="自由練習選字"]'); step('回到練習後離開老師模式', pg.locator('footer button:has-text("老師專區")').count()==1 and pg.locator('header button:has-text("回到練習")').count()==0); step('開始按鈕在選字區之前且選字收合', pg.locator('.free-start-button').count()==1 and not pg.locator('button:has-text("開始練習已選生字")').is_visible())
    pg.get_by_role('button',name='開始整課練習').click(); pg.wait_for_selector('.writing-surface'); pg.wait_for_timeout(4500)
    sec=pg.locator('section[aria-label="自由練習書寫"]')
    step('簡易畫面', sec.get_attribute('data-simple')=='true' and not pg.locator('[data-ctl="secondary"]').first.is_visible() and pg.get_by_role('button',name='清除重寫').is_visible())
    step('語詞有注音', pg.locator('.free-word-line [aria-label]').count()>0 or pg.locator('.free-word-line ruby, .free-word-line span span').count()>0)
    pg.screenshot(path='/home/claude/a6.png',full_page=True)
    box=pg.locator('.writing-surface').bounding_box()
    def draw():
        x,y,w,h=box['x'],box['y'],box['width'],box['height']
        pg.mouse.move(x+w*.3,y+h*.3); pg.mouse.down(); pg.mouse.move(x+w*.5,y+h*.5,steps=8); pg.mouse.move(x+w*.7,y+h*.4,steps=8); pg.mouse.up()
    draw(); pg.wait_for_timeout(300)
    pg.get_by_role('button',name='下一個字').click(); pg.wait_for_timeout(1500)
    t=pg.locator('.free-progress-list summary').first.inner_text(); pos=pg.locator('.free-writing-navigation span[aria-live]').inner_text()
    step('換字自動保存並得星', t.startswith('★ 1') and '第 2' in pos, t+' / '+pos)
    pg.get_by_role('button',name='返回選字與設定').click(); pg.wait_for_selector('text=上次還沒練完')
    step('返回後顯示繼續練習', True)
    pg.reload(); pg.wait_for_selector('text=上次還沒練完'); step('重新整理後座號仍保留', '座號 2' in pg.locator('header').inner_text())
    pg.screenshot(path='/home/claude/a7.png',full_page=True)
    pg.get_by_role('button',name='繼續練習').click(); pg.wait_for_selector('.writing-surface')
    t=pg.locator('.free-progress-list summary').first.inner_text(); pos=pg.locator('.free-writing-navigation span[aria-live]').inner_text()
    step('重新整理後接續進度', t.startswith('★ 1') and '第 2' in pos, t+' / '+pos)
    recs=pg.evaluate("Object.keys(localStorage)"); step('紀錄依座號分開', any('seat-2' in k and 'records' in k for k in recs), str([k for k in recs if 'seat' in k]))
    # 另一個座號沒有進度
    pg.get_by_role('button',name='返回選字與設定').click(); pg.wait_for_selector('section[aria-label="自由練習選字"]'); pg.get_by_role('button',name='換人').click(); pg.wait_for_selector('.seat-grid'); pg.locator('.seat-grid button').nth(0).click(); pg.wait_for_selector('section[aria-label="自由練習選字"]')
    step('座號 1 沒有座號 2 的進度', pg.locator('text=上次還沒練完').count()==0)
    # 字單
    pg.locator('button:has-text("加強字（4 字）")').click(); pg.wait_for_selector('.writing-surface')
    step('字單練習', '字單：加強字' in pg.locator('.free-writing-header').inner_text() and '1／4' in pg.locator('.free-writing-navigation').inner_text())
    # 派課連結
    pg2=ctx.new_page(); watch(pg2); pg2.goto(link+'&mode=guided&lock=1'); pg2.wait_for_selector('.seat-grid'); pg2.locator('.seat-grid button').nth(2).click(); pg2.wait_for_selector('.writing-surface',timeout=8000)
    step('派課連結直接開始', '第 1／' in pg2.locator('.free-writing-navigation').inner_text())
    pg2.goto(U+'?chars=山水火&steps=writing'); pg2.wait_for_selector('.writing-surface'); step('網址指定生字', '1／3' in pg2.locator('.free-writing-navigation').inner_text())
    pg2.goto(U+'?chars=山水&mode=free&steps=writing'); pg2.wait_for_selector('.writing-surface'); pg2.wait_for_timeout(4500)
    step('書寫時收起網站標題列', not pg2.locator('header').is_visible())
    bx=pg2.locator('.writing-surface').bounding_box()
    def draw2():
        x,y,w,h=bx['x'],bx['y'],bx['width'],bx['height']
        pg2.mouse.move(x+w*.3,y+h*.3); pg2.mouse.down(); pg2.mouse.move(x+w*.6,y+h*.6,steps=8); pg2.mouse.up(); pg2.wait_for_timeout(300)
    draw2(); pg2.get_by_role('button',name='下一個字').click(); pg2.wait_for_timeout(4500); bx=pg2.locator('.writing-surface').bounding_box(); draw2()
    pg2.get_by_role('button',name='寫好了').click(); pg2.wait_for_selector('text=太棒了！全部完成！')
    step('最後一個字按寫好了完成', pg2.locator('.free-progress-list summary').first.inner_text().startswith('★ 2'))
    pg2.screenshot(path='/home/claude/c3.png')
    pg2.get_by_role('button',name='再練一次').click(); pg2.wait_for_timeout(800)
    step('再練一次', pg2.locator('.free-progress-list summary').first.inner_text().startswith('★ 0') and '第 1／2' in pg2.locator('.free-writing-navigation').inner_text())
    pg2.close()
    # 共用設定檔：新的瀏覽器（沒有任何本機設定）會套用
    json.dump(exported,open('/tmp/site/free-practice/class-settings.json','w',encoding='utf8'),ensure_ascii=False)
    ctx2=b.new_context(viewport={'width':1280,'height':900}); p3=ctx2.new_page(); watch(p3); p3.goto(U); p3.wait_for_selector('.seat-grid')
    step('新載具自動套用共用設定檔', p3.locator('.seat-grid button').count()==3)
    p3.locator('text=我沒有座號').click(); p3.wait_for_selector('section[aria-label="自由練習選字"]')
    step('共用設定含字單與鎖定', p3.locator('button:has-text("加強字")').count()==1 and p3.locator('text=練習方式由老師設定').count()==1)
    # 離線
    p3.wait_for_timeout(2500); p3.reload(); p3.wait_for_selector('section[aria-label="自由練習選字"]'); p3.get_by_role('button',name='開始整課練習').click(); p3.wait_for_selector('.writing-surface'); p3.wait_for_timeout(5000)
    ctx2.set_offline(True); p3.reload(); 
    try:
        p3.wait_for_selector('section[aria-label="自由練習選字"]',timeout=8000); p3.locator('text=繼續練習').count()
        p3.get_by_role('button',name='開始整課練習').click(); p3.wait_for_selector('.writing-surface'); p3.get_by_role('button',name='下一個字').click(); p3.wait_for_timeout(2500)
        txt=p3.locator('section[aria-label="自由練習書寫"]').inner_text()
        step('離線可開啟並換到未看過的字', '無法載入' not in txt and '連線中斷' not in txt, '')
        p3.screenshot(path='/home/claude/a8.png',full_page=True)
    except Exception as e: step('離線可開啟',False,str(e)[:200])
    print('errs',[e for e in errs if 'ERR_INTERNET_DISCONNECTED' not in e and 'fonts.googleapis' not in e][:8])
    b.close()
finally:
    srv.terminate(); os.remove('/tmp/site/free-practice/class-settings.json') if False else None
