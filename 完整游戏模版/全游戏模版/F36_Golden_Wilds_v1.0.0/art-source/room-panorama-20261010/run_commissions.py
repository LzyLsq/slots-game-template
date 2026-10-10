"""Use the bundled imagegen CLI through CC Switch's selected Codex provider.
Credentials stay in the child environment. No provider/global config changes.
"""
from pathlib import Path
import json,os,re,sqlite3,subprocess,concurrent.futures,sys
HERE=Path(__file__).resolve().parent
con=sqlite3.connect(f'file:{Path.home()}/.cc-switch/cc-switch.db?mode=ro',uri=True)
row=con.execute('select settings_config from providers where app_type=? and is_current=1',('codex',)).fetchone();con.close()
if not row:raise RuntimeError('No selected CC Switch provider')
settings=json.loads(row[0]);m=re.search(r'base_url\s*=\s*"([^"]+)"',settings['config'])
if not m:raise RuntimeError('Selected provider has no endpoint')
env=os.environ.copy();env['OPENAI_BASE_URL']=m.group(1).rstrip('/');env['OPENAI_API_KEY']=settings['auth']['OPENAI_API_KEY']
cli=Path.home()/'.codex/skills/.system/imagegen/scripts/image_gen.py'
jobs=json.loads(Path(sys.argv[1]).read_text())
if len(sys.argv)>2:jobs=[j for j in jobs if j['id'] in sys.argv[2:]]
def run(j):
 out=Path(j['out']);out.parent.mkdir(parents=True,exist_ok=True)
 cmd=['/tmp/f36-image-api-env/bin/python',str(cli),'edit','--model','gpt-image-2','--image',j['image'],'--prompt-file',j['prompt'],'--size',j['size'],'--quality','high','--out',str(out),'--no-augment','--force']
 if j.get('mask'):cmd+=['--mask',j['mask']]
 with (HERE/(j['id']+'-generation.log')).open('w') as log:
  code=subprocess.run(cmd,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
 print(j['id'],'OK' if code==0 else 'FAILED',flush=True)
 return code
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:codes=list(pool.map(run,jobs))
if any(codes):raise SystemExit(1)
