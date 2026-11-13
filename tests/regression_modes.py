from playwright.sync_api import sync_playwright
import json,subprocess,time,sys
srv=subprocess.Popen([sys.executable,'-m','http.server','8765'],cwd='/tmp/site',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
U='http://localhost:8765/free-practice/'; errs=[]
def step(name,ok,extra=''): print(('PASS ' if ok else 'FAIL ')+name,extra)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    def fresh(h=700):
        c=b.new_context(viewport={'width':1024,'height':h},accept_downloads=True); pg=c.new_page()
        pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'speech' not in m.text.lower() else None); pg.on('dialog',lambda d: d.accept()); return pg
    def draw(pg):
        bx=pg.locator('.writing-surface').bounding_box(); x,y,w,h=bx['x'],bx['y'],bx['width'],bx['height']
        pg.mouse.move(x+w*.3,y+h*.3); pg.mouse.down(); pg.mouse.move(x+w*.6,y+h*.6,steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
    def pick(pg,lesson=2):
        pg.get_by_role('button',name='康軒').click(); pg.get_by_role('button',name='二年級').click(); pg.locator('.lesson-options button').nth(lesson).click()
    def teacher(pg): pg.locator('footer button:has-text("老師專區")').click(); pg.wait_for_selector('section[aria-label="老師專區"]')
    star=lambda pg: pg.locator('.free-progress-list summary').first.inner_text()
    # ── 自己寫（預設）：課次按鈕、畫面高度、換字得星
    pg=fresh(); pg.goto(U); pick(pg); step('課次按鈕', pg.locator('.lesson-options button[aria-pressed=true]').count()==1)
    pg.locator('summary',has_text='練習設定').click(); pg.locator('button:has-text("關閉範字顯示")').click()
    step('用詞', pg.locator('select[aria-label="練習步驟"] option').all_inner_texts()==['只寫字','先畫部件、組部件，再寫字'] and pg.locator('select[aria-label="書寫方式"] option').all_inner_texts()==['自己寫','跟著筆順寫'])
    pg.get_by_role('button',name='開始整課練習').click(); pg.wait_for_selector('.writing-surface'); pg.wait_for_timeout(1500)
    sb=pg.locator('.writing-surface').bounding_box(); nb=pg.get_by_role('button',name='下一個字').bounding_box()
    step('格子與下一個字同一畫面（1024×700）', sb['y']>=0 and nb['y']+nb['height']<=700 and sb['y']+sb['height']<=nb['y']+2 and pg.evaluate('window.scrollY')==0, f"格子 {round(sb['width'])}px 下一個字底 {round(nb['y']+nb['height'])}")
    step('書寫時收起標題列、只剩書寫時隱藏分頁', not pg.locator('header').is_visible() and not pg.locator('[role=tab]').first.is_visible())
    pg.screenshot(path='/home/claude/g1.png')
    draw(pg); pg.get_by_role('button',name='下一個字').click(); pg.wait_for_timeout(1500); step('自己寫：換字得星', star(pg).startswith('★ 1'), star(pg))
    # ── 跟著筆順寫
    pg.get_by_role('button',name='返回選字與設定').click(); pg.locator('summary',has_text='練習設定').click(); pg.locator('select[aria-label="書寫方式"]').select_option('guided')
    pg.get_by_role('button',name='開始整課練習').click(); pg.wait_for_selector('.writing-surface'); pg.wait_for_timeout(2500)
    step('跟著筆順寫', json.loads(pg.locator('#writing-canvas').get_attribute('data-practice'))['exercise']=='guided' and pg.get_by_role('button',name='下一個字').is_visible())
    # ── 先畫部件
    pg.get_by_role('button',name='返回選字與設定').click(); pg.locator('summary',has_text='練習設定').click(); pg.locator('select[aria-label="練習步驟"]').select_option('parts')
    pg.get_by_role('button',name='開始整課練習').click(); pg.wait_for_selector('[role=tab]:has-text("畫部件")'); pg.wait_for_timeout(2500)
    step('部件模式：三個步驟出現', pg.locator('[role=tab]').count()==3)
    step('部件步驟時不顯示下一個字', pg.get_by_role('button',name='下一個字').count()==0); pg.screenshot(path='/home/claude/g2.png')
    # ── 下一課
    chars=None
    pg2=fresh(); pg2.goto(U); pick(pg2); pg2.locator('summary',has_text='自己選字').click(); chars=pg2.locator('button.hanzi-kai').all_inner_texts(); lesson=json.loads(pg2.evaluate("localStorage.getItem('free-practice-last:guest')"))
    pg2.evaluate("([s,l])=>{localStorage.setItem('free-practice-progress:guest',JSON.stringify({sequence:s,position:s.length-1,done:s.slice(0,-1).map((_,i)=>i),book:l.book,lesson:l.lesson,list:''}));localStorage.setItem('free-practice-options:guest',JSON.stringify({showObserve:false}))}",[chars,lesson])
    pg2.reload(); pg2.get_by_role('button',name='繼續練習').click(); pg2.wait_for_selector('.writing-surface'); pg2.wait_for_timeout(1500); draw(pg2); pg2.get_by_role('button',name='寫好了').click(); pg2.wait_for_selector('text=太棒了！全部完成！')
    step('完成後有下一課', pg2.get_by_role('button',name='下一課').count()==1); pg2.screenshot(path='/home/claude/g3.png')
    pg2.get_by_role('button',name='下一課').click(); pg2.wait_for_timeout(1200)
    now=json.loads(pg2.evaluate("localStorage.getItem('free-practice-last:guest')")); step('下一課開始新的一課', now['lesson']!=lesson['lesson'] and star(pg2).startswith('★ 0') and '第 1／' in pg2.locator('.free-writing-navigation').inner_text(), now['lesson'])
    # ── 字跡空間滿了自動淘汰
    pg3=fresh(); pg3.goto(U)
    pg3.evaluate("()=>{const ink='data:image/jpeg;base64,'+'A'.repeat(8000);const list=Array.from({length:200},(_,i)=>({id:'x'+i,character:'山',book:'b',lesson:'l',at:new Date().toISOString(),ink}));localStorage.setItem('character-writing-free-records-v1:student:seat-9',JSON.stringify(list));localStorage.setItem('free-practice-options:guest',JSON.stringify({showObserve:false}))}")
    before=pg3.evaluate("localStorage.getItem('character-writing-free-records-v1:student:seat-9').length")
    pg3.goto(U+'?chars=山水&mode=free'); pg3.wait_for_selector('.writing-surface'); pg3.wait_for_timeout(1500); draw(pg3); pg3.get_by_role('button',name='下一個字').click(); pg3.wait_for_timeout(1500)
    after=pg3.evaluate("localStorage.getItem('character-writing-free-records-v1:student:seat-9').length"); mine=pg3.evaluate("localStorage.getItem('character-writing-free-records-v1').length")
    step('空間滿了仍能保存並換字', star(pg3).startswith('★ 1') and after<before and after+mine<=1500000, f'其他人 {before}→{after}，自己 {mine}')
    # ── 老師：關閉提示、查字典、寫了才能換、下載全部座號
    pg4=fresh(900); pg4.goto(U); teacher(pg4)
    for label in ['顯示整字','查字典']: pg4.locator(f'label:has-text("{label}") input').uncheck()
    pg4.locator('label:has-text("寫了才能換下一個字") input').check(); pg4.locator('[aria-label="書寫前看範字"] button:has-text("關閉")').click()
    pg4.screenshot(path='/home/claude/g4.png',full_page=True)
    step('逐字編輯器用版本按鈕', (pg4.get_by_role('tab',name='逐字教材與讀音').click() or True) and pg4.locator('.book-picker').count()==1); pg4.get_by_role('tab',name='練習預設').click()
    pg4.get_by_role('button',name='回到練習').click(); pg4.goto(U+'?chars=山水&mode=free'); pg4.wait_for_selector('.writing-surface'); pg4.wait_for_timeout(1500)
    step('老師關閉顯示整字與查字典', pg4.get_by_role('button',name='顯示整字').count()==0 and not pg4.locator('details[aria-label$="延伸查詢"]').is_visible())
    step('還沒寫不能換下一個字', pg4.get_by_role('button',name='下一個字').is_disabled()); draw(pg4); step('寫了就能換', not pg4.get_by_role('button',name='下一個字').is_disabled())
    pg4.get_by_role('button',name='下一個字').click(); pg4.wait_for_timeout(1500); pg4.get_by_role('button',name='返回選字與設定').click(); teacher(pg4)
    with pg4.expect_download() as d: pg4.get_by_role('button',name='下載這台載具所有座號的字跡總表').click()
    step('下載所有座號字跡總表', d.value.suggested_filename.startswith('全部座號字跡總表'), d.value.suggested_filename)
    print('errs',errs[:6]); b.close()
finally: srv.terminate()
