// Convert Cocos 3.8 Web Mobile resources to WebP and update their ImageAsset
// format metadata. Preserves source PNGs as a browser/debug fallback.
const fs=require('node:fs'),path=require('node:path');
let sharp;try{sharp=require('sharp');}catch{sharp=require(process.env.SHARP_MODULE||'/Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/sharp');}
const root=path.resolve(process.argv[2]||'build/web-mobile');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function change(value){if(!value||typeof value!=='object')return 0;if(value.fmt==='0'){value.fmt='4_0';return 1;}return Object.values(value).reduce((sum,item)=>sum+change(item),0);}
(async()=>{
  let originalBytes=0,webpBytes=0,count=0;
  for(const png of walk(path.join(root,'assets')).filter(p=>p.includes('/native/')&&p.endsWith('.png'))){
    const uuid=path.basename(png,'.png'),bundle=png.slice(0,png.indexOf('/native/'));
    const metadata=path.join(bundle,'import',uuid.slice(0,2),uuid+'.json');
    if(!fs.existsSync(metadata))continue;
    const data=JSON.parse(fs.readFileSync(metadata,'utf8'));
    if(!JSON.stringify(data).includes('"fmt":"0"'))continue;
    const original=fs.readFileSync(png);
    const encoded=await sharp(original).webp({quality:82,alphaQuality:100,effort:5}).toBuffer();
    if(encoded.length>=original.length)continue;
    const a=await sharp(original).metadata(),b=await sharp(encoded).metadata();
    if(a.width!==b.width||a.height!==b.height)throw Error('Image dimensions changed: '+png);
    const pixels=await sharp(original).ensureAlpha().raw().toBuffer();
    const decoded=await sharp(encoded).ensureAlpha().raw().toBuffer();
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==decoded[i])throw Error('Image alpha changed: '+png);
    if(change(data)!==1)throw Error('Unexpected Cocos ImageAsset metadata: '+metadata);
    fs.writeFileSync(png.replace(/\.png$/,'.webp'),encoded);
    fs.writeFileSync(metadata,JSON.stringify(data));
    originalBytes+=original.length;webpBytes+=encoded.length;count++;
  }
  const result={format:'WebP quality 82; PNG fallback retained',count,originalBytes,webpBytes,savedBytes:originalBytes-webpBytes};
  fs.mkdirSync(path.join(root,'reports'),{recursive:true});
  fs.writeFileSync(path.join(root,'reports/webp.json'),JSON.stringify(result,null,2));
  console.log(result);
})().catch(e=>{console.error(e);process.exitCode=1;});
