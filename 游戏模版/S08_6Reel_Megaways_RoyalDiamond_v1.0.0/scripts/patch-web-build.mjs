import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve(process.argv[2] || 'build/web-mobile');
const settingsPath = path.join(outputRoot, 'src/settings.json');
const stylePath = path.join(outputRoot, 'style.css');
const indexPath = path.join(outputRoot, 'index.html');
const bootCabinetName = 'royal-diamond-boot-cabinet.png';
const bootWheelName = 'royal-diamond-boot-emblem.png';

await copyFile(
    path.resolve('assets/resources/theme/royal-diamond/cabinet-master-v2.png'),
    path.join(outputRoot, bootCabinetName),
);
await copyFile(
    path.resolve('assets/resources/theme/royal-diamond/symbols/diamond-wild.png'),
    path.join(outputRoot, bootWheelName),
);

const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
settings.splashScreen = {
    ...(settings.splashScreen || {}),
    displayRatio: 0,
    totalTime: 0,
    logo: { type: 'none' },
    background: {
        type: 'color',
        color: { x: 0.29, y: 0.11, z: 0.015, w: 1 },
    },
};
await writeFile(settingsPath, `${JSON.stringify(settings)}\n`, 'utf8');

const style = await readFile(stylePath, 'utf8');
await writeFile(
    stylePath,
    `${style.replace(/background-color:\s*#333;/, 'background-color: #5A0718;')}

/* Surround the portrait cabinet with matching casino ambience on browsers
   that expose space beyond the WebGL viewport. */
body {
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(206, 118, 32, .30), rgba(93, 7, 28, .80) 48%, rgba(29, 2, 11, .98) 100%),
    linear-gradient(90deg, #1f020b, #62081f 25%, #62081f 75%, #1f020b);
}

`,
    'utf8',
);

const bootMarkup = `
  <!-- S08_BOOT_START -->
  <style>
    #rfBootLoader { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; overflow: hidden; background: #5a0718 url('./${bootCabinetName}') center/cover no-repeat; opacity: 1; transition: opacity .26s ease-out; isolation: isolate; }
    #rfBootLoader::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg,rgba(67,2,19,.30),rgba(68,3,18,.58)), radial-gradient(circle at 50% 44%,rgba(255,220,105,.18),rgba(111,5,28,.20) 48%,rgba(64,2,16,.56) 100%); }
    #rfBootStage { width: min(88vw,480px); display: flex; flex-direction: column; align-items: center; transform: translateY(-1vh); }
    #rfBootKicker { color: #fff2bc; font: 800 clamp(11px,2.8vw,15px)/1.2 Arial Rounded MT Bold,Arial,sans-serif; letter-spacing: .22em; text-shadow: 0 1px 0 #8d3b10; }
    #rfBootTitle { margin-top: 1.2vh; color: #fff6cf; font: 900 clamp(34px,10.5vw,58px)/.86 Georgia,serif; letter-spacing: .035em; text-align: center; -webkit-text-stroke: 1px #8b340b; text-shadow: 0 2px 0 #bd6715,0 0 18px rgba(255,211,86,.42); animation: rfBootTitle 1.45s ease-in-out infinite alternate; }
    #rfBootSubtitle { margin-top: 9px; color: #ffd66b; font: 800 clamp(13px,3.6vw,19px)/1.1 Arial Rounded MT Bold,Arial,sans-serif; letter-spacing: .28em; }
    #rfBootWheelWrap { position: relative; width: min(48vw,248px); aspect-ratio: 1; margin: 2.2vh 0 1vh; display: grid; place-items: center; }
    #rfBootWheelWrap::before { content: ''; position: absolute; width: 88%; height: 88%; border: 2px solid rgba(255,225,119,.70); border-radius: 50%; box-shadow: 0 0 28px rgba(255,197,43,.32); animation: rfBootRing 3s linear infinite; }
    #rfBootWheel { width: 100%; height: 100%; object-fit: contain; animation: rfBootWheel 2.4s cubic-bezier(.4,0,.2,1) infinite; }
    #rfBootCopy { color: #fff4cc; font: 800 clamp(12px,3.2vw,17px)/1.2 Arial Rounded MT Bold,Arial,sans-serif; letter-spacing: .11em; text-shadow: 0 1px 0 #7e270d; }
    #rfBootTrack { width: min(72vw,390px); height: 12px; margin-top: 15px; padding: 3px; border: 2px solid #ffd96c; border-radius: 999px; background: #fff0be; box-shadow: 0 0 16px rgba(255,205,63,.28); overflow: hidden; }
    #rfBootFill { width:100%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#7520a5,#d94980,#f7b32b,#fff0a5); transform:scaleX(.02); transform-origin:left center; will-change:transform; }
    #rfBootPercent { margin-top:8px; color:#ffe8a2; font:900 clamp(12px,3vw,15px)/1 Arial Rounded MT Bold,Arial,sans-serif; font-variant-numeric:tabular-nums; }
    #rfBootHint { margin-top: 11px; color: rgba(255,245,210,.86); font: 700 clamp(10px,2.6vw,13px)/1.2 Arial,sans-serif; letter-spacing: .10em; }
    @keyframes rfBootRing { to { transform: rotate(360deg); } }
    @keyframes rfBootTitle { to { transform: translateY(-4px) scale(1.018); } }
    @keyframes rfBootWheel { 0%,100% { transform: translateY(3px) scale(.98); } 50% { transform: translateY(-7px) scale(1.035); } }
    @media (prefers-reduced-motion: reduce) { #rfBootLoader *, #rfBootLoader::before { animation: none !important; } }
  </style>
  <div id="rfBootLoader" aria-label="Loading Royal Diamond Megaways">
    <div id="rfBootStage">
      <div id="rfBootKicker">UP TO 117,649 WAYS · ROYAL CASINO</div>
      <div id="rfBootTitle">ROYAL<br>DIAMOND</div>
      <div id="rfBootSubtitle">MEGAWAYS CASCADE</div>
      <div id="rfBootWheelWrap"><img id="rfBootWheel" src="./${bootWheelName}" alt=""></div>
      <div id="rfBootCopy">BUILDING THE MEGAWAYS</div>
      <div id="rfBootTrack"><div id="rfBootFill"></div></div>
      <div id="rfBootPercent">2%</div>
      <div id="rfBootHint">CASCADES RAISE THE MULTIPLIER</div>
    </div>
  </div>
  <script>
    (() => {
      const loader=document.getElementById('rfBootLoader');
      const fill=document.getElementById('rfBootFill');
      const percent=document.getElementById('rfBootPercent');
      const status=document.getElementById('rfBootCopy');
      const started=performance.now(); const minimumVisibleMs=1700; let ready=false; let shown=2;
      const statusFor=(p)=>p<28?'OPENING THE DIAMOND CABINET':p<58?'SETTING THE REEL HEIGHTS':p<84?'BUILDING THE MEGAWAYS':'CHARGING THE DIAMOND VAULT';
      const complete=()=>{shown=100;fill.style.transform='scaleX(1)';percent.textContent='100%';status.textContent='THE VAULT IS READY';setTimeout(()=>{loader.style.opacity='0';setTimeout(()=>loader.remove(),300);},180);};
      const finish=()=>{if(ready)return;ready=true;setTimeout(()=>requestAnimationFrame(complete),Math.max(0,minimumVisibleMs-(performance.now()-started)));};
      const frame=(now)=>{if(ready)return;const target=Math.min(92,2+(now-started)/36);shown+=Math.max(.12,(target-shown)*.075);const rounded=Math.min(92,Math.floor(shown));fill.style.transform='scaleX('+(rounded/100)+')';percent.textContent=rounded+'%';status.textContent=statusFor(rounded);requestAnimationFrame(frame);};
      addEventListener('royal-diamond-ready',finish,{once:true});
      if(globalThis.__ROYAL_DIAMOND_READY__) finish(); else requestAnimationFrame(frame);
    })();
  </script>
  <!-- S08_BOOT_END -->`;

const index = await readFile(indexPath, 'utf8');
const cleanIndex = index.replace(/\s*<!-- S08_BOOT_START -->[\s\S]*?<!-- S08_BOOT_END -->\s*/g, '\n');
await writeFile(
    indexPath,
    cleanIndex
        .replace(/<title>[\s\S]*?<\/title>/, '<title>Royal Diamond Megaways · S08</title>')
        .replace(/<body>/, `<body>${bootMarkup}`),
    'utf8',
);

console.log(`Patched Royal Diamond Web loader: ${outputRoot}`);
