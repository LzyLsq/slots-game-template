import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_CONFIGS, prizeArt, symbolAtlas } from '../assets/scripts/math/GameConfigs';
import { ENTRY_ART, pageArt } from '../assets/scripts/ui/PageArtManifest';

const base=new Set(ENTRY_ART);
for(const name of ['salon','carnival-hall-soft','carnival-destinations','treasury-brand-title',symbolAtlas('coin-carousel')]){
  assert(base.has(name),`entry scene requires ${name}`);
}
for(const game of GAME_CONFIGS){
  const cabinet=new Set([...base,...pageArt('game',game)]);
  for(const name of [game.id+'-tall',symbolAtlas(game.id),symbolAtlas(game.id)+'-blur','treasury-jackpot-environment-'+game.id]){
    assert(cabinet.has(name),`${game.id} must load ${name} before rendering or its first jackpot`);
  }
  const store=new Set([...base,...pageArt('store',game)]);
  for(const featured of GAME_CONFIGS){
    assert(store.has(symbolAtlas(featured.id)));
    assert(store.has(prizeArt(featured.id)));
  }
  assert(!base.has(game.id+'-tall'),`${game.id} cabinet must not block sign-in`);
}
const all=new Set([...ENTRY_ART,...GAME_CONFIGS.flatMap(game=>[...pageArt('game',game),...pageArt('store',game)])]);
for(const name of all)assert(existsSync(join('assets','resources','art',name+'.png')),`missing ${name}.png`);
assert.equal(all.size,new Set(all).size);
console.log(`PASS ${all.size} artwork dependencies: entry, store, four cabinets and first-win stages.`);
