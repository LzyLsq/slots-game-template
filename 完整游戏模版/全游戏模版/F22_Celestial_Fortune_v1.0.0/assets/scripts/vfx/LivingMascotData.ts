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
      281,
      169,
      190,
      209
    ],
    "pivot": [
      373.12,
      358.79999999999995
    ],
    "frames": [
      [
        22,
        12,
        211,
        232
      ],
      [
        278,
        12,
        211,
        232
      ]
    ],
    "phase": 6.82,
    "angle": 1.2,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.9975,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "beard",
        "pivot": [
          0.5,
          0.71
        ],
        "region": [
          0.18,
          0.67,
          0.84,
          1.27
        ],
        "angle": 4,
        "period": 6.8,
        "phase": 1.3,
        "mode": "sway"
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
      298,
      155,
      179,
      197
    ],
    "pivot": [
      410,
      347.2
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
    "phase": 7.65,
    "angle": 1.2,
    "period": 6.27,
    "blinkSafe": true,
    "blinkIoU": 0.988,
    "eyeState": "open",
    "blinkEnabled": true,
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
    "index": 2,
    "canvas": [
      1024,
      1024
    ],
    "rect": [
      314,
      113,
      178,
      178
    ],
    "pivot": [
      467.20000000000005,
      280.96000000000004
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
    "phase": 8.48,
    "angle": 1.2,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.993,
    "eyeState": "open",
    "blinkEnabled": true,
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
      1024,
      1024
    ],
    "rect": [
      194,
      294,
      278,
      205
    ],
    "pivot": [
      369.5999999999999,
      511.20000000000005
    ],
    "frames": [
      [
        12,
        810,
        232,
        171
      ],
      [
        268,
        810,
        232,
        171
      ]
    ],
    "phase": 9.31,
    "angle": 2,
    "period": 7.21,
    "blinkSafe": true,
    "blinkIoU": 0.9975,
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
  },
  {
    "art": "golden-hour-tall",
    "index": -1,
    "canvas": [
      2048,
      3584
    ],
    "rect": [
      936,
      956,
      176,
      239
    ],
    "pivot": [
      1027.76,
      1242.48
    ],
    "frames": [
      [
        42,
        1036,
        171,
        232
      ],
      [
        298,
        1036,
        171,
        232
      ]
    ],
    "phase": 10.14,
    "angle": 1.2,
    "period": 7.68,
    "blinkSafe": true,
    "blinkIoU": 0.9956,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "beard",
        "pivot": [
          0.5,
          0.71
        ],
        "region": [
          0.18,
          0.67,
          0.84,
          1.27
        ],
        "angle": 4,
        "period": 6.8,
        "phase": 1.3,
        "mode": "sway"
      }
    ]
  },
  {
    "art": "jade-treasury-tall",
    "index": -1,
    "canvas": [
      2048,
      3584
    ],
    "rect": [
      934,
      948,
      228,
      256
    ],
    "pivot": [
      1048.96,
      1211.04
    ],
    "frames": [
      [
        24,
        1292,
        207,
        232
      ],
      [
        280,
        1292,
        207,
        232
      ]
    ],
    "phase": 10.969999999999999,
    "angle": 1,
    "period": 8.149999999999999,
    "blinkSafe": true,
    "blinkIoU": 0.989,
    "eyeState": "open",
    "blinkEnabled": true,
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
    "art": "pearl-palace-tall",
    "index": -1,
    "canvas": [
      2048,
      3584
    ],
    "rect": [
      903,
      950,
      239,
      291
    ],
    "pivot": [
      1053.2,
      1265.2
    ],
    "frames": [
      [
        32,
        1548,
        191,
        232
      ],
      [
        288,
        1548,
        191,
        232
      ]
    ],
    "phase": 11.8,
    "angle": 1,
    "period": 8.62,
    "blinkSafe": true,
    "blinkIoU": 0.9746,
    "eyeState": "open",
    "blinkEnabled": true,
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
    "art": "ruby-revel-tall",
    "index": -1,
    "canvas": [
      2048,
      3584
    ],
    "rect": [
      949,
      887,
      192,
      253
    ],
    "pivot": [
      1061.6,
      1162.4
    ],
    "frames": [
      [
        40,
        1804,
        176,
        232
      ],
      [
        296,
        1804,
        176,
        232
      ]
    ],
    "phase": 12.629999999999999,
    "angle": 1.2,
    "period": 9.09,
    "blinkSafe": true,
    "blinkIoU": 0.9898,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "beard",
        "pivot": [
          0.5,
          0.71
        ],
        "region": [
          0.18,
          0.67,
          0.84,
          1.27
        ],
        "angle": 4,
        "period": 6.8,
        "phase": 1.3,
        "mode": "sway"
      }
    ]
  }
];
