import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readdir, readFile, stat, realpath, writeFile, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join, resolve, extname} from 'node:path';
import {pipeline} from 'node:stream/promises';

const base=fileURLToPath(new URL('../../完整游戏模版/全游戏模版/',import.meta.url));
const output=await mkdtemp(join(tmpdir(),'slots-preview-all.'));
const ids=Array.from({length:21},(_,i)=>i+13).filter(id=>id!==32);
const names=await readdir(base);
const games=[];
const servers=[];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.m4a':'audio/mp4','.aac':'audio/aac','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mp4':'video/mp4','.wasm':'application/wasm','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.map':'application/json','.bin':'application/octet-stream'};
const listen=server=>new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',fail);servers.push(server);ok(server.address().port);});});
for(const id of ids){
  const candidates=names.filter(n=>n.startsWith(`F${id}_`)&&n.includes('_v'));
  const name=id===25?candidates.find(n=>n.includes('_Cocos_')):id===14?candidates.find(n=>n.endsWith('_good')):candidates[0];
  if(!name)throw new Error(`Missing F${id}`);
  const project=join(base,name);
  const dir=await realpath(join(project,id===26?'dist':'build/web-mobile'));
  await stat(join(dir,'index.html'));
  const preview=![25,26,27].includes(id);
  const config=preview?await readFile(join(project,id===28?'assets/scripts/core/Modes.ts':'assets/scripts/math/GameConfigs.ts'),'utf8'):'';
  const cabinets=[...new Set([...config.matchAll(/\bid\s*:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]))];
  if(preview&&cabinets.length!==4)throw new Error(`F${id}: expected four cabinet IDs, got ${cabinets.length}`);
  const game={id,name:name.replace(/^F\d+_/,'').replace(/_v.*$/,'').replaceAll('_',' '),dir,requests:0,failures:[],preview,cabinets};
  const server=createServer(async(req,res)=>{
    try{
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
      if(pathname.includes('\0'))throw Object.assign(new Error('Invalid path'),{code:'EINVAL'});
      let file=resolve(dir,'.'+pathname);
      if(file!==dir&&!file.startsWith(dir+'/'))throw Object.assign(new Error('Outside root'),{code:'EINVAL'});
      let info=await stat(file);
      if(info.isDirectory()){file=join(file,'index.html');info=await stat(file);}
      const actual=await realpath(file);
      if(!actual.startsWith(dir+'/')||!info.isFile())throw Object.assign(new Error('Not a resource'),{code:'ENOENT'});
      game.requests++;
      const headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
      let start=0,end=info.size-1,status=200;
      if(req.headers.range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!match||(!match[1]&&!match[2])){res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`});res.end();return;}
        if(match[1]){start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;}
        else start=Math.max(0,info.size-Number(match[2]));
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`});res.end();return;}
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
      }
      headers['Content-Length']=Math.max(0,end-start+1);
      res.writeHead(status,headers);
      if(req.method==='HEAD'||!info.size){res.end();return;}
      await pipeline(createReadStream(file,{start,end}),res);
    }catch(error){
      if(error.code==='ERR_STREAM_PREMATURE_CLOSE'||res.destroyed)return;
      game.failures.push({path:req.url,code:error.code||error.message});
      if(game.failures.length>100)game.failures.shift();
      if(!res.headersSent){res.writeHead(error.code==='EINVAL'?400:404,{'Content-Type':'text/plain'});res.end('Not found');}
      else res.destroy();
    }
  });
  const port=await listen(server);
  game.url=`http://127.0.0.1:${port}/`;
  games.push(game);
}
const publicGames=games.map(({id,name,url,preview,cabinets})=>({id,name,url,preview,cabinets}));
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>F13–F33 游戏预览</title><style>
*{box-sizing:border-box}body{margin:0;background:#141915;color:#ede8d9;font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}header{padding:15px 20px;border-bottom:1px solid #394638;background:#1d271f;display:flex;align-items:center;gap:14px;flex-wrap:wrap}h1{font-size:19px;margin:0}header small{color:#b4c7b4}main{height:calc(100dvh - 63px);display:grid;grid-template-columns:230px 1fr}aside{padding:16px 12px;overflow:auto;border-right:1px solid #394638}aside p{font-size:12px;line-height:1.6;color:#b8c4b2;margin:0 6px 14px}nav{display:grid;gap:5px}button,select,a{font:inherit}button{border:1px solid #425242;background:#222e25;color:#dddccf;border-radius:8px;padding:9px 10px;cursor:pointer}button:hover{background:#334838}nav button{text-align:left;display:flex;gap:10px;align-items:center;min-height:44px}nav strong{color:#edce80;min-width:31px}nav span{font-size:12px}nav button[aria-pressed=true]{border-color:#dab765;background:#3c422c;color:#fff}section{min-height:0;display:flex;flex-direction:column;padding:12px 18px;align-items:center;gap:10px}.toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%;justify-content:center}.toolbar a{color:#e8cc89;text-decoration:none;margin:0 6px}.toolbar select{color:#eee;background:#28352a;border:1px solid #425242;padding:8px;border-radius:8px}#stage{height:100%;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}iframe{height:100%;max-height:844px;width:auto;aspect-ratio:390/844;border:1px solid #465642;border-radius:10px;background:#090d0a;max-width:100%}#caption{font-size:12px;color:#bec9b6;text-align:center;margin:0}#title{font-size:14px;min-width:210px;text-align:center}.missing{color:#83927d!important;border:1px dashed #394638;padding:9px;border-radius:7px;margin:10px 0 0!important}@media(max-width:700px){header{padding:10px}header small{display:none}main{height:calc(100dvh - 46px);grid-template-columns:1fr;grid-template-rows:auto 1fr}aside{padding:8px;border-right:0;border-bottom:1px solid #394638}aside p,.missing{display:none}nav{display:flex;overflow:auto;gap:6px}nav button{min-width:58px;min-height:38px;justify-content:center}nav span{display:none}section{padding:8px;gap:7px}.toolbar{gap:5px}#title{min-width:0}iframe{border-radius:4px}.toolbar button{padding:7px}}</style></head><body><header><h1>F13–F33 游戏预览</h1><small>20 款已启动 · 每次加载一款 · 各游戏预览数据独立</small></header><main><aside><p>点击游戏编号切换。进入柜机后点击 SPIN 试玩；音效需在游戏内点击后启动。</p><nav aria-label="游戏列表"></nav><p class="missing">F32：仓库中未找到</p></aside><section><div class="toolbar"><button id="prev" aria-label="上一款">上一款</button><strong id="title"></strong><button id="next" aria-label="下一款">下一款</button><select id="entry" aria-label="运行入口"><option value="preview">大厅预览</option><option value="golden-hour">柜机 1</option><option value="jade-treasury">柜机 2</option><option value="pearl-palace">柜机 3</option><option value="ruby-revel">柜机 4</option><option value="normal">正常入口</option></select><button id="reload">重载</button><a id="open" target="_blank" rel="noopener">单独打开</a></div><div id="stage"></div><p id="caption" aria-live="polite"></p></section></main><script>
const games=${JSON.stringify(publicGames)};let current=0;const nav=document.querySelector('nav'),stage=document.querySelector('#stage'),entry=document.querySelector('#entry');
function show(index){current=(index+games.length)%games.length;const g=games[current];for(const b of nav.children)b.setAttribute('aria-pressed',String(Number(b.dataset.id)===g.id));document.querySelector('#title').textContent='F'+g.id+' · '+g.name;const options=[...entry.options];const cabinetIndex=Math.max(0,options.findIndex(o=>o.value===entry.value)-1);for(let i=1;i<=4;i++){options[i].disabled=!g.preview;options[i].value=g.cabinets[i-1]||'cabinet-'+i;}if(!['preview','normal'].includes(entry.value))entry.selectedIndex=cabinetIndex+1;const url=g.url+(g.preview&&entry.value!=='normal'?(entry.value==='preview'?'?debug=1&screen=home':'?debug=1&screen=game&game='+encodeURIComponent(entry.value)):'');const old=stage.querySelector('iframe');if(old){old.src='about:blank';old.remove();}const frame=document.createElement('iframe');frame.title='F'+g.id+' 游戏';frame.allow='autoplay; fullscreen';frame.src=url;stage.append(frame);document.querySelector('#open').href=url;document.querySelector('#caption').textContent=g.preview&&entry.value!=='normal'?'本地动态预览；音乐需要点击游戏内按钮启动，可切换正常入口检查登录。':'正常入口：请按原有游客/协议流程进入，年龄确认需你本人操作。';history.replaceState(null,'','#F'+g.id);}
for(const g of games){const b=document.createElement('button');b.dataset.id=g.id;b.setAttribute('aria-label','F'+g.id+' '+g.name);const strong=document.createElement('strong');strong.textContent='F'+g.id;const span=document.createElement('span');span.textContent=g.name;b.append(strong,span);b.addEventListener('click',()=>show(games.indexOf(g)));nav.append(b);}
document.querySelector('#prev').onclick=()=>show(current-1);document.querySelector('#next').onclick=()=>show(current+1);document.querySelector('#reload').onclick=()=>show(current);entry.onchange=()=>show(current);const requested=Number(location.hash.replace('#F',''));const initial=games.findIndex(g=>g.id===requested);show(initial<0?0:initial);
</script></body></html>`;
const hub=createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const data=pathname==='/api/games'?JSON.stringify(publicGames):pathname==='/api/status'?JSON.stringify(games.map(({id,requests,failures})=>({id,requests,failures}))):pathname==='/'?html:null;
  if(data===null){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':pathname==='/'?'text/html; charset=utf-8':'application/json','Cache-Control':'no-store','Content-Length':Buffer.byteLength(data)});res.end(req.method==='HEAD'?undefined:data);
});
const hubPort=await listen(hub);
const manifest={hub:`http://127.0.0.1:${hubPort}/`,games:publicGames};
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{for(const server of servers)server.closeAllConnections();for(const server of servers)server.close();process.exit(0);});
