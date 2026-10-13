import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync,cpSync,statSync} from 'node:fs';
import {join,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {games,root,output,reports,patch} from './plus-common.mjs';
import {walk} from './webp.mjs';
const manifest=JSON.parse(readFileSync(join(output,'manifest.json')));
assert.deepEqual(manifest.map(g=>g.id),games.map(g=>g.id));
const read=name=>JSON.parse(readFileSync(join(reports,name+'-results.json')));
const source=read('source'),native=read('native'),release=read('release'),durable=read('durable');
const audit=JSON.parse(readFileSync(join(reports,'delivery-audit.json')));
const checks=manifest.map(g=>{
 const n=native.find(i=>i.id===g.id),r=release.find(i=>i.id===g.id),s=source.find(i=>i.id===g.id),a=audit.games.find(i=>i.id===g.id),d=durable.find(i=>i.id===g.id);
 assert.ok(s?.success,'Source tests incomplete F'+g.id);assert.ok(n?.success&&n.passed===4,'Native tests incomplete F'+g.id);assert.ok(r?.success,'Release build incomplete F'+g.id);assert.ok(a?.passed,'Audit incomplete F'+g.id);
 if(g.id!==42)assert.ok(d?.success,'Persistence tests incomplete F'+g.id);
 const log=readFileSync(join(reports,`F${g.id}-build.log`),'utf8');
 assert.ok(g.id===42?log.includes('Web build:'): /build Task \(web-mobile\) Finished/.test(log),'H5 build evidence missing F'+g.id);
 const app=join(reports,'ReleaseDerivedData/Build/Products/Release-iphoneos',g.name+'H5.app');assert.ok(existsSync(join(app,g.name+'H5')),'Release app absent F'+g.id);
 return {id:g.id,sourceTestsPassed:true,h5BuildPassed:true,simulatorTests:4,simulatorPassed:true,allWebPDecoded:true,durableStorePassed:true,releaseArm64BuildPassed:true,releaseSigned:false,appleSandboxTested:false,realPaymentTested:false,webp:a.webp,webBytes:g.webBytes,releaseAppBytes:walk(app).reduce((n,f)=>n+statSync(f).size,0),nativeResultBundle:n.resultBundle,releaseLog:r.log};
});
const before=manifest.reduce((n,g)=>n+g.compression.before,0),after=manifest.reduce((n,g)=>n+g.webBytes,0),images=checks.reduce((n,g)=>n+g.webp,0),converted=manifest.reduce((n,g)=>n+g.compression.count,0);
const mib=n=>(n/1048576).toFixed(1),rows=manifest.map(g=>{const c=checks.find(c=>c.id===g.id);return `| F${g.id} ${g.title} | ${mib(g.compression.before)} | ${mib(g.webBytes)} | ${((1-g.webBytes/g.compression.before)*100).toFixed(1)}% | ${c.webp} | 4/4 | 通过 |`;}).join('\n');
patch(join(output,'本机检查.md'),`# 本机检查与交付 — 2026-10-13

10 款：${manifest.map(g=>'F'+g.id).join('、')}。本地没有 F39/F41，不虚构缺失项目。

## 结果

- 10 款源码测试通过，10 款发布版 H5 构建完成。
- F42 使用原生HTML/ESM，而非Cocos；已修复本地容器的.mjs和.webmanifest文件类型，防止模块被拒绝加载、游戏停在启动页。
- 本机 Xcode 26.3，iPhone 11 / iOS 17.5 模拟器：10 款共40项 XCTest通过。每款检查原生交易验证及账户隔离、未完成交易补发、待批准/非法请求不发币、H5购买发币与网页重载保存，以及全部WebP的HTTP/MIME/解码。
- 9款标准Cocos另通过实际Save/Economy/Store的存储失败、重启补发、finish失败、600个旧交易ID不裁剪、余额上限和本地化价格测试。F42通过源码内购模型测试，以及使用真实IndexedDB的隔离持久化WebKit集成测试。
- 10款arm64 iPhone Release编译通过，未签名；未测试真实付款、Apple Sandbox/TestFlight、签名Archive或商店上传。

## 文件体积

下面是网页发布资源的未打包文件大小，不是运行RAM，也不是压缩IPA大小。全部H5由 ${mib(before)} MiB降到 ${mib(after)} MiB，减少 ${((1-after/before)*100).toFixed(1)}%。

| 项目 | 压缩前 MiB | WebP后 MiB | 减少 | WebP数 | 模拟器测试 | Release编译 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
${rows}

共 ${images} 张WebP；本次从PNG/JPEG转换的 ${converted} 张使用质量85有损编码，尺寸不变，源PNG透明度逐像素验证。已有WebP保留、不重复压缩。新交付的H5里不保留重复PNG/JPEG；原画和旧工程保留。App图标仍为1024×1024无透明PNG。未实测长期帧率和峰值RAM，不能把文件压缩率当作内存降低率。

## 内购配置与边界

各款商品、币量、Bundle ID见 products.csv，历史商品见 legacy-products.csv。F34与旧F24的同名商品命名空间分开；F38纠正误用F37商品ID。如果已有线上商品，先核对迁移，不直接改已发布ID。

LocalTest仅模拟付款，不扣真钱。真实苹果内购需选择自己的Team/签名，创建对应App和Consumable商品，配置价格、本地化、审核资料、付费协议/税务/银行资料；Release不关联.storekit，需另外真机沙盒验证。

本地验证指设备StoreKit2验证Apple签名交易，不接你的远程验单服务器；查询商品和付款仍要联网。先保存金币和交易ID，再finish；取消/待批准/错误账户/未验证交易不发币，重复ID不重复发币。恢复只补发未完成消耗型交易，不恢复已经消耗的金币。

本地账户/金币没有云同步或服务器风控，卸载/清存档会丢数据，不抵御本机篡改和存档回滚；未实现自动退款扣币。原生Apple登录桥保留，但九款标准源码仍禁用Apple登录，本轮未接通完整Apple认证。F42沿用本机账户。正式上线前还需审核隐私文案、账号规则和素材授权。

原生主体Objective-C，StoreKit2后端保留Swift，与此前方案一致。昵称、多语言、玩法、动画和音乐沿用各款最新源码，本轮未改变中奖规则，也未宣称全部页面/设备/长期运行均已验收。最低部署15.4，本轮实测17.5模拟器，未测最低系统真机。

verification.json记录每款结果。原始日志及xcresult保存在仓库 tools/webp-iap/verification/f33plus-20261013，构建缓存不复制到桌面。
`);
const csv=key=>['game,bundle_id,product_id,type,credits,bonus,total,reference_price_usd',...manifest.flatMap(g=>g[key].map(p=>[g.id,g.bundle,p.appleProductId,'Consumable',p.credits,p.bonus,p.credits+p.bonus,p.debugPrice.replace(/[^0-9.]/g,'')].join(',')))].join('\n');
patch(join(output,'products.csv'),csv('products'));patch(join(output,'legacy-products.csv'),csv('legacyProducts'));
writeFileSync(join(output,'verification.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:games.map(g=>g.id),environment:{xcode:'26.3',simulator:'iPhone 11 / iOS 17.5',minimumIOS:'15.4',release:'unsigned arm64 iphoneos'},games:checks},null,2));
// Relative project paths keep the desktop and repository delivery byte-identical
// and allow future checks after moving the package to another machine.
patch(join(output,'manifest.json'),JSON.stringify(manifest.map(g=>({...g,project:isAbsolute(g.project)?relative(output,g.project):g.project})),null,2));
const desktop='/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_F33plus_20261013';
assert.ok(!existsSync(desktop),'Desktop destination already exists; preserve user changes');mkdirSync(join(desktop,'..'),{recursive:true});cpSync(output,desktop,{recursive:true});
const original=walk(output).map(f=>relative(output,f)).sort(),copied=walk(desktop).map(f=>relative(desktop,f)).sort();assert.deepEqual(copied,original);
for(const file of original){const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');assert.equal(hash(join(output,file)),hash(join(desktop,file)),'Copy mismatch '+file);}
console.log(JSON.stringify({delivered:desktop,games:manifest.length,files:original.length,webp:images,webBeforeMiB:mib(before),webAfterMiB:mib(after),verifiedHashCopy:true}));
