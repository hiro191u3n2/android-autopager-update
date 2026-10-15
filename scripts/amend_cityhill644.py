"""Do not let fallback navigation bounce the browser forward after Back."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'src/cityhill-pno-guard.js'
s=p.read_text()
def replace(old,new):
    global s
    assert s.count(old)==1, old[:100]
    s=s.replace(old,new,1)
replace("  let lastY = 0, hold = 0, held = false, pointerX = 0, pointerY = 0;", "  let lastY = 0, hold = 0, held = false, pointerX = 0, pointerY = 0;\n  let gestureNeeded = performance.getEntriesByType('navigation').some(e => e.type === 'back_forward');")
replace("    if (stopped || document.hidden || !document.body) return;", "    if (stopped || gestureNeeded || document.hidden || !document.body) return;")
replace("    snapshot('ready');", "    snapshot('ready');\n    window.addEventListener('wheel', e => { if (e.deltaY > 0) gestureNeeded = false; }, {passive:true});\n    window.addEventListener('touchmove', () => { gestureNeeded = false; }, {passive:true});\n    window.addEventListener('keydown', e => { if (['ArrowDown','PageDown',' '].includes(e.key)) gestureNeeded = false; });")
replace("if (e.persisted) { stopped = false; armedURL = ''; armedAt = 0; timer = setInterval(inspect, 500); }", "if (e.persisted) { stopped = false; gestureNeeded = true; scrolled = false; lastY = window.scrollY; innerScroll = 0; armedURL = ''; armedAt = 0; timer = setInterval(inspect, 500); }")
p.write_text(s)
p=ROOT/'tests/test_cityhill644.py'
s=p.read_text()
replace("appended=False,top=False,link=None):", "appended=False,top=False,link=None,back=False,gesture=False):")
replace("    p.evaluate(wrap(GUARD,url))", "    if back:p.evaluate(\"()=>{performance.getEntriesByType=()=>[{type:'back_forward'}]}\")\n    p.evaluate(wrap(GUARD,url))\n    if gesture:p.evaluate(\"window.dispatchEvent(new WheelEvent('wheel',{deltaY:30}))\")")
replace("    browser.close()\nresult=", "    guard_case(browser,'Browser Back never automatically bounces forward',back=True,expected=False)\n    guard_case(browser,'A fresh downward gesture re-enables fallback after Back',back=True,gesture=True)\n    browser.close()\nresult=")
p.write_text(s)
print('Added Back-navigation protection and two regressions')
