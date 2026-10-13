import {readFile,readdir,mkdir,access} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
const root=fileURLToPath(new URL('..',import.meta.url));
export const baseUrl=process.env.QA_BASE_URL||'http://127.0.0.1:6142/';
export async function sourceFingerprint(){
 // Fingerprint actual bitmap/audio bytes too: same-name asset replacement invalidates QA.
 const files=['index.html','manifest.webmanifest',...(await readdir(path.join(root,'assets/art'))).map(n=>'assets/art/'+n),...(await readdir(path.join(root,'assets/audio'))).map(n=>'assets/audio/'+n),...(await readdir(path.join(root,'src'))).map(n=>'src/'+n)].sort();
 const hash=createHash('sha256');for(const file of files){hash.update(file+'\0');hash.update(await readFile(path.join(root,file)));}return hash.digest('hex');
}
export async function launchBrowser(){
 let module;
 if(process.env.PLAYWRIGHT_MODULE)module=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
 else try{module=await import('playwright');}catch{
  const cached=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  try{module=await import(pathToFileURL(cached).href);}catch{throw Error('Browser QA needs Playwright. Install it locally or set PLAYWRIGHT_MODULE to its entry file.');}
 }
 const options={headless:true};
 if(process.env.CHROME_EXECUTABLE)options.executablePath=process.env.CHROME_EXECUTABLE;
 else try{await access('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');options.executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';}catch{}
 await mkdir(path.join(root,'docs/screenshots'),{recursive:true});return module.chromium.launch(options);
}
