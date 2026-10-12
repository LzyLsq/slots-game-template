import type { MascotBone } from './ArticulatedMascot';
export interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }
export const LIVING_MASCOTS: readonly LivingMascotSpec[] = [
  {
    "art": "golden-hour-tall",
    "index": -1,
    "canvas": [
      1920,
      3456
    ],
    "rect": [
      423,
      697,
      335,
      325
    ],
    "pivot": [
      599.52,
      1028.6399999999999
    ],
    "frames": [
      [
        12,
        15,
        232,
        225
      ],
      [
        268,
        15,
        232,
        225
      ]
    ],
    "phase": 5.58,
    "angle": 3.6,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.9968,
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
    "art": "jade-treasury-tall",
    "index": -1,
    "canvas": [
      1920,
      3456
    ],
    "rect": [
      843,
      590,
      420,
      349
    ],
    "pivot": [
      1030.4,
      929.6
    ],
    "frames": [
      [
        12,
        287,
        232,
        193
      ],
      [
        268,
        287,
        232,
        193
      ]
    ],
    "phase": 6.41,
    "angle": 3.6,
    "period": 6.27,
    "blinkSafe": true,
    "blinkIoU": 0.9888,
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
    "art": "pearl-palace-tall",
    "index": -1,
    "canvas": [
      1920,
      3456
    ],
    "rect": [
      940,
      605,
      247,
      238
    ],
    "pivot": [
      1070.08,
      856.3199999999999
    ],
    "frames": [
      [
        12,
        528,
        232,
        224
      ],
      [
        268,
        528,
        232,
        224
      ]
    ],
    "phase": 7.24,
    "angle": 3.6,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.9967,
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
  }
];
