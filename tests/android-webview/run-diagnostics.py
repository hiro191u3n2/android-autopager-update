#!/usr/bin/env python3
"""Exercise the diagnostic dialog with real Android touches on one offline page."""
import json
import pathlib
import subprocess
import sys
import time
from urllib.parse import urlsplit

from PIL import Image, ImageChops

HARNESS = pathlib.Path(__file__).resolve().parent
BUILD = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HARNESS / 'build'
OUTPUT = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else BUILD / 'diagnostic-evidence'
PACKAGE = 'jp.hiro.autopager.webviewtest'
COMPONENT = PACKAGE + '/.MainActivity'
OUTPUT.mkdir(parents=True, exist_ok=True)
MANIFEST = json.loads((BUILD / 'assets/build-manifest.json').read_text())
EXPECTED_VERSION = MANIFEST['variants']['current']['version']
request_number = 0


def adb(*args, check=True, binary=False):
    result = subprocess.run(['adb', *args], check=check, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=60)
    return result.stdout if binary else result.stdout.decode('utf-8', errors='replace')


def save_json(name, value):
    (OUTPUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2))


def read_report(filename, timeout=55):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        error = adb('shell', 'run-as', PACKAGE, 'cat', 'files/error.txt', check=False).strip()
        if error:
            raise AssertionError(error)
        text = adb('shell', 'run-as', PACKAGE, 'cat', 'files/' + filename, check=False)
        if text.startswith('{'):
            return json.loads(text)
        time.sleep(0.2)
    raise AssertionError('Timed out waiting for ' + filename)


def probe(action):
    global request_number
    request_number += 1
    token = str(request_number)
    adb('shell', 'am', 'start', '-W', '-n', COMPONENT,
        '--es', 'diagnostic_action', action, '--es', 'diagnostic_request', token)
    value = read_report(f'diagnostics-{token}.json', timeout=12)
    assert value['request'] == token and value['action'] == action, 'Stale diagnostic probe'
    assert value['visualStateRequest'] == request_number and value['frameCommitted'], 'Diagnostic report preceded its rendered Android frame'
    assert (value['variant'], value['shape'], value['theme']) == ('current', 'mixed', 'light'), 'Activity reset'
    save_json(f'probe-{request_number:03d}-{action}.json', value)
    return value


def wait_probe(action, predicate, timeout=12):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = probe(action)
        if predicate(value):
            return value
        time.sleep(0.15)
    raise AssertionError('UI state did not become ready: ' + action)


def screenshot(name):
    path = OUTPUT / name
    path.write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
    return path


def touch_point(geometry, control):
    assert control is not None, 'Touch target missing'
    box = control['rect']
    assert box['width'] > 0 and box['height'] > 0, ('Empty touch target', control)
    cx = (box['left'] + box['right']) / 2
    cy = (box['top'] + box['bottom']) / 2
    assert 0 <= cx < geometry['width'] and 0 <= cy < geometry['height'], ('Touch target outside viewport', box)
    scale = geometry['viewWidth'] / geometry['width']
    return (round(geometry['viewX'] + cx * scale), round(geometry['viewY'] + cy * scale))


def tap(geometry, control):
    x, y = touch_point(geometry, control)
    adb('shell', 'input', 'tap', str(x), str(y))


def intact(value):
    assert not value['errors'] and not value['page']['errors'], value['errors'] + value['page']['errors']
    baseline = value['baseline']
    assert baseline['nativeUnchanged'], 'Diagnostic UI changed the native first result'
    assert baseline['importedMarkupUnchanged'], 'Diagnostic UI changed imported markup'
    assert baseline['formValuesPreserved'], 'Diagnostic UI changed fixture form values'
    assert abs(baseline['scrollDelta']) <= 1, ('Diagnostic UI changed page scroll', baseline['scrollDelta'])


def verify_privacy(value, tokens):
    encoded = json.dumps(value, ensure_ascii=False)
    for token in tokens:
        assert token not in encoded, ('Private fixture value leaked into diagnostic report', token)
    assert 'q=organic-fixture' not in encoded, 'Search query leaked into report'
    assert 'diagnostic_private=' not in encoded, 'Private URL parameter leaked into report'
    # Inspect URLs, not arbitrary '#' characters in safe CSS node descriptions.
    def walk(node):
        if isinstance(node, dict):
            for child in node.values():
                walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)
        elif isinstance(node, str) and node.startswith(('https://', 'http://')):
            parsed = urlsplit(node)
            assert not parsed.query and not parsed.fragment, ('Unsanitized diagnostic URL', node)
    walk(value)


def verify_dialog_paint(before_path, opened_path, geometry):
    before = Image.open(before_path).convert('RGB')
    opened = Image.open(opened_path).convert('RGB')
    assert before.size == opened.size, 'Compositor screenshot dimensions changed'
    box = geometry['dialog']['panel']['rect']
    scale = geometry['viewWidth'] / geometry['width']
    bounds = (round(geometry['viewX'] + box['left'] * scale),
              round(geometry['viewY'] + box['top'] * scale),
              round(geometry['viewX'] + box['right'] * scale),
              round(geometry['viewY'] + box['bottom'] * scale))
    assert 0 <= bounds[0] < bounds[2] <= opened.width, ('Dialog outside screenshot width', bounds)
    assert 0 <= bounds[1] < bounds[3] <= opened.height, ('Dialog outside screenshot height', bounds)
    difference = ImageChops.difference(before.crop(bounds), opened.crop(bounds))
    changed = sum(max(pixel) > 12 for pixel in difference.getdata())
    area = difference.width * difference.height
    assert changed >= max(250, area * 0.01), ('Dialog exists in DOM but no substantial compositor paint', changed, area)
    return {'changedPhysicalPixels': changed, 'dialogPhysicalPixels': area, 'bounds': bounds}


def wait_for_dialog_paint(before_path, geometry, timeout=5):
    # A submitted Android frame may still be waiting for SurfaceFlinger. Keep
    # every actual screencap and require the original pixel threshold to pass.
    deadline = time.monotonic() + timeout
    attempt = 0
    while True:
        attempt += 1
        path = screenshot(f'diagnostics-opened-attempt-{attempt:02d}.png')
        try:
            measurement = verify_dialog_paint(before_path, path, geometry)
        except AssertionError as error:
            if not error.args or not isinstance(error.args[0], tuple) or error.args[0][0] != 'Dialog exists in DOM but no substantial compositor paint':
                raise
            if time.monotonic() >= deadline:
                raise
            time.sleep(0.1)
            continue
        (OUTPUT / 'diagnostics-opened.png').write_bytes(path.read_bytes())
        return {**measurement, 'compositorCaptureAttempts': attempt}


result = {'scope': 'One Android API 35 emulator WebView current/mixed/light diagnostic UI smoke; offline controlled DOM, not Berry or live Google.'}
failures = []
try:
    assert MANIFEST['variants']['current']['version'] == EXPECTED_VERSION, 'Build the complete v6.59.0 candidate before this smoke test'
    environment = {
        'androidRelease': adb('shell', 'getprop', 'ro.build.version.release').strip(),
        'api': adb('shell', 'getprop', 'ro.build.version.sdk').strip(),
        'emulator': adb('shell', 'getprop', 'ro.kernel.qemu').strip(),
        'webview': adb('shell', 'dumpsys', 'webviewupdate'),
        'userscript': MANIFEST['variants']['current'],
        'scope': result['scope'],
    }
    save_json('environment.json', environment)
    assert environment['api'] == '35', ('Expected Android API 35', environment['api'])
    assert environment['emulator'] == '1', 'This command requires an actual Android emulator'
    adb('shell', 'wm', 'size', '1080x2400')
    adb('shell', 'wm', 'density', '420')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    adb('shell', 'input', 'keyevent', '82')
    adb('install', '-r', str(BUILD / 'webview-fixture-test.apk'))
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('shell', 'pm', 'clear', PACKAGE)
    adb('logcat', '-c')
    adb('shell', 'am', 'start', '-W', '-n', COMPONENT,
        '--es', 'variant', 'current', '--es', 'shape', 'mixed', '--es', 'theme', 'light')
    ready = read_report('ready-2.json')
    save_json('ready-2.json', ready)
    assert ready['page'] == 2 and ready['nativeUnchanged'] and not ready['errors'], ready
    assert len(ready['results']) == 4, 'Expected the four complete imported fixture results'
    assert all(item['rect']['width'] > 0 and item['rect']['height'] > 0 for item in ready['results']), 'Imported results must actually render before UI testing'
    for item, expected in zip(ready['results'], MANIFEST['expected']['10']):
        assert (item['id'], item['title'], item['snippet'], item['href']) == (expected['id'], expected['title'], expected['snippet'], expected['href']), 'Fixture result content changed before diagnostic UI'

    prepared = probe('prepare')
    intact(prepared)
    assert prepared['status']['visible'] and not prepared['status']['paused'], 'Status must be visible and running'
    assert prepared['dialog'] is None, 'Dialog opened without a long press'
    screenshot('diagnostics-before-short-tap.png')

    # Normal tap must retain the production pause behavior. Its invisible
    # button still has a hit box, which a second actual tap uses to resume.
    tap(prepared, prepared['status'])
    paused = wait_probe('short-tap', lambda value: value['status']['paused'])
    intact(paused)
    assert paused['dialog'] is None, 'Short tap opened the diagnostic dialog'
    assert '一時中断中' in paused['status']['ariaLabel'], paused['status']
    screenshot('diagnostics-paused.png')
    tap(paused, paused['status'])
    resumed = wait_probe('resumed', lambda value: value['status']['visible'] and not value['status']['paused'])
    intact(resumed)
    assert resumed['dialog'] is None, 'Resume tap opened the diagnostic dialog'
    before = screenshot('diagnostics-before-long-press.png')

    x, y = touch_point(resumed, resumed['status'])
    adb('shell', 'input', 'touchscreen', 'swipe', str(x), str(y), str(x), str(y), '1300')
    opened = wait_probe('opened', lambda value: value['dialog'] is not None and
                        value['dialog']['panel'] is not None and value['dialog']['panel']['visible'] and
                        value['dialog']['textarea'] is not None and value['dialog']['textarea']['visible'] and
                        bool(value['dialog']['reportText']))
    intact(opened)
    assert not opened['status']['paused'], 'Long press also toggled pause'
    assert opened['dialog']['host']['role'] == 'dialog', 'Diagnostic overlay lost its dialog role'
    assert opened['dialog']['readonly'], 'Report textarea must be read-only'
    assert opened['dialog']['close']['visible'], 'Dialog close button is not visible'
    report_text = opened['dialog']['reportText']
    (OUTPUT / 'diagnostic-report.txt').write_text(report_text)
    diagnostic = json.loads(report_text)
    save_json('diagnostic-report.json', diagnostic)
    result['paint'] = wait_for_dialog_paint(before, opened)
    assert diagnostic['schema'] == 'android-autopager-google-diagnostics/v659', diagnostic.get('schema')
    assert diagnostic['userscriptVersion'] == EXPECTED_VERSION, diagnostic.get('userscriptVersion')
    assert str(diagnostic['pager']['selectedPage']) == '2', diagnostic['pager']
    assert diagnostic['pager']['source']['origin'] == 'https://www.google.com', diagnostic['pager']['source']
    assert diagnostic['pager']['source']['path'] == '/search', diagnostic['pager']['source']
    assert str(diagnostic['pager']['source']['start']) == '10', diagnostic['pager']['source']
    assert diagnostic['runtime']['repairHistoryAvailable'], 'Repair history wrapper was not installed'
    history = diagnostic['runtime']['selectedPageRepairCalls']
    assert history['calls'] >= 1 and history['recent'], 'No actual repair invocation was recorded for selected page'
    assert all(call['connected'] and call['sourceRootPresent'] and call['outcome'] == 'returned'
               for call in history['recent']), history
    inspection = diagnostic['inspection']
    assert inspection['schema'] == 'google-boundary-inspection/v659' and inspection['status'] == 'ok', inspection
    for name in ['sources', 'records', 'acceptedCards']:
        assert inspection['counts'][name] == 4, (name, inspection['counts'])
    assert len(inspection['records']) == 4 and len(inspection['pairs']) == 3, inspection['counts']
    reasons = [pair['reason'] for pair in inspection['pairs']]
    assert reasons == ['marker', 'marker', 'root-branches'], reasons
    verify_privacy(diagnostic, prepared['privacyTokens'])

    tap(opened, opened['dialog']['close'])
    closed = wait_probe('closed', lambda value: value['dialog'] is None)
    intact(closed)
    assert closed['status']['visible'] and not closed['status']['paused'], 'Closing the dialog changed pager state'
    screenshot('diagnostics-closed.png')
    result.update({'passed': True, 'version': EXPECTED_VERSION, 'selectedPage': 2,
                   'counts': inspection['counts'], 'pairReasons': reasons,
                   'recordedRepairCalls': history['calls'],
                   'actualTouches': ['short tap', 'resume tap', '1300 ms long press', 'close tap'],
                   'privateURLAndFormValuesOmitted': True, 'markupAndScrollPreserved': True})
    print(f'PASS Android diagnostic UI: actual short tap/pause/resume, long press/open, sanitized v{EXPECTED_VERSION} page-2 report, close, unchanged source markup.', flush=True)
except Exception as error:
    result['passed'] = False
    failures.append({'error': str(error)})
    try:
        screenshot('diagnostics-failure.png')
    except Exception as capture_error:
        failures.append({'evidenceCaptureError': str(capture_error)})
    raise
finally:
    save_json('diagnostic-result.json', result)
    save_json('verification-failures.json', failures)
    try:
        (OUTPUT / 'logcat.txt').write_text(adb('logcat', '-d', '-s', 'AutoPagerTest:I', 'chromium:E', 'AndroidRuntime:E', check=False))
    except Exception as log_error:
        (OUTPUT / 'logcat-error.txt').write_text(str(log_error))
