import type { MascotBone } from './ArticulatedMascot';
export interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }
export const LIVING_MASCOTS: readonly LivingMascotSpec[] = [
  {
    "art": "golden-hour-tall",
    "index": -1,
    "canvas": [
      2304,
      4608
    ],
    "rect": [
      894,
      728,
      539,
      396
    ],
    "pivot": [
      1137.92,
      1127.68
    ],
    "frames": [
      [
        12,
        43,
        232,
        170
      ],
      [
        268,
        43,
        232,
        170
      ]
    ],
    "phase": 5.89,
    "angle": 2.7,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.9931,
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
          -0.16,
          0.1,
          0.34,
          0.57
        ],
        "angle": 9,
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
          0.7,
          0.1,
          1.17,
          0.57
        ],
        "angle": -7.6499999999999995,
        "period": 7.1,
        "phase": 4.3,
        "mode": "flick"
      }
    ]
  },
  {
    "art": "jade-treasury-tall",
    "index": -1,
    "canvas": [
      2304,
      4608
    ],
    "rect": [
      981,
      817,
      442,
      437
    ],
    "pivot": [
      1185.76,
      1227.84
    ],
    "frames": [
      [
        12,
        269,
        232,
        229
      ],
      [
        268,
        269,
        232,
        229
      ]
    ],
    "phase": 6.72,
    "angle": 3.6,
    "period": 6.27,
    "blinkSafe": true,
    "blinkIoU": 0.9926,
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
    "art": "pearl-palace-tall",
    "index": -1,
    "canvas": [
      2304,
      4608
    ],
    "rect": [
      925,
      831,
      389,
      368
    ],
    "pivot": [
      1149.6,
      1214.4
    ],
    "frames": [
      [
        12,
        530,
        232,
        219
      ],
      [
        268,
        530,
        232,
        219
      ]
    ],
    "phase": 7.55,
    "angle": 3.6,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.9904,
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
          -0.16,
          0.1,
          0.34,
          0.57
        ],
        "angle": 9,
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
          0.7,
          0.1,
          1.17,
          0.57
        ],
        "angle": -7.6499999999999995,
        "period": 7.1,
        "phase": 4.3,
        "mode": "flick"
      }
    ]
  },
  {
    "art": "ruby-revel-tall",
    "index": -1,
    "canvas": [
      2304,
      4608
    ],
    "rect": [
      843,
      790,
      627,
      489
    ],
    "pivot": [
      1150.72,
      1310.72
    ],
    "frames": [
      [
        12,
        805,
        232,
        181
      ],
      [
        268,
        805,
        232,
        181
      ]
    ],
    "phase": 8.379999999999999,
    "angle": 2.6,
    "period": 7.21,
    "blinkSafe": true,
    "blinkIoU": 0.9966,
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
  }
];
