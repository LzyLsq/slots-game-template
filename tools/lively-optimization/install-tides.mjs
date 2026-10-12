import {readFileSync,existsSync,cpSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),p=join(root,'完整游戏模版/全游戏模版/F26_Fortune_Tides_v1.0.0'),files=new Map();
const app=join(p,'src/app.js');let text=readFileSync(app,'utf8');
function replace(a,b){if(text.includes(b))return;if(text.split(a).length!==2)throw Error('Unknown anchor '+a);text=text.replace(a,b);}
if(!text.includes("import {mountFestivity}"))text="import {mountFestivity} from './festivity.js';\nimport {TidalSound} from './tidal-sound.js';\n"+text;
replace("const app=document.querySelector('#app')","const soundtrack=new TidalSound();\nconst app=document.querySelector('#app')");
const old=text.split('\n').find(l=>l.startsWith('function feedback('));if(!old.includes('soundtrack.cue'))replace(old,"function feedback(kind='tap'){soundtrack.configure(page==='game'?'cabinet':'home',store.state.sound);soundtrack.cue(kind);}");
replace('finishControls(app);app.scrollTop=0;','finishControls(app);mountFestivity(app,page);soundtrack.configure(page===\'game\'?\'cabinet\':\'home\',store.state.sound);app.scrollTop=0;');
replace('function celebrate(amount,big){const token=epoch;','function celebrate(amount,big){soundtrack.present(amount/bet);const token=epoch;');
replace("function closeModal(){const collect=", "function closeModal(){soundtrack.finishAward();const collect=");
replace('reels.begin(first.grid);','feedback(\'spin\');reels.begin(first.grid);');
files.set(app,text);
for(const name of ['index.html','ios/FortuneTides/Web/index.html']){const f=join(p,name);let t=readFileSync(f,'utf8');if(!t.includes('/src/festivity.css'))t=t.replace('</head>','<link rel="stylesheet" href="/src/festivity.css"></head>');files.set(f,t);}
for(const name of ['app.js','festivity.js','festivity.css','tidal-sound.js'])files.set(join(p,'ios/FortuneTides/Web/src',name),name==='app.js'?text:readFileSync(join(p,'src',name),'utf8'));
let patch='*** Begin Patch\n';for(const [f,t] of files){if(existsSync(f)){const old=readFileSync(f,'utf8');if(old===t)continue;patch+=`*** Update File: ${f}\n@@\n`+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';}else patch+=`*** Add File: ${f}\n`+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';}patch+='*** End Patch\n';execFileSync('apply_patch',[],{input:patch,maxBuffer:5*1024*1024});mkdirSync(join(p,'ios/FortuneTides/Web/audio'),{recursive:true});cpSync(join(p,'audio'),join(p,'ios/FortuneTides/Web/audio'),{recursive:true});console.log('F26 adapted and bundled Web/audio copies synchronized.');
