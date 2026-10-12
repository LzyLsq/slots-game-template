/** Small, deterministic cutout poses. The feet and background never translate. */
export interface CaravanCatPose {
  chestX: number;
  chestY: number;
  headAngle: number;
  tailAngle: number;
  earAngle: number;
  tasselAngle: number;
  blink: boolean;
}

export function sampleCaravanCatPose(time: number, reduced = false): CaravanCatPose {
  if (reduced) return { chestX: 1, chestY: 1, headAngle: 0, tailAngle: 0, earAngle: 0, tasselAngle: 0, blink: false };
  const breath = .5 - .5 * Math.cos(time * Math.PI * 2 / 4.7);
  const earTime = time % 7.3;
  const twitch = (start: number, duration: number): number => {
    const p = (earTime - start) / duration;
    return p > 0 && p < 1 ? Math.sin(p * Math.PI) * Math.sin(p * Math.PI * 3) : 0;
  };
  const blinkTime = time % 4.6;
  return {
    chestX: 1 + breath * .006,
    chestY: 1 + breath * .017,
    headAngle: 3.8 * Math.sin(time * Math.PI * 2 / 6.4) + .8 * Math.sin(time * Math.PI * 2 / 11.6),
    tailAngle: 14 * Math.sin(time * Math.PI * 2 / 3.8),
    earAngle: 9 * (twitch(1.35, .55) + twitch(1.98, .32)),
    tasselAngle: 5 * Math.sin(time * Math.PI * 2 / 3.1),
    blink: blinkTime >= 3.8 && blinkTime < 3.94 || Math.floor(time / 4.6) % 2 === 1 && blinkTime >= 4.07 && blinkTime < 4.15,
  };
}
