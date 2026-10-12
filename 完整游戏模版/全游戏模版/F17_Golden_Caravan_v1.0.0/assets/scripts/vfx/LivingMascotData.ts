import type { MascotBone } from './ArticulatedMascot';
export interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }
export const LIVING_MASCOTS: readonly LivingMascotSpec[] = [
  {
    "art": "caravan-card-1",
    "index": -1,
    "canvas": [
      599,
      599
    ],
    "rect": [
      236,
      129,
      165,
      177
    ],
    "pivot": [
      315.36,
      300.08000000000004
    ],
    "frames": [
      [
        20,
        12,
        216,
        232
      ],
      [
        276,
        12,
        216,
        232
      ]
    ],
    "phase": 5.27,
    "angle": 3.6,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.9863,
    "eyeState": "open",
    "blinkEnabled": true,
    "bones": [
      {
        "name": "lower jaw",
        "pivot": [
          0.51,
          0.74
        ],
        "region": [
          0.24,
          0.71,
          0.89,
          1.18
        ],
        "angle": 1.6,
        "period": 6.8,
        "phase": 1.2,
        "mode": "sway"
      }
    ]
  },
  {
    "art": "caravan-card-2",
    "index": -1,
    "canvas": [
      599,
      599
    ],
    "rect": [
      95,
      50,
      409,
      281
    ],
    "pivot": [
      314,
      312.8
    ],
    "frames": [
      [
        12,
        304,
        232,
        159
      ],
      [
        268,
        304,
        232,
        159
      ]
    ],
    "phase": 6.1,
    "angle": 2.4,
    "period": 7.2,
    "blinkSafe": true,
    "blinkIoU": 0.9946,
    "eyeState": "open",
    "blinkEnabled": true,
    "bones": [
      {
        "name": "left ear",
        "pivot": [
          0.29,
          0.52
        ],
        "region": [
          -0.18,
          0.19,
          0.39,
          1.16
        ],
        "angle": 9,
        "period": 6.2,
        "phase": 1.8,
        "mode": "flick"
      },
      {
        "name": "right ear",
        "pivot": [
          0.7,
          0.54
        ],
        "region": [
          0.71,
          0.16,
          1.21,
          0.82
        ],
        "angle": -8,
        "period": 7.3,
        "phase": 4.5,
        "mode": "flick"
      },
      {
        "name": "trunk curl",
        "pivot": [
          0.74,
          0.64
        ],
        "region": [
          0.75,
          0.31,
          1.21,
          0.91
        ],
        "angle": 7,
        "period": 5.3,
        "phase": 2.2,
        "mode": "sway"
      }
    ]
  },
  {
    "art": "caravan-card-3",
    "index": -1,
    "canvas": [
      599,
      599
    ],
    "rect": [
      245,
      32,
      271,
      271
    ],
    "pivot": [
      308.75,
      299.25
    ],
    "frames": [
      [
        12,
        524,
        232,
        232
      ],
      [
        268,
        524,
        232,
        232
      ]
    ],
    "phase": 6.93,
    "angle": 2.3,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.9888,
    "eyeState": "open",
    "blinkEnabled": true,
    "bones": [
      {
        "name": "left long ear",
        "pivot": [
          0.27,
          0.5
        ],
        "region": [
          -0.12,
          -0.14,
          0.51,
          0.55
        ],
        "angle": 11,
        "period": 6.1,
        "phase": 2.4,
        "mode": "flick"
      },
      {
        "name": "right long ear",
        "pivot": [
          0.69,
          0.5
        ],
        "region": [
          0.53,
          -0.12,
          1.17,
          0.61
        ],
        "angle": -9,
        "period": 7.3,
        "phase": 4.8,
        "mode": "flick"
      }
    ]
  }
];
