import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {polishedFeedbackProfiles as profiles,polishedFeedbackRevision as revision,polishedEvidenceDirectory} from './polished-feedback-profiles.mjs';
const option=n=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3);
const read=f=>JSON.parse(readFileSync(f));
const out=join(import.meta.dirname,polishedEvidenceDirectory),install=read(join(out,'install.json')),audio=read(join(out,'decoded-audio.json'));
const ids=profiles.map(p=>p.id),installedAt=Date.parse(install.checkedAt);
assert.equal(install.revision,revision);assert.equal(audio.revision,revision);assert(audio.passed);
assert(Date.parse(audio.checkedAt)>=installedAt);assert.equal(audio.totalFiles,480);
assert.equal(install.nativeFilesChanged,false);assert.equal(audio.backgroundFilesUnchanged,60);
const evidence=join(out,'evidence');mkdirSync(evidence,{recursive:true});
function collect(kind,paths,key){
 assert(paths?.length,'Missing '+kind+' evidence');const rows=[];
 for(const [i,path] of paths.entries()){
  const r=read(path);assert(Date.parse(r.checkedAt)>=installedAt,kind+' predates final asset sync');
  const target=join(evidence,kind+'-'+(i+1)+'.json');copyFileSync(path,target);
  rows.push(...r[key].map(g=>({...g,evidence:target})));
 }
 rows.sort((a,b)=>a.id-b.id);assert.deepEqual(rows.map(g=>g.id),ids,'Incomplete '+kind);
 for(const g of rows)assert(g.passed,kind+' failed F'+g.id+' '+g.error);
 return rows;
}
const feedback=collect('feedback',option('feedback')?.split(','),'games');
const situations=collect('situations',option('situations')?.split(','),'games');
const native=collect('native',option('native')?.split(','),'results');
const audition=read(join(out,'audition.json'));
assert(audition.passed&&audition.revision===revision&&audition.files===480);
assert(Date.parse(audition.checkedAt)>=installedAt,'Audition predates final asset sync');
assert.deepEqual(audition.games.map(g=>g.id),ids,'Incomplete audition');
copyFileSync(join(out,'audition.json'),join(evidence,'audition.json'));
for(const r of native){assert(r.unsignedArm64Build&&r.copiedFiles>0);copyFileSync(r.log,join(evidence,`F${r.id}-native.log`));}
const old=read(join(import.meta.dirname,'verification/themed-feedback-20261010/final-report.json'));
const report={
 checkedAt:new Date().toISOString(),revision,scope:ids,missingRepositoryGame:32,
 implementation:{themeSuites:20,feedbackFilesPerGame:16,awardFilesPerGame:5,audioFilesChecked:480,
  correspondingAwardPrimaryCues:20,totalIndependentStockAwardCues:20,
  sourceCueReuseAcrossTiers:true,completeMusicalSources:true,stitchedMusicalPhrases:0,
  stereoMusicalCues:true,originalSpeed:true,originalPitch:true,
  roleBalancedFeedback:true,feedbackFirstTransientLimitMs:40,
  feedbackLeadInEdited:true,blanket6200HzLowPassRemoved:true,
  independentBackgroundWorks:40,unchangedBackgroundAndSpinFiles:60,
  extraRuntimeVoices:0,changedGameMath:false,changedIAPSigning:false,protectedNativeFiles:install.protectedNativeFiles,
  audioByteDeltaSinceIntermediateEdit:audio.games.reduce((sum,g)=>sum+g.deltaBytes,0)},
 listeningStatus:'Not yet human-listening accepted; no claim of twenty exclusive professional scores or certified premium listening quality.',
 limitations:[
  'Whole-cue selection/mastering from licensed stock, not newly commissioned commercial recordings.',
  'Twenty independent source cues are reassigned across award tiers. Corresponding roles are distinct across games; appropriate material can be shared across different roles.',
  'All twenty games tested in their first cabinet, plus isolated award, mute/background and credits fixtures. Not a full gameplay/probability test of all cabinets.',
  'Five supplied award files do not imply five actual award tiers in every game.',
  'No current-version human headphone/speaker listening or physical iPhone memory/frame-rate test.',
  'Unsigned arm64 Release builds and matching App resources do not verify signing, live StoreKit purchase or App Store acceptance.',
  'Audition page plays the stored file; in-game ducking, gain and polyphony still affect the final mix.',
  'No Git commit/push or purchase of commercial audio performed.',
 ],
 themes:audio.games,feedback,situations,native,audioAudit:audio,audition,
 assetSync:{report:join(out,'install.json'),backup:install.backup,backupBeforeTask:option('initial-backup'),targetsPerGame:4,audioCopiesChecked:audio.synchronizedAudioCopies},
 priorVersionReport:join(import.meta.dirname,'verification/themed-feedback-20261010/final-report.json'),
 feedbackMemory:{kind:'Decoded short-feedback PCM cache from browser fixture, not real-device total app RAM',
  games:feedback.map(g=>({id:g.id,currentBytes:g.sampleStatus.decodedBytes,priorBytes:old.feedback.find(p=>p.id===g.id)?.sampleStatus?.decodedBytes}))},
};
writeFileSync(join(out,'final-report.json'),JSON.stringify(report,null,2)+'\n');
for(const root of [resolve(import.meta.dirname,'../../Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010']){
 const manifest=read(join(root,'manifest.json'));assert.deepEqual(manifest.map(g=>g.id),ids);
 for(const row of manifest)assert.equal(row.feedbackThemeRevision,revision);
 writeFileSync(join(root,'成品音频整理验证.json'),JSON.stringify(report,null,2)+'\n');
}
console.log('PASS: final stock-cue edit / feedback / situations / unsigned native bundles: 20/20 each.');
console.log('Human listening remains pending. Report: '+join(out,'final-report.json'));
