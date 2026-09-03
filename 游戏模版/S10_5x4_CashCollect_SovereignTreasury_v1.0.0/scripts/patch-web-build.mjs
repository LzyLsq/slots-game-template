import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve(process.argv[2] || 'build/web-mobile');
const settingsPath = path.join(outputRoot, 'src/settings.json');
const stylePath = path.join(outputRoot, 'style.css');
const indexPath = path.join(outputRoot, 'index.html');
const cabinetName = 'sovereign-treasury-boot-cabinet.png';
const emblemName = 'sovereign-treasury-boot-emblem.png';

await copyFile(path.resolve('assets/resources/theme/sovereign-treasury/cabinet-portrait-v3.png'), path.join(outputRoot, cabinetName));
await copyFile(path.resolve('assets/resources/theme/sovereign-treasury/symbols/vault-wild.png'), path.join(outputRoot, emblemName));

const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
settings.splashScreen = {
  ...(settings.splashScreen || {}),
  displayRatio: 0,
  totalTime: 0,
  logo: { type: 'none' },
  background: { type: 'color', color: { x: 0.28, y: 0.07, z: 0.11, w: 1 } },
};
await writeFile(settingsPath, `${JSON.stringify(settings)}\n`, 'utf8');

const style = await readFile(stylePath, 'utf8');
await writeFile(stylePath, style.replace(/background-color:\s*#333;/, 'background-color: #49121E;'), 'utf8');

const loader = `
  <!-- S10_BOOT_START -->
  <style>
    #stBoot { position:fixed; inset:0; z-index:9999; display:grid; place-items:center; overflow:hidden; background:#49121e url('./${cabinetName}') center/cover no-repeat; opacity:1; transition:opacity .28s ease-out; isolation:isolate; }
    #stBoot::before { content:''; position:absolute; inset:0; z-index:-1; background:linear-gradient(180deg,rgba(75,15,28,.18),rgba(8,42,32,.28)),radial-gradient(circle at 50% 45%,rgba(255,223,125,.13),rgba(24,7,14,.35) 78%); }
    #stStage { width:min(84vw,450px); display:flex; flex-direction:column; align-items:center; transform:translateY(-1vh); }
    #stKicker { color:#baf7de; font:800 clamp(11px,2.8vw,15px)/1.2 'Arial Rounded MT Bold',Arial,sans-serif; letter-spacing:.18em; text-shadow:0 1px 0 #184839; }
    #stTitle { margin-top:9px; color:#fff2be; font:900 clamp(37px,10.5vw,62px)/.88 Georgia,serif; letter-spacing:.018em; text-align:center; -webkit-text-stroke:1px #7c4211; text-shadow:0 3px 0 #a06012,0 0 16px rgba(255,205,76,.34); animation:stTitle 1.55s ease-in-out infinite alternate; }
    #stSub { margin-top:8px; color:#8ff0c8; font:900 clamp(13px,3.5vw,19px)/1.1 'Arial Rounded MT Bold',Arial,sans-serif; letter-spacing:.24em; }
    #stEmblemWrap { position:relative; width:min(42vw,210px); aspect-ratio:1; margin:2vh 0 1vh; display:grid; place-items:center; }
    #stEmblemWrap::before { content:''; position:absolute; width:78%; height:78%; border:2px solid rgba(255,222,117,.76); border-radius:50%; box-shadow:0 0 26px rgba(255,207,78,.28),inset 0 0 20px rgba(123,255,206,.16); animation:stRing 3.4s linear infinite; }
    #stEmblem { width:100%; height:100%; object-fit:contain; animation:stVault 1.5s ease-in-out infinite alternate; }
    #stStatus { color:#fff0bd; font:800 clamp(12px,3vw,16px)/1.2 'Arial Rounded MT Bold',Arial,sans-serif; letter-spacing:.09em; text-align:center; }
    #stTrack { width:min(72vw,380px); height:14px; margin-top:14px; padding:3px; border:2px solid #f4d681; border-radius:999px; background:#0a4938; overflow:hidden; box-sizing:border-box; }
    #stFill { width:100%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#8c1833,#e0a32d 48%,#fff0ab); transform:scaleX(.02); transform-origin:left center; will-change:transform; }
    #stPercent { margin-top:8px; color:#ffe8a5; font:900 clamp(12px,3vw,15px)/1 'Arial Rounded MT Bold',Arial,sans-serif; font-variant-numeric:tabular-nums; }
    #stHint { margin-top:9px; color:rgba(206,255,235,.9); font:700 clamp(10px,2.5vw,13px)/1.2 Arial,sans-serif; letter-spacing:.08em; text-align:center; }
    @keyframes stRing { to { transform:rotate(360deg); } }
    @keyframes stTitle { to { transform:translateY(-3px) scale(1.016); } }
    @keyframes stVault { to { transform:translateY(-6px) rotate(4deg) scale(1.04); } }
    @media (prefers-reduced-motion:reduce) { #stBoot * { animation:none !important; } }
  </style>
  <div id="stBoot" aria-label="Loading Sovereign Treasury">
    <div id="stStage">
      <div id="stKicker">5×4 · 1024 WAYS</div>
      <div id="stTitle">SOVEREIGN<br>TREASURY</div>
      <div id="stSub">CASH COLLECT</div>
      <div id="stEmblemWrap"><img id="stEmblem" src="./${emblemName}" alt=""></div>
      <div id="stStatus">UNLOCKING THE TREASURY</div>
      <div id="stTrack"><div id="stFill"></div></div>
      <div id="stPercent">2%</div>
      <div id="stHint">LAND CASH COINS · FIND THE COLLECTOR</div>
    </div>
  </div>
  <script>
    (()=>{
      const root=document.getElementById('stBoot'),fill=document.getElementById('stFill'),percent=document.getElementById('stPercent'),status=document.getElementById('stStatus');
      const started=performance.now(),minimum=1700; let ready=false,shown=2;
      const text=(p)=>p<28?'UNLOCKING THE TREASURY':p<58?'POLISHING THE TREASURE':p<84?'SETTING THE CASH REELS':'CHARGING THE COLLECTOR';
      const finish=()=>{if(ready)return;ready=true;setTimeout(()=>requestAnimationFrame(()=>{shown=100;fill.style.transform='scaleX(1)';percent.textContent='100%';status.textContent='TREASURY OPEN';setTimeout(()=>{root.style.opacity='0';setTimeout(()=>root.remove(),300);},180);}),Math.max(0,minimum-(performance.now()-started)));};
      const frame=(now)=>{if(ready)return;const target=Math.min(92,2+(now-started)/37);shown+=Math.max(.12,(target-shown)*.075);const value=Math.min(92,Math.floor(shown));fill.style.transform='scaleX('+(value/100)+')';percent.textContent=value+'%';status.textContent=text(value);requestAnimationFrame(frame);};
      addEventListener('sovereign-treasury-ready',finish,{once:true});
      if(globalThis.__SOVEREIGN_TREASURY_READY__)finish();else requestAnimationFrame(frame);
    })();
  </script>
  <!-- S10_BOOT_END -->`;

const index = await readFile(indexPath, 'utf8');
const clean = index.replace(/\s*<!-- S10_BOOT_START -->[\s\S]*?<!-- S10_BOOT_END -->\s*/g, '\n');
await writeFile(indexPath, clean.replace(/<title>[\s\S]*?<\/title>/, '<title>Sovereign Treasury · S10</title>').replace(/<body>/, `<body>${loader}`), 'utf8');
console.log(`Patched Sovereign Treasury Web loader: ${outputRoot}`);
