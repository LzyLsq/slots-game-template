// Transfer tested media-handler deltas only. Keep each app's identity and port.
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),base=join(root,'Xcode_H5/F13-F21_20260914');
const pathFor=id=>join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)),`F${id}_H5/ios-wrapper/App/H5LocalServer.m`);
const source=readFileSync(pathFor(20),'utf8');
const span=(text,start,end)=>text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
const anchor='    NSString *mime = [self mimeTypeForPath:filePath data:body];';
const rangeBlock=span(source,anchor,'- (NSString *)mimeTypeForPath:');
const responseBlock=span(source,'- (void)sendStatus:','- (void)sendData:');
let patch='*** Begin Patch\n';
for(const id of [13,14,15,17,18,19,21]){
 const file=pathFor(id),old=readFileSync(file,'utf8');let next=old;
 if(!next.includes('SO_NOSIGPIPE'))next=next.replace('        int flags = fcntl(client, F_GETFL, 0);','        // Media requests may be cancelled during scene crossfades.\n        int noSigPipe = 1;\n        setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &noSigPipe, sizeof(noSigPipe));\n        int flags = fcntl(client, F_GETFL, 0);');
 if(!next.includes('readRangeNumber:'))next=next.replace(span(next,anchor,'- (NSString *)mimeTypeForPath:'),rangeBlock);
 if(!next.includes('@"m4a"'))next=next.replace('        @"wav": @"audio/wav",','        @"wav": @"audio/wav",\n        @"m4a": @"audio/mp4",\n        @"aac": @"audio/aac",');
 if(!next.includes('@206:'))next=next.replace(span(next,'- (void)sendStatus:','- (void)sendData:'),responseBlock);
 for(const check of ['SO_NOSIGPIPE','@"m4a"','readRangeNumber:','@206:'])if(!next.includes(check))throw Error(`F${id} missing ${check}`);
 if(next===old)continue;
 patch+=`*** Update File: ${file}\n@@\n`+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';
}
for(const id of [13,14,15,17,18,19,21]){
 const file=pathFor(id).replace('H5LocalServer.m','AppDelegate.m'),old=readFileSync(file,'utf8');let next=old;
 if(next.includes('__localGameLifecycle'))continue;
 const lifecycle=`
    // Deliver native inactive/background state to Cocos and its audio pools.
    NSString *lifecycle = @"(() => { let inactive=false; const hidden=Object.getOwnPropertyDescriptor(Document.prototype,'hidden')?.get; Object.defineProperty(document,'hidden',{configurable:true,get:()=>inactive||(hidden?hidden.call(document):false)}); window.__localGameLifecycle=active=>{const next=!active;if(next===inactive)return;inactive=next;document.dispatchEvent(new Event('visibilitychange'));}; })();";
    [configuration.userContentController addUserScript:[[WKUserScript alloc] initWithSource:lifecycle injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];
`;
 next=next.replace('    self.webView = [[WKWebView alloc]',lifecycle+'\n    self.webView = [[WKWebView alloc]');
 const oldMethods=span(next,'- (void)applicationDidEnterBackground:','- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:');
 if(!oldMethods.includes('applicationWillEnterForeground'))throw Error(`F${id} lifecycle anchors changed`);
 const methods=`- (void)setGameActive:(BOOL)active {
    [self.webView setAllMediaPlaybackSuspended:!active completionHandler:nil];
    [self.webView evaluateJavaScript:active ? @"window.__localGameLifecycle?.(true)" : @"window.__localGameLifecycle?.(false)" completionHandler:nil];
}
- (void)applicationWillResignActive:(UIApplication *)application { [self setGameActive:NO]; }
- (void)applicationDidEnterBackground:(UIApplication *)application { [self setGameActive:NO]; }
- (void)applicationDidBecomeActive:(UIApplication *)application { [self setGameActive:YES]; }

#if DEBUG
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    if (![NSProcessInfo.processInfo.arguments containsObject:@"--lively-media-smoke"]) return;
    NSString *script = @"const audio=new Audio(new URL('audio/music-home.m4a',location.href));const result={};try{await Promise.race([audio.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('AAC timeout')),10000))]);await new Promise(resolve=>setTimeout(resolve,600));if(audio.paused||audio.currentTime<=0||audio.readyState<2)throw new Error('AAC did not advance');result.passed=true;result.time=audio.currentTime;result.duration=audio.duration;}catch(error){result.passed=false;result.error=String(error);result.mediaError=audio.error?.code;}finally{audio.pause();audio.removeAttribute('src');audio.load();}return JSON.stringify(result);";
    [webView callAsyncJavaScript:script arguments:@{} inFrame:nil inContentWorld:WKContentWorld.pageWorld completionHandler:^(id value,NSError *error){NSLog(@"LIVELY_MEDIA_SMOKE F${id} %@ %@",value,error);}];
}
#endif

`;
 next=next.replace(oldMethods,methods);
 patch+=`*** Update File: ${file}\n@@\n`+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';
}
patch+='*** End Patch\n';execFileSync('apply_patch',[],{input:patch,maxBuffer:3*1024*1024});
console.log('Patched local media and native lifecycle, preserving bundle identities and fixed storage origins.');
