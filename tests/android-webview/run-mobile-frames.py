"""Measure ordinary-result separators in Android WebView compositor screenshots."""
import json
import pathlib
import subprocess
import sys
import time
from PIL import Image

build, output = map(pathlib.Path, sys.argv[1:])
output.mkdir(parents=True, exist_ok=True)
package = 'jp.hiro.autopager.webviewtest'
component = package + '/.MainActivity'


def adb(*args, check=True, binary=False):
    result = subprocess.run(['adb', *args], capture_output=True, check=check, timeout=60)
    return result.stdout if binary else result.stdout.decode(errors='replace').strip()


def geometry(number):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        error = adb('exec-out', 'run-as', package, 'cat', 'files/error.txt', check=False)
        if error and not error.startswith('cat:'):
            raise AssertionError(error)
        raw = adb('exec-out', 'run-as', package, 'cat', f'files/ready-{number}.json', check=False)
        if raw.startswith('{'):
            report = json.loads(raw)
            assert report['frameCommitted'] and report['visualStateRequest'] == 1000000 + number
            return report
        time.sleep(.3)
    raise AssertionError(f'Missing compositor report for page {number}')


def bands_in_region(image, report, start, end, color):
    scale = report['dpr']
    x0 = round(report['viewX'] + (report['left'] + 5) * scale)
    x1 = round(report['viewX'] + (report['right'] - 5) * scale)
    y0 = round(report['viewY'] + start * scale)
    y1 = round(report['viewY'] + end * scale)
    assert 0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height, (x0, x1, y0, y1, image.size)
    pixels = image.load()
    columns = list(range(x0, x1, max(1, (x1 - x0) // 100)))
    thickness = []
    previous = -2
    for y in range(y0, y1):
        matching = sum(max(abs(channel - wanted) for channel, wanted in zip(pixels[x, y], color)) <= 2 for x in columns)
        if matching < .95 * len(columns):
            continue
        if y != previous + 1:
            thickness.append(0)
        thickness[-1] += 1
        previous = y
    return [round(value / scale, 2) for value in thickness]


def verify(png, report, variant, theme):
    assert report['androidApi'] == 37 and report['webviewVersion'], report
    assert report['scale'] == 1 and report['documentWidth'] <= report['viewport'] + 1
    assert not report['consoleErrors'], report['consoleErrors']
    rows = report['results']
    assert len({row['title'] for row in rows if row['title']}) == 5
    color = (232, 234, 237) if theme == 'light' else (60, 64, 67)
    with Image.open(png) as bitmap:
        image = bitmap.convert('RGB')
    bands = [bands_in_region(image, report, a['bodyBottom'], b['sourceTop'], color)
             for a, b in zip(rows, rows[1:])]
    for index, values in enumerate(bands):
        if variant == 'current' or index in (0, 3):
            assert len(values) == 1 and abs(values[0] - 8) <= .8, ('expected one 8px stripe', index, bands)
        else:
            assert sum(values) < 2, ('frozen v6.67 should reproduce missing band', index, bands)
    for row in rows[1:4]:
        assert not bands_in_region(image, report, row['sourceTop'], row['bodyBottom'], color)
    return bands


environment = adb('shell', 'dumpsys', 'webviewupdate')
(output / 'webview-provider.txt').write_text(environment)
adb('shell', 'wm', 'size', '1080x2600')
adb('shell', 'wm', 'density', '432')
adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
adb('shell', 'input', 'keyevent', '82')
adb('install', '-r', str(build / 'webview-fixture-test.apk'))
measurements = []
try:
    for variant in ['control', 'current']:
        for shape, theme in [('captured', 'light'), ('grid', 'dark')]:
            adb('shell', 'pm', 'clear', package)
            adb('shell', 'am', 'start', '-W', '-n', component, '--es', 'fixture', 'frames',
                '--es', 'variant', variant, '--es', 'shape', shape, '--es', 'theme', theme)
            for number in [2, 3]:
                label = f'{variant}-{shape}-{theme}-page{number}'
                if number == 3:
                    adb('shell', 'am', 'start', '-W', '-n', component, '--ei', 'next_page', '3')
                report = geometry(number)
                assert (report['variant'], report['shape'], report['theme'], report['page']) == (variant, shape, theme, number)
                (output / (label + '.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2))
                png = output / (label + '.png')
                for attempt in range(6):
                    png.write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
                    try:
                        bands = verify(png, report, variant, theme)
                        break
                    except AssertionError:
                        if attempt == 5:
                            raise
                        time.sleep(.4)
                measurements.append({'scenario': label, 'bandsCssPixels': bands, 'webviewVersion': report['webviewVersion']})
                print('PASS', label, bands, report['webviewVersion'], flush=True)
finally:
    (output / 'measurements.json').write_text(json.dumps(measurements, indent=2))
    (output / 'logcat.txt').write_text(adb('logcat', '-d', '-t', '700'))
