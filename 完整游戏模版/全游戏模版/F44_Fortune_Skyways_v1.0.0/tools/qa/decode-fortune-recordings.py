"""Decode actual canvas timestamps with bounded memory and no frame blending."""
from pathlib import Path
import argparse
import json
import cv2
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
parser.add_argument('--modes', nargs='+', choices=('golden-otter', 'moon-rabbit', 'star-fox', 'cloud-elephant'), default=('golden-otter', 'moon-rabbit', 'star-fox', 'cloud-elephant'))
parser.add_argument('--gif-mode', choices=('golden-otter', 'moon-rabbit', 'star-fox', 'cloud-elephant'), default='golden-otter')
args = parser.parse_args()
output = args.output
reports = []
for mode in args.modes:
    for kind in ('idle', 'spin-award'):
        source = output / 'direct-canvas' / f'{mode}-{kind}.webm'
        cap = cv2.VideoCapture(str(source))
        times, selected, gif = [], [], []
        previous = None
        grid_index = gif_index = 0
        make_gif = mode == args.gif_mode and kind == 'idle'
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
            assert not times or t >= times[-1], source
            current = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            # Keep only the preceding frame and the final small selected outputs.
            # Full-resolution recordings can otherwise consume several GB.
            while grid_index < 16 and grid_index * .6 <= t:
                target = grid_index * .6
                frame, stamp = (previous, times[-1]) if previous is not None and target < t else (current, t)
                crop = frame.crop((100, 0, 680, 480)).resize((282, 234), Image.Resampling.LANCZOS)
                selected.append((crop, target, stamp))
                grid_index += 1
            while make_gif and gif_index * .1 <= t:
                target = gif_index * .1
                frame = previous if previous is not None and target < t else current
                im = frame.resize((390, 844), Image.Resampling.LANCZOS)
                gif.append(im.convert('P', palette=Image.Palette.ADAPTIVE, colors=192))
                gif_index += 1
            times.append(t)
            previous = current
        cap.release()
        assert len(times) > 30 and len(selected) == 16, source
        grid = Image.new('RGB', (4 * 282, 4 * 252), '#202020')
        draw = ImageDraw.Draw(grid)
        for n, (crop, target, stamp) in enumerate(selected):
            x, y = n % 4 * 282, n // 4 * 252
            grid.paste(crop, (x, y))
            draw.text((x + 4, y + 236), f'{target:.1f}s source {stamp:.3f}s', fill='white')
        grid.save(output / f'{mode}-{kind}-recorded-poses.jpg', quality=95)
        if kind == 'idle':
            previous.save(output / f'{mode}-runtime-idle.png')
        if make_gif:
            gif[0].save(output / f'{args.gif_mode}-festival-runtime.gif', save_all=True,
                        append_images=gif[1:], duration=100, loop=0, optimize=True)
        reports.append({
            'mode': mode, 'kind': kind, 'decodedFrames': len(times),
            'startSeconds': times[0], 'endSeconds': times[-1],
            'maxSourceGapSeconds': round(max(b - a for a, b in zip(times, times[1:])), 4),
            'decode': 'sequential; recorded timestamps; preceding-frame sampling; no interpolation',
        })
        print(mode, kind, len(times), 'decoded frames', flush=True)
(output / 'sequential-decoding.json').write_text(json.dumps(reports, indent=2) + '\n')
