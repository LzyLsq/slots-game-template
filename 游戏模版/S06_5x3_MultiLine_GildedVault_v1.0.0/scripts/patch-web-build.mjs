import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve(process.argv[2] || 'build/web-mobile');
const settingsPath = path.join(outputRoot, 'src/settings.json');
const stylePath = path.join(outputRoot, 'style.css');
const indexPath = path.join(outputRoot, 'index.html');
const bootTitleName = 'gilded-vault-boot-title.png';
const bootChestName = 'gilded-vault-boot-chest.png';

await copyFile(
    path.resolve('assets/resources/theme/gilded-vault/title-wordmark-v2.png'),
    path.join(outputRoot, bootTitleName),
);
await copyFile(
    path.resolve('assets/resources/theme/gilded-vault/symbols/treasure-chest.png'),
    path.join(outputRoot, bootChestName),
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
    style.replace(/background-color:\s*#333;/, 'background-color: #7A3A08;'),
    'utf8',
);

const bootMarkup = `
  <style>
    #gvBootLoader { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(circle at 50% 42%, #a35b0d 0%, #642303 42%, #350901 78%, #210500 100%); opacity: 1; transition: opacity .24s ease-out; }
    #gvBootLoader::before { content: ''; position: absolute; width: 78vmin; height: 78vmin; border: 2px solid rgba(255,220,112,.68); border-radius: 50%; box-shadow: 0 0 38px rgba(255,188,44,.26), inset 0 0 30px rgba(255,205,70,.18); animation: gvBootRing 2.8s linear infinite; }
    #gvBootTitle { position: relative; width: min(82vw, 470px); height: auto; object-fit: contain; filter: drop-shadow(0 3px 2px rgba(94,20,0,.55)); animation: gvBootTitle 1.2s ease-in-out infinite alternate; }
    #gvBootChest { position: relative; width: min(42vw, 230px); height: auto; margin-top: -4vh; object-fit: contain; filter: drop-shadow(0 6px 6px rgba(102,35,0,.42)); animation: gvBootChest 1.35s ease-in-out infinite alternate; }
    #gvBootCopy { position: relative; margin-top: 2.5vh; color: #fff1b4; font: 700 clamp(12px,3.4vw,19px)/1.2 Arial Rounded MT Bold, Arial, sans-serif; letter-spacing: .12em; text-shadow: 0 2px 1px #6c1900; }
    #gvBootTrack { position: relative; width: min(70vw, 390px); height: 12px; margin-top: 16px; padding: 3px; border: 2px solid #ffd966; border-radius: 999px; background: #7d2505; }
    #gvBootFill { height: 100%; border-radius: inherit; background: linear-gradient(90deg,#ff8b16,#ffd85a,#fff1a6); transform-origin: left center; animation: gvBootFill 2.6s cubic-bezier(.2,.72,.18,1) forwards; }
    @keyframes gvBootRing { to { transform: rotate(360deg); } }
    @keyframes gvBootTitle { to { transform: translateY(-5px) scale(1.018); } }
    @keyframes gvBootChest { to { transform: translateY(-8px) rotate(1.5deg); } }
    @keyframes gvBootFill { from { transform: scaleX(.08); } to { transform: scaleX(.9); } }
    @media (prefers-reduced-motion: reduce) { #gvBootLoader *, #gvBootLoader::before { animation: none !important; } #gvBootFill { transform: scaleX(.72); } }
  </style>
  <div id="gvBootLoader" aria-label="Loading Gilded Vault">
    <img id="gvBootTitle" src="./${bootTitleName}" alt="Gilded Vault">
    <img id="gvBootChest" src="./${bootChestName}" alt="">
    <div id="gvBootCopy">PREPARING THE GOLD REELS</div>
    <div id="gvBootTrack"><div id="gvBootFill"></div></div>
  </div>`;

const index = await readFile(indexPath, 'utf8');
await writeFile(
    indexPath,
    index
        .replace(/<title>[\s\S]*?<\/title>/, '<title>Gilded Vault · S06</title>')
        .replace(/<body>/, `<body>${bootMarkup}`),
    'utf8',
);

console.log(`Patched branded Web loader: ${outputRoot}`);
