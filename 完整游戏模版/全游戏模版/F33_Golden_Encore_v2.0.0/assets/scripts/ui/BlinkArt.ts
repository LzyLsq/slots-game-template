import type { KeeperMode } from './KeeperGesture';
export type BlinkScene = 'hall' | 'cabinet' | 'prize';
export type BlinkArt = { readonly art: string; readonly rect: readonly [number, number, number, number] };
/** Tiny source-registered eye crops. All source art was edited by CC Switch. */
export const BLINK_ART: Readonly<Record<BlinkScene, readonly BlinkArt[]>> = {
  "hall": [
    {
      "art": "blink-hall-otter",
      "rect": [
        602,
        516,
        72,
        41
      ]
    },
    {
      "art": "blink-hall-rabbit",
      "rect": [
        608,
        521,
        85,
        45
      ]
    },
    {
      "art": "blink-hall-fox",
      "rect": [
        675,
        525,
        65,
        36
      ]
    },
    {
      "art": "blink-hall-dragon",
      "rect": [
        541,
        510,
        99,
        45
      ]
    }
  ],
  "cabinet": [
    {
      "art": "blink-cabinet-otter",
      "rect": [
        51,
        26,
        56,
        31
      ]
    },
    {
      "art": "blink-cabinet-rabbit",
      "rect": [
        49,
        30,
        59,
        34
      ]
    },
    {
      "art": "blink-cabinet-fox",
      "rect": [
        79,
        43,
        49,
        28
      ]
    },
    {
      "art": "blink-cabinet-dragon",
      "rect": [
        68,
        46,
        56,
        30
      ]
    }
  ],
  "prize": [
    {
      "art": "blink-prize-otter",
      "rect": [
        54,
        50,
        46,
        23
      ]
    },
    {
      "art": "blink-prize-rabbit",
      "rect": [
        59,
        57,
        47,
        24
      ]
    },
    {
      "art": "blink-prize-fox",
      "rect": [
        73,
        60,
        43,
        25
      ]
    },
    {
      "art": "blink-prize-dragon",
      "rect": [
        72,
        68,
        42,
        20
      ]
    }
  ]
};
export function blinkArt(scene: BlinkScene, mode: KeeperMode): BlinkArt { return BLINK_ART[scene][mode]; }
