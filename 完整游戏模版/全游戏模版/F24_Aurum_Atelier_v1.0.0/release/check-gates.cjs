// F24 packaging and evidence check; passing static checks never implies Apple approval.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const status=JSON.parse(read('release/readiness.json')),config=JSON.parse(read('release/ios-release-build.json'));
const checks=[];
const check=(name,ok,detail)=>checks.push({name,ok,detail});
check('F24 iOS export identity',config.name==='f24-aurum-atelier'&&config.packages.ios.bundleIdentifier===status.candidateBundleId&&config.packages.ios.packageName===status.candidateBundleId,'Candidate App ID still requires publisher registration and signing.');
check('F24 launch scene',config.scenes?.length>0&&config.scenes.some(s=>s.uuid===config.startScene&&fs.existsSync(path.join(root,s.url.replace('db://','')))),'The configured launch scene must exist.');
const store=read('assets/scripts/services/StoreService.ts'),env=read('release/production.env.example');
const credits=JSON.parse(env.match(/^CSW_IAP_PRODUCTS=(.+)$/m)?.[1]??'{}');
let products=0,matched=true;
for(const row of store.split('\n')){const m=row.match(/appleProductId:'([^']+)',credits:([\d_]+),bonus:([\d_]+)/);if(m){products++;matched&&=credits[m[1]]===Number(m[2].replaceAll('_',''))+Number(m[3].replaceAll('_',''));}}
check('F24 server product totals',products===4&&Object.keys(credits).length===4&&matched,'Example server totals must exactly include each declared bonus.');
check('Production publisher configuration',!read('assets/scripts/core/ReleaseConfig.ts').includes('REPLACE_WITH_'),'Set legal identity, HTTPS API/policy/support URLs and contact.');
check('Native implementation evidence',status.requiresImplementation.length===0,status.requiresImplementation.join('; '));
check('Publisher registration/deployment evidence',status.requiresPublisherConfiguration.length===0,status.requiresPublisherConfiguration.join('; '));
check('Device/Sandbox/product acceptance evidence',status.requiresEvidence.length===0,status.requiresEvidence.join('; '));
check('F24 audit input wired',read('tools/release-audit.ts').includes("read('release/readiness.json')"),'The main audit must read F24 release evidence and report incomplete configuration as BLOCK.');
check('Submission gate explicitly reviewed',status.readyForSubmission===true,'Do not change this flag until every evidence item is resolved and reviewed.');
const failures=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?'PASS':'BLOCK'} ${c.name}\n  ${c.detail}`);
console.log(`\n${checks.length-failures.length}/${checks.length} F24 gates passed. ${failures.length?'Submission remains blocked.':'Static gate record complete; Apple review is still required.'}`);
process.exitCode=failures.length?1:0;
