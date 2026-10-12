/** Keep the generated cabinet, its wordmark and its keeper on one source-pixel
 * transform. Wide windows use a complete portrait stage rather than cropping
 * off the top of the machine. Phone portrait framing is unchanged. */
export function cabinetViewport(width: number, height: number, sourceWidth = 1024, sourceHeight = 1536) {
  const cover = Math.max(width / sourceWidth, height / sourceHeight);
  const scale = Math.min(cover, height / sourceHeight);
  const wide = cover > scale + 1e-6;
  // Ease the secondary HUD into source registration as the window widens;
  // there is no layout jump at the portrait-to-wide boundary.
  const blend = Math.max(0, Math.min(1, (width / height - sourceWidth / sourceHeight) / (1 - sourceWidth / sourceHeight)));
  const chromeScale = 1 + (scale * 715 / 880 - 1) * blend;
  return {
    cover, scale, wide, chromeScale,
    walletY: -535 + ((768 - 1140) * scale + 535) * blend,
    utilityY: -710 + ((768 - 1260) * scale + 710) * blend,
  };
}
