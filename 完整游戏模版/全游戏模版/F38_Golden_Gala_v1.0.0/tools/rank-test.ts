import assert from 'node:assert/strict';
import { GameBootstrap } from '../assets/scripts/core/GameBootstrap';
import { PRIVACY_VERSION, TERMS_VERSION } from '../assets/scripts/core/ReleaseConfig';
import { LocalAuthService } from '../assets/scripts/services/LocalAuthService';
import { RankService, hallStandings } from '../assets/scripts/services/RankService';
import { createPlayerScope, MemoryStorage, SaveService } from '../assets/scripts/services/SaveService';

const main=async():Promise<void>=>{
  const save=new SaveService(new MemoryStorage());
  save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);
  const auth=new LocalAuthService(save);
  const first=await auth.guestLogin();
  assert(first.ok&&first.player,'Guest login failed');
  const guestId=first.player.id;
  save.update(state=>{state.players[guestId].totalWin=1_250;state.players[guestId].biggestWin=750;});

  const second=await auth.guestLogin();
  assert(second.ok&&second.player,'Guest resume failed');
  assert.equal(second.player.id,guestId,'Guest refresh created a new profile');
  assert.equal(second.player.totalWin,1_250,'Guest refresh lost ranking totals');

  save.update(state=>{
    state.players['player-local']={...state.players[guestId],id:'player-local',username:'local_member',nickname:'Local Member',isGuest:false,signInProvider:'password',totalWin:2_400,biggestWin:1_100};
    state.playerData['player-local']=createPlayerScope();
    state.players['guest-stale']={...state.players[guestId],id:'guest-stale',username:'guest_stale',nickname:'Stale Guest',totalWin:99_999};
    state.playerData['guest-stale']=createPlayerScope();
  });

  const rows=new RankService(undefined,save).list('all-time',save.read().players[guestId]);
  assert.deepEqual(rows.map(row=>[row.rank,row.nickname,row.winnings,row.current]),[
    [1,'Local Member',2_400,false],
    [2,'Collector',1_250,true],
  ]);
  assert.equal(await new GameBootstrap(save).resumeSession(),true,'Guest session did not survive a reload');
  console.log('PASS  Guest totals persist and on-device ranking is sorted from real saved profiles.');
};

void main();

const characters=hallStandings([]);
assert.equal(characters.length,8);
const top=characters[0].winnings;
const player={rank:1,nickname:'Player',winnings:top,avatar:6,current:true};
assert(hallStandings([player])[0].current,'Real player wins score ties');
assert.equal(hallStandings([{...player,winnings:0}]).find(r=>r.current)?.rank,9);
assert.equal(player.rank,1,'Display must not mutate real standings');
assert(hallStandings([player]).every((r,i,a)=>r.rank===i+1&&(!i||a[i-1].winnings>=r.winnings)));

assert.deepEqual(characters.map(r=>r.nickname),['Gala Host','Emerald Patron','Ruby Duchess','Crown Keeper','Golden Dealer','Vault Curator','Ruby Collector','Grand Treasurer']);
assert.deepEqual(characters.map(r=>r.winnings),[78844,58976,43608,30940,19172,11004,5536,1868]);
assert(characters.every(r=>r.virtual&&!r.current));
const sameName={...player,nickname:'Gala Host'};
const matching=hallStandings([sameName]).filter(r=>r.nickname===sameName.nickname);
assert.equal(matching.length,2);assert.equal(matching[0].virtual,false);assert.equal(matching[1].virtual,true);
assert.equal(sameName.nickname,'Gala Host','Do not localize or mutate saved user names');
console.log('PASS gala-themed virtual names, unchanged scores and separate real player identities.');
