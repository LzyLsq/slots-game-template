"""Invoke the bundled image edit CLI with the current CC Switch provider; never print keys."""
from pathlib import Path
import os,sqlite3,json,re,subprocess,concurrent.futures,sys
ROOT=Path(__file__).resolve().parents[2]
DB=Path.home()/'.cc-switch/cc-switch.db'
if not DB.exists():DB=Path.home()/'.cc-switch/cc-switch.db'
con=sqlite3.connect(DB)
row=con.execute("select settings_config from providers where app_type=? and is_current=1",('codex',)).fetchone()
if not row:raise RuntimeError('No current CC Switch Codex provider')
data=json.loads(row[0]);match=re.search(r'base_url\s*=\s*"([^"]+)"',data['config'])
env=os.environ.copy();env['OPENAI_BASE_URL']=match.group(1).rstrip('/');env['OPENAI_API_KEY']=data['auth']['OPENAI_API_KEY']
CLI=Path.home()/'.codex/skills/.system/imagegen/scripts/image_gen.py'
def run(mode):
 out=ROOT/'art-source/guardian-integration'/f'{mode}-integrated.png'
 cmd=['/tmp/f36-image-api-env/bin/python',str(CLI),'edit','--model','gpt-image-2','--image',str(ROOT/'assets/resources/art'/f'{mode}-environment.png'),'--mask',str(ROOT/'art-source/guardian-integration'/f'{mode}-mask.png'),'--prompt-file',str(ROOT/'art-source/guardian-integration'/f'{mode}-prompt.txt'),'--size','1024x1536','--quality','high','--out',str(out),'--no-augment','--force']
 log=ROOT/'art-source/guardian-integration'/f'{mode}-generation.log'
 with log.open('w') as f:code=subprocess.run(cmd,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
 print(mode,'OK' if code==0 else 'FAILED',flush=True)
 return code
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 codes=list(pool.map(run,sys.argv[1:] or ['sun-lion','emerald-elephant','lotus-koi','moon-fox']))
if any(codes):raise SystemExit(1)
