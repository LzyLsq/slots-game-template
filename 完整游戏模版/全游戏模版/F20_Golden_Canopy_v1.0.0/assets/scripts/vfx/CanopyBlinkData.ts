export interface CanopyBlinkSpec { art: string; index: number; canvas: readonly number[]; eyes: readonly { rect: readonly number[]; frames: readonly (readonly number[])[] }[]; }
export const CANOPY_BLINKS: readonly CanopyBlinkSpec[] = [
  {
    "art": "canopy-destinations",
    "index": 0,
    "canvas": [
      1024,
      1024
    ],
    "eyes": [
      {
        "rect": [
          364,
          354,
          74,
          56
        ],
        "frames": [
          [
            2,
            2,
            74,
            56
          ],
          [
            130,
            2,
            74,
            56
          ]
        ]
      },
      {
        "rect": [
          452,
          347,
          48,
          56
        ],
        "frames": [
          [
            258,
            2,
            48,
            56
          ],
          [
            386,
            2,
            48,
            56
          ]
        ]
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
    "eyes": [
      {
        "rect": [
          462,
          338,
          68,
          74
        ],
        "frames": [
          [
            514,
            2,
            68,
            74
          ],
          [
            642,
            2,
            68,
            74
          ]
        ]
      },
      {
        "rect": [
          552,
          350,
          87,
          76
        ],
        "frames": [
          [
            770,
            2,
            87,
            76
          ],
          [
            898,
            2,
            87,
            76
          ]
        ]
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
    "eyes": [
      {
        "rect": [
          377,
          391,
          60,
          54
        ],
        "frames": [
          [
            2,
            130,
            60,
            54
          ],
          [
            130,
            130,
            60,
            54
          ]
        ]
      },
      {
        "rect": [
          471,
          389,
          49,
          51
        ],
        "frames": [
          [
            258,
            130,
            49,
            51
          ],
          [
            386,
            130,
            49,
            51
          ]
        ]
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
    "eyes": [
      {
        "rect": [
          467,
          270,
          80,
          70
        ],
        "frames": [
          [
            514,
            130,
            80,
            70
          ],
          [
            642,
            130,
            80,
            70
          ]
        ]
      },
      {
        "rect": [
          552,
          245,
          54,
          69
        ],
        "frames": [
          [
            770,
            130,
            54,
            69
          ],
          [
            898,
            130,
            54,
            69
          ]
        ]
      }
    ]
  },
  {
    "art": "golden-hour-tall",
    "index": -1,
    "canvas": [
      2048,
      4096
    ],
    "eyes": [
      {
        "rect": [
          997,
          810,
          71,
          64
        ],
        "frames": [
          [
            2,
            258,
            71,
            64
          ],
          [
            130,
            258,
            71,
            64
          ]
        ]
      },
      {
        "rect": [
          1108,
          832,
          50,
          63
        ],
        "frames": [
          [
            258,
            258,
            50,
            63
          ],
          [
            386,
            258,
            50,
            63
          ]
        ]
      }
    ]
  },
  {
    "art": "jade-treasury-tall",
    "index": -1,
    "canvas": [
      2048,
      4096
    ],
    "eyes": [
      {
        "rect": [
          973,
          1027,
          55,
          63
        ],
        "frames": [
          [
            514,
            258,
            55,
            63
          ],
          [
            642,
            258,
            55,
            63
          ]
        ]
      },
      {
        "rect": [
          1104,
          1035,
          37,
          67
        ],
        "frames": [
          [
            770,
            258,
            37,
            67
          ],
          [
            898,
            258,
            37,
            67
          ]
        ]
      }
    ]
  },
  {
    "art": "ruby-revel-tall",
    "index": -1,
    "canvas": [
      2048,
      4096
    ],
    "eyes": [
      {
        "rect": [
          945,
          834,
          58,
          60
        ],
        "frames": [
          [
            2,
            386,
            58,
            60
          ],
          [
            130,
            386,
            58,
            60
          ]
        ]
      },
      {
        "rect": [
          1055,
          829,
          51,
          58
        ],
        "frames": [
          [
            258,
            386,
            51,
            58
          ],
          [
            386,
            386,
            51,
            58
          ]
        ]
      }
    ]
  }
];
