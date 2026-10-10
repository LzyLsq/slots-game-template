"""Motion-only repair: one registered painted pose contributes each moving pixel.

Do not run the old room installer: this script never changes room/hall art.
Frame interpolation transports a single nearest key pose. It never alpha-blends
neighboring hands, eyes or treasure. Feathering is confined to stationary scenery
outside the complete moving anatomy. Cocos still plays 48 fixed-position frames.
"""
from pathlib import Path
import argparse, hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw

P = Path(__file__).resolve().parent
ROOT = P.parents[1]
ART = ROOT / 'assets/resources/art'
W, H, FW, FH, COUNT = 736, 448, 460, 280, 48
MODES = ('sun-lion', 'emerald-elephant', 'lotus-koi', 'moon-fox')
# Palm centers measured in the 460x280 registered commissions. Broad motion
# guidance prevents unconstrained flow from tracking a hand against background
# gold, which otherwise stretches fingers at large arm displacements.
PALMS = {
 'sun-lion': [(173,188),(152,158),(142,155),(146,151),(128,157),(158,153),(144,153),(158,153),(134,176),(172,183),(175,192),(173,188)],
 'emerald-elephant': [(161,184),(143,145),(136,145),(125,144),(112,155),(138,152),(131,150),(142,152),(112,163),(168,182),(171,189),(161,184)],
 'lotus-koi': [(174,205),(165,172),(162,163),(175,162),(139,172),(169,168),(158,168),(166,171),(154,179),(173,207),(175,209),(174,205)],
 'moon-fox': [(166,209),(161,183),(144,173),(157,170),(125,176),(161,179),(126,184),(161,180),(125,179),(162,201),(168,208),(166,209)],
}


def guide_flow(mode, key, other, x, y):
    center = np.asarray(PALMS[mode][key], np.float32)
    delta = np.asarray(PALMS[mode][other], np.float32) - center
    distance = np.sqrt(((x - center[0]) / 1.08)**2 + (y - center[1])**2)
    blend = np.clip((distance - 27) / 53, 0, 1)
    weight = 1 - blend * blend * (3 - 2 * blend)
    weight *= np.clip((215 - x) / 19, 0, 1)
    weight *= np.clip((x - 58) / 12, 0, 1)
    weight *= np.clip((250 - y) / 14, 0, 1)
    weight *= np.clip((y - 92) / 26, 0, 1)
    return weight[:, :, None] * delta


def guided_flow(solver, a, b, guidance, x, y):
    aligned = cv2.remap(b, x + guidance[:, :, 0], y + guidance[:, :, 1],
                        cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    residual = solver.calc(cv2.cvtColor(a, cv2.COLOR_RGB2GRAY),
                           cv2.cvtColor(aligned, cv2.COLOR_RGB2GRAY), None)
    # Residuals describe local expression/finger changes, not gross arm motion.
    # Bound the left arm residual to avoid false long matches into the gold.
    length = np.sqrt(np.sum(residual * residual, axis=2))
    residual *= np.minimum(1, 5 / np.maximum(length, 1e-4))[:, :, None]
    residual = cv2.GaussianBlur(residual, (0, 0), 1.4)
    sampled = cv2.remap(guidance, x + residual[:, :, 0], y + residual[:, :, 1],
                        cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    flow = cv2.GaussianBlur(residual + sampled, (0, 0), 1.0)
    # A uniform bound preserves a continuous spatial map. Local clipping can
    # itself introduce steep seams. Half-key transport uses at most .5 flow.
    dx, dy = np.gradient(flow, axis=(1, 0))
    norm = np.sqrt(np.sum(dx*dx + dy*dy, axis=2))
    flow *= min(1.0, 1.2 / max(float(np.max(norm)), 1e-5))
    return flow


def rgb(path):
    return np.asarray(Image.open(path).convert('RGB')).copy()


def resize(a, w=FW, h=FH):
    return cv2.resize(a, (w, h), interpolation=cv2.INTER_LANCZOS4)


def inverse_map(flow, amount, x, y):
    mx, my = x.copy(), y.copy()
    for _ in range(5):
        f = cv2.remap(flow, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        mx, my = x - amount * f[:, :, 0], y - amount * f[:, :, 1]
    return mx, my


def anatomy_mask(mode):
    # Outer boundaries are in architecture/robe, not through fingers or bowls.
    # The hard interior is opaque; distance feather only joins static scenery.
    shapes = {
        'sun-lion': [(140, 134, 367, 366), (248, 122, 470, 305), (412, 166, 624, 368)],
        'emerald-elephant': [(136, 129, 370, 372), (246, 115, 473, 330), (409, 167, 637, 379)],
        'lotus-koi': [(132, 157, 371, 374), (248, 144, 475, 340), (410, 183, 644, 369)],
        'moon-fox': [(129, 184, 376, 393), (241, 155, 473, 356), (404, 209, 625, 393)],
    }
    mask = np.zeros((H, W), np.uint8)
    for x0, y0, x1, y1 in shapes[mode]:
        mask[y0:y1, x0:x1] = 255
    distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    a = np.clip(distance / 9, 0, 1).astype(np.float32)
    a = cv2.resize(a, (FW, FH), interpolation=cv2.INTER_AREA)
    a[:10] = 0
    a[-10:] = 0
    a[:, :10] = 0
    a[:, -10:] = 0
    return a


def prepare(mode, original):
    # Frame zero matches the exact room crown, including its static join.
    neutral = rgb(ART / (mode + '-fortune-motion.png'))[:FH, :FW].copy()
    sheet = rgb(P / 'output/imagegen' / (mode + '-poses.png'))
    sh, sw = sheet.shape[:2]
    alignment = {r['pose']: r['translation'] for r in original['registration']}
    poses = []
    for i in range(12):
        tile = sheet[round(i // 4 * sh / 3):round((i // 4 + 1) * sh / 3),
                     round(i % 4 * sw / 4):round((i % 4 + 1) * sw / 4)]
        tile = resize(tile, W, H)
        if i:
            matrix = np.eye(2, 3, dtype=np.float32)
            matrix[:, 2] = alignment[i]
            tile = cv2.warpAffine(tile, matrix, (W, H),
                                  flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                                  borderMode=cv2.BORDER_REFLECT)
        poses.append(resize(tile))
    poses[0] = neutral.copy()
    poses[-1] = neutral.copy()
    return neutral, poses


def bake(mode, original, output):
    neutral, poses = prepare(mode, original)
    broad = anatomy_mask(mode)
    # Scene pixels common to all commissions are not animation pixels. A binary
    # union of actual painted changes includes both the departed neutral arm
    # and every beckoning position, avoiding a surviving neutral silhouette.
    neutral_lab = cv2.cvtColor(neutral, cv2.COLOR_RGB2LAB).astype(np.float32)
    differences = np.stack([np.sqrt(np.sum((cv2.cvtColor(p, cv2.COLOR_RGB2LAB).astype(np.float32) - neutral_lab)**2, axis=2)) for p in poses])
    active = (np.max(differences, axis=0) > 24).astype(np.uint8) * 255
    active = cv2.morphologyEx(active, cv2.MORPH_CLOSE, np.ones((9,9), np.uint8))
    active = cv2.dilate(active, np.ones((11,11), np.uint8))
    distance = cv2.distanceTransform(active, cv2.DIST_L2, 5)
    alpha = np.minimum(broad, np.clip(distance / 4, 0, 1))
    # Forearm guidance must never bend the medallion beside the face.
    alpha[:90, :200] = 0
    solver = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    solver.setUseSpatialPropagation(True)
    solver.setFinestScale(0)
    yy, xx = np.mgrid[:FH, :FW]
    xx, yy = xx.astype(np.float32), yy.astype(np.float32)
    flows = []
    for i, (a, b) in enumerate(zip(poses[:-1], poses[1:])):
        ab = guided_flow(solver, a, b, guide_flow(mode, i, i + 1, xx, yy), xx, yy)
        ba = guided_flow(solver, b, a, guide_flow(mode, i + 1, i, xx, yy), xx, yy)
        flows.append((ab, ba))
    frames = []
    choices = []
    fd = output / mode
    fd.mkdir(parents=True, exist_ok=True)
    for n in range(COUNT):
        phase = n / (COUNT - 1) * 11
        i = min(10, int(phase))
        t = phase - i
        # One source image per frame: no convex interpolation/double contours.
        key, flow, amount = (i, flows[i][0], t) if t <= .5 else (i + 1, flows[i][1], 1 - t)
        mx, my = inverse_map(flow, amount, xx, yy)
        transported = cv2.remap(poses[key], mx, my, cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_REPLICATE)
        frame = np.clip(np.rint(neutral * (1 - alpha[:, :, None]) +
                               transported * alpha[:, :, None]), 0, 255).astype(np.uint8)
        if n in (0, COUNT - 1):
            frame = neutral.copy()
        frames.append(frame)
        dx_x, dy_x = np.gradient(mx, axis=(1,0))
        dx_y, dy_y = np.gradient(my, axis=(1,0))
        minimum_jacobian = float(np.min(dx_x*dy_y - dy_x*dx_y))
        assert minimum_jacobian > 0, (mode, n, minimum_jacobian)
        choices.append({'frame': n, 'keyPose': key, 'amount': round(amount, 6),
                        'movingSourceCount': 1, 'minimumInverseMapJacobian': round(minimum_jacobian, 5)})
        Image.fromarray(frame).save(fd / f'{n:02}.png')
    atlas = Image.new('RGB', (FW * 8, FH * 6))
    overview = Image.new('RGB', (FW * 8, FH * 6 + 6 * 18), '#252525')
    draw = ImageDraw.Draw(overview)
    for i, f in enumerate(frames):
        image = Image.fromarray(f)
        atlas.paste(image, (i % 8 * FW, i // 8 * FH))
        overview.paste(image, (i % 8 * FW, i // 8 * (FH + 18)))
        draw.text((i % 8 * FW + 5, i // 8 * (FH + 18) + FH + 1), f'{mode} {i:02}', fill='white')
    dest = output / (mode + '-fortune-motion.png')
    atlas.save(dest, optimize=True)
    overview.save(output / (mode + '-all-frames.jpg'), quality=94)
    Image.fromarray(frames[0]).save(output / (mode + '-neutral.png'))
    Image.fromarray(frames[22]).save(output / (mode + '-middle.png'))
    border = np.ones((FH, FW), dtype=bool)
    border[10:-10, 10:-10] = False
    assert all(np.array_equal(f[border], neutral[border]) for f in frames)
    assert np.array_equal(frames[0], frames[-1])
    # A seam audit exposes mid-key switches; it is evidence to review, not a
    # numerical substitute for watching the actual gesture.
    changes = [round(float(np.mean(np.abs(b.astype(float) - a.astype(float)))), 4)
               for a, b in zip(frames[:-1], frames[1:])]
    return {'mode': mode, 'frames': COUNT, 'frameSize': [FW, FH], 'atlasSize': list(atlas.size),
            'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(), 'fileBytes': dest.stat().st_size,
            'staticBorderEqualAllFrames': True, 'loopNeutralIdentical': True,
            'movingSourceCount': 1, 'sourceChoice': choices, 'adjacentFrameMeanAbsChange': changes}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--output', type=Path, default=Path('/tmp/f36-clean-motion'))
    args = parser.parse_args()
    originals = json.loads((P / 'installation-manifest.json').read_text())
    originals = {r['mode']: r for r in originals['cabinetPoses']}
    args.output.mkdir(parents=True, exist_ok=True)
    preserved = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in ART.glob('*.png') if not p.name.endswith('-fortune-motion.png')}
    reports = [bake(mode, originals[mode], args.output) for mode in MODES]
    if args.install:
        import shutil
        for mode in MODES:
            shutil.copyfile(args.output / (mode + '-fortune-motion.png'), ART / (mode + '-fortune-motion.png'))
            for i in range(COUNT):
                shutil.copyfile(args.output / mode / f'{i:02}.png', P / 'baked-frames' / mode / f'{i:02}.png')
        assert all(hashlib.sha256((ART / n).read_bytes()).hexdigest() == h for n, h in preserved.items())
    report = {'date': '2026-10-10', 'method': 'single-source nearest-key pose transport; no neighboring pose crossfade; opaque anatomy; stationary join feather',
              'commission': 'existing CC Switch commissioned twelve-pose sheets', 'installed': args.install,
              'roomHallTitleReelControlAssetsUnchanged': True, 'cabinetPoses': reports}
    (args.output / 'clean-motion-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    if args.install:
        (P / 'clean-motion-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    for r in reports:
        print(r['mode'], 'frames', r['frames'], 'maxAdjacentMean', max(r['adjacentFrameMeanAbsChange']), flush=True)


if __name__ == '__main__':
    main()
