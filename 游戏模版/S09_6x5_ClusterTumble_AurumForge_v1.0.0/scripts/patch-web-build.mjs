import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve(process.argv[2] || 'build/web-mobile');
const settingsPath = path.join(outputRoot, 'src/settings.json');
const stylePath = path.join(outputRoot, 'style.css');
const indexPath = path.join(outputRoot, 'index.html');
const bootCabinetName = 'aurum-forge-boot-cabinet.png';
const bootEmblemName = 'aurum-forge-boot-emblem.png';

await copyFile(
    path.resolve('assets/resources/theme/aurum-forge/cabinet-v1.png'),
    path.join(outputRoot, bootCabinetName),
);
await copyFile(
    path.resolve('assets/resources/theme/aurum-forge/symbols/molten-wild.png'),
    path.join(outputRoot, bootEmblemName),
);

const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
settings.splashScreen = {
    ...(settings.splashScreen || {}),
    displayRatio: 0,
    totalTime: 0,
    logo: { type: 'none' },
    background: { type: 'color', color: { x: 0.01, y: 0.12, z: 0.085, w: 1 } },
};
await writeFile(settingsPath, `${JSON.stringify(settings)}\n`, 'utf8');

const style = await readFile(stylePath, 'utf8');
await writeFile(stylePath, style.replace(/background-color:\s*#333;/, 'background-color: #031f18;'), 'utf8');

const bootMarkup = `
  <!-- S09_BOOT_START -->
  <style>
    #afBootLoader { position:fixed; inset:0; z-index:9999; display:grid; place-items:center; overflow:hidden; background:#031f18 url('./${bootCabinetName}') center/cover no-repeat; opacity:1; transition:opacity .28s ease-out; isolation:isolate; }
    #afBootLoader::before { content:''; position:absolute; inset:0; z-index:-1; background:linear-gradient(180deg,rgba(1,25,18,.15),rgba(2,31,22,.48)),radial-gradient(circle at 50% 45%,rgba(34,209,147,.12),rgba(3,31,23,.62) 72%); }
    #afBootStage { width:min(84vw,440px); display:flex; flex-direction:column; align-items:center; transform:translateY(-1vh); }
    #afBootEyebrow { color:#a9f4d6; font:800 clamp(11px,2.8vw,15px)/1.2 Arial Rounded MT Bold,Arial,sans-serif; letter-spacing:.16em; text-align:center; text-shadow:0 1px 0 #174a37; }
    #afBootTitle { margin-top:10px; color:#fff3bd; font:900 clamp(40px,11vw,64px)/.9 Georgia,serif; letter-spacing:.025em; text-align:center; -webkit-text-stroke:1px #6c4a0d; text-shadow:0 3px 0 #94600d,0 0 16px rgba(255,205,67,.32); animation:afTitle 1.5s ease-in-out infinite alternate; }
    #afBootSub { margin-top:8px; color:#77e8b9; font:900 clamp(13px,3.6vw,19px)/1.1 Arial Rounded MT Bold,Arial,sans-serif; letter-spacing:.20em; }
    #afBootEmblemWrap { position:relative; width:min(42vw,210px); aspect-ratio:1; margin:2vh 0 1vh; display:grid; place-items:center; }
    #afBootEmblemWrap::before { content:''; position:absolute; width:78%; height:78%; border:2px solid rgba(255,218,101,.72); border-radius:50%; box-shadow:0 0 26px rgba(33,221,151,.25),inset 0 0 22px rgba(255,199,45,.18); animation:afRing 3.2s linear infinite; }
    #afBootEmblem { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 0 12px rgba(255,191,40,.36)); animation:afEmblem 1.35s ease-in-out infinite alternate; }
    #afBootStatus { color:#fff2c2; font:800 clamp(12px,3vw,16px)/1.2 Arial Rounded MT Bold,Arial,sans-serif; letter-spacing:.08em; text-align:center; }
    #afBootTrack { position:relative; width:min(72vw,380px); height:14px; margin-top:14px; padding:3px; border:2px solid #f7d56c; border-radius:999px; background:#073f30; overflow:hidden; box-sizing:border-box; }
    #afBootFill { width:100%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#17a879,#74edbd 48%,#ffd566); transform:scaleX(.02); transform-origin:left center; will-change:transform; }
    #afBootPercent { margin-top:8px; color:#ffe6a1; font:900 clamp(12px,3vw,15px)/1 Arial Rounded MT Bold,Arial,sans-serif; font-variant-numeric:tabular-nums; }
    #afBootHint { margin-top:9px; color:rgba(188,244,220,.9); font:700 clamp(10px,2.5vw,13px)/1.2 Arial,sans-serif; letter-spacing:.08em; text-align:center; }
    @keyframes afRing { to { transform:rotate(360deg); } }
    @keyframes afTitle { to { transform:translateY(-3px) scale(1.015); } }
    @keyframes afEmblem { to { transform:translateY(-7px) scale(1.045); } }
    @media (prefers-reduced-motion:reduce) { #afBootLoader * { animation:none !important; } }
  </style>
  <div id="afBootLoader" aria-label="Loading Aurum Forge">
    <div id="afBootStage">
      <div id="afBootEyebrow">6×5 CLUSTER TUMBLE</div>
      <div id="afBootTitle">AURUM<br>FORGE</div>
      <div id="afBootSub">MOLTEN MULTIPLIERS</div>
      <div id="afBootEmblemWrap"><img id="afBootEmblem" src="./${bootEmblemName}" alt=""></div>
      <div id="afBootStatus">HEATING THE FORGE</div>
      <div id="afBootTrack"><div id="afBootFill"></div></div>
      <div id="afBootPercent">2%</div>
      <div id="afBootHint">CONNECT 5+ · TUMBLE · CHARGE THE FORGE</div>
    </div>
  </div>
  <script>
    (() => {
      const loader=document.getElementById('afBootLoader');
      const fill=document.getElementById('afBootFill');
      const percent=document.getElementById('afBootPercent');
      const status=document.getElementById('afBootStatus');
      const started=performance.now(); const minimumVisibleMs=1700; let ready=false; let shown=2;
      const statusFor=(p)=>p<28?'HEATING THE FORGE':p<58?'SETTING THE 6×5 REELS':p<84?'POLISHING THE GOLD':'CHARGING CLUSTER ENERGY';
      const finish=()=>{ if(ready)return; ready=true; const complete=()=>{shown=100;fill.style.transform='scaleX(1)';percent.textContent='100%';status.textContent='FORGE READY';setTimeout(()=>{loader.style.opacity='0';setTimeout(()=>loader.remove(),300);},180);}; setTimeout(()=>requestAnimationFrame(complete),Math.max(0,minimumVisibleMs-(performance.now()-started))); };
      const frame=(now)=>{ if(ready)return; const elapsed=now-started; const target=Math.min(92,2+elapsed/38); shown+=Math.max(.12,(target-shown)*.075); const rounded=Math.min(92,Math.floor(shown)); fill.style.transform='scaleX('+(rounded/100)+')'; percent.textContent=rounded+'%'; status.textContent=statusFor(rounded); requestAnimationFrame(frame); };
      addEventListener('aurum-forge-ready',finish,{once:true});
      if(globalThis.__AURUM_FORGE_READY__) finish(); else requestAnimationFrame(frame);
    })();
  </script>
  <!-- S09_BOOT_END -->`;

const index = await readFile(indexPath, 'utf8');
const cleanIndex = index.replace(/\s*<!-- S09_BOOT_START -->[\s\S]*?<!-- S09_BOOT_END -->\s*/g, '\n');
await writeFile(
    indexPath,
    cleanIndex
        .replace(/<title>[\s\S]*?<\/title>/, '<title>Aurum Forge · S09</title>')
        .replace(/<body>/, `<body>${bootMarkup}`),
    'utf8',
);

console.log(`Patched Aurum Forge web loader: ${outputRoot}`);
