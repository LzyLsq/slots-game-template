import type { MascotBone } from './ArticulatedMascot';
export interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }
export const LIVING_MASCOTS: readonly LivingMascotSpec[] = [
  {
    "art": "harvest-card-0",
    "index": -1,
    "canvas": [
      593,
      588
    ],
    "rect": [
      76,
      28,
      179,
      236
    ],
    "pivot": [
      161.12,
      252.96
    ],
    "frames": [
      [
        40,
        12,
        176,
        232
      ],
      [
        296,
        12,
        176,
        232
      ]
    ],
    "phase": 4.65,
    "angle": 2.4,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.9886,
    "eyeState": "open",
    "blinkEnabled": true,
    "bones": [
      {
        "name": "left antenna",
        "pivot": [
          0.27,
          0.34
        ],
        "region": [
          0.05,
          -0.2,
          0.42,
          0.38
        ],
        "angle": 12,
        "period": 5.8,
        "phase": 1.7,
        "mode": "flick"
      },
      {
        "name": "right antenna",
        "pivot": [
          0.75,
          0.33
        ],
        "region": [
          0.61,
          -0.2,
          1.1,
          0.37
        ],
        "angle": -11,
        "period": 6.7,
        "phase": 4.1,
        "mode": "flick"
      }
    ]
  },
  {
    "art": "golden-hour-tall",
    "index": -1,
    "canvas": [
      1920,
      3456
    ],
    "rect": [
      771,
      202,
      375,
      371
    ],
    "pivot": [
      957,
      554
    ],
    "frames": [
      [
        12,
        269,
        232,
        230
      ],
      [
        268,
        269,
        232,
        230
      ]
    ],
    "phase": 5.48,
    "angle": 2,
    "period": 6.27,
    "blinkSafe": true,
    "blinkIoU": 0.9879,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "left antenna",
        "pivot": [
          0.27,
          0.34
        ],
        "region": [
          0.05,
          -0.2,
          0.42,
          0.38
        ],
        "angle": 12,
        "period": 5.8,
        "phase": 1.7,
        "mode": "flick"
      },
      {
        "name": "right antenna",
        "pivot": [
          0.75,
          0.33
        ],
        "region": [
          0.61,
          -0.2,
          1.1,
          0.37
        ],
        "angle": -11,
        "period": 6.7,
        "phase": 4.1,
        "mode": "flick"
      }
    ]
  },
  {
    "art": "ruby-revel-tall",
    "index": -1,
    "canvas": [
      1920,
      3456
    ],
    "rect": [
      797,
      101,
      409,
      465
    ],
    "pivot": [
      988.8,
      541.2
    ],
    "frames": [
      [
        26,
        524,
        204,
        232
      ],
      [
        282,
        524,
        204,
        232
      ]
    ],
    "phase": 6.3100000000000005,
    "angle": 2,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.9967,
    "eyeState": "closed",
    "blinkEnabled": false,
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
    "art": "harvest-card-3",
    "index": -1,
    "canvas": [
      593,
      594
    ],
    "rect": [
      257,
      17,
      181,
      172
    ],
    "pivot": [
      323.46,
      190.94
    ],
    "frames": [
      [
        12,
        786,
        232,
        220
      ],
      [
        268,
        786,
        232,
        220
      ]
    ],
    "phase": 7.140000000000001,
    "angle": 3.6,
    "period": 7.21,
    "blinkSafe": true,
    "blinkIoU": 0.9932,
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
  }
];
