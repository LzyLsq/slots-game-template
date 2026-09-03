import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve(process.argv[2] || 'build/web-mobile');
const settingsPath = path.join(outputRoot, 'src/settings.json');
const stylePath = path.join(outputRoot, 'style.css');
const indexPath = path.join(outputRoot, 'index.html');
const hallName = 'royal-wealth-casino-hall.png';
const emblemName = 'royal-wealth-lobby-emblem.png';
const gemName = 'royal-wealth-lobby-ruby.png';
const chestName = 'royal-wealth-lobby-chest.png';

await copyFile(path.resolve('assets/resources/lobby/v3/lobby-background-v3.png'), path.join(outputRoot, hallName));
await copyFile(path.resolve('assets/resources/lobby/sovereign-treasury/symbols/sovereign-coin.png'), path.join(outputRoot, emblemName));
await copyFile(path.resolve('assets/resources/lobby/sovereign-treasury/symbols/ruby-signet.png'), path.join(outputRoot, gemName));
await copyFile(path.resolve('assets/resources/lobby/sovereign-treasury/symbols/collector-chest.png'), path.join(outputRoot, chestName));

const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
settings.splashScreen = {
  ...(settings.splashScreen || {}),
  displayRatio: 0,
  totalTime: 0,
  logo: { type: 'none' },
  background: { type: 'color', color: { x: 0.12, y: 0.03, z: 0.06, w: 1 } },
};
await writeFile(settingsPath, `${JSON.stringify(settings)}\n`, 'utf8');

const style = await readFile(stylePath, 'utf8');
await writeFile(stylePath, style.replace(/background-color:\s*#333;/, 'background-color: #200811;'), 'utf8');

const loader = `
  <!-- L02_BOOT_START -->
  <style>
    #rwBoot{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;background:#200811 url('./${hallName}') center/cover no-repeat;opacity:1;transition:opacity .3s ease-out;isolation:isolate}
    #rwBoot::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(54,5,22,.13),rgba(3,36,28,.20)),radial-gradient(circle at 50% 46%,rgba(255,224,127,.05),rgba(31,5,14,.35) 82%)}
    #rwStage{position:relative;width:min(84vw,450px);display:flex;flex-direction:column;align-items:center;transform:translateY(-1vh);padding:28px 18px 24px;border:1px solid rgba(255,222,135,.55);border-radius:30px;background:linear-gradient(180deg,rgba(83,17,35,.74),rgba(5,53,41,.72));box-sizing:border-box}
    #rwStage::before{content:'';position:absolute;inset:7px;border:1px solid rgba(255,247,205,.18);border-radius:24px;pointer-events:none}
    #rwKicker{color:#a9f5d4;font:800 clamp(11px,2.8vw,15px)/1.2 'Arial Rounded MT Bold',Arial,sans-serif;letter-spacing:.2em;text-shadow:0 1px 0 #17493a}
    #rwTitle{margin-top:10px;color:#fff3c6;font:900 clamp(36px,9.8vw,60px)/.9 Georgia,serif;letter-spacing:.025em;text-align:center;-webkit-text-stroke:1px #7b4515;text-shadow:0 3px 0 #a76516,0 0 15px rgba(255,205,76,.3);animation:rwTitle 1.7s ease-in-out infinite alternate}
    #rwSub{margin-top:9px;color:#8ff0c8;font:900 clamp(12px,3.3vw,18px)/1.1 'Arial Rounded MT Bold',Arial,sans-serif;letter-spacing:.24em}
    #rwEmblemWrap{position:relative;width:min(40vw,190px);aspect-ratio:1;margin:2vh 0 1vh;display:grid;place-items:center}
    #rwEmblemWrap::before{content:'';position:absolute;width:80%;height:80%;border:2px solid rgba(255,222,117,.78);border-radius:50%;box-shadow:0 0 24px rgba(255,207,78,.26),inset 0 0 18px rgba(123,255,206,.16);animation:rwRing 4s linear infinite}
    #rwEmblem{width:100%;height:100%;object-fit:contain;animation:rwCoin 1.6s ease-in-out infinite alternate}
    #rwStatus{color:#fff0bd;font:800 clamp(12px,3vw,16px)/1.2 'Arial Rounded MT Bold',Arial,sans-serif;letter-spacing:.1em;text-align:center}
    #rwTrack{width:min(72vw,380px);height:14px;margin-top:14px;padding:3px;border:2px solid #f4d681;border-radius:999px;background:#0a4938;overflow:hidden;box-sizing:border-box}
    #rwFill{width:100%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8c1833,#d49a29 48%,#fff0ab);transform:scaleX(.02);transform-origin:left center;will-change:transform}
    #rwPercent{margin-top:8px;color:#ffe8a5;font:900 clamp(12px,3vw,15px)/1 'Arial Rounded MT Bold',Arial,sans-serif;font-variant-numeric:tabular-nums}
    #rwHint{margin-top:9px;color:rgba(206,255,235,.9);font:700 clamp(10px,2.5vw,13px)/1.2 Arial,sans-serif;letter-spacing:.09em;text-align:center}
    .rwFloat{position:absolute;z-index:-1;width:clamp(42px,14vw,88px);height:auto;object-fit:contain;opacity:.72;filter:saturate(1.08);animation:rwFloat 5.5s ease-in-out infinite alternate}
    .rwFloat1{left:4vw;top:20%;animation-delay:-.8s}.rwFloat2{right:3vw;top:29%;width:clamp(54px,17vw,102px);animation-delay:-2.1s}.rwFloat3{left:7vw;bottom:14%;width:clamp(48px,16vw,96px);animation-delay:-3.4s}
    @keyframes rwRing{to{transform:rotate(360deg)}}
    @keyframes rwTitle{to{transform:translateY(-3px) scale(1.014)}}
    @keyframes rwCoin{to{transform:translateY(-6px) rotate(3deg) scale(1.035)}}
    @keyframes rwFloat{to{transform:translate3d(7px,-15px,0) rotate(5deg) scale(1.04);opacity:.94}}
    @media(prefers-reduced-motion:reduce){#rwBoot *{animation:none!important}}
  </style>
  <div id="rwBoot" aria-label="Loading Royal Wealth Casino">
    <img class="rwFloat rwFloat1" src="./${gemName}" alt="">
    <img class="rwFloat rwFloat2" src="./${chestName}" alt="">
    <img class="rwFloat rwFloat3" src="./${emblemName}" alt="">
    <div id="rwStage">
      <div id="rwKicker">L02 · PRIVATE CASINO</div>
      <div id="rwTitle">ROYAL WEALTH</div>
      <div id="rwSub">SOVEREIGN CLUB</div>
      <div id="rwEmblemWrap"><img id="rwEmblem" src="./${emblemName}" alt=""></div>
      <div id="rwStatus">OPENING THE PRIVATE FLOOR</div>
      <div id="rwTrack"><div id="rwFill"></div></div>
      <div id="rwPercent">2%</div>
      <div id="rwHint">S07 · S08 · S09 · S10</div>
    </div>
  </div>
  <script>
    (()=>{
      const root=document.getElementById('rwBoot'),fill=document.getElementById('rwFill'),percent=document.getElementById('rwPercent'),status=document.getElementById('rwStatus');
      const started=performance.now(),minimum=1700;let ready=false,shown=2;
      const text=(p)=>p<28?'OPENING THE PRIVATE FLOOR':p<58?'COUNTING THE JACKPOT':p<84?'POLISHING THE GOLD':'WELCOMING THE HIGH ROLLERS';
      const finish=()=>{if(ready)return;ready=true;setTimeout(()=>requestAnimationFrame(()=>{shown=100;fill.style.transform='scaleX(1)';percent.textContent='100%';status.textContent='CASINO OPEN';setTimeout(()=>{root.style.opacity='0';setTimeout(()=>root.remove(),320)},190)}),Math.max(0,minimum-(performance.now()-started)))};
      const frame=(now)=>{if(ready)return;const target=Math.min(92,2+(now-started)/38);shown+=Math.max(.12,(target-shown)*.075);const value=Math.min(92,Math.floor(shown));fill.style.transform='scaleX('+(value/100)+')';percent.textContent=value+'%';status.textContent=text(value);requestAnimationFrame(frame)};
      addEventListener('royal-wealth-lobby-ready',finish,{once:true});
      if(globalThis.__ROYAL_WEALTH_LOBBY_READY__)finish();else requestAnimationFrame(frame);
    })();
  </script>
  <!-- L02_BOOT_END -->`;

const index = await readFile(indexPath, 'utf8');
const clean = index.replace(/\s*<!-- L02_BOOT_START -->[\s\S]*?<!-- L02_BOOT_END -->\s*/g, '\n');
await writeFile(indexPath, clean.replace(/<title>[\s\S]*?<\/title>/, '<title>Royal Wealth Casino · L02</title>').replace(/<body>/, `<body>${loader}`), 'utf8');
console.log(`Patched Royal Wealth Casino Web loader: ${outputRoot}`);
