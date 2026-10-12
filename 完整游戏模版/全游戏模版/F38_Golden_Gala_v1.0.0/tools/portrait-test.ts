import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PORTRAITS,PORTRAIT_PICKER as L,portraitSeat,canonicalPortraitIndex,PORTRAIT_TRANSLATIONS} from '../assets/scripts/ui/PortraitCatalog';
import {LANGUAGES,setLanguage,tr} from '../assets/scripts/ui/Language';
import {fittedText,textGlyphs} from '../assets/scripts/ui/TextLayout';
import {MemoryStorage,SaveService} from '../assets/scripts/services/SaveService';
import {LocalAuthService} from '../assets/scripts/services/LocalAuthService';
import {PlayerProfileService} from '../assets/scripts/services/PlayerProfileService';
import {TERMS_VERSION,PRIVACY_VERSION} from '../assets/scripts/core/ReleaseConfig';

async function main(){
  assert.equal(PORTRAITS.length,4);assert.equal(new Set(PORTRAITS.map(p=>p.index)).size,4);
  assert.equal(new Set(PORTRAITS.map(p=>p.label)).size,4);
  for(let i=0;i<16;i++){
    const selected=canonicalPortraitIndex(i);assert.equal(selected,i%4);
    assert.equal(PORTRAITS.filter(p=>p.index===selected).length,1,'old IDs must select exactly one visible choice');
  }
  for(const invalid of [-1,16,NaN,Infinity,.5,Number.MAX_SAFE_INTEGER])assert.equal(canonicalPortraitIndex(invalid),0);
  for(const p of PORTRAITS){
    const seat=portraitSeat(p.index),rimTop=seat.y+L.medallionY+L.medallionSize/2;
    assert(rimTop<L.height/2-245-76/2,'rim clears title');
    assert(seat.y+L.selectedY-L.selectedHeight/2>L.hintY+L.hintHeight/2,'status clears hint');
    assert(Math.abs(seat.x)+L.hitWidth/2<978/2,'hit box remains in dialog');
    assert(L.medallionY-L.medallionSize/2>L.nameY+L.nameHeight/2,'name below rim');
    assert(L.nameY-L.nameHeight/2>L.selectedY+L.selectedHeight/2,'status below name');
    for(const width of [320,360,390,430])assert(L.hitWidth*width/1080>=44&&L.hitHeight*width/1080>=44);
  }
  const row=portraitSeat(0),below=portraitSeat(2);
  assert(row.y-L.hitHeight/2>below.y+L.hitHeight/2,'row hit areas do not overlap');
  assert(portraitSeat(0).x+L.hitWidth/2<portraitSeat(1).x-L.hitWidth/2);
  const measure=(v:string,s:number)=>textGlyphs(v).reduce((n,c)=>n+(/[^\u0000-\u007f]/.test(c)?1:.62)*s,0);
  for(const language of LANGUAGES){setLanguage(language.code);
    for(const p of PORTRAITS){
      const value=tr(p.label);if(language.code!=='en')assert.notEqual(value,p.label);
      const fit=fittedText(value,{width:L.nameWidth-12,height:L.nameHeight-10,maximum:38,wrap:false,leading:1.22,measure});
      assert.equal(fit.text,value);assert(fit.size>=28,'labels stay readable on small phones');
    }
    const status=fittedText(tr('Current portrait'),{width:L.selectedWidth-12,height:L.selectedHeight-10,maximum:32,wrap:false,leading:1.22,measure});
    assert(status.size>=28,'current marker remains readable, not shrunk inside a decorative plate');
    for(const key of Object.keys(PORTRAIT_TRANSLATIONS))assert(language.code==='en'||tr(key)!==key);
  }setLanguage('en');
  const art=readFileSync('assets/scripts/ui/SalonArt.ts','utf8');
  assert(art.indexOf("name === 'portraits'")<art.indexOf('const key ='), 'canonicalize before sprite cache');
  const source=readFileSync('assets/scripts/ui/AureliaApp.ts','utf8');
  const picker=source.slice(source.indexOf('private avatars()'),source.indexOf('private history()'));
  assert(picker.includes('for(const choice of PORTRAITS)'));assert(!picker.includes("'interfaces'"));
  assert(picker.includes("this.audio.play('confirm')"));assert(!picker.includes("this.audio.play('win')"));
  assert(picker.includes('if(this.busy)return;'));assert(picker.includes('generation===this.generation'));

  class FallibleStorage extends MemoryStorage {fail=false;override setItem(k:string,v:string){if(this.fail)throw new Error('full');super.setItem(k,v);}}
  const storage=new FallibleStorage(),save=new SaveService(storage);
  save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);assert((await new LocalAuthService(save).guestLogin()).ok);
  const profile=new PlayerProfileService(save),uid=profile.current()!.id;
  for(const p of PORTRAITS){
    assert(await profile.setAvatar(p.index));const loaded=new PlayerProfileService(new SaveService(storage));
    assert.equal(loaded.current()!.avatar,p.index);assert.equal(loaded.current()!.id,uid);
  }
  assert(await profile.setAvatar(15));assert.equal(canonicalPortraitIndex(profile.current()!.avatar),3);
  assert.equal(new PlayerProfileService(new SaveService(storage)).current()!.avatar,15,'render mapping must not rewrite legacy storage');
  const failed=new PlayerProfileService(save,{updateProfile:async()=>{throw new Error('offline');}});
  assert.equal(await failed.setAvatar(1),false);assert.equal(profile.current()!.avatar,15);
  assert.equal(new PlayerProfileService(new SaveService(storage)).current()!.avatar,15);
  storage.fail=true;await assert.rejects(profile.setAvatar(0));assert.equal(profile.current()!.avatar,15);storage.fail=false;
  for(const invalid of [-1,16,.5,NaN])assert.equal(await profile.setAvatar(invalid),false);
  assert(await profile.setAvatar(0));assert.equal(profile.current()!.settings.music,true);
  const auth=new LocalAuthService(save);assert((await auth.register({username:'portrait_test',nickname:'PortraitTester',password:'portrait-test-123',confirmPassword:'portrait-test-123',acceptedTerms:true})).ok);const nextUid=profile.current()!.id;
  assert.notEqual(nextUid,uid);assert(await profile.setAvatar(2));assert.equal(save.read().players[uid].avatar,0,'account choices isolated');
  console.log('PASS portraits: four unique 2×2 choices; all 16 legacy IDs; five locales; mobile hit targets; non-overlapping text; shared frame mapping; persistence, remote/storage failure rollback and account isolation.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
