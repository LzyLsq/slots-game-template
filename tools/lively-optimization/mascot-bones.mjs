// Reviewed isolated alpha artwork. Coordinates are within each cropped head,
// never inferred from an opaque scene. Hats, eyes and facial identity stay rigid.
const bone=(name,pivot,region,angle=8,period=5.6,phase=0,mode='flick')=>({name,pivot,region,angle,period,phase,mode});
const pair=(left,right,angle=10)=>[
  bone('left ear',[.26,.43],left,angle,5.9,2.1),
  bone('right ear',[.76,.43],right,-angle*.85,7.1,4.3),
];
const fox=()=>pair([-.14,-.13,.44,.47],[.61,-.13,1.14,.47],13);
const roundEars=()=>pair([-.16,.10,.34,.57],[.70,.10,1.17,.57],9);
const rabbit=()=>[
  bone('left long ear',[.27,.50],[-.12,-.14,.51,.55],11,6.1,2.4),
  bone('right long ear',[.69,.50],[.53,-.12,1.17,.61],-9,7.3,4.8),
];
const jaw=()=>[bone('lower jaw',[.51,.74],[.24,.71,.89,1.18],1.6,6.8,1.2,'sway')];
const elephant=()=>[
  bone('left ear',[.29,.52],[-.18,.19,.39,1.16],9,6.2,1.8),
  bone('right ear',[.70,.54],[.71,.16,1.21,.82],-8,7.3,4.5),
  bone('trunk curl',[.74,.64],[.75,.31,1.21,.91],7,5.3,2.2,'sway'),
];
const bee=()=>[
  bone('left antenna',[.27,.34],[.05,-.2,.42,.38],12,5.8,1.7),
  bone('right antenna',[.75,.33],[.61,-.2,1.1,.37],-11,6.7,4.1),
];
const swan=()=>[bone('beak',[.68,.70],[.69,.55,1.20,1.08],3,6.3,1.4,'sway')];
const owl=()=>pair([-.17,-.05,.39,.40],[.64,-.05,1.2,.41],7);
const beard=()=>[bone('beard',[.50,.71],[.18,.67,.84,1.27],4,6.8,1.3,'sway')];
const hair=()=>[
  bone('left hair ornament',[.18,.40],[-.19,.31,.26,1.03],5,6.7,1.5,'sway'),
  bone('right hair ornament',[.83,.39],[.78,.29,1.18,1.06],-4,7.7,3.9,'sway'),
];
const types={fox,roundEars,rabbit,jaw,elephant,bee,swan,owl,beard,hair,
  genie:()=>[bone('hair tuft',[.39,.26],[.07,-.19,.65,.26],7,5.8,2,'sway')],
  jade:()=>[bone('left tassel',[.22,.27],[-.08,.07,.31,.49],6,7,1,'sway'),bone('right tassel',[.79,.28],[.73,.04,1.13,.52],-5,8,3,'sway')],
  flame:()=>[bone('left flame',[.27,.40],[-.10,-.17,.39,.48],5,4.9,1,'sway'),bone('right flame',[.76,.43],[.63,-.20,1.14,.54],-6,6.1,3,'sway')],
  bird:()=>[bone('beak',[.65,.62],[.61,.44,1.18,.88],2.4,6.2,1,'sway'),bone('crest',[.43,.24],[.21,-.14,.70,.33],4,7.1,2.4,'sway')],
};
// Row order follows prepared.json, visually checked against the alpha atlases.
const rows={
  15:['bee','bee','fox','fox'],17:['jaw','elephant','rabbit'],18:['roundEars','roundEars','jaw'],
  19:['roundEars','fox','roundEars','fox'],21:['roundEars','fox','swan','elephant','roundEars','fox','swan','elephant'],
  22:['beard','hair','hair','flame','beard','hair','hair','beard'],23:['genie','jade','hair','flame'],
  25:['owl','rabbit','roundEars','roundEars','owl','rabbit','roundEars','roundEars'],
  29:['fox','rabbit','jaw','bird','fox','rabbit','jaw','bird','fox','rabbit','jaw','bird'],
  20:['fox','rabbit','jaw','bird'],
};
export function bonesFor(id,index){const name=rows[id]?.[index];if(!name)throw Error(`Unreviewed bone row F${id}:${index}`);return types[name]();}
export const fullBodyBones={
  'salon-squirrel':[
    bone('tail',[.44,.76],[-.10,.06,.64,.83],4.8,5.9,1.3,'sway'),
    bone('left ear',[.69,.26],[.58,-.09,.82,.28],12,6.1,1.8),
    bone('right ear',[.91,.25],[.83,-.08,1.07,.26],-10,7.3,4.1),
    bone('chest',[.65,.87],[.42,.46,.89,.91],0,3.7,0,'breath'),
  ],
  'golden-hour-animal':[
    bone('tail',[.38,.57],[-.15,-.09,.59,.57],5,5.4,1,'sway'),
    bone('left ear',[.65,.28],[.56,-.03,.75,.30],12,6.3,1.8),
    bone('right ear',[.87,.29],[.81,.02,1.01,.30],-11,7.4,4.2),
    bone('chest',[.49,.94],[.26,.49,.67,.92],0,3.8,0,'breath'),
  ],
  'jade-treasury-animal':[
    bone('left long ear',[.36,.51],[-.13,-.15,.51,.54],12,6.2,1.9),
    bone('right long ear',[.68,.51],[.55,-.16,1.16,.53],-11,7.5,4.3),
    bone('chest',[.52,.96],[.30,.73,.83,.94],0,4.1,0,'breath'),
  ],
  'pearl-palace-animal':[
    bone('neck nod',[.69,.80],[.52,.13,1.08,.93],1.8,6.8,1,'sway'),
    bone('left flipper',[.28,.71],[.02,.70,.37,.91],3,7.1,3,'sway'),
  ],
  'ruby-revel-animal':[
    bone('left wing',[.28,.65],[-.21,.20,.36,1.03],7,5.7,1.2,'sway'),
    bone('right wing',[.72,.65],[.67,.22,1.22,1.03],-7,6.2,2.4,'sway'),
    bone('beak',[.52,.55],[.45,.44,.66,.76],2.3,6.7,1,'sway'),
  ],
};
