"""Repack F43's commissioned RGBA objects without cutting at imagined grid lines.

This is deliberately scoped to atlases and extracted controls. It never rebuilds
registered room extensions, guardian meshes, or corrected eyelid commissions.
Requires the existing Pillow, NumPy and OpenCV artwork environment.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageOps

P = Path(__file__).resolve().parents[1]
RAW = P / 'art-source/raw'
ART = P / 'assets/resources/art'
MODES = ['golden-strings', 'sapphire-harp', 'ruby-brass', 'pearl-rhythm']
INTERFACE_ORDER = [0, 1, 2, 3, 4, 6, 5, 15, 6, 7, 10, 11, 9, 13, 14, 8]
report = {}


def extract(name, cols, rows, threshold=180):
    """Use opaque connected silhouettes as seeds; preserve original RGBA edges.

    Detached tassels/beads and low-alpha edges follow the nearest silhouette,
    rather than getting chopped off by their nominal source cell boundary.
    """
    source = np.array(Image.open(RAW / (name + '.png')).convert('RGBA'))
    height, width = source.shape[:2]
    seeds = (source[:, :, 3] > threshold).astype(np.uint8)
    _, labels, stats, centers = cv2.connectedComponentsWithStats(seeds)
    major = [i for i, stat in enumerate(stats) if i and stat[4] > 5000]
    groups = {}
    for component in major:
        cx,cy=centers[component]
        index=min(rows-1,int(cy*rows/height))*cols+min(cols-1,int(cx*cols/width))
        groups.setdefault(index,[]).append(component)
    if len(groups)!=cols*rows:
        raise ValueError(f'{name}: expected {cols*rows} semantic cells, found {sorted(groups)}')
    nearest_input = (~np.isin(labels, major)).astype(np.uint8)
    _,nearest=cv2.distanceTransformWithLabels(nearest_input,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_CCOMP)
    objects=[None]*(cols*rows);bounds=[None]*len(objects)
    for index,components in groups.items():
        owners=[]
        for component in components:
            sy,sx=np.argwhere(labels==component)[0];owners.append(nearest[sy,sx])
        ownership=np.isin(nearest,owners)
        visible=ownership&(source[:,:,3]>6)
        ys,xs=np.nonzero(visible)
        left,top,right,bottom=int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1
        paint=source[top:bottom,left:right].copy();paint[~ownership[top:bottom,left:right]]=0
        paint[paint[:,:,3]<3]=0
        objects[index]=Image.fromarray(paint);bounds[index]=[left,top,right,bottom]
    report[name] = {'sourceSize': [width, height], 'objects': len(objects), 'sourceBounds': bounds}
    return objects


def edge_rgb(image):
    """Extend edge RGB into transparent gutters, keeping alpha unchanged.

    Linear filtering then blends painted RGB rather than transparent black.
    """
    array = np.array(image)
    solid = array[:, :, 3] >= 8
    if not solid.any():
        return image
    _, nearest = cv2.distanceTransformWithLabels(
        (~solid).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    palette = np.zeros((int(nearest.max()) + 1, 3), dtype=np.uint8)
    palette[nearest[solid]] = array[:, :, :3][solid]
    transparent = array[:, :, 3] == 0
    array[:, :, :3][transparent] = palette[nearest[transparent]]
    return Image.fromarray(array)


def save(name, image):
    image = edge_rgb(image)
    image.save(ART / (name + '.png'), optimize=True)
    meta = ART / (name + '.png.meta')
    if meta.exists():
        data = json.loads(meta.read_text())
        for submeta in data.get('subMetas', {}).values():
            if submeta.get('importer') == 'texture':
                submeta['userData'].update(wrapModeS='clamp-to-edge', wrapModeT='clamp-to-edge')
        # RGB dilation above is explicit and reproducible, not importer dependent.
        data['userData']['fixAlphaTransparencyArtifacts'] = False
        meta.write_text(json.dumps(data, indent=2) + '\n')


def premultiplied_blur(image, sigma=3.0):
    array = np.array(image, dtype=np.float32)
    alpha = array[:, :, 3:4] / 255
    premultiplied = array[:, :, :3] * alpha
    blurred_alpha = cv2.GaussianBlur(alpha, (0, 0), sigma)[..., None]
    blurred_rgb = cv2.GaussianBlur(premultiplied, (0, 0), sigma)
    rgb = np.divide(blurred_rgb, blurred_alpha, out=np.zeros_like(blurred_rgb), where=blurred_alpha > 1e-6)
    return Image.fromarray(np.clip(np.concatenate((rgb, blurred_alpha * 255), axis=2), 0, 255).astype(np.uint8))


def pack(name, objects, cols, rows, cell, gutter, blur=False):
    atlas = Image.new('RGBA', (cols * cell, rows * cell))
    blurred = Image.new('RGBA', atlas.size) if blur else None
    crops = []
    for index, paint in enumerate(objects):
        fitted = ImageOps.contain(paint, (cell - gutter * 2, cell - gutter * 2), Image.Resampling.LANCZOS)
        tile = Image.new('RGBA', (cell, cell))
        tile.alpha_composite(fitted, ((cell - fitted.width) // 2, (cell - fitted.height) // 2))
        bounds = tile.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        # Include enough transparent headroom for filtering and the per-cell blur.
        left, top, right, bottom = bounds
        pad = 10 if blur else 6
        crop = [max(0, left - pad), max(0, top - pad), min(cell, right + pad), min(cell, bottom + pad)]
        crops.append([crop[0], crop[1], crop[2] - crop[0], crop[3] - crop[1]])
        # An empty gutter prevents the renderer from sampling a neighbouring object.
        alpha = np.asarray(tile)[:, :, 3]
        assert not any((alpha[:gutter - 2].any(), alpha[-gutter + 2:].any(), alpha[:, :gutter - 2].any(), alpha[:, -gutter + 2:].any())), (name, index)
        position = (index % cols * cell, index // cols * cell)
        atlas.paste(tile, position)
        if blurred is not None:
            # Never blur the entire atlas: that can carry a neighbour into this cell.
            blurred.paste(premultiplied_blur(tile), position)
    save(name, atlas)
    if blurred is not None:
        save(name + '-blur', blurred)
    report[name]['outputSize'] = list(atlas.size)
    report[name]['gutterPixels'] = gutter
    return crops


def prepare():
    crops = {}
    for mode in MODES:
        name = 'symbols-' + mode
        crops[name] = pack(name, extract(name, 4, 4, 128), 4, 4, 256, 18, True)
    # Legacy aliases use the same corrected cells rather than the uncropped raw atlas.
    save('symbols', Image.open(ART / 'symbols-golden-strings.png').convert('RGBA'))
    save('symbols-blur', Image.open(ART / 'symbols-golden-strings-blur.png').convert('RGBA'))
    crops['symbols'] = crops['symbols-golden-strings']
    for name in ['canopy-destinations', 'optics']:
        crops[name] = pack(name, extract(name, 2, 2, 70 if name == "optics" else 180), 2, 2, 512, 18)
    interfaces = extract('interfaces', 4, 4)
    for index, source_index in enumerate(INTERFACE_ORDER):
        save('interface-' + str(index), ImageOps.expand(interfaces[source_index], 5, (0, 0, 0, 0)))
    save('interface-close', ImageOps.expand(interfaces[7], 5, (0, 0, 0, 0)))
    for theme in range(4):
        for index, paint in enumerate(extract('controls-' + str(theme), 2, 2)):
            save('canopy-button-' + str(theme * 4 + index), ImageOps.expand(paint, 5, (0, 0, 0, 0)))
    for source, prefix in [('frames', 'canopy-frame-'), ('plates', 'canopy-soft-plate-'), ('win-frames', 'win-frame-'), ('award-titles', 'award-title-')]:
        for index, paint in enumerate(extract(source, 2, 2)):
            suffix = ['big', 'super', 'mega', 'epic'][index] if source == 'award-titles' else str(index)
            save(prefix + suffix, ImageOps.expand(paint, 5, (0, 0, 0, 0)))
    single_crops = {}
    for name in ['canopy-brand'] + ['canopy-title-'+str(i) for i in range(4)] + ['marquee-title-'+str(i) for i in range(4) if (ART/('marquee-title-'+str(i)+'.png')).exists()]:
        im = Image.open(ART / (name+'.png'))
        l,t,r,b = im.getchannel('A').point(lambda v:255 if v>6 else 0).getbbox()
        l,t,r,b = max(0,l-6),max(0,t-6),min(im.width,r+6),min(im.height,b+6)
        single_crops[name] = [l,t,r-l,b-t]
    symbol_crops = {name: cells for name, cells in crops.items() if name.startswith('symbols')}
    art_crops = {name: cells for name, cells in crops.items() if not name.startswith('symbols')}
    glyph_report = P / 'art-source/award-glyph-crops.json'
    if glyph_report.exists():
        art_crops['festival-gold-digits-v2'] = json.loads(glyph_report.read_text())['crops']
    (P / 'assets/scripts/ui/SymbolCrop.ts').write_text(
        '// Commissioned silhouettes repacked per object; regenerate with art-source/prepare_atlases.py.\n'
        'export const SYMBOL_CROPS:Record<string,readonly (readonly number[])[]>=' + json.dumps(symbol_crops) + ';\n'
        'export const ART_CROPS:Record<string,readonly (readonly number[])[]>=' + json.dumps(art_crops) + ';\n' +
        'export const SINGLE_ART_CROPS:Record<string,readonly number[]>=' + json.dumps(single_crops) + ';\n')
    report['processing'] = 'Connected silhouette extraction with original RGBA, proportional per-object packing, transparent RGB edge extension, and isolated premultiplied-alpha blur.'
    report['preserved'] = ['symbol semantic indices', 'interface semantic reorder', 'room extensions', 'guardian commissions and eyelids']
    (P / 'docs/atlas-crop-audit-20261012.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Prepared 64 symbols, 16 interfaces, 16 controls, 4 destinations and material/award objects; registered scenes untouched.')


if __name__ == '__main__':
    prepare()
