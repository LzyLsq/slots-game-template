import assert from 'node:assert/strict';
import { GameBootstrap } from '../assets/scripts/core/GameBootstrap';
import { PRIVACY_VERSION, TERMS_VERSION } from '../assets/scripts/core/ReleaseConfig';
import { LocalAuthService } from '../assets/scripts/services/LocalAuthService';
import { RankService } from '../assets/scripts/services/RankService';
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
    [2,'Starlight Guest',1_250,true],
  ]);
  assert.equal(await new GameBootstrap(save).resumeSession(),true,'Guest session did not survive a reload');
  console.log('PASS  Guest totals persist and on-device ranking is sorted from real saved profiles.');
};

void main();
