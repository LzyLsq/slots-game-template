"""Inspect the full cabinet through actual recorded award transitions."""
from pathlib import Path
import argparse
import json
import cv2
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
parser.add_argument('--modes', nargs='+', choices=('sun-lion', 'emerald-elephant', 'lotus-koi', 'moon-fox'), default=('sun-lion', 'emerald-elephant', 'lotus-koi', 'moon-fox'))
parser.add_argument('--gif-mode', choices=('sun-lion', 'emerald-elephant', 'lotus-koi', 'moon-fox'), default='lotus-koi')
args = parser.parse_args()
reports = []
for mode in args.modes:
    source = args.output / 'direct-canvas' / f'{mode}-spin-award.webm'
    # One bounded-memory pass retains exact timestamps and thumbnail frames.
    cap = cv2.VideoCapture(str(source))
    times, selected, gif = [], [], []
    previous = None
    grid_index = gif_index = 0
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
        assert not times or t >= times[-1], source
        current = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)).resize((234, 506), Image.Resampling.LANCZOS)
        while grid_index * .75 <= t:
            target = grid_index * .75
            frame, stamp = (previous, times[-1]) if previous is not None and target < t else (current, t)
            selected.append((frame.copy(), target, stamp))
            grid_index += 1
        while mode == args.gif_mode and gif_index * .1 <= t:
            target = gif_index * .1
            frame = previous if previous is not None and target < t else current
            gif.append(frame.convert('P', palette=Image.Palette.ADAPTIVE, colors=192))
            gif_index += 1
        times.append(t)
        previous = current
    cap.release()
    assert len(times) > 30 and len(selected) > 8, source
    # Include the final recorded restored scene, even if between grid samples.
    selected.append((previous, times[-1], times[-1]))
    rows = (len(selected) + 5) // 6
    grid = Image.new('RGB', (6 * 234, rows * 526), '#252020')
    draw = ImageDraw.Draw(grid)
    for n, (frame, target, stamp) in enumerate(selected):
        x, y = n % 6 * 234, n // 6 * 526
        grid.paste(frame, (x, y))
        draw.text((x + 4, y + 509), f'{target:.2f}s source {stamp:.3f}s', fill='white')
    grid.save(args.output / f'{mode}-full-award-sequence.jpg', quality=94)
    if mode == args.gif_mode:
        gif[0].save(args.output / f'{mode}-cabinet-award.gif', save_all=True, append_images=gif[1:], duration=100, loop=0, optimize=True)
    reports.append({'mode': mode, 'decodedFrames': len(times), 'startSeconds': times[0], 'endSeconds': times[-1], 'maxSourceGapSeconds': round(max(b-a for a,b in zip(times,times[1:])),4), 'method': 'Actual recorded timestamps; preceding-frame sampling; no interpolation or blending. GIF is a 10 Hz inspection preview, not a performance benchmark.'})
    print(mode, len(times), 'decoded frames', flush=True)
(args.output / 'sequential-decoding.json').write_text(json.dumps(reports, indent=2) + '\n')
