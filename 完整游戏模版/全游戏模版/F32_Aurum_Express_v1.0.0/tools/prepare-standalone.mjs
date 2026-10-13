#!/usr/bin/env node
/** Creates an isolated Cocos project for one F32 game. Does not sign or submit. */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ids = ['coin-carousel','lantern-vault','lucky-parade','celestial-mint'];
const slug = { 'coin-carousel':'roulette-rail', 'lantern-vault':'golden-sleeper', 'lucky-parade':'high-roller', 'celestial-mint':'jackpot-engine' };
const args = process.argv.slice(2), flag = key => args[args.indexOf(key)+1];
const game = flag('--game'), out = flag('--out');
if (!ids.includes(game) || !out || !isAbsolute(out)) {
  console.error(`Usage: node tools/prepare-standalone.mjs --game <${ids.join('|')}> --out /absolute/new/project`);
  process.exit(2);
}
const destination=resolve(out);
if (destination===project || destination.startsWith(project+sep) || existsSync(destination)) {
  console.error('Output must be a new absolute directory outside the source project.'); process.exit(2);
}
mkdirSync(destination,{recursive:true});
const exclude=new Set(['build','library','temp','local','node_modules','work','docs','output','.creator','.git','.DS_Store']);
for(const entry of readdirSync(project,{withFileTypes:true})){
  if(exclude.has(entry.name))continue;
  cpSync(join(project,entry.name),join(destination,entry.name),{recursive:true,filter:src=>!exclude.has(basename(src))});
}
const change=(file,from,to)=>{
  const path=join(destination,file),source=readFileSync(path,'utf8');
  if(!source.includes(from))throw Error(`Missing expected build marker in ${file}`);
  writeFileSync(path,source.replaceAll(from,to));
};
change('assets/scripts/core/GameDistribution.ts','STANDALONE_GAME_ID: GameId | null = null',`STANDALONE_GAME_ID: GameId | null = '${game}'`);
const title=slug[game];
const packageName=`com.publisher.aurumexpress.f32.${title.replaceAll('-','')}`;
const iosPath=join(destination,'tools/ios-preview-build.json');
const config=JSON.parse(readFileSync(iosPath,'utf8'));
config.outputName=`ios-${title}`;
config.name=`f32-${title}`;
config.packages.ios.packageName=packageName;
config.packages.ios.bundleIdentifier=packageName;
writeFileSync(iosPath,JSON.stringify(config,null,2)+'\n');
const productPath='assets/scripts/services/StoreService.ts';
change(productPath,'com.publisher.aurumexpress.f32.coins',`${packageName}.coins`);
const pkgPath=join(destination,'package.json'),pkg=JSON.parse(readFileSync(pkgPath,'utf8'));
pkg.name=`f32-${title}`;writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
writeFileSync(join(destination,'STANDALONE-RELEASE-NOTES.md'),`# ${title} · isolated game source\n\nPlayable game locked to \`${game}\`; bundle ID set to \`${packageName}\`. This is a placeholder identifier, **not** a signed iOS app or App Store approval.\n\nOpen this project in Cocos Creator 3.8.8 and build using \`tools/ios-preview-build.json\`. Replace publisher-owned identity, product IDs, legal links, native StoreKit/Apple sign-in bridges and production API settings; verify on iOS devices, Sandbox and TestFlight. Give this app distinct product metadata, screenshots and a meaningful standalone experience; Apple may reject near-duplicate bundle IDs under guideline 4.3. Do not submit the four source copies as-is.\n`);
console.log(JSON.stringify({game,project:destination,bundleIdentifier:packageName,releaseReady:false},null,2));
