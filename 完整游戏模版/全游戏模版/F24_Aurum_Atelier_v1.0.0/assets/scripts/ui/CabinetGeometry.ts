import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1536;export const CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {faces:readonly Box[];screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;status:Box;ink:string;titleIndex:number;}
// Each aperture measured from its final source painting; all components share one transform.
export const CABINETS:Record<GameId,CabinetGeometry>={
  "golden-hour": {
    "screen": [
      282,
      1053,
      458,
      340
    ],
    "title": [
      390,
      898,
      246,
      43
    ],
    "spin": [
      425,
      1508,
      175,
      90
    ],
    "minus": [
      120,
      1542,
      148,
      148
    ],
    "plus": [
      268,
      1542,
      148,
      148
    ],
    "auto": [
      664,
      1524,
      148,
      148
    ],
    "bet": [
      234,
      1479,
      148,
      50
    ],
    "status": [
      665,
      1624,
      148,
      46
    ],
    "balance": [
      313,
      1833,
      132,
      60
    ],
    "win": [
      451,
      1833,
      125,
      60
    ],
    "topWin": [
      584,
      1833,
      125,
      60
    ],
    "faces": [
      [
        425,
        1508,
        175,
        90
      ],
      [
        310,
        1551,
        57,
        50
      ],
      [
        231,
        1551,
        57,
        50
      ],
      [
        682,
        1540,
        77,
        58
      ]
    ],
    "ink": "#49321B",
    "titleIndex": 0
  },
  "jade-treasury": {
    "screen": [
      255,
      1085,
      534,
      272
    ],
    "title": [
      431,
      1001,
      190,
      34
    ],
    "spin": [
      441,
      1419,
      160,
      90
    ],
    "minus": [
      123,
      1466,
      148,
      148
    ],
    "plus": [
      271,
      1466,
      148,
      148
    ],
    "auto": [
      687,
      1454,
      148,
      148
    ],
    "bet": [
      225,
      1407,
      148,
      50
    ],
    "status": [
      684,
      1543,
      148,
      46
    ],
    "balance": [
      264,
      1710,
      159,
      60
    ],
    "win": [
      434,
      1710,
      159,
      60
    ],
    "topWin": [
      604,
      1710,
      159,
      60
    ],
    "faces": [
      [
        448,
        1432,
        149,
        59
      ],
      [
        309,
        1473,
        61,
        39
      ],
      [
        212,
        1473,
        61,
        39
      ],
      [
        713,
        1478,
        76,
        42
      ]
    ],
    "ink": "#49321B",
    "titleIndex": 1
  },
  "pearl-palace": {
    "screen": [
      244,
      1055,
      533,
      327
    ],
    "title": [
      380,
      925,
      262,
      44
    ],
    "spin": [
      425,
      1506,
      177,
      90
    ],
    "minus": [
      110,
      1546,
      148,
      148
    ],
    "plus": [
      258,
      1546,
      148,
      148
    ],
    "auto": [
      710,
      1532,
      148,
      148
    ],
    "bet": [
      187,
      1474,
      178,
      52
    ],
    "status": [
      709,
      1620,
      148,
      46
    ],
    "balance": [
      255,
      1778,
      158,
      58
    ],
    "win": [
      425,
      1778,
      158,
      58
    ],
    "topWin": [
      595,
      1778,
      170,
      58
    ],
    "faces": [
      [
        432,
        1517,
        168,
        53
      ],
      [
        274,
        1550,
        67,
        48
      ],
      [
        162,
        1550,
        67,
        48
      ],
      [
        747,
        1540,
        66,
        48
      ]
    ],
    "ink": "#49321B",
    "titleIndex": 2
  },
  "ruby-revel": {
    "screen": [
      285,
      1004,
      452,
      420
    ],
    "title": [
      423,
      822,
      176,
      40
    ],
    "spin": [
      424,
      1543,
      177,
      91
    ],
    "minus": [
      128,
      1612,
      148,
      148
    ],
    "plus": [
      276,
      1612,
      148,
      148
    ],
    "auto": [
      666,
      1600,
      148,
      148
    ],
    "bet": [
      206,
      1548,
      156,
      50
    ],
    "status": [
      667,
      1685,
      148,
      46
    ],
    "balance": [
      241,
      1825,
      170,
      64
    ],
    "win": [
      426,
      1825,
      170,
      64
    ],
    "topWin": [
      611,
      1825,
      170,
      64
    ],
    "faces": [
      [
        459,
        1544,
        106,
        52
      ],
      [
        283,
        1617,
        56,
        39
      ],
      [
        191,
        1617,
        56,
        39
      ],
      [
        698,
        1617,
        80,
        44
      ]
    ],
    "ink": "#49321B",
    "titleIndex": 3
  }
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Frame the cabinet at 135% of the room fit, then constrain its live controls. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.bet,g.topWin,g.status,
  ...[g.spin,g.minus,g.plus,g.auto].map(([x,y,w,h]):Box=>{
   const hitW=Math.max(148,w),hitH=Math.max(148,h);
   return [x+(w-hitW)/2,y+(h-hitH)/2,hitW,hitH];
  })];
 const top=1152-Math.min(680,...boxes.map(b=>b[1])); // Preserve the palace mascot above the title on every viewport.
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 // The integrated room may crop at the sides; controls keep an 8-unit edge gap.
 const scale=Math.min(cabinetScale(width,height)*1.35,(safeTop-safeBottom)/(top-bottom),(width-16)/(2*Math.max(512-left,right-512)));
 const y=(safeTop+safeBottom-(top+bottom)*scale)/2;
 return {scale,y};
}
