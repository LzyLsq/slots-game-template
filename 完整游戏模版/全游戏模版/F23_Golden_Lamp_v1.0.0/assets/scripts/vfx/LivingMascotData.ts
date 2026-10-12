import type { MascotBone } from './ArticulatedMascot';
export interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }
export const LIVING_MASCOTS: readonly LivingMascotSpec[] = [
  {
    "art": "canopy-destinations",
    "index": 0,
    "canvas": [
      768,
      768
    ],
    "rect": [
      285,
      155,
      99,
      107
    ],
    "pivot": [
      331.68,
      269.28
    ],
    "frames": [
      [
        20,
        12,
        215,
        232
      ],
      [
        276,
        12,
        215,
        232
      ]
    ],
    "phase": 7.13,
    "angle": 3.6,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.9864,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "hair tuft",
        "pivot": [
          0.39,
          0.26
        ],
        "region": [
          0.07,
          -0.19,
          0.65,
          0.26
        ],
        "angle": 7,
        "period": 5.8,
        "phase": 2,
        "mode": "sway"
      }
    ]
  },
  {
    "art": "canopy-destinations",
    "index": 1,
    "canvas": [
      768,
      768
    ],
    "rect": [
      412,
      358,
      106,
      111
    ],
    "pivot": [
      466.72,
      473.28
    ],
    "frames": [
      [
        17,
        268,
        222,
        232
      ],
      [
        273,
        268,
        222,
        232
      ]
    ],
    "phase": 7.96,
    "angle": 3.6,
    "period": 6.27,
    "blinkSafe": true,
    "blinkIoU": 0.9973,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "left tassel",
        "pivot": [
          0.22,
          0.27
        ],
        "region": [
          -0.08,
          0.07,
          0.31,
          0.49
        ],
        "angle": 6,
        "period": 7,
        "phase": 1,
        "mode": "sway"
      },
      {
        "name": "right tassel",
        "pivot": [
          0.79,
          0.28
        ],
        "region": [
          0.73,
          0.04,
          1.13,
          0.52
        ],
        "angle": -5,
        "period": 8,
        "phase": 3,
        "mode": "sway"
      }
    ]
  },
  {
    "art": "canopy-destinations",
    "index": 2,
    "canvas": [
      768,
      768
    ],
    "rect": [
      219,
      371,
      142,
      117
    ],
    "pivot": [
      307.52,
      483.20000000000005
    ],
    "frames": [
      [
        12,
        544,
        232,
        191
      ],
      [
        268,
        544,
        232,
        191
      ]
    ],
    "phase": 8.79,
    "angle": 1.5,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.9914,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "left hair ornament",
        "pivot": [
          0.18,
          0.4
        ],
        "region": [
          -0.19,
          0.31,
          0.26,
          1.03
        ],
        "angle": 5,
        "period": 6.7,
        "phase": 1.5,
        "mode": "sway"
      },
      {
        "name": "right hair ornament",
        "pivot": [
          0.83,
          0.39
        ],
        "region": [
          0.78,
          0.29,
          1.18,
          1.06
        ],
        "angle": -4,
        "period": 7.7,
        "phase": 3.9,
        "mode": "sway"
      }
    ]
  },
  {
    "art": "canopy-destinations",
    "index": 3,
    "canvas": [
      768,
      768
    ],
    "rect": [
      483,
      311,
      138,
      139
    ],
    "pivot": [
      559.04,
      460.6400000000001
    ],
    "frames": [
      [
        13,
        780,
        230,
        232
      ],
      [
        269,
        780,
        230,
        232
      ]
    ],
    "phase": 9.62,
    "angle": 3.6,
    "period": 7.21,
    "blinkSafe": true,
    "blinkIoU": 0.9891,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "left flame",
        "pivot": [
          0.27,
          0.4
        ],
        "region": [
          -0.1,
          -0.17,
          0.39,
          0.48
        ],
        "angle": 5,
        "period": 4.9,
        "phase": 1,
        "mode": "sway"
      },
      {
        "name": "right flame",
        "pivot": [
          0.76,
          0.43
        ],
        "region": [
          0.63,
          -0.2,
          1.14,
          0.54
        ],
        "angle": -6,
        "period": 6.1,
        "phase": 3,
        "mode": "sway"
      }
    ]
  }
];
