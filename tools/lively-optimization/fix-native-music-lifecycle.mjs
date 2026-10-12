// Only the lifecycle in AppDelegate changes; never touch StoreKit/signing/data.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,cpSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {walk} from '../webp-iap/webp.mjs';
import {installMusicHostLifecycle} from './music-host-lifecycle.mjs';
const roots=[join(import.meta.dirname,'../../Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const script='('+installMusicHostLifecycle.toString()+')();';
const injection=`    // Forward native inactivity to browser/Cocos audio without changing saved settings.
    NSString *musicLifecycle = @${JSON.stringify(script.replaceAll('\n',' '))};
    [configuration.userContentController addUserScript:[[WKUserScript alloc] initWithSource:musicLifecycle injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];

`;
const methods=`- (void)setGameActive:(BOOL)active {
    [self.webView setAllMediaPlaybackSuspended:!active completionHandler:nil];
    [self.webView evaluateJavaScript:active ? @"window.__musicHostLifecycle?.(true)" : @"window.__musicHostLifecycle?.(false)" completionHandler:nil];
}

- (void)applicationWillResignActive:(UIApplication *)application { [self setGameActive:NO]; }
- (void)applicationDidEnterBackground:(UIApplication *)application { [self setGameActive:NO]; }
- (void)applicationDidBecomeActive:(UIApplication *)application { [self setGameActive:YES]; }

`;
const targets=[];
const protectedFiles=new Map();
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
for(const root of roots)for(const g of JSON.parse(readFileSync(join(root,'manifest.json')))){
 for(const folder of [join(root,g.folder,'DBGame'),join(root,g.folder,`F${g.id}_H5/ios-wrapper`)])for(const file of walk(folder))protectedFiles.set(file,hash(file));
 const file=join(root,g.folder,`F${g.id}_H5/ios-wrapper/App/AppDelegate.m`),old=readFileSync(file,'utf8');
 if(old.includes('__musicHostLifecycle'))continue;
 assert(old.includes('    self.webView = [[WKWebView alloc]'),'WebView anchor '+file);
 const start=old.indexOf('- (void)applicationDidEnterBackground:'),end=old.indexOf('- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:',start);
 assert(start>=0&&end>start,'Lifecycle anchors '+file);
 const next=(old.slice(0,start)+methods+old.slice(end)).replace('    self.webView = [[WKWebView alloc]',injection+'    self.webView = [[WKWebView alloc]');
 targets.push({id:g.id,file,old,next});
}
const backup=mkdtempSync(join(tmpdir(),'native-music-lifecycle.'));
let patch='*** Begin Patch\n';
for(const [i,t] of targets.entries()){
 cpSync(t.file,join(backup,`${i}-F${t.id}-AppDelegate.m`));
 patch+=`*** Update File: ${t.file}\n@@\n`+t.old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+t.next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';
}
if(targets.length)execFileSync('apply_patch',[],{input:patch+'*** End Patch\n',maxBuffer:1024*1024});
const changed=new Set(targets.map(t=>t.file));
for(const [file,expected] of protectedFiles)if(!changed.has(file))assert.equal(hash(file),expected,'Unrelated native code changed '+file);
for(const t of targets)assert.equal(readFileSync(t.file,'utf8').trimEnd(),t.next.trimEnd(),'Lifecycle patch mismatch '+t.file);
const report={checkedAt:new Date().toISOString(),backup,protectedUnchangedFiles:protectedFiles.size-targets.length,targets:targets.map(({id,file,old})=>({id,file,beforeSha256:createHash('sha256').update(old).digest('hex'),afterSha256:hash(file)}))};
writeFileSync(join(backup,'report.json'),JSON.stringify(report,null,2));
mkdirSync(join(import.meta.dirname,'verification'),{recursive:true});
writeFileSync(join(import.meta.dirname,'verification/native-music-lifecycle.json'),JSON.stringify(report,null,2));
console.log(`Patched ${targets.length} native audio lifecycle files; prior files: ${backup}`);
