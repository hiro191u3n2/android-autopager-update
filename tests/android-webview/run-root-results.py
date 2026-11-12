#!/usr/bin/env python3
"""Verify diagnostic-derived root sibling gaps using real Android compositor pixels."""
import json
import pathlib
import shutil
import subprocess
import sys
import time
from math import ceil, floor, isfinite

from PIL import Image, ImageChops

HARNESS = pathlib.Path(__file__).resolve().parent
BUILD = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HARNESS / 'build'
OUTPUT = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else BUILD / 'root-evidence'
PACKAGE = 'jp.hiro.autopager.webviewtest'
COMPONENT = PACKAGE + '/.MainActivity'
MANIFEST = json.loads((BUILD / 'assets/build-manifest.json').read_text())
ROOT = MANIFEST['rootResults']
CASES = ROOT['cases']
OUTPUT.mkdir(parents=True, exist_ok=True)


def adb(*args, check=True, binary=False):
    result = subprocess.run(['adb', *args], check=check, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=60)
    return result.stdout if binary else result.stdout.decode('utf-8', errors='replace')


def save_json(name, value):
    (OUTPUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2))


def report(number):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        error = adb('shell', 'run-as', PACKAGE, 'cat', 'files/error.txt', check=False).strip()
        if error:
            raise AssertionError(error)
        text = adb('shell', 'run-as', PACKAGE, 'cat', f'files/ready-{number}.json', check=False)
        if text.startswith('{'):
            value = json.loads(text)
            assert value['frameCommitted'] and value['visualStateRequest'] == 1000000 + number, 'Snapshot preceded its submitted Android frame'
            return value
        time.sleep(0.2)
    raise AssertionError(f'Timeout waiting for page {number} report')


def screen_scale(geometry):
    visual = geometry.get('visualViewport')
    assert visual and abs(visual['scale'] - 1) <= 0.001, 'Fixture must be captured at its unzoomed viewport'
    return geometry['viewWidth'] / visual['width']


def painted_rows(image, geometry, previous, following, color):
    scale = screen_scale(geometry)
    x0 = round(geometry['viewX'] + (previous['content']['left'] + 8) * scale)
    x1 = round(geometry['viewX'] + (previous['content']['right'] - 8) * scale)
    y0 = round(geometry['viewY'] + previous['content']['bottom'] * scale)
    y1 = round(geometry['viewY'] + following['content']['top'] * scale)
    assert 0 <= x0 < x1 <= image.width, ('Out of screenshot width', x0, x1, image.size)
    assert 0 <= y0 <= y1 <= image.height, ('Boundary outside screenshot', y0, y1, image.size)
    pixels = image.load()
    rows = []
    for y in range(y0, y1):
        matches = sum(all(abs(pixels[x, y][channel] - color[channel]) <= 3 for channel in range(3)) for x in range(x0, x1))
        if matches / (x1 - x0) >= 0.95:
            rows.append(y)
    bands = 0
    last = -2
    for y in rows:
        if y != last + 1:
            bands += 1
        last = y
    return {'cssPixels': len(rows) / scale, 'bands': bands, 'screenRows': len(rows)}


def gap_region(geometry, previous, following, start_inset=0, end_inset=0):
    scale = screen_scale(geometry)
    # Inspect full physical pixels inside the specified CSS interval. Exclude
    # only the fractional edge pixels, whose coverage can blend adjacent colors.
    x0 = ceil(geometry['viewX'] + (previous['rect']['left'] + 8) * scale - 0.0001)
    x1 = floor(geometry['viewX'] + (previous['rect']['right'] - 8) * scale + 0.0001)
    y0 = ceil(geometry['viewY'] + (previous['rect']['bottom'] + start_inset) * scale - 0.0001)
    y1 = floor(geometry['viewY'] + (following['rect']['top'] - end_inset) * scale + 0.0001)
    return (x0, y0, x1, y1)


def verify_solid_region(image, bounds, color, label):
    x0, y0, x1, y1 = bounds
    assert 0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height, ('Invalid screenshot sample', label, bounds, image.size)
    pixels = image.load()
    for y in range(y0, y1):
        matches = sum(all(abs(pixels[x, y][channel] - color[channel]) <= 1 for channel in range(3)) for x in range(x0, x1))
        assert matches / (x1 - x0) >= 0.95, ('Gap or outline pixels differ', label, y, matches, x1 - x0, color, pixels[(x0 + x1) // 2, y])
    return {'bounds': list(bounds), 'screenRows': y1 - y0, 'expectedRgb': color}


def verify_geometry(geometry, case):
    assert geometry['nativeUnchanged'], 'Initial native markup changed'
    assert not geometry['errors'] and not geometry['consoleErrors'], geometry
    assert geometry['documentWidth'] <= geometry['width'] + 1, 'Horizontal overflow'
    assert 490 <= geometry['width'] <= 510, ('Expected near-500 CSS px Android viewport', geometry['width'])
    assert abs(geometry['sourceRoot']['width'] - 499.78125) <= 0.2, ('Diagnostic-derived root width changed', geometry['sourceRoot'])
    expected = ROOT['expected'][str((geometry['page'] - 1) * 10)]
    results = geometry['results']
    assert len(results) == len(expected) == 4, 'Four complete independent root results required'
    for result, original in zip(results, expected):
        assert (result['id'], result['title'], result['snippet'], result['href']) == (original['id'], original['title'], original['snippet'], original['href']), 'Result content, order or destination changed'
        assert result['rect']['width'] > 0 and result['rect']['height'] > 0, ('Result is not rendered', result['id'])
        assert all(isinstance(result['content'][edge], (int, float)) and isfinite(result['content'][edge]) for edge in ['top', 'bottom']), ('Invalid result content geometry', result['id'])
        assert result['rootStructure']['directRootChild'], ('Fixture lost its direct root siblings', result['id'])
        surface = result['rootStructure']['surface']
        assert abs(surface['top'] - result['rect']['top']) <= 0.2 and abs(surface['height'] - result['rect']['height']) <= 0.2, ('Opaque surface does not fill its transparent root wrapper', result['id'], surface, result['rect'])
        assert result['rootStructure']['surfaceMarginBottom'] == '8px', ('Existing source margin changed', result['id'])
        ring = case['ringRgb']
        expected_shadow = f"rgb({ring[0]}, {ring[1]}, {ring[2]}) 0px 0px 0px 1px"
        assert result['rootStructure']['surfaceShadow'] == expected_shadow, ('Original 1px inner surface outline changed', result['id'], result['rootStructure']['surfaceShadow'])
        if original.get('thumbnail'):
            assert result['thumbnail'] and result['thumbnail']['src'] == original['thumbnail'], 'Thumbnail lost or changed'
            assert result['thumbnail']['rect']['width'] >= 48 and result['thumbnail']['rect']['height'] >= 48, 'Thumbnail collapsed'
    assert 'dining.example' in results[1]['rootStructure']['sourceText'] and 'https://r.dining.example' in results[1]['rootStructure']['sourceText'], 'Base/subdomain duplicate-source fixture absent'
    gaps = [results[index + 1]['rect']['top'] - results[index]['rect']['bottom'] for index in range(len(results) - 1)]
    assert all(abs(gap - ROOT['gap']) <= 0.2 for gap in gaps), ('Existing 8px gaps changed or doubled', gaps)
    return gaps


def verify_pixels(geometry, png, case):
    image = Image.open(png).convert('RGB')
    results = geometry['results']
    scale = screen_scale(geometry)
    background = case['surfaceRgb']
    for result in results:
        y = round(geometry['viewY'] + (result['content']['top'] + 6) * scale)
        for css_x in [result['rect']['left'] + 4, result['rect']['right'] - 4]:
            x = round(geometry['viewX'] + css_x * scale)
            assert 0 <= x < image.width and 0 <= y < image.height, 'Background sample outside screenshot'
            pixel = image.getpixel((x, y))
            assert all(abs(pixel[channel] - background[channel]) <= 3 for channel in range(3)), ('Screenshot obscured or stale background', result['id'], pixel, background)
    color = case['underlayRgb'] if geometry['variant'] == 'control' else case['paintRgb']
    boundaries = []
    for index in range(len(results) - 1):
        previous, following = results[index], results[index + 1]
        middle = verify_solid_region(image, gap_region(geometry, previous, following, 1, 1), color, f'gap-{index}-middle6')
        before_ring = verify_solid_region(image, gap_region(geometry, previous, following, 0, 7), case['ringRgb'], f'gap-{index}-previous-ring1')
        after_ring = verify_solid_region(image, gap_region(geometry, previous, following, 7, 0), case['ringRgb'], f'gap-{index}-current-ring1')
        boundaries.append({'fullGapCssPixels': following['rect']['top'] - previous['rect']['bottom'],
                           'middleCssPixels': 6, 'middle': middle, 'previousRing': before_ring, 'currentRing': after_ring})
    divider = case['paintRgb']
    for result in results:
        content = result['content']
        inside = painted_rows(image, geometry, {'content': {**content, 'bottom': content['top'] + 1}}, {'content': {'top': content['bottom'] - 1}}, divider)
        assert inside['bands'] == 0, ('Divider cuts through result content', result['id'], inside)
    return boundaries


def capture(geometry, base, case):
    # A submitted Android frame may be presented after its callback. Retain
    # every compositor attempt and wait for the same strict paint assertions.
    deadline = time.monotonic() + 5
    attempt = 0
    while True:
        attempt += 1
        png = OUTPUT / f'{base}-paint-{attempt:02d}.png'
        png.write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
        try:
            boundaries = verify_pixels(geometry, png, case)
            shutil.copyfile(png, OUTPUT / f'{base}.png')
            return boundaries, attempt
        except AssertionError:
            if time.monotonic() >= deadline:
                shutil.copyfile(png, OUTPUT / f'{base}.png')
                raise
            time.sleep(0.1)


def verify_same_layout(current, control):
    # Page 3 may become available before or after the page-2 scroll request.
    # That changes the scroll clamp and translates every viewport rectangle.
    # Compare layout within the recorded source root, retaining the strict
    # tolerance and independently checking that the root itself did not grow.
    new_root, old_root = current['sourceRoot'], control['sourceRoot']
    for dimension in ['width', 'height', 'left']:
        assert abs(new_root[dimension] - old_root[dimension]) <= 0.2, ('Source root geometry changed', dimension, new_root, old_root)
    assert len(current['results']) == len(control['results']), 'Result count changed between candidate and control'
    maximum = 0

    def compare_box(new, old, label):
        nonlocal maximum
        for edge in ['top', 'bottom', 'left', 'right', 'width', 'height']:
            if edge not in new and edge not in old:
                continue
            origin = 'top' if edge in ['top', 'bottom'] else 'left' if edge in ['left', 'right'] else None
            delta = (new[edge] - (new_root[origin] if origin else 0)) - (old[edge] - (old_root[origin] if origin else 0))
            maximum = max(maximum, abs(delta))
            assert abs(delta) <= 0.2, ('Repair changed source-relative geometry', label, edge, delta, new, old)

    for new, old in zip(current['results'], control['results']):
        assert new['id'] == old['id'], 'Result identity changed between candidate and control'
        compare_box(new['rect'], old['rect'], new['id'] + '/card')
        compare_box(new['content'], old['content'], new['id'] + '/content')
        compare_box(new['rootStructure']['surface'], old['rootStructure']['surface'], new['id'] + '/surface')
        assert new['rootStructure']['surfaceShadow'] == old['rootStructure']['surfaceShadow'], ('Inner outline style changed', new['id'])
        assert bool(new['thumbnail']) == bool(old['thumbnail']), 'Thumbnail presence changed'
        if new['thumbnail']:
            compare_box(new['thumbnail']['rect'], old['thumbnail']['rect'], new['id'] + '/thumbnail')
    return {'viewportTranslationY': new_root['top'] - old_root['top'],
            'maximumSourceRelativeDifference': maximum, 'tolerance': 0.2,
            'currentRoot': new_root, 'controlRoot': old_root,
            'currentScroll': {'x': current.get('scrollX'), 'y': current.get('scrollY')},
            'controlScroll': {'x': control.get('scrollX'), 'y': control.get('scrollY')},
            'currentRootDocumentTop': new_root['top'] + current['scrollY'] if 'scrollY' in current else None,
            'controlRootDocumentTop': old_root['top'] + control['scrollY'] if 'scrollY' in control else None}


def verify_native_gap_pixels(current, control, current_png, control_png):
    new_image, old_image = Image.open(current_png).convert('RGB'), Image.open(control_png).convert('RGB')
    comparisons = []
    for index in range(len(current['results']) - 1):
        new_bounds = gap_region(current, current['results'][index], current['results'][index + 1])
        old_bounds = gap_region(control, control['results'][index], control['results'][index + 1])
        new_gap, old_gap = new_image.crop(new_bounds), old_image.crop(old_bounds)
        assert new_gap.size == old_gap.size, ('Native gap raster dimensions changed', index, new_bounds, old_bounds)
        maximum = max(high for low, high in ImageChops.difference(new_gap, old_gap).getextrema())
        assert maximum <= 1, ('Existing native gutter or ring pixels changed', index, maximum)
        comparisons.append({'pair': index, 'maximumChannelDifference': maximum, 'currentBounds': list(new_bounds), 'controlBounds': list(old_bounds)})
    return comparisons


assert MANIFEST['variants']['current']['version'] == '6.61.0', MANIFEST['variants']['current']
assert ROOT['control']['version'] == '6.60.0', ROOT['control']
assert {case['id'] for case in CASES} == {'nearwhite-light', 'alpha-light', 'native-light', 'native-dark'} and len(CASES) == 4, 'Unexpected v6.61 case matrix'
save_json('build-manifest.json', MANIFEST)
save_json('environment.json', {
    'androidRelease': adb('shell', 'getprop', 'ro.build.version.release').strip(),
    'api': adb('shell', 'getprop', 'ro.build.version.sdk').strip(),
    'webview': adb('shell', 'dumpsys', 'webviewupdate'),
    'scripts': {'current': MANIFEST['variants']['current'], 'control': ROOT['control']},
    'scope': 'API35 Android emulator WebView, controlled structure based on the supplied diagnostic. Not Berry, Android17 or live Google.',
})
adb('shell', 'wm', 'size', '1080x2400')
adb('shell', 'wm', 'density', '345')
adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
adb('shell', 'input', 'keyevent', '82')
adb('install', '-r', str(BUILD / 'webview-fixture-test.apk'))
measurements = []
failures = []
geometries = {}
layout_comparisons = []
try:
    for variant in ['current', 'control']:
        for case in CASES:
            shape, theme = case['variant'], case['theme']
            adb('shell', 'am', 'force-stop', PACKAGE)
            adb('shell', 'pm', 'clear', PACKAGE)
            adb('logcat', '-c')
            adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '--es', 'fixture', 'root', '--es', 'variant', variant, '--es', 'shape', shape, '--es', 'theme', theme)
            for number in [2, 3]:
                base = f"{variant}-{case['id']}-page{number}"
                try:
                    if number == 3:
                        adb('shell', 'am', 'start', '-W', '-n', COMPONENT, '--ei', 'next_page', '3')
                    geometry = report(number)
                    assert (geometry['fixture'], geometry['variant'], geometry['shape'], geometry['theme'], geometry['page']) == ('root', variant, shape, theme, number), 'Stale or reset scenario'
                    save_json(base + '.json', geometry)
                    geometries[(variant, case['id'], number)] = geometry
                    gaps = verify_geometry(geometry, case)
                    boundaries, attempts = capture(geometry, base, case)
                    measurements.append({'variant': variant, 'case': case['id'], 'shape': shape, 'theme': theme, 'page': number, 'gaps': gaps, 'boundaries': boundaries, 'paintAttempts': attempts})
                    print(f'PASS {base}: gaps={gaps}; pixels={boundaries}', flush=True)
                except Exception as error:
                    failure = {'scenario': base, 'error': str(error)}
                    failures.append(failure)
                    save_json(base + '.error.json', failure)
                    (OUTPUT / (base + '-failure.png')).write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
                    print(f'FAIL {base}: {error}', flush=True)
            (OUTPUT / f"{variant}-{case['id']}-logcat.txt").write_text(adb('logcat', '-d', '-s', 'AutoPagerTest:I', 'chromium:E', 'AndroidRuntime:E'))
    for case in CASES:
        shape, theme = case['variant'], case['theme']
        for number in [2, 3]:
            current = geometries.get(('current', case['id'], number))
            control = geometries.get(('control', case['id'], number))
            if not current or not control:
                continue
            try:
                comparison = verify_same_layout(current, control)
                if case['native']:
                    comparison['nativePixelComparisons'] = verify_native_gap_pixels(current, control,
                        OUTPUT / f"current-{case['id']}-page{number}.png", OUTPUT / f"control-{case['id']}-page{number}.png")
                layout_comparisons.append({'case': case['id'], 'shape': shape, 'theme': theme, 'page': number, **comparison})
            except Exception as error:
                failures.append({'scenario': f"unchanged-layout-{case['id']}-page{number}", 'error': str(error)})
finally:
    save_json('measurements.json', measurements)
    save_json('layout-comparisons.json', layout_comparisons)
    save_json('verification-failures.json', failures)
    (OUTPUT / 'last-logcat.txt').write_text(adb('logcat', '-d', '-s', 'AutoPagerTest:I', 'chromium:E', 'AndroidRuntime:E'))
if failures:
    raise AssertionError(f'{len(failures)} root-result scenarios failed; remaining scenarios were still attempted. See verification-failures.json.')
assert len(measurements) == 16, 'Missing Android root-result evidence'
print('PASS Android root results: 16 pages, filled middle6px of unchanged8px gaps, original1px rings and native gutter pixels preserved, unchanged control/candidate layout, intact content and thumbnails.')
