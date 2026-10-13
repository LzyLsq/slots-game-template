import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_CONFIGS, prizeArt, symbolAtlas } from '../assets/scripts/math/GameConfigs';
import { ENTRY_ART, pageArt } from '../assets/scripts/ui/PageArtManifest';
import { STANDALONE_GAME_ID } from '../assets/scripts/core/GameDistribution';

const base=new Set(ENTRY_ART);
for(const name of ['f32-station','f32-station-hall','f32-lounge','f32-brand-title','f32-jackpot','treasury-panel-ivory','treasury-loose-coin',symbolAtlas('coin-carousel')]){
  assert(base.has(name),`entry scene requires ${name}`);
}
for(const game of GAME_CONFIGS){
  const cabinet=new Set([...base,...pageArt('game',game)]);
  for(const name of [game.id+'-tall',symbolAtlas(game.id),symbolAtlas(game.id)+'-blur','f32-cabinet']){
    assert(cabinet.has(name),`${game.id} must load ${name} before rendering`);
  }
  const store=new Set([...base,...pageArt('store',game)]);
  for(const featured of GAME_CONFIGS.filter(c=>!STANDALONE_GAME_ID||c.id===STANDALONE_GAME_ID)){
    assert(store.has(symbolAtlas(featured.id)));
    assert(store.has(prizeArt(featured.id)));
  }
  assert.equal(base.has(game.id+'-tall'),game.id===STANDALONE_GAME_ID,`${game.id} foyer preload is scoped to its distributable`);
}
const all=new Set([...ENTRY_ART,...GAME_CONFIGS.flatMap(game=>[...pageArt('game',game),...pageArt('store',game)])]);
for(const name of all)assert(existsSync(join('assets','resources','art',name+'.png')),`missing ${name}.png`);
assert.equal(all.size,new Set(all).size);
console.log(`PASS ${all.size} artwork dependencies: entry, lobby, store and four cabinets.`);
