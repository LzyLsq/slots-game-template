import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {themedFeedbackProfiles as profiles,themedFeedbackRevision as revision} from './themed-feedback-profiles.mjs';

const option=n=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3);
const read=f=>JSON.parse(readFileSync(f));
const out=join(import.meta.dirname,'verification/themed-feedback-20261010');
const ids=profiles.map(g=>g.id),install=read(join(out,'install.json')),audio=read(join(out,'decoded-audio.json'));
assert.equal(install.revision,revision);assert.equal(audio.revision,revision);
const installedAt=Date.parse(install.checkedAt);
assert(Number.isFinite(installedAt),'Missing installation timestamp');
assert(Date.parse(audio.checkedAt)>=installedAt,'Audio audit predates the latest asset sync');
assert.equal(audio.passed,true,'Waveform audit did not pass');
assert.equal(audio.uniqueFeedbackFiles,420);assert.equal(audio.uniqueFiles,480);
assert.equal(install.nativeFilesChanged,false);assert.equal(audio.backgroundFilesUnchanged,60);
const evidence=join(out,'evidence');mkdirSync(evidence,{recursive:true});
function collect(kind,paths,key){
 assert(paths&&paths.length,'Missing '+kind+' evidence');const rows=[];
 for(const [index,path]of paths.entries()){
  const result=read(path),file=join(evidence,kind+'-'+(index+1)+'.json');
  assert(Date.parse(result.checkedAt)>=installedAt,kind+' evidence predates the latest asset sync');
  copyFileSync(path,file);assert(Array.isArray(result[key]));
  rows.push(...result[key].map(g=>({...g,evidence:file})));
 }
 rows.sort((a,b)=>a.id-b.id);assert.deepEqual(rows.map(g=>g.id),ids,'Incomplete/duplicate '+kind+' results');
 for(const g of rows)assert(g.passed,kind+' failed F'+g.id+' '+g.error);
 return rows;
}
const feedback=collect('feedback',option('feedback')?.split(','),'games');
const situations=collect('situation',option('situations')?.split(','),'games');
const native=collect('native',[option('native')].filter(Boolean),'results');
const desktopAudit=collect('desktop-delivery',[join(out,'desktop-delivery.json')],'games');
const repoAudit=collect('repo-delivery',[join(out,'repo-delivery.json')],'games');
for(const result of native){assert(result.unsignedArm64Build&&result.copiedFiles>0);copyFileSync(result.log,join(evidence,`F${result.id}-native.log`));}
const roots=[resolve(import.meta.dirname,'../../Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
for(const dir of roots){const manifest=read(join(dir,'manifest.json'));assert.deepEqual(manifest.map(g=>g.id),ids);for(const g of manifest)assert.equal(g.feedbackThemeRevision,revision);}
const report={
 checkedAt:new Date().toISOString(),revision,scope:ids,missingRepositoryGame:32,
 implementation:{themeSuites:20,feedbackCuesPerGame:16,awardStingsPerGame:5,distinctFeedbackFiles:420,totalAudioFiles:480,
  independentBackgroundWorks:40,unchangedBackgroundAndSpinFiles:60,sourceRecordingsChecked:audio.sourceRecordingsChecked,
  distinctMaterialCombinationsPerCorrespondingCue:20,originalSampleSpeed:true,originalSamplePitch:true,offlineMixed:true,
  extraRuntimeVoices:0,changedGameMath:false,changedIAPSigning:false,protectedNativeFiles:install.protectedNativeFiles,
  audioByteDeltaSinceLastAssetSync:audio.games.reduce((sum,g)=>sum+g.deltaBytes,0)},
 limitations:[
  'Automated signal/playback tests are not a human-listening evaluation.',
  'Current browser interaction regressions cover each game\'s first cabinet and isolated payout fixtures, not complete four-cabinet gameplay or payout-probability testing.',
  'Theme labels describe sound-design intent; no claim of 420 original field recordings or custom-composed exclusive scores. Licensed CC0 source recordings are shared where appropriate.',
  'Five supplied short stings use each existing game tier mapping; not every game has five actual award tiers.',
  'No physical iPhone listening or memory/frame-rate measurements. Longer short stings can change PCM-cache occupancy despite unchanged voice/cache limits.',
  'Unsigned arm64 builds and bundle hash checks do not verify signing, live StoreKit payment or App Store review.',
  'F26 uses HTMLAudioElement for music. Playback/lifecycle and offline decoding are checked, not live WebAudio RMS.',
  'No Git commit or push performed in this task.'
 ],
 themes:audio.games,feedback,situations,native,deliveryAudits:{desktop:desktopAudit,repository:repoAudit},
 audioAudit:{report:join(out,'decoded-audio.json'),uniqueFiles:audio.uniqueFiles,correspondingCues:audio.comparisons,backgroundCopiesUnchanged:audio.unchangedBackgroundCopies},
 assetSync:{report:join(out,'install.json'),audioCopiesChecked:audio.synchronizedAudioCopies,backup:install.backup,originalBeforeTaskBackup:option('original-backup'),targetsPerGame:4,protectedNativeFiles:install.protectedNativeFiles}
};
writeFileSync(join(out,'final-report.json'),JSON.stringify(report,null,2)+'\n');
for(const dir of roots)writeFileSync(join(dir,'主题音效验证.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS: themed feedback / situation playback / current unsigned native bundles / both deliveries: 20/20 each.');
console.log('Final report: '+join(out,'final-report.json'));
