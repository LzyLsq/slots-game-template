// Each suite is a material/gesture design, not a pitch or playback-rate preset.
// Labels describe sound-design intent, not a claim of original field recording.
const I = (name) => `impact/${name}`;
const R = (name) => `rpg/${name}`;
const C = (name) => `casino/${name}`;
export const themedFeedbackRevision = 'theme-material-motifs-original-speed-20261010';
export const themedFeedbackProfiles = [
  {id:13,label:'Harvest: seed pods, timber and coin basket',zh:'丰收：木质、种荚轻扣、金币篮',family:'PIZZI',
   touch:[I('impactWood_light_000'),I('impactWood_light_001'),I('impactWood_light_002')],gesture:[R('cloth1'),I('footstep_grass_000')],treasure:[C('chips-handle-1'),C('chips-stack-1')]},
  {id:14,label:'Cloud Crown: silk swish and softened crystal',zh:'云冠：丝绸轻拂、柔和晶莹轻敲',family:'STEEL',
   touch:[I('impactGlass_light_000'),I('impactGlass_light_001'),I('impactSoft_medium_000')],gesture:[R('cloth2'),R('cloth3')],treasure:[C('chips-stack-1'),C('chips-collide-1')]},
  {id:15,label:'Honey Parade: padded bounce and little hive taps',zh:'蜂蜜：柔软弹性、蜂巢小木扣',family:'PIZZI',
   touch:[I('impactSoft_medium_001'),I('impactWood_light_003'),I('impactSoft_medium_002')],gesture:[R('cloth4'),R('clothBelt')],treasure:[C('chips-handle-3'),C('chips-stack-2')]},
  {id:16,label:'Jamboree: toy drum taps and festive treasure',zh:'宝藏嘉年华：玩具鼓点、轻快宝物碰响',family:'STEEL',
   touch:[I('impactTin_medium_000'),I('impactSoft_medium_003'),I('impactWood_light_004')],gesture:[R('clothBelt2'),C('card-fan-1')],treasure:[C('chips-collide-2'),C('chips-stack-3')]},
  {id:17,label:'Caravan: leather pouch, wooden chest and coins',zh:'商队：皮革钱袋、木箱、金币',family:'PIZZI',
   touch:[R('handleSmallLeather'),I('impactWood_medium_000'),R('dropLeather')],gesture:[R('beltHandle1'),R('handleSmallLeather2')],treasure:[R('handleCoins2'),C('chips-stack-4')]},
  {id:18,label:'Express: upholstered latch and brass mechanism',zh:'金色列车：软垫扣合、黄铜机械',family:'SAX',
   touch:[R('metalLatch'),I('impactMetal_light_000'),I('impactSoft_medium_004')],gesture:[R('beltHandle2'),C('card-slide-2')],treasure:[C('chips-stack-5'),C('chips-collide-3')]},
  {id:19,label:'Treasury: rounded vault latch and coin stacks',zh:'金库：厚实圆润的金属锁扣、金币叠放',family:'SAX',
   touch:[I('impactMetal_light_001'),R('metalClick'),I('impactPlate_light_000')],gesture:[C('card-slide-3'),R('clothBelt')],treasure:[C('chips-stack-6'),R('handleCoins')]},
  {id:20,label:'Canopy: leafy rustle, acorn wood and treasure',zh:'森林：叶片轻响、橡果木扣、宝物',family:'PIZZI',
   touch:[I('impactWood_light_001'),I('impactWood_medium_001'),I('impactGeneric_light_000')],gesture:[I('footstep_grass_001'),R('cloth3')],treasure:[C('chips-handle-4'),R('handleCoins2')]},
  {id:21,label:'Royal Jubilee: satin and warm porcelain taps',zh:'皇家庆典：绸缎、温润瓷器轻敲',family:'STEEL',
   touch:[I('impactPlate_light_001'),I('impactGlass_light_002'),I('impactPlate_medium_000')],gesture:[R('cloth2'),C('card-fan-2')],treasure:[C('chips-stack-3'),C('chips-collide-4')]},
  {id:22,label:'Celestial: crystal detail and airy fabric sweep',zh:'星空：晶莹细节、轻盈拂动',family:'STEEL',
   touch:[I('impactGlass_light_003'),I('impactPlate_light_002'),I('impactGeneric_light_001')],gesture:[R('cloth4'),C('card-slide-4')],treasure:[C('chips-handle-5'),C('chips-stack-6')]},
  {id:23,label:'Golden Lamp: lamp brass, silk and treasure pouch',zh:'神灯：灯盏黄铜、丝绸、宝袋',family:'PIZZI',
   touch:[I('impactMetal_light_002'),R('metalPot1'),I('impactSoft_medium_001')],gesture:[R('clothBelt2'),R('handleSmallLeather')],treasure:[R('handleCoins'),C('chips-handle-6')]},
  {id:24,label:'Atelier: delicate workshop tools and small metal pieces',zh:'金饰工坊：精细工具轻扣、小金属件',family:'SAX',
   touch:[I('impactMetal_light_003'),I('impactPlate_light_003'),I('impactTin_medium_001')],gesture:[C('card-slide-5'),R('cloth1')],treasure:[C('chips-collide-1'),C('chips-handle-1')]},
  {id:25,label:'Velvet: cloth-covered buttons and soft leather',zh:'丝绒：布面按键、柔软皮革',family:'SAX',
   touch:[I('impactSoft_medium_002'),R('handleSmallLeather2'),I('impactGeneric_light_002')],gesture:[R('clothBelt'),R('cloth2')],treasure:[C('chips-handle-2'),C('chip-lay-1')]},
  {id:26,label:'Tides: rounded shell-like clicks and steel-drum phrases',zh:'海潮：贝壳般圆润轻敲、钢鼓短句',family:'STEEL',
   touch:[I('impactPlate_light_004'),I('impactGlass_light_004'),I('impactSoft_medium_003')],gesture:[R('cloth3'),C('card-slide-6')],treasure:[C('chips-stack-2'),C('chips-handle-3')]},
  {id:27,label:'Sovereign: polished mint latch and dense coin detail',zh:'财富：抛光金属锁扣、扎实金币细节',family:'SAX',
   touch:[I('impactMetal_light_004'),I('impactTin_medium_002'),I('impactPlate_light_004')],gesture:[R('beltHandle2'),C('card-slide-7')],treasure:[C('chips-collide-3'),C('chips-stack-5')]},
  {id:28,label:'Regatta: ship timber, rope-like cloth and treasure chest',zh:'帆船：船木、绳索般的布料摩擦、宝箱',family:'STEEL',
   touch:[I('impactWood_light_002'),I('impactPlank_medium_000'),I('impactWood_medium_002')],gesture:[R('clothBelt2'),R('beltHandle1')],treasure:[C('chips-collide-4'),C('chip-lay-2')]},
  {id:29,label:'Jade Lantern: jade-like porcelain and paper folds',zh:'玉灯庭院：温润瓷玉感、纸面轻折',family:'PIZZI',
   touch:[I('impactGlass_light_001'),I('impactPlate_medium_001'),I('impactGlass_medium_000')],gesture:[R('bookFlip1'),R('cloth1')],treasure:[C('chips-stack-4'),C('chips-handle-4')]},
  {id:30,label:'Clockwork: precise latch, ticks and wooden gears',zh:'发条：精准锁扣、齿轮轻嗒、木质传动',family:'PIZZI',
   touch:[R('metalClick'),I('impactTin_medium_003'),I('impactWood_light_003')],gesture:[R('metalLatch'),C('card-slide-8')],treasure:[C('chip-lay-1'),C('chip-lay-3')]},
  {id:31,label:'Carnival: padded spring bounce and toy accents',zh:'嘉年华：软垫弹跳、玩具式轻快敲击',family:'SAX',
   touch:[I('impactSoft_medium_004'),I('impactTin_medium_004'),I('impactGeneric_light_003')],gesture:[C('card-fan-2'),R('cloth4')],treasure:[C('chips-handle-6'),C('chips-handle-5')]},
  {id:33,label:'Library: page turns, book binding and gentle desk taps',zh:'图书馆：翻页、书脊、轻叩书桌',family:'PIZZI',
   touch:[R('bookPlace1'),R('bookPlace2'),I('impactWood_medium_003')],gesture:[R('bookFlip2'),R('bookFlip3')],treasure:[C('chip-lay-2'),C('chips-collide-2')]},
];
// Keep the dominant material unique for each corresponding hit/count action,
// not merely a faint secondary accent beneath an otherwise identical sample.
for(const field of ['touch','treasure'])for(let n=0;n<(field==='touch'?3:2);n++){
 if(new Set(themedFeedbackProfiles.map(p=>p[field][n])).size!==themedFeedbackProfiles.length)throw Error(`Repeated dominant ${field}[${n}] material`);
}
