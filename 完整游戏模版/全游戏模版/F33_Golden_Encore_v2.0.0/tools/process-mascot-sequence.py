"""Prepare a quiet articulated greeting from existing CC Switch-generated art.

Only the inviting forearm/sleeve changes. The face, torso, ingot, tail and feet
remain the exact neutral source pixels, not a whole-image morph. A single low
paw lift/return replaces the twelve-pose head/blink/high-wave routine. Local wrist/forearm
articulation is baked offline; runtime swaps cached frames, with no face morph,
optical-flow ghosting or whole-image deformation.
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path('output/mascot-work')
W, H, FRAMES, COLUMNS, ROWS = 256, 320, 64, 8, 8
# Bounds contain the generated sleeve/forearm travel, safely below the face.
# The fox's gentle low-paw pose is frame 10, rather than its high wave.
ARM = {
    'otter': (1, (35, 147, 125, 248), [(59,199),(76,196),(86,207),(105,224),(104,240),(92,246),(79,241),(67,224),(58,208)], (69,202), 22),
    'rabbit': (1, (40, 156, 117, 272), [(75,227),(90,224),(99,231),(103,244),(96,255),(84,259),(74,250),(71,235)], (85,228), 27),
    'fox': (9, (60, 126, 126, 221), [(77,164),(94,165),(106,185),(115,196),(111,208),(100,214),(89,206),(79,188),(74,173)], (85,171), 24),
    'dragon': (1, (59, 173, 140, 263), [(85,216),(98,211),(112,216),(120,226),(116,241),(104,250),(91,247),(81,235)], (94,216), 24),
}


def rgba_resize(im, size):
    a = np.array(im).astype(np.float32) / 255
    a[:, :, :3] *= a[:, :, 3:4]
    channels = [np.asarray(Image.fromarray(a[:, :, i]).resize(size, Image.Resampling.LANCZOS)) for i in range(4)]
    r = np.clip(np.stack(channels, axis=-1), 0, 1)
    r[:, :, :3] /= np.maximum(r[:, :, 3:4], 1 / 255)
    r[r[:, :, 3] < 4 / 255] = 0
    return Image.fromarray((np.clip(r, 0, 1) * 255).astype(np.uint8))


def normalised_poses(animal):
    source = Image.open(SOURCE / f'{animal}-atlas.png').convert('RGBA')
    sw, sh = source.size
    cells, bounds, feet = [], [], []
    for k in range(12):
        cell = source.crop((round(k % 4 * sw / 4), round(k // 4 * sh / 3),
                            round((k % 4 + 1) * sw / 4), round((k // 4 + 1) * sh / 3)))
        a = np.array(cell)
        a[a[:, :, 3] < 8] = 0
        cell = Image.fromarray(a)
        bbox = cell.getbbox()
        if not bbox:
            raise ValueError('empty generated frame')
        cells.append(cell)
        bounds.append(bbox)
        ys, xs = np.where(a[:, :, 3] > 128)
        bottom = ys.max()
        foot = xs[ys >= bottom - 10]
        feet.append((float((foot.min() + foot.max()) / 2), bottom))
    # Keep the previous registration/scale: no scene or character repositioning.
    left = max(foot[0] - box[0] for foot, box in zip(feet, bounds))
    right = max(box[2] - foot[0] for foot, box in zip(feet, bounds))
    scale = min((W - 24) / (left + right), (H - 24) / max(b[3] - b[1] for b in bounds))
    anchor_x = (W + (left - right) * scale) / 2
    poses = []
    for cell, (foot_x, bottom) in zip(cells, feet):
        resized = rgba_resize(cell, (round(cell.width * scale), round(cell.height * scale)))
        canvas = Image.new('RGBA', (W, H))
        canvas.alpha_composite(resized, (round(anchor_x - foot_x * scale), round(H - 12 - (bottom + 1) * scale)))
        poses.append(np.array(canvas).astype(np.float32) / 255)
    return poses


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * t * (t * (t * 6 - 15) + 10)


def amount(t):
    # Zero velocity and acceleration at lift, turn-around and landing.
    # No spring overshoot, rapid repeated waves or suddenly closing eyes.
    if t <= .06 or t >= .94:
        return 0.0
    if t < .45:
        return float(smoothstep((t - .06) / .39))
    if t <= .55:
        return 1.0
    return float(1 - smoothstep((t - .55) / .39))


def run(animal):
    poses = normalised_poses(animal)
    target, (left, top, right, bottom), polygon, pivot, max_angle = ARM[animal]
    a, b = poses[0], poses[target]
    yy, xx = np.mgrid[:H, :W].astype(np.float32)
    feather = 7.0
    region = (smoothstep((xx - left) / feather) * smoothstep((right - xx) / feather)
              * smoothstep((yy - top) / feather) * smoothstep((bottom - yy) / feather))[:, :, None]
    # This is only an alpha matte for an existing generated paw, not painted art.
    matte = Image.new('L', (W, H))
    ImageDraw.Draw(matte).polygon(polygon, fill=255)
    matte = matte.filter(ImageFilter.GaussianBlur(.6))
    mask = np.array(matte).astype(np.float32)[:, :, None] / 255

    def premul(p):
        q = p.copy()
        q[:, :, :3] *= q[:, :, 3:4]
        return q

    ap, bp = premul(a), premul(b)
    # The generated low-paw pose supplies the tiny hidden area behind the paw.
    base = ap * (1 - mask) + bp * mask
    paw = ap * mask

    def rotate_paw(degrees):
        # Premultiplied-alpha 2x supersampling keeps fur/scale outlines clean.
        return np.stack([np.asarray(Image.fromarray(paw[:, :, ch])
                         .resize((W * 2, H * 2), Image.Resampling.LANCZOS)
                         .rotate(degrees, Image.Resampling.BICUBIC, center=(pivot[0] * 2, pivot[1] * 2))
                         .resize((W, H), Image.Resampling.LANCZOS))
                         for ch in range(4)], axis=-1)

    def composite(p):
        return p + base * (1 - p[:, :, 3:4])

    neutral = composite(rotate_paw(0))
    generated, stats = [], []
    for index in range(FRAMES):
        t = amount(index / (FRAMES - 1))
        if t == 0:
            out = a.copy()
        else:
            # Subtract the rest matte before applying movement. This makes even
            # the first subpixel move continuous and preserves exact source rest.
            mixed = ap + (composite(rotate_paw(max_angle * t)) - neutral) * region
            mixed = np.clip(mixed, 0, 1)
            mixed[:, :, :3] = np.minimum(mixed[:, :, :3], mixed[:, :, 3:4])
            mixed[:, :, :3] /= np.maximum(mixed[:, :, 3:4], 1 / 255)
            mixed[mixed[:, :, 3] < 4 / 255] = 0
            out = np.clip(mixed, 0, 1)
            out[region[:, :, 0] == 0] = a[region[:, :, 0] == 0]
        frame = (out * 255).astype(np.uint8)
        assert np.array_equal(frame[region[:, :, 0] == 0], (a * 255).astype(np.uint8)[region[:, :, 0] == 0]), 'face/body pixels must be locked'
        assert not (frame[:, :3, 3] > 32).any() and not (frame[:, -3:, 3] > 32).any(), 'clipped silhouette'
        if generated:
            delta = np.abs(frame.astype(np.int16) - generated[-1].astype(np.int16))
            stats.append(float(delta.mean()))
        generated.append(frame)
    assert np.array_equal(generated[0], generated[-1]), 'neutral loop closure'
    atlas = Image.new('RGBA', (W * COLUMNS, H * ROWS))
    for index, frame in enumerate(generated):
        atlas.paste(Image.fromarray(frame), (index % COLUMNS * W, index // COLUMNS * H))
    dest = ROOT / 'assets/resources/art' / f'mascot-{animal}-motion.png'
    atlas.save(dest, optimize=True)
    evidence = SOURCE.parent / 'mascot-calm'
    evidence.mkdir(exist_ok=True)
    bg = Image.new('RGBA', (W, H), (19, 43, 38, 255))
    previews = [Image.alpha_composite(bg, Image.fromarray(frame)).convert('RGB') for frame in generated]
    previews[0].save(evidence / f'{animal}-calm.gif', save_all=True, append_images=previews[1:] + [previews[-1]] * 120, duration=33, loop=0)
    contact = Image.new('RGB', (W * 8, H * 2), (19, 43, 38))
    for n, index in enumerate([0, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 63]):
        contact.paste(previews[index], (n % 8 * W, n // 8 * H))
    contact.save(evidence / f'{animal}-calm-contact.jpg', quality=95)
    metrics = {'animal': animal, 'frames': FRAMES, 'atlas': atlas.size, 'reveal_source_pose': target,
               'moving_region': [left, top, right, bottom], 'outside_region_exact': True,
               'maximum_forearm_rotation_degrees': max_angle, 'whole_body_rotation_degrees': 0,
               'neutral_loop_exact': True, 'maximum_adjacent_frame_mean_delta': max(stats),
               'mean_adjacent_frame_delta': float(np.mean(stats))}
    (evidence / f'{animal}-calm-metrics.json').write_text(json.dumps(metrics, indent=2) + '\n')
    print(json.dumps(metrics), flush=True)


if __name__ == '__main__':
    for animal in sys.argv[2:] or list(ARM):
        if animal not in ARM:
            raise ValueError(f'Unknown mascot {animal}')
        run(animal)
