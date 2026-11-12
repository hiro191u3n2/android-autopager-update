#!/usr/bin/env python3
"""Run the isolated APK and verify actual emulator compositor screenshots."""
import json
import pathlib
import subprocess
import sys
import time
from PIL import Image

HARNESS = pathlib.Path(__file__).resolve().parent
BUILD = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HARNESS / 'build'
OUTPUT = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else BUILD / 'evidence'
PACKAGE = 'jp.hiro.autopager.webviewtest'
COMPONENT = PACKAGE + '/.MainActivity'
OUTPUT.mkdir(parents=True, exist_ok=True)
MANIFEST = json.loads((BUILD / 'assets/build-manifest.json').read_text())


def adb(*args, check=True, binary=False):
    result = subprocess.run(['adb', *args], check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.stdout if binary else result.stdout.decode('utf-8', errors='replace')


def report(number):
    deadline = time.monotonic() + 65
    while time.monotonic() < deadline:
        error = adb('shell', 'run-as', PACKAGE, 'cat', 'files/error.txt', check=False).strip()
        if error:
            raise AssertionError(error)
        text = adb('shell', 'run-as', PACKAGE, 'cat', f'files/ready-{number}.json', check=False)
        if text.startswith('{'):
            return json.loads(text)
        time.sleep(0.25)
    raise AssertionError(f'Timeout waiting for page {number} report')


def painted_rows(image, geometry, previous, following, color):
    scale = geometry['viewWidth'] / geometry['width']
    x0 = round(geometry['viewX'] + (previous['content']['left'] + 8) * scale)
    x1 = round(geometry['viewX'] + (previous['content']['right'] - 8) * scale)
    y0 = round(geometry['viewY'] + previous['content']['bottom'] * scale)
    y1 = round(geometry['viewY'] + following['content']['top'] * scale)
    assert 0 <= x0 < x1 <= image.width, ('Out of screenshot width', x0, x1, image.size)
    assert 0 <= y0 <= y1 <= image.height, ('Boundary outside screenshot', y0, y1, image.size)
    data = image.load()
    rows = []
    for y in range(y0, y1):
        matches = sum(all(abs(data[x, y][channel] - color[channel]) <= 3 for channel in range(3)) for x in range(x0, x1))
        if matches / (x1 - x0) >= 0.95:
            rows.append(y)
    bands = []
    for y in rows:
        if bands and y == bands[-1][-1] + 1:
            bands[-1].append(y)
        else:
            bands.append([y])
    return {'cssPixels': len(rows) / scale, 'bands': len(bands), 'screenRows': len(rows)}


def verify(geometry, png):
    assert geometry['nativeUnchanged'], 'Initial page markup changed'
    assert not geometry['errors'], geometry['errors']
    assert geometry['documentWidth'] <= geometry['width'] + 1, 'Horizontal overflow'
    results = geometry['results']
    assert len(results) == 4, f'Expected four complete results, found {len(results)}'
    assert geometry['width'] >= 350 and geometry['width'] <= 430, geometry['width']
    start = (geometry['page'] - 1) * 10
    for result, expected_result in zip(results, MANIFEST['expected'][str(start)]):
        assert result['id'] == expected_result['id'], 'Result order changed'
        assert result['title'] == expected_result['title'], 'Title changed'
        assert result['href'] == expected_result['href'], 'Destination changed'
        assert result['snippet'] == expected_result['snippet'], 'Snippet changed'
        if expected_result['thumbnail']:
            assert result['thumbnail'], 'Thumbnail lost'
            assert result['thumbnail']['src'] == expected_result['thumbnail'], 'Thumbnail source changed'
            assert result['thumbnail']['rect']['width'] >= 48 and result['thumbnail']['rect']['height'] >= 48, 'Thumbnail collapsed'
    color = MANIFEST['colors'][geometry['theme']]
    image = Image.open(png).convert('RGB')
    boundaries = [painted_rows(image, geometry, results[index], results[index + 1], color) for index in range(3)]
    expected = [0, 0, 8] if geometry['variant'] == 'control' else [8, 8, 8]
    for index, (measurement, target) in enumerate(zip(boundaries, expected)):
        assert abs(measurement['cssPixels'] - target) <= 0.8, ('Unexpected painted boundary', index, measurement, target)
        assert measurement['bands'] == (1 if target else 0), ('Missing or duplicate band', index, measurement)
    for result in results[:3]:
        content = result['content']
        inside = painted_rows(image, geometry,
            {'content': {**content, 'bottom': content['top'] + 1}},
            {'content': {'top': content['bottom'] - 1}}, color)
        assert inside['bands'] == 0, ('Divider inside result content', result['id'], inside)
    return boundaries


environment = {
    'androidRelease': adb('shell', 'getprop', 'ro.build.version.release').strip(),
    'api': adb('shell', 'getprop', 'ro.build.version.sdk').strip(),
    'webview': adb('shell', 'dumpsys', 'webviewupdate'),
    'scope': 'Android emulator WebView; controlled offline fixtures. Not Berry, not Galaxy, not live Google.',
}
(OUTPUT / 'environment.json').write_text(json.dumps(environment, ensure_ascii=False, indent=2))
adb('shell', 'wm', 'size', '1080x2400')
adb('shell', 'wm', 'density', '420')
adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
adb('shell', 'input', 'keyevent', '82')
adb('install', '-r', str(BUILD / 'webview-fixture-test.apk'))
measurements = []
try:
    for variant in ['control', 'current']:
      for shape in ['mixed', 'plain']:
        for theme in ['light', 'dark']:
            adb('shell', 'am', 'force-stop', PACKAGE)
            adb('shell', 'pm', 'clear', PACKAGE)
            adb('logcat', '-c')
            adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '--es', 'variant', variant, '--es', 'theme', theme, '--es', 'shape', shape)
            for number in [2, 3]:
                if number == 3:
                    adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '--ei', 'next_page', '3')
                geometry = report(number)
                assert (geometry['variant'], geometry['shape'], geometry['theme'], geometry['page']) == (variant, shape, theme, number), 'Activity reset or returned stale scenario evidence'
                base = OUTPUT / f'{variant}-{shape}-{theme}-page{number}'
                base.with_suffix('.json').write_text(json.dumps(geometry, ensure_ascii=False, indent=2))
                png = base.with_suffix('.png')
                png.write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
                boundaries = verify(geometry, png)
                measurements.append({'variant': variant, 'shape': shape, 'theme': theme, 'page': number, 'boundaries': boundaries})
                print(f'PASS {variant} {shape} {theme} page {number}: {boundaries}', flush=True)
            (OUTPUT / f'{variant}-{shape}-{theme}-logcat.txt').write_text(adb('logcat', '-d', '-s', 'AutoPagerTest:I', 'chromium:E', 'AndroidRuntime:E'))
finally:
    (OUTPUT / 'last-logcat.txt').write_text(adb('logcat', '-d', '-s', 'AutoPagerTest:I', 'chromium:E', 'AndroidRuntime:E'))
    (OUTPUT / 'measurements.json').write_text(json.dumps(measurements, ensure_ascii=False, indent=2))
print('Android WebView fixtures passed: 16 page/shape/theme/control scenarios; see environment.json for the actual provider version.')
