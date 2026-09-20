// Symbol ids keep their mathematical meaning; artwork and names belong to each voyage.
const names = {
  "mint": [
    [
      "Doubloons",
      "Treasure map",
      "Captain telescope",
      "Ruby cutlass",
      "Ship wheel",
      "Pirate chest",
      "Ruby wild star",
      "Treasure ship"
    ],
    [
      "金币",
      "藏宝图",
      "船长望远镜",
      "红宝弯刀",
      "金舵",
      "海盗宝箱",
      "红宝百搭星",
      "宝船"
    ],
    [
      "金幣",
      "藏寶圖",
      "船長望遠鏡",
      "紅寶彎刀",
      "金舵",
      "海盜寶箱",
      "紅寶百搭星",
      "寶船"
    ],
    [
      "金貨",
      "宝の地図",
      "船長の望遠鏡",
      "宝石の剣",
      "金の舵",
      "海賊の宝箱",
      "ワイルド星",
      "宝船"
    ],
    [
      "금화",
      "보물 지도",
      "선장 망원경",
      "루비 검",
      "황금 조타륜",
      "해적 보물상자",
      "와일드 별",
      "보물선"
    ]
  ],
  "pearl": [
    [
      "Pearl medallion",
      "Pearl shell",
      "Ocean tiara",
      "Sapphire perfume",
      "Pearl necklace",
      "Ivory jewel box",
      "Pearl wild star",
      "Golden trident"
    ],
    [
      "珍珠徽章",
      "珠光贝壳",
      "海蓝王冠",
      "蓝宝香瓶",
      "珍珠项链",
      "象牙宝匣",
      "珍珠百搭星",
      "黄金三叉戟"
    ],
    [
      "珍珠徽章",
      "珠光貝殼",
      "海藍王冠",
      "藍寶香瓶",
      "珍珠項鏈",
      "象牙寶匣",
      "珍珠百搭星",
      "黃金三叉戟"
    ],
    [
      "真珠の紋章",
      "真珠貝",
      "海のティアラ",
      "サファイアの香水",
      "真珠の首飾り",
      "象牙の宝石箱",
      "真珠ワイルド星",
      "金の三叉槍"
    ],
    [
      "진주 메달",
      "진주 조개",
      "바다 티아라",
      "사파이어 향수",
      "진주 목걸이",
      "상아 보석함",
      "진주 와일드 별",
      "황금 삼지창"
    ]
  ],
  "reef": [
    [
      "Amber",
      "Sea glass",
      "Emerald crystal",
      "Ruby crystal",
      "Amethyst geode",
      "Coral treasure",
      "Crystal star",
      "Nautilus"
    ],
    [
      "琥珀",
      "海玻璃",
      "翡翠晶簇",
      "红宝晶簇",
      "紫晶洞",
      "珊瑚宝篮",
      "水晶星",
      "鹦鹉螺"
    ],
    [
      "琥珀",
      "海玻璃",
      "翡翠晶簇",
      "紅寶晶簇",
      "紫晶洞",
      "珊瑚寶籃",
      "水晶星",
      "鸚鵡螺"
    ],
    [
      "琥珀",
      "シーグラス",
      "エメラルド結晶",
      "ルビー結晶",
      "紫水晶",
      "サンゴの宝籠",
      "水晶の星",
      "オウムガイ"
    ],
    [
      "호박",
      "바다 유리",
      "에메랄드 결정",
      "루비 결정",
      "자수정",
      "산호 보물",
      "수정 별",
      "앵무조개"
    ]
  ],
  "beacon": [
    [
      "Sun coin",
      "Brass lantern",
      "Vault key",
      "Amber spyglass",
      "Nautical watch",
      "Gold vault",
      "Golden star",
      "Lighthouse"
    ],
    [
      "太阳金币",
      "黄铜灯",
      "金库钥匙",
      "琥珀望远镜",
      "航海怀表",
      "黄金宝库",
      "金星",
      "灯塔"
    ],
    [
      "太陽金幣",
      "黃銅燈",
      "金庫鑰匙",
      "琥珀望遠鏡",
      "航海懷錶",
      "黃金寶庫",
      "金星",
      "燈塔"
    ],
    [
      "太陽の金貨",
      "真鍮のランプ",
      "金庫の鍵",
      "琥珀の望遠鏡",
      "航海の懐中時計",
      "黄金の金庫",
      "金の星",
      "灯台"
    ],
    [
      "태양 금화",
      "황동 램프",
      "금고 열쇠",
      "호박 망원경",
      "항해 회중시계",
      "황금 금고",
      "황금 별",
      "등대"
    ]
  ]
};
const languages = ["en","zh","zh-Hant","ja","ko"];
export const symbolPath = (mode, id) => `/art/symbols/${mode}/${id}-crafted30.png`;
export const symbolName = (mode, id, lang="en") => names[mode][Math.max(0,languages.indexOf(lang))][id];
