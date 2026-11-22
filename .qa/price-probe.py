import json
import pathlib
import subprocess
import sys
import time

build, evidence = map(pathlib.Path, sys.argv[1:3])
api = int(sys.argv[3])
package = 'jp.hiro.autopager.webviewtest'
def adb(*args, check=True):
    run = subprocess.run(['adb', *args], capture_output=True, text=True, timeout=90, check=check)
    return run.stdout.strip()
adb('install', '--no-streaming', '-r', str(build / 'webview-fixture-test.apk'))
for variant in ['control', 'current']:
    adb('shell','pm','clear',package)
    adb('shell','am','start','-W','-n',package + '/.MainActivity','--es','fixture','frames','--es','variant',variant)
    for page in [2,3]:
        if page == 3:
            adb('shell','am','start','-W','-n',package + '/.MainActivity','--ei','next_page','3')
        deadline = time.monotonic() + 70
        while time.monotonic() < deadline:
            raw = adb('exec-out','run-as',package,'cat',f'files/ready-{page}.json',check=False)
            if raw.startswith('{'):
                break
            err = adb('exec-out','run-as',package,'cat','files/error.txt',check=False)
            if err and not err.startswith('cat:'):
                raise AssertionError(err)
            time.sleep(1)
        report = json.loads(raw)
        print(variant, json.dumps(report, ensure_ascii=False), flush=True)
        assert report['androidApi'] == api and report['webviewVersion'] and report['frameCommitted']
        assert all(n >= page for n in report['visibleSections']), report
        assert (report['gap'] > 20 and report['frameCount'] >= page) if variant == 'control' else (abs(report['gap']) <= 1 and report['frameCount'] == 0), report
