#!/usr/bin/env python3
"""Regression tests for F35's photographic symbol cutouts (Pillow/NumPy)."""
import importlib.util
import json
from pathlib import Path
import unittest

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('symbol_cutouts', ROOT / 'tools/clean-symbol-gutters.py')
crop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(crop)


class CutoutTests(unittest.TestCase):
    def test_edge_recovers_gold_instead_of_white_fringe(self):
        # A known foreground composited onto white, with a subpixel boundary.
        coverage = Image.new('L', (384, 384))
        ImageDraw.Draw(coverage).ellipse((54, 54, 330, 330), fill=255)
        coverage = coverage.resize((128, 128), Image.Resampling.LANCZOS)
        alpha = np.asarray(coverage).astype(np.float32) / 255
        gold = np.array([205, 132, 29], np.float32)
        pixels = (gold * alpha[:, :, None] + 255 * (1 - alpha[:, :, None])).round().astype('uint8')
        solid = alpha > .10
        out = np.asarray(crop.matte_edges(pixels, solid))
        edge = (out[:, :, 3] > 30) & (out[:, :, 3] < 225)
        self.assertGreater(int(edge.sum()), 40)
        self.assertLess(float(np.abs(out[edge, :3].astype(float) - gold).mean()), 16)
        self.assertEqual(int(out[64, 64, 3]), 255)
        self.assertEqual(int(out[0, 0, 3]), 0)

    def test_white_highlights_survive_but_measured_hole_stays_open(self):
        pixels = np.full((128, 128, 3), 255, dtype='uint8')
        pixels[16:112, 16:112] = (207, 130, 25)
        pixels[40:55, 30:45] = 255  # pearl/metal specular highlight
        pixels[70:90, 70:90] = 255  # real ring/key aperture
        solid = np.any(pixels < 235, axis=2)
        labels, objects = crop.components(solid)
        # Source extraction includes a 4px border: local origin is (12,12).
        opening = ((80 - 12) / 104, (80 - 12) / 104)
        evidence = {}
        out = np.asarray(crop.isolate(pixels, labels, objects[0], (opening,), evidence))
        self.assertEqual(evidence['realOpenings'], 1)
        self.assertEqual(evidence['openingAlpha'], [0])
        self.assertGreater(int(((out[:, :, :3].min(2) > 245) & (out[:, :, 3] == 255)).sum()), 100)

    def test_rgb_bleed_changes_no_alpha_or_visible_artwork(self):
        image = Image.new('RGBA', (32, 32))
        ImageDraw.Draw(image).rectangle((10, 10, 21, 21), fill=(205, 132, 29, 255))
        out = np.asarray(crop.bleed_rgb(image))
        original = np.asarray(image)
        np.testing.assert_array_equal(out[:, :, 3], original[:, :, 3])
        np.testing.assert_array_equal(out[original[:, :, 3] > 0], original[original[:, :, 3] > 0])
        np.testing.assert_array_equal(out[9, 15], [205, 132, 29, 0])
        np.testing.assert_array_equal(out[8, 15], [205, 132, 29, 0])
        self.assertEqual(int(out[0, 0].sum()), 0)

    def test_blur_does_not_mix_transparent_black_into_gold(self):
        image = Image.new('RGBA', (64, 64))
        ImageDraw.Draw(image).ellipse((20, 20, 43, 43), fill=(205, 132, 29, 255))
        out = np.asarray(crop.blur_rgba(image, 5))
        edge = (out[:, :, 3] > 24) & (out[:, :, 3] < 120)
        self.assertLess(float(np.abs(out[edge, :3].astype(float) - [205, 132, 29]).mean()), 8)

    def test_all_delivered_atlases_have_complete_isolated_cells(self):
        for theme in crop.THEMES:
            for blurred in (False, True):
                suffix = '-blur' if blurred else ''
                with self.subTest(theme=theme, blurred=blurred):
                    image = Image.open(ROOT / f'assets/resources/art/symbols-{theme}{suffix}.png').convert('RGBA')
                    self.assertEqual(len(crop.validate_atlas(image, blurred)), 16)

    def test_release_fingerprints_art_but_preserves_public_legal_urls(self):
        config = json.loads((ROOT / 'tools/web-mobile-release-build.json').read_text())
        self.assertTrue(config['md5Cache'])
        self.assertTrue(config['md5CacheOptions']['handleTemplateMd5Link'])
        self.assertTrue({'privacy.html', 'terms.html', 'support.html'} <=
                        set(config['md5CacheOptions']['excludes']))

    def test_source_apertures_are_not_filled(self):
        openings = 0
        for theme in crop.THEMES:
            image = Image.open(ROOT / f'art-source/master/symbols-{theme}.png').convert('RGB')
            rgb = np.asarray(image)
            low = rgb.min(2).astype(np.int16)
            labels, objects = crop.components(~((rgb.max(2).astype(np.int16) - low < 32) & (low > 235)))
            for obj in objects:
                if obj['area'] <= 1000:
                    continue
                x0, y0, x1, y1 = obj['bounds']
                index = min(3, int((x0 + x1) / 2 / image.width * 4)) + 4 * min(3, int((y0 + y1) / 2 / image.height * 4))
                anchors = crop.OPENING_ANCHORS.get(theme, {}).get(index, ())
                if anchors:
                    with self.subTest(theme=theme, index=index):
                        evidence = {}
                        crop.isolate(rgb, labels, obj, anchors, evidence)
                        self.assertEqual(evidence['realOpenings'], len(anchors))
                        self.assertTrue(all(a < 16 for a in evidence['openingAlpha']))
                        openings += len(anchors)
        self.assertEqual(openings, 24)


if __name__ == '__main__':
    unittest.main(verbosity=2)
