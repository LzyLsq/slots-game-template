import type { MascotBone } from './ArticulatedMascot';
export interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }
export const LIVING_MASCOTS: readonly LivingMascotSpec[] = [
  {
    "art": "canopy-destinations",
    "index": 0,
    "canvas": [
      1024,
      1024
    ],
    "rect": [
      321,
      215,
      198,
      245
    ],
    "pivot": [
      417.6,
      455.59999999999997
    ],
    "frames": [
      [
        34,
        12,
        187,
        232
      ],
      [
        290,
        12,
        187,
        232
      ]
    ],
    "phase": 8.99,
    "angle": 3.6,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.99,
    "eyeState": "open",
    "blinkEnabled": true,
    "bones": [
      {
        "name": "left ear",
        "pivot": [
          0.26,
          0.43
        ],
        "region": [
          -0.14,
          -0.13,
          0.44,
          0.47
        ],
        "angle": 13,
        "period": 5.9,
        "phase": 2.1,
        "mode": "flick"
      },
      {
        "name": "right ear",
        "pivot": [
          0.76,
          0.43
        ],
        "region": [
          0.61,
          -0.13,
          1.14,
          0.47
        ],
        "angle": -11.049999999999999,
        "period": 7.1,
        "phase": 4.3,
        "mode": "flick"
      }
    ]
  },
  {
    "art": "canopy-destinations",
    "index": 1,
    "canvas": [
      1024,
      1024
    ],
    "rect": [
      439,
      161,
      283,
      311
    ],
    "pivot": [
      558.4000000000001,
      441.28000000000003
    ],
    "frames": [
      [
        22,
        268,
        211,
        232
      ],
      [
        278,
        268,
        211,
        232
      ]
    ],
    "phase": 9.82,
    "angle": 2.2,
    "period": 6.27,
    "blinkSafe": true,
    "blinkIoU": 0.9927,
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
  },
  {
    "art": "canopy-destinations",
    "index": 2,
    "canvas": [
      1024,
      1024
    ],
    "rect": [
      369,
      341,
      154,
      178
    ],
    "pivot": [
      448.4,
      515.52
    ],
    "frames": [
      [
        27,
        524,
        201,
        232
      ],
      [
        283,
        524,
        201,
        232
      ]
    ],
    "phase": 10.65,
    "angle": 3.6,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.9887,
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
    "art": "canopy-destinations",
    "index": 3,
    "canvas": [
      1024,
      1024
    ],
    "rect": [
      423,
      172,
      206,
      203
    ],
    "pivot": [
      549.2,
      376.4000000000001
    ],
    "frames": [
      [
        12,
        781,
        232,
        229
      ],
      [
        268,
        781,
        232,
        229
      ]
    ],
    "phase": 11.48,
    "angle": 3.6,
    "period": 7.21,
    "blinkSafe": true,
    "blinkIoU": 0.9906,
    "eyeState": "open",
    "blinkEnabled": true,
    "bones": [
      {
        "name": "beak",
        "pivot": [
          0.65,
          0.62
        ],
        "region": [
          0.61,
          0.44,
          1.18,
          0.88
        ],
        "angle": 2.4,
        "period": 6.2,
        "phase": 1,
        "mode": "sway"
      },
      {
        "name": "crest",
        "pivot": [
          0.43,
          0.24
        ],
        "region": [
          0.21,
          -0.14,
          0.7,
          0.33
        ],
        "angle": 4,
        "period": 7.1,
        "phase": 2.4,
        "mode": "sway"
      }
    ]
  }
];
