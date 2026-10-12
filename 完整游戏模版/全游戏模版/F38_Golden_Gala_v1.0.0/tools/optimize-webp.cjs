// Cocos 3.8 ImageAsset format IDs: 4 = WebP, 0 = PNG. Keep PNG as browser fallback.
const fs=require('node:fs'),path=require('node:path');
let sharp;try{sharp=require('sharp');}catch{sharp=require(process.env.SHARP_MODULE||'/Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/sharp');}
const root=path.resolve(process.argv[2]||'build/web-mobile');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function change(value){let n=0;if(!value||typeof value!=='object')return 0;if(value.fmt==='0'){value.fmt='4_0';return 1;}for(const v of Object.values(value))n+=change(v);return n;}
(async()=>{
 let before=0,after=0;const images=[];
 for(const png of walk(path.join(root,'assets')).filter(p=>p.includes('/native/')&&p.endsWith('.png'))){
  const uuid=path.basename(png,'.png'),bundle=png.slice(0,png.indexOf('/native/'));
  const metadata=path.join(bundle,'import',uuid.slice(0,2),uuid+'.json');if(!fs.existsSync(metadata))continue;
  const data=JSON.parse(fs.readFileSync(metadata,'utf8'));if(!JSON.stringify(data).includes('"fmt":"0"'))continue;
  const original=fs.readFileSync(png),encoded=await sharp(original).webp({lossless:true,effort:4}).toBuffer();
  if(encoded.length>=original.length)continue;
  const a=await sharp(original).ensureAlpha().raw().toBuffer(),b=await sharp(encoded).ensureAlpha().raw().toBuffer();
  if(a.length!==b.length)throw Error('Image dimensions changed: '+png);
  for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3]||(a[i+3]!==0&&(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])))throw Error('Visible pixels changed: '+png);}
  if(change(data)!==1)throw Error('Unexpected Cocos ImageAsset metadata: '+metadata);
  fs.writeFileSync(png.replace(/\.png$/,'.webp'),encoded);fs.writeFileSync(metadata,JSON.stringify(data));
  before+=original.length;after+=encoded.length;images.push({asset:uuid,png:original.length,webp:encoded.length});
 }
 const report={format:'lossless WebP with PNG fallback',pixelVerification:'All visible RGB pixels and every alpha value match source PNG',images:images.length,originalBytes:before,webpBytes:after,savedBytes:before-after,assets:images};
 fs.mkdirSync(path.join(root,'reports'),{recursive:true});fs.writeFileSync(path.join(root,'reports/webp.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,assets:undefined},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
