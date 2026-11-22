import json,subprocess,sys,time
from pathlib import Path
build=Path(sys.argv[1])
pkg='jp.hiro.autopager.webviewtest'
def adb(*args):return subprocess.check_output(['adb',*map(str,args)],text=True,timeout=30)
adb('install','-r',build/'webview-fixture-test.apk')
for variant in ('control','current'):
 adb('shell','pm','clear',pkg)
 adb('shell','am','start','-n',pkg+'/.MainActivity','--es','fixture','frames','--es','variant',variant)
 for _ in range(90):
  p=subprocess.run(['adb','exec-out','run-as',pkg,'cat','files/ready-30.json'],capture_output=True)
  if p.returncode==0:break
  time.sleep(2)
 else:raise RuntimeError('Android WebView did not reach page 30')
 result=json.loads(p.stdout)
 print(variant,result,flush=True)
 assert result['frameCommitted'] and result['androidApi']==37 and len(result['pages'])==30
 for i,row in enumerate(result['pages']):
  assert row['kept']==['article','questions'],(variant,i,row)
  assert (row['cards'],row['head'],row['foot'])==((4,1,2) if variant=='control' else (0,0,0)),(variant,i,row)
  if i and variant=='current':assert row['domCards']==0
