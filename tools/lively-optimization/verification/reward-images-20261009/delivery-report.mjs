import {readFileSync,writeFileSync,existsSync,cpSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const out=import.meta.dirname,root=resolve(out,'../../../..'),base=join(root,'完整游戏模版/全游戏模版');
const ids=[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const read=f=>JSON.parse(readFileSync(f,'utf8'));
const nativeFirst='/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-native.AfiUqO/results.json';
const nativeRetest='/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-native.qj1xJQ/results.json';
cpSync(nativeFirst,join(out,'native-first-pass.json'));cpSync(nativeRetest,join(out,'native-F20-retest.json'));
const replacements=read(nativeRetest),native=read(nativeFirst).map(row=>replacements.find(r=>r.project===row.project)??row);
const checks=read(join(out,'checks.json'));
const reports=[
 ['common','/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.PGWPAm/results.json'],
 ['F27-F31','/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.ecjcwA/results.json'],
 ['F25','/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.Idh0Cs/results.json'],
 ['F31-final','/var/folders/_j/9pm8s1m52csb33rf6l_3flj80000gn/T/lively-build.LJmc6F/results.json'],
];
const buildRuns=reports.map(([name,path])=>{const data=read(path);cpSync(path,join(out,'build-'+name+'.json'));return {name,results:data};});
for(const id of [20,25]){
 const log=`/tmp/reward-art-F${id}-build-20261009.log`;
 if(existsSync(log))cpSync(log,join(out,`build-F${id}-full.log`));
}
const sources=read(join(out,'artwork-manifest.json'));
for(const [id,suffix,method] of [
 [25,'assets/resources/art/cabinet0.webp','Own theatre cabinet plaque; Rect(134,514,670,104); 9-slice'],
 [26,'public/art/victory-plaque.png','Own original marine victory plaque'],
 [28,'assets/resources/art/plaque.png','Existing own regatta plaque retained; no reward replacement necessary'],
]){
 const dir=readdirSync(base).find(n=>id===25?n.startsWith('F25_Velvet_Fortune_Cocos_'):n.startsWith(`F${id}_`));
 const path=join(base,dir,suffix);sources.push({id,original:relative(root,path),sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),method});
}
const browserQA=[
 {id:15,checks:['Super award screenshot','Collect closes overlay','Actual spin then back to lobby'],screenshots:['F15-super-phone.png','F15-home-after-spin.png']},
 {id:20,checks:['Local debug forced spin completes','Back to lobby responds; award-animation image not captured'],screenshots:['F20-after-spin-phone.png','F20-home-after-spin.png']},
 {id:25,checks:['Big award theme 0','Epic award theme 3','Collect closes overlay'],screenshots:['F25-big-phone.png','F25-epic-theme3-phone.png']},
 {id:26,checks:['Marine award and own ocean backdrop','Continue closes overlay'],screenshots:['F26-big-phone.png']},
 {id:27,checks:['All four original plaque silhouettes','Crown collect closes overlay'],screenshots:['F27-royal-mint-phone.png','F27-jade-phone.png','F27-diamond-phone.png','F27-crown-phone.png']},
 {id:28,checks:['Cabinet bitmap and retained themed plaque load','Real spin returned WIN 220, Net +200 without freezing'],screenshots:['F28-cabinet-phone.png','F28-after-spin-phone.png']},
 {id:31,checks:['All four plaques match runtime cabinet order','Collect closes overlay','Small award bitmap panel'],screenshots:['F31-coin-phone.png','F31-lantern-phone.png','F31-parade-phone.png','F31-celestial-phone.png','F31-small-phone.png']},
];
for(const item of browserQA)for(const file of item.screenshots)if(!existsSync(join(out,file)))throw Error('Missing proof: '+file);
if(checks.some(r=>!r.success)||native.some(r=>!r.simulatorBuild||!r.resources.match||r.serverTest===false))throw Error('Verification failed');
writeFileSync(join(out,'delivery.json'),JSON.stringify({date:'2026-10-09',ids,absentId:32,checks,buildRuns,native,artworkSources:sources,browserQA,
 caveats:['F27 npm test reports zero test cases; Cocos build and browser visual QA are separate evidence.','Browser QA is sampled, not all-device/all-flow coverage.','No real-device, sandbox IAP or Apple-login retest.','No F16 native shell was found; source and Web build updated only.','No Git commit or push.','PNG fallback remains in WebP build output; do not equate compressed image bytes with total app size.'],
 unchangedScope:['payout and settlement rules','account and sign-in','IAP','music content','mascot behavior'],
 incidentalFix:'Independent F20 old H5LocalServer: audio MIME/byte Range/SO_NOSIGPIPE; retest passed.'},null,2));
writeFileSync(join(out,'README.md'),`# 中奖主题原画交付记录 · 2026-10-09

完成范围：F13–F21、F22–F31、F33，共20款；仓库没有F32。

## 改了什么

- 以各游戏现有高清原画替代中奖纯色卡片。共用项目使用原画分段绘制、独立文字与点击热区，避免左右雕花被横向拉长。
- F25 使用自身剧院柜机的金色铭牌；F26 使用海洋胜利牌和舱室背景；F27/F31 用图形遮罩去除原牌周围背景，源图片不被破坏。
- F31 修正了四款奖牌与实际柜机顺序的映射。
- F24 已有高清整场演出保留，只更新小奖/领取牌；F28 已有主题原画保留，不作重复替换。
- 没有生成AI图片，没有使用CC Switch。原画来源及SHA256见 delivery.json、artwork-manifest.json。
- 没有更改中奖规则、结算、用户、登录、内购、音乐内容或吉祥物行为。

## 构建与同步

- 20款的Web输出已构建。全量项目检查${checks.length}项通过，详见 checks.json 和对应日志。
- F27的 npm test 虽然退出成功，但实际包含0个用例，不能视作单元测试覆盖。
- 9款、10个已有Xcode工程已同步Web资源（F20有两份）；模拟器编译全部通过，复制资源逐文件SHA256一致。
- F13/14/15/17/18/19/20/21位于 Xcode_H5/F13-F21_20260914；F20独立版位于 Xcode_H5/F20_Golden_Canopy_OC_StoreKit2_Xcode；F26位于原游戏 ios 目录。
- 没找到F16的Xcode壳，F16只完成源码及Web构建。没有为F22–F33新建壳，F26为已有例外。
- F20独立版旧本地音频服务缺少Range支持，已补MIME、206/416字节读取和SO_NOSIGPIPE。两份F20均重测通过；保留首次失败记录与重测记录。
- WebP和资源引用已沿用/更新，PNG fallback仍保留；不把WebP文件字节数当作总包体积。

## 实际运行证据

- 390×844浏览器抽查：F15/F20/F25/F26/F27/F28/F31，截图就在本目录。
- F15真实转轴后返回大厅正常；F15/F25/F26/F27/F31的领奖关闭已抽查。
- F27/F31四个柜机主题逐一核对，F31的小奖也检查了。
- F15此前的小屏多主题证据在 ../reward-theme-20261009/。
- awardPreview仅用于localhost视觉预览，不下注、不结算、不加金币，不是正式中奖流程的替代测试。
- 没有完成所有20款的每个页面、所有手机型号、真机、苹果登录或沙盒内购回归；不能声称已验证这些。

## 如何看效果

当前预览总入口：http://127.0.0.1:50634/ （需本地预览进程仍运行）。

正常游戏不加 awardPreview 参数。源码与Web构建保存在完整游戏模版/全游戏模版，各Cocos项目为 build/web-mobile；F26为 dist。

未提交、未推送Git，保留工作树其他既有修改。
`);
if(process.env.SHARP_MODULE){
 const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE);
 const selected=[['F15 · Honey Parade','F15-super-phone.png'],['F26 · Fortune Tides','F26-big-phone.png'],['F27 · Royal Mint','F27-royal-mint-phone.png'],['F31 · Lantern Vault','F31-lantern-phone.png']];
 const width=240,height=519,gap=12,header=36,composites=[];
 for(let i=0;i<selected.length;i++){
  const [name,file]=selected[i],left=gap+i*(width+gap);
  composites.push({input:await sharp(join(out,file)).resize(width,height).png().toBuffer(),left,top:header});
  composites.push({input:Buffer.from('<svg width="240" height="36"><text x="120" y="23" text-anchor="middle" fill="#F4DCA0" font-family="Arial" font-size="14">'+name+'</text></svg>'),left,top:0});
 }
 await sharp({create:{width:selected.length*(width+gap)+gap,height:height+header+gap,channels:4,background:'#171315'}}).composite(composites).png().toFile(join(out,'reward-overview.png'));
}
console.log(JSON.stringify({games:ids.length,checks:checks.length,nativeProjects:native.length,allPassed:true,report:join(out,'README.md')},null,2));
