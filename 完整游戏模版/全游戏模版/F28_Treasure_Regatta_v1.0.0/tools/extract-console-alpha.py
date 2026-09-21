"""Extract the eight generated console controls from a softly graded sheet.

The pearl and reef source sheets were rendered on studio gradients rather than
the requested chroma key.  Each object occupies one cell of a 2 x 4 sheet, so
we can estimate that cell's smooth background from its outer border and retain
the single substantial foreground component.  This is deterministic and keeps
the original control artwork unchanged.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from skimage.color import rgb2lab


def background_plane(rgb: np.ndarray) -> np.ndarray:
    height, width, _ = rgb.shape
    yy, xx = np.mgrid[0:height, 0:width]
    x = xx / max(1, width - 1)
    y = yy / max(1, height - 1)
    border = max(12, round(min(width, height) * 0.08))
    sample = (xx < border) | (xx >= width - border) | (yy < border) | (yy >= height - border)
    basis = np.stack((np.ones_like(x), x, y, x * x, x * y, y * y), axis=-1)
    design = basis[sample]
    fitted = np.empty_like(rgb, dtype=np.float64)
    for channel in range(3):
        coefficients, *_ = np.linalg.lstsq(design, rgb[..., channel][sample], rcond=None)
        fitted[..., channel] = basis @ coefficients
    return np.clip(fitted, 0, 1)


def cell_mask(rgb: np.ndarray) -> np.ndarray:
    delta = np.linalg.norm(rgb2lab(rgb) - rgb2lab(background_plane(rgb)), axis=2)
    # Gold, nacre and aqua edges all clear this threshold while studio gradients
    # stay below it. Closing reconnects fine metallic rims without swallowing
    # the soft cast shadow.
    mask = delta > 15.0
    mask = ndimage.binary_opening(mask, iterations=1)
    mask = ndimage.binary_closing(mask, iterations=3)
    mask = ndimage.binary_fill_holes(mask)
    labels, count = ndimage.label(mask)
    if count == 0:
        raise ValueError('no foreground component found')
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    keep = labels == sizes.argmax()
    keep = ndimage.binary_dilation(keep, iterations=2)
    return keep


def extract(source: Path, destination: Path) -> None:
    image = Image.open(source).convert('RGB')
    rgb = np.asarray(image, dtype=np.float64) / 255.0
    height, width, _ = rgb.shape
    alpha = np.zeros((height, width), dtype=np.uint8)
    for row in range(4):
        for column in range(2):
            x0, x1 = column * width // 2, (column + 1) * width // 2
            y0, y1 = row * height // 4, (row + 1) * height // 4
            alpha[y0:y1, x0:x1] = cell_mask(rgb[y0:y1, x0:x1]).astype(np.uint8) * 255
    matte = Image.fromarray(alpha, 'L').filter(ImageFilter.GaussianBlur(0.65))
    output = image.convert('RGBA')
    output.putalpha(matte)
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    extract(args.input, args.out)


if __name__ == '__main__':
    main()
