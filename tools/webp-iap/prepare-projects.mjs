import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {root,patch} from './install.mjs';
const out=join(root,'Xcode_H5/WebP_IAP_20261010');
const selected=process.argv.slice(2);
const items=JSON.parse(readFileSync(join(out,'manifest.json')));
for(const item of items.filter(i=>!selected.length||selected.includes(String(i.id)))){
 const file=join(item.project,'project.pbxproj');
 // StoreKit 2 and the games' structuredClone-based saves require a modern
 // iOS WebKit. Do not advertise an unsupported 15.0 deployment target.
 patch(file,readFileSync(file,'utf8').replaceAll('IPHONEOS_DEPLOYMENT_TARGET = 15.0;','IPHONEOS_DEPLOYMENT_TARGET = 15.4;'));
 const readme=join(out,item.folder,'README.md');
 patch(readme,readFileSync(readme,'utf8').replace('最低 iOS 15。','最低 iOS 15.4。'));
 item.minimumIOS='15.4';
 console.log('F'+item.id+': iOS 15.4 minimum, LocalTest/Release schemes preserved');
}
writeFileSync(join(out,'manifest.json'),JSON.stringify(items,null,2));
