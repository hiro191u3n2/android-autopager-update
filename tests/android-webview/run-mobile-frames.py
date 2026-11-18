"""Measure ordinary-result separators in Android WebView compositor screenshots."""
import json
import pathlib
import subprocess
import sys
import tempfile
import time
from PIL import Image

build, output = map(pathlib.Path, sys.argv[1:3])
expected_api = int(sys.argv[3]) if len(sys.argv) == 4 else 37
output.mkdir(parents=True, exist_ok=True)
package = 'jp.hiro.autopager.webviewtest'
component = package + '/.MainActivity'


def adb(*args, check=True, binary=False):
    result = subprocess.run(['adb', *args], capture_output=True, timeout=90)
    if check and result.returncode:
        raise RuntimeError(f'adb {args!r} exited {result.returncode}: ' +
                           (result.stdout + result.stderr).decode(errors='replace'))
    return result.stdout if binary else result.stdout.decode(errors='replace').strip()


def install_fixture():
    apk = str(build / 'webview-fixture-test.apk')
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        available = adb('shell', 'pm', 'path', 'android', check=False)
        if available.startswith('package:'):
            break
        time.sleep(1)
    else:
        raise RuntimeError(f'Package manager is not ready: {available!r}')
    print(adb('shell', 'df', '-h', '/data'), flush=True)
    try:
        print(adb('install', '--no-streaming', '-r', apk), flush=True)
    except RuntimeError as error:
        print(error, flush=True)
        # Run the package manager directly to preserve its own error message
        # even if the host transport rejects the normal install transaction.
        remote = '/data/local/tmp/autopager-frame-fixture.apk'
        adb('push', apk, remote)
        try:
            message = adb('shell', 'pm', 'install', '--user', '0', '-r', remote)
            print(message, flush=True)
            if message != 'Success':
                raise RuntimeError('Package manager rejected fixture: ' + message)
        finally:
            adb('shell', 'rm', '-f', remote, check=False)
    if not adb('shell', 'pm', 'path', package).startswith('package:'):
        raise RuntimeError('Fixture install returned without the expected package')


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


def screenshot():
    if expected_api == 37:
        # Read the emulator's composited framebuffer on the host, avoiding the
        # API 37 goldfish mapper's guest-side DMA readback assertion.
        with tempfile.TemporaryDirectory() as directory:
            response = adb('emu', 'screenrecord', 'screenshot', directory, check=False)
            for _ in range(10):
                images = list(pathlib.Path(directory).glob('*.png'))
                if len(images) == 1 and images[0].stat().st_size:
                    return images[0].read_bytes()
                time.sleep(.1)
            print('Emulator framebuffer capture unavailable:', response, flush=True)
    return adb('exec-out', 'screencap', '-p', binary=True)


def verify(png, report, variant, theme):
    assert report['androidApi'] == expected_api and report['webviewVersion'], report
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
        if variant == 'current' or (index in (0, 3) and report['shape'] != 'backdrop'):
            assert len(values) == 1 and abs(values[0] - 8) <= .8, ('expected one 8px stripe', index, bands)
        else:
            assert sum(values) < 2, ('frozen v6.67 should reproduce missing band', index, bands)
    for row in rows[1:4]:
        assert not bands_in_region(image, report, row['sourceTop'], row['bodyBottom'], color)
    return bands


environment = adb('shell', 'dumpsys', 'webviewupdate')
(output / 'webview-provider.txt').write_text(environment)
adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
adb('shell', 'input', 'keyevent', '82', check=False)
measurements = []
failures = []
try:
    install_fixture()
    for variant in ['current', 'control']:
        for shape, theme in [('captured', 'light'), ('grid', 'dark'), ('backdrop', 'light')]:
            adb('shell', 'pm', 'clear', package)
            adb('shell', 'am', 'start', '-W', '-n', component, '--es', 'fixture', 'frames',
                '--es', 'variant', variant, '--es', 'shape', shape, '--es', 'theme', theme)
            # A background Pixel Launcher ANR can obscure an otherwise valid
            # committed frame. The foreground fixture does not use a launcher.
            adb('shell', 'am', 'force-stop', 'com.google.android.apps.nexuslauncher', check=False)
            for number in [2, 3]:
                label = f'{variant}-{shape}-{theme}-page{number}'
                if number == 3:
                    adb('shell', 'am', 'start', '-W', '-n', component, '--ei', 'next_page', '3')
                report = geometry(number)
                assert (report['variant'], report['shape'], report['theme'], report['page']) == (variant, shape, theme, number)
                (output / (label + '.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2))
                png = output / (label + '.png')
                bands = None
                for attempt in range(6):
                    png.write_bytes(screenshot())
                    try:
                        bands = verify(png, report, variant, theme)
                        break
                    except AssertionError as error:
                        if attempt == 5:
                            failures.append({'scenario': label, 'error': str(error)})
                            print('FAIL', label, error, flush=True)
                            break
                        time.sleep(.4)
                if bands is None:
                    continue
                measurements.append({'scenario': label, 'bandsCssPixels': bands, 'webviewVersion': report['webviewVersion']})
                print('PASS', label, bands, report['webviewVersion'], flush=True)
finally:
    (output / 'measurements.json').write_text(json.dumps(measurements, indent=2))
    (output / 'pixel-failures.json').write_text(json.dumps(failures, indent=2))
    (output / 'logcat.txt').write_text(adb('logcat', '-d', '-t', '700'))
if failures:
    raise AssertionError(failures)
