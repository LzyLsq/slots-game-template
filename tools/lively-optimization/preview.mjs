import {createServer} from 'node:http';
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {profiles} from './profiles.mjs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),base=join(root,'完整游戏模版/全游戏模版'),port=Number(process.argv[2]||51313),tides=process.argv.includes('--tides');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.m4a':'audio/mp4','.wasm':'application/wasm','.ttf':'font/ttf'};
createServer((req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),parts=decodeURIComponent(url.pathname).split('/').filter(Boolean);
 const id=tides?26:Number(parts.shift()?.replace(/^F/,'')),p=profiles.find(p=>p.id===id);if(!p){res.writeHead(404);res.end();return;}
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_${p.slug}_v`))),dir=id===26?project:join(project,'build/web-mobile');
 if(id===26&&parts[0]==='art')parts.unshift('public');
 let file=resolve(dir,parts.join('/')||'index.html');if(file!==dir&&!file.startsWith(dir+'/'))throw Error('outside preview');if(existsSync(file)&&statSync(file).isDirectory())file=join(file,'index.html');
 const data=readFileSync(file),size=data.length;res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('Accept-Ranges','bytes');
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){const start=Number(range[1]),end=range[2]?Math.min(size-1,Number(range[2])):size-1;if(start>=size){res.writeHead(416);res.end();return;}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));}else{res.writeHead(200,{'Content-Length':size});res.end(data);}
 }catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Preview http://127.0.0.1:${port}/ (loopback only)`));
