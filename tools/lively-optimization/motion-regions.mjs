// Authored regions after reviewing source art. [cx,cy,rx,ry, radians, lift, period, phase].
// y=0 is the top of the artwork. Broad masks include both ears/wings, with soft boundaries.
const r=(x,y,rx,ry,a=.022,l=.004,p=5.8,phase=0)=>[x,y,rx,ry,a,l,p,phase];
const tops=(centers,rx=.18,ry=.09)=>Object.fromEntries(['golden-hour','jade-treasury','pearl-palace','ruby-revel'].map((s,i)=>[s+'-tall',[r(...centers[i],rx,ry,.022,.0035,5.5+i*.7,i*.9)]]));
const atlas=(cx=.5,cy=.36,rx=.36,ry=.30)=>[r(cx,cy,rx,ry,.018,.004,6.4)];
export const legacyMotionRegions={
  13:{...tops([[.50,.70],[.50,.72],[.50,.70],[.50,.70]],.16,.09), 'harvest-card-0':atlas(.48,.45,.38,.38),'harvest-card-1':atlas(),'harvest-card-2':atlas(),'harvest-card-3':atlas()},
  14:{...tops([[.50,.055],[.50,.06],[.50,.055],[.50,.055]],.24,.052), 'harvest-hall-soft':[r(.27,.15,.25,.09,.018,.004,7),r(.76,.36,.22,.085,.016,.003,8.1,1.4),r(.28,.55,.24,.10,.014,.0025,7.8,2.4),r(.72,.72,.21,.09,.014,.003,9.2,4.1)],...Object.fromEntries([0,1,2,3].map(i=>['harvest-card-'+i,atlas(.5,.39,.46,.37)]))},
  15:{...tops([[.51,.15],[.52,.15],[.49,.13],[.50,.14]],.23,.08),...Object.fromEntries([0,1,2,3].map(i=>['harvest-card-'+i,atlas(.48,.31,.44,.30)]))},
  16:{...tops([[.50,.13],[.50,.12],[.50,.13],[.50,.13]],.20,.075),'jamboree-plaza':[r(.24,.30,.19,.15,.010,.003,7.2),r(.72,.48,.19,.14,.010,.003,8.2,2)]},
  17:{...tops([[.50,.235],[.50,.24],[.50,.235],[.50,.24]],.29,.065),'caravan-card-0':atlas(.49,.32,.30,.30),'caravan-card-1':atlas(),'caravan-card-2':atlas(),'caravan-card-3':atlas(),'salon':[r(.75,.70,.24,.18,.018,.0025,6.7)]},
  18:{...tops([[.315,.29],[.56,.25],[.55,.235],[.50,.22]],.19,.11),'salon':[r(.38,.37,.16,.17,.017,.0035,6.8)]},
  19:{...tops([[.50,.235],[.50,.25],[.50,.25],[.50,.23]],.23,.13),'treasury-hall-soft':[r(.315,.39,.15,.085,.026,.0025,6),r(.72,.39,.15,.085,.022,.0025,7.1,1),r(.315,.55,.15,.085,.024,.0025,6.7,2),r(.72,.55,.15,.085,.020,.0025,7.8,3)],'salon':[r(.83,.45,.16,.12,.024,.003,6.7)]},
  21:{...tops([[.50,.31],[.50,.30],[.50,.30],[.50,.30]],.21,.12),'canopy-destinations':atlas(.49,.38,.32,.31),'salon':[r(.91,.23,.12,.14,.022,.0035,7)]},
  22:{...tops([[.50,.33],[.50,.33],[.50,.335],[.50,.325]],.16,.062),'canopy-destinations':atlas(.49,.34,.37,.31),'salon':[r(.81,.20,.19,.18,.016,.003,7.4)]},
  23:{...tops([[.50,.105],[.50,.11],[.50,.105],[.50,.105]],.24,.085),'canopy-destinations':atlas(.5,.32,.36,.30)},
  24:{...tops([[.50,.28],[.50,.35],[.50,.31],[.50,.10]],.18,.045),'canopy-destinations':atlas(.50,.40,.40,.33)},
  25:{'hero0':[r(.32,.43,.29,.49,.018,.005,6.1)],'hero1':[r(.5,.43,.35,.49,.020,.005,6.9)],'hero2':[r(.46,.47,.35,.46,.018,.004,7.6)],'hero3':[r(.5,.45,.44,.48,.020,.005,6.7)],'cabinetMotion0':[r(.30,.16,.23,.12,.019,.003,6.1)],'cabinetMotion1':[r(.5,.15,.30,.12,.020,.003,6.9)],'cabinetMotion2':[r(.5,.15,.34,.12,.018,.003,7.6)],'cabinetMotion3':[r(.5,.15,.36,.12,.020,.003,6.7)]},
  28:{'captain-scene':[r(.5,.225,.17,.075,.014,.002,7)],'cargo-scene':[r(.5,.23,.18,.075,.012,.002,7.6)],'pearl-scene':[r(.5,.225,.23,.075,.014,.002,8.2)],'reef-scene':[r(.5,.23,.24,.065,.013,.002,7.9)],'marina':[r(.26,.36,.21,.12,.008,.002,8.4),r(.75,.38,.21,.12,.008,.002,9.3,2),r(.27,.62,.22,.13,.009,.002,8.8,3),r(.76,.62,.23,.13,.008,.002,9.7,1)]},
  29:{...tops([[.5,.235],[.5,.24],[.5,.29],[.5,.29]],.23,.075),...Object.fromEntries([[.34,.39,.28,.32],[.50,.35,.27,.32],[.28,.48,.26,.25],[.50,.48,.34,.26]].map((v,i)=>['canopy-destinations:'+i,atlas(...v)])),'salon':[r(.4,.24,.27,.18,.018,.003,6.8)]},
  30:{...tops([[.50,.13],[.50,.13],[.50,.13],[.50,.13]],.19,.075),'canopy-destinations':atlas(.5,.36,.34,.32)},
  31:{...Object.fromEntries(['celestial-mint','coin-carousel','lantern-vault','lucky-parade'].map((s,i)=>[s+'-tall',[r(.5,.355,.13,.055,.010,.0015,7+i*.5,i)]])),'carnival-destinations':atlas(.50,.27,.29,.21)},
  33:{...tops([[.50,.13],[.50,.15],[.50,.15],[.50,.13]],.16,.085),'canopy-destinations':atlas(.5,.30,.33,.27)},
};
// Opaque pictures cannot provide independent joints. Keep this reviewed legacy
// inventory for migration, but never rubber-warp architecture or baked faces.
// Animated alpha layers use ArticulatedMascot; static metal retains separate glow.
export const motionRegions=Object.fromEntries(Object.keys(legacyMotionRegions).map(id=>[id,{}]));
