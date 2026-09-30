"""Separate the login squirrel from salon.png for a low-cost idle animation.

Requires opencv-python-headless and numpy. Keep salon.png unchanged; Cocos
imports the two generated images beside it. Coordinates are for 941x1672 art.
"""
from pathlib import Path

import cv2
import numpy as np


art = Path(__file__).resolve().parents[1] / "assets/resources/art"
image = cv2.imread(str(art / "salon.png"), cv2.IMREAD_COLOR)
if image is None or image.shape[:2] != (1672, 941):
    raise RuntimeError("Expected the original 941x1672 salon.png")

height, width = image.shape[:2]
region = np.zeros((height, width), np.uint8)
outline = np.array([
    (125, 257), (134, 205), (156, 169), (196, 142), (255, 130),
    (306, 154), (338, 135), (341, 100), (357, 91), (377, 132),
    (391, 153), (425, 111), (441, 107), (442, 176), (435, 197),
    (448, 219), (453, 260), (432, 287), (431, 330), (418, 378),
    (418, 439), (376, 453), (317, 447), (265, 450), (225, 435),
    (217, 397), (189, 368), (171, 337), (143, 322),
], np.int32)
cv2.fillPoly(region, [outline], 1)
mask = np.full((height, width), cv2.GC_BGD, np.uint8)
mask[region == 1] = cv2.GC_PR_FGD


def foreground_ellipse(x: int, y: int, rx: int, ry: int, angle: int = 0) -> None:
    cv2.ellipse(mask, (x, y), (rx, ry), angle, 0, 360, int(cv2.GC_FGD), -1)


for ellipse in [
    (218, 230, 57, 70, -22), (262, 290, 58, 76, -23),
    (328, 351, 56, 66, -17), (371, 219, 54, 56, -15),
    (358, 155, 11, 28, -13), (426, 155, 6, 24, 12),
    (379, 298, 31, 39, -20), (278, 381, 29, 39, -28),
    (320, 426, 30, 8, 0), (383, 429, 25, 8, 0),
]:
    foreground_ellipse(*ellipse)

cv2.grabCut(
    image, mask, None, np.zeros((1, 65), np.float64),
    np.zeros((1, 65), np.float64), 7, cv2.GC_INIT_WITH_MASK,
)
selected = np.where(
    (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0,
).astype(np.uint8)
selected = cv2.morphologyEx(selected, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
selected = cv2.morphologyEx(selected, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

# The repair is almost entirely concealed by the squirrel; a small overlap
# prevents revealing the baked original as the head moves a few pixels.
repair = cv2.dilate(selected, np.ones((11, 11), np.uint8), iterations=1)
background = cv2.inpaint(image, repair, 18, cv2.INPAINT_TELEA)
alpha = cv2.GaussianBlur(selected, (5, 5), .9)
sprite = np.dstack((image, alpha))[82:465, 115:465]
if not cv2.imwrite(str(art / "salon-motion-bg.png"), background):
    raise RuntimeError("Could not write salon-motion-bg.png")
if not cv2.imwrite(str(art / "salon-squirrel.png"), sprite):
    raise RuntimeError("Could not write salon-squirrel.png")
