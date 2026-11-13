from playwright.sync_api import sync_playwright
import json,subprocess,time,sys
srv=subprocess.Popen([sys.executable,'-m','http.server','8765'],cwd='/tmp/site',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
U='http://localhost:8765/free-practice/'; errs=[]
def step(name,ok,extra=''): print(('PASS ' if ok else 'FAIL ')+name,extra)
STUB="window.__spoken=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speak(u){window.__spoken.push(u.text);setTimeout(()=>{u.onstart&&u.onstart({});u.onend&&u.onend({})},40)},cancel(){},addEventListener(){},removeEventListener(){}}});"
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context(viewport={'width':1024,'height':900}); c.add_init_script(STUB); pg=c.new_page()
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('dialog',lambda d: d.accept())
    def teacher(): pg.locator('footer button:has-text("老師專區")').click(); pg.wait_for_selector('section[aria-label="老師專區"]'); pg.evaluate("document.querySelectorAll('section[aria-label=老師專區] details').forEach(d=>d.open=true)")
    def play():
        pg.wait_for_selector('.writing-surface'); pg.wait_for_timeout(2500); pg.locator('summary:has-text("需要提示")').click(); pg.evaluate('window.__spoken=[]'); pg.get_by_role('button',name='播放筆順').click(); pg.wait_for_timeout(5000); return pg.evaluate('window.__spoken')
    # 預設不報讀
    pg.goto(U+'?chars=人大'); pg.evaluate("localStorage.setItem('free-practice-options:guest',JSON.stringify({showObserve:false}))"); pg.goto(U+'?chars=人大')
    step('預設播放筆順不報讀', play()==[])
    # 老師開啟報讀、速度很慢
    pg.goto(U); teacher(); pg.locator('select[aria-label="筆順速度預設"]').select_option('0.5'); pg.locator('label:has-text("播放筆順時報讀筆畫名稱") input').check(); pg.screenshot(path='/home/claude/h1.png',full_page=True)
    pg.get_by_role('button',name='回到練習').click(); pg.goto(U+'?chars=人大'); spoken=play()
    step('開啟後逐筆報讀，撇用同音字代讀', spoken[:2]==['一，苤','二，捺'], str(spoken))
    step('學生設定顯示老師的筆順速度', (pg.get_by_role('button',name='語音與筆順設定').click() or True) and pg.locator('select[aria-label^="筆順速"]').input_value()=='0.5')
    # 學生改速度後記住
    pg.locator('select[aria-label^="筆順速"]').select_option('1.5'); pg.get_by_role('button',name='完成').click(); pg.reload(); pg.wait_for_selector('.writing-surface'); pg.get_by_role('button',name='語音與筆順設定').click()
    step('學生改的筆順速度重新整理後仍在', pg.locator('select[aria-label^="筆順速"]').input_value()=='1.5'); pg.get_by_role('button',name='完成').click()
    # 逐字更正筆畫名稱
    pg.goto(U); teacher(); pg.get_by_role('tab',name='逐字筆畫名稱').click(); pg.wait_for_selector('ol li select'); ch=pg.locator('b.text-lg').inner_text()
    pg.locator('ol li select').first.select_option('挑'); pg.wait_for_timeout(400)
    ls=json.loads(pg.evaluate("localStorage.getItem('free-practice-local-settings:v1')"))
    step('更正筆畫名稱自動儲存', len(ls['strokeNameOverrides'])==1 and list(ls['strokeNameOverrides'].values())[0][0]=='挑' and '已更正' in pg.locator('b.text-lg').inner_text(), ch)
    pg.evaluate('window.__spoken=[]'); pg.get_by_role('button',name='🔊 試聽整個字').click(); pg.wait_for_timeout(1200); sp=pg.evaluate('window.__spoken')
    step('試聽時挑用同音字代讀', bool(sp) and sp[0].startswith('一，窕'), str(sp)[:60]); pg.screenshot(path='/home/claude/h2.png',full_page=True)
    step('匯出含新設定', (lambda e: e['strokeNarration'] is True and e['animationSpeed']==0.5)(ls))
    print('errs',errs); b.close()
finally: srv.terminate()
