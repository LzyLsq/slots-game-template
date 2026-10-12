// Decode actual recorded poses with the browser decoder used for the game QA.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const O=path.resolve(process.env.QA_OUTPUT||'docs/screenshots/f40-eyelids-limb-isolation-20261010/final');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),p=await b.newPage();const reports=[];
for(const mode of ['golden-phoenix','jade-dragon','pearl-qilin','amber-panda']){
 const encoded=fs.readFileSync(path.join(O,'direct-canvas',mode+'-idle.webm')).toString('base64');
 await p.evaluate(async encoded=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),v=document.createElement('video');v.muted=true;v.src=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=reject});window.__poseVideo=v;},encoded);
 const files=[];for(let i=0;i<30;i++){
  const t=i*.2;const img=await p.evaluate(async t=>{const v=window.__poseVideo;v.currentTime=t;await new Promise(resolve=>v.onseeked=resolve);const c=document.createElement('canvas');c.width=580;c.height=480;c.getContext('2d').drawImage(v,100,0,580,480,0,0,580,480);return c.toDataURL('image/png').split(',')[1];},t);
  const name=mode+'-pose-'+i.toString().padStart(2,'0')+'.png';fs.mkdirSync(path.join(O,'browser-poses'),{recursive:true});fs.writeFileSync(path.join(O,'browser-poses',name),Buffer.from(img,'base64'));files.push({file:name,time:t});
 }
 await p.evaluate(()=>{const v=window.__poseVideo;URL.revokeObjectURL(v.src);v.removeAttribute('src');v.load();v.remove();window.__poseVideo=null});reports.push({mode,files});console.log('DECODED browser poses '+mode);
}
await b.close();fs.writeFileSync(path.join(O,'browser-pose-decoding.json'),JSON.stringify({method:'native browser recorded-video seek, no interpolation or blending',reports},null,2));})().catch(e=>{console.error(e);process.exit(1)});
