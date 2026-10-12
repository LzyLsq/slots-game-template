import type { MascotBone } from './ArticulatedMascot';
export const FULL_BODY_BONES: Record<string, readonly MascotBone[]> = {
  "salon-squirrel": [
    {
      "name": "tail",
      "pivot": [
        0.44,
        0.76
      ],
      "region": [
        -0.1,
        0.06,
        0.64,
        0.83
      ],
      "angle": 4.8,
      "period": 5.9,
      "phase": 1.3,
      "mode": "sway"
    },
    {
      "name": "left ear",
      "pivot": [
        0.69,
        0.26
      ],
      "region": [
        0.58,
        -0.09,
        0.82,
        0.28
      ],
      "angle": 12,
      "period": 6.1,
      "phase": 1.8,
      "mode": "flick"
    },
    {
      "name": "right ear",
      "pivot": [
        0.91,
        0.25
      ],
      "region": [
        0.83,
        -0.08,
        1.07,
        0.26
      ],
      "angle": -10,
      "period": 7.3,
      "phase": 4.1,
      "mode": "flick"
    },
    {
      "name": "chest",
      "pivot": [
        0.65,
        0.87
      ],
      "region": [
        0.42,
        0.46,
        0.89,
        0.91
      ],
      "angle": 0,
      "period": 3.7,
      "phase": 0,
      "mode": "breath"
    }
  ],
  "golden-hour-animal": [
    {
      "name": "tail",
      "pivot": [
        0.38,
        0.57
      ],
      "region": [
        -0.15,
        -0.09,
        0.59,
        0.57
      ],
      "angle": 5,
      "period": 5.4,
      "phase": 1,
      "mode": "sway"
    },
    {
      "name": "left ear",
      "pivot": [
        0.65,
        0.28
      ],
      "region": [
        0.56,
        -0.03,
        0.75,
        0.3
      ],
      "angle": 12,
      "period": 6.3,
      "phase": 1.8,
      "mode": "flick"
    },
    {
      "name": "right ear",
      "pivot": [
        0.87,
        0.29
      ],
      "region": [
        0.81,
        0.02,
        1.01,
        0.3
      ],
      "angle": -11,
      "period": 7.4,
      "phase": 4.2,
      "mode": "flick"
    },
    {
      "name": "chest",
      "pivot": [
        0.49,
        0.94
      ],
      "region": [
        0.26,
        0.49,
        0.67,
        0.92
      ],
      "angle": 0,
      "period": 3.8,
      "phase": 0,
      "mode": "breath"
    }
  ],
  "jade-treasury-animal": [
    {
      "name": "left long ear",
      "pivot": [
        0.36,
        0.51
      ],
      "region": [
        -0.13,
        -0.15,
        0.51,
        0.54
      ],
      "angle": 12,
      "period": 6.2,
      "phase": 1.9,
      "mode": "flick"
    },
    {
      "name": "right long ear",
      "pivot": [
        0.68,
        0.51
      ],
      "region": [
        0.55,
        -0.16,
        1.16,
        0.53
      ],
      "angle": -11,
      "period": 7.5,
      "phase": 4.3,
      "mode": "flick"
    },
    {
      "name": "chest",
      "pivot": [
        0.52,
        0.96
      ],
      "region": [
        0.3,
        0.73,
        0.83,
        0.94
      ],
      "angle": 0,
      "period": 4.1,
      "phase": 0,
      "mode": "breath"
    }
  ],
  "pearl-palace-animal": [
    {
      "name": "neck nod",
      "pivot": [
        0.69,
        0.8
      ],
      "region": [
        0.52,
        0.13,
        1.08,
        0.93
      ],
      "angle": 1.8,
      "period": 6.8,
      "phase": 1,
      "mode": "sway"
    },
    {
      "name": "left flipper",
      "pivot": [
        0.28,
        0.71
      ],
      "region": [
        0.02,
        0.7,
        0.37,
        0.91
      ],
      "angle": 3,
      "period": 7.1,
      "phase": 3,
      "mode": "sway"
    }
  ],
  "ruby-revel-animal": [
    {
      "name": "left wing",
      "pivot": [
        0.28,
        0.65
      ],
      "region": [
        -0.21,
        0.2,
        0.36,
        1.03
      ],
      "angle": 7,
      "period": 5.7,
      "phase": 1.2,
      "mode": "sway"
    },
    {
      "name": "right wing",
      "pivot": [
        0.72,
        0.65
      ],
      "region": [
        0.67,
        0.22,
        1.22,
        1.03
      ],
      "angle": -7,
      "period": 6.2,
      "phase": 2.4,
      "mode": "sway"
    },
    {
      "name": "beak",
      "pivot": [
        0.52,
        0.55
      ],
      "region": [
        0.45,
        0.44,
        0.66,
        0.76
      ],
      "angle": 2.3,
      "period": 6.7,
      "phase": 1,
      "mode": "sway"
    }
  ]
};
