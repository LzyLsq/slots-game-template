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
      389,
      209,
      270,
      278
    ],
    "pivot": [
      521.28,
      465.59999999999997
    ],
    "frames": [
      [
        15,
        12,
        225,
        232
      ],
      [
        271,
        12,
        225,
        232
      ]
    ],
    "phase": 6.51,
    "angle": 3.6,
    "period": 5.8,
    "blinkSafe": true,
    "blinkIoU": 0.9938,
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
    "art": "canopy-destinations",
    "index": 1,
    "canvas": [
      1024,
      1024
    ],
    "rect": [
      496,
      311,
      253,
      278
    ],
    "pivot": [
      613.5999999999999,
      614.8
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
    "phase": 7.34,
    "angle": 3.6,
    "period": 6.27,
    "blinkSafe": true,
    "blinkIoU": 0.9898,
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
    "index": 2,
    "canvas": [
      1024,
      1024
    ],
    "rect": [
      477,
      266,
      161,
      179
    ],
    "pivot": [
      586.72,
      427.20000000000005
    ],
    "frames": [
      [
        23,
        524,
        209,
        232
      ],
      [
        279,
        524,
        209,
        232
      ]
    ],
    "phase": 8.17,
    "angle": 2,
    "period": 6.74,
    "blinkSafe": true,
    "blinkIoU": 0.9965,
    "eyeState": "open",
    "blinkEnabled": true,
    "bones": [
      {
        "name": "beak",
        "pivot": [
          0.68,
          0.7
        ],
        "region": [
          0.69,
          0.55,
          1.2,
          1.08
        ],
        "angle": 3,
        "period": 6.3,
        "phase": 1.4,
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
      271,
      230,
      431,
      326
    ],
    "pivot": [
      478.4000000000001,
      517.5999999999999
    ],
    "frames": [
      [
        12,
        808,
        232,
        175
      ],
      [
        268,
        808,
        232,
        175
      ]
    ],
    "phase": 9,
    "angle": 2.4,
    "period": 7.21,
    "blinkSafe": false,
    "blinkIoU": 0.9258,
    "eyeState": "open",
    "blinkEnabled": false,
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
    "art": "golden-hour-tall",
    "index": -1,
    "canvas": [
      2765,
      4147
    ],
    "rect": [
      1200,
      1049,
      375,
      338
    ],
    "pivot": [
      1389.6,
      1374.4
    ],
    "frames": [
      [
        12,
        1047,
        232,
        209
      ],
      [
        268,
        1047,
        232,
        209
      ]
    ],
    "phase": 9.83,
    "angle": 2.4,
    "period": 7.68,
    "blinkSafe": true,
    "blinkIoU": 0.9896,
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
      2765,
      4147
    ],
    "rect": [
      1220,
      993,
      319,
      326
    ],
    "pivot": [
      1404.8,
      1330
    ],
    "frames": [
      [
        14,
        1292,
        227,
        232
      ],
      [
        270,
        1292,
        227,
        232
      ]
    ],
    "phase": 10.66,
    "angle": 2.4,
    "period": 8.149999999999999,
    "blinkSafe": true,
    "blinkIoU": 0.991,
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
    "art": "pearl-palace-tall",
    "index": -1,
    "canvas": [
      2765,
      4147
    ],
    "rect": [
      1320,
      986,
      268,
      354
    ],
    "pivot": [
      1396.48,
      1310.24
    ],
    "frames": [
      [
        40,
        1548,
        176,
        232
      ],
      [
        296,
        1548,
        176,
        232
      ]
    ],
    "phase": 11.489999999999998,
    "angle": 1.2,
    "period": 8.62,
    "blinkSafe": true,
    "blinkIoU": 0.9909,
    "eyeState": "closed",
    "blinkEnabled": false,
    "bones": [
      {
        "name": "beak",
        "pivot": [
          0.68,
          0.7
        ],
        "region": [
          0.69,
          0.55,
          1.2,
          1.08
        ],
        "angle": 3,
        "period": 6.3,
        "phase": 1.4,
        "mode": "sway"
      }
    ]
  },
  {
    "art": "ruby-revel-tall",
    "index": -1,
    "canvas": [
      2765,
      4147
    ],
    "rect": [
      1128,
      875,
      509,
      392
    ],
    "pivot": [
      1396.2,
      1327.6
    ],
    "frames": [
      [
        12,
        1830,
        232,
        179
      ],
      [
        268,
        1830,
        232,
        179
      ]
    ],
    "phase": 12.32,
    "angle": 2,
    "period": 9.09,
    "blinkSafe": true,
    "blinkIoU": 0.9852,
    "eyeState": "closed",
    "blinkEnabled": false,
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
  }
];
