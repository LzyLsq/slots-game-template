import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { SHOP_BUNDLES, SHOP_CABINET, SHOP_NICHES, SHOP_SIGN_INSETS, SHOP_SLOTS, SHOP_SOURCE_SIZE, shopPlacement, type ShopFixture } from '../assets/scripts/ui/ShopLayout';
import { LANGUAGES, setLanguage, tr } from '../assets/scripts/ui/Language';
const rect = ([x,y,w,h]: ShopFixture) => [x-w/2,y-h/2,x+w/2,y+h/2];
const contains = (outer: ShopFixture, inner: ShopFixture) => {
  const a=rect(outer),b=rect(inner);
  return b[0]>=a[0] && b[1]>=a[1] && b[2]<=a[2] && b[3]<=a[3];
};
const separate = (a: ShopFixture,b: ShopFixture,gap=0) => {
  const aa=rect(a),bb=rect(b);
  return aa[2]+gap<=bb[0] || bb[2]+gap<=aa[0] || aa[3]+gap<=bb[1] || bb[3]+gap<=aa[1];
};
const image=readFileSync('assets/resources/art/store-cabinet-v2.png');
assert.equal(image.readUInt32BE(16),SHOP_SOURCE_SIZE);
assert.equal(image.readUInt32BE(20),SHOP_SOURCE_SIZE);
assert.equal(SHOP_CABINET.width,SHOP_CABINET.height,'Square art cannot be stretched');
assert.equal(SHOP_BUNDLES.length,4);
assert.deepEqual(SHOP_BUNDLES.map(b=>b.amount),[1000,3000,8000,20000],'No economy change in this layout fix');
for (const [i,slots] of SHOP_SLOTS.entries()) {
  const copy=[slots.title,slots.amount,slots.detail];
  for (const box of [...copy,slots.product]) assert.ok(contains(SHOP_NICHES[i],box),`Bundle ${i} stays in its ivory niche`);
  for (const box of copy) assert.ok(separate(box,slots.product,8),`Bundle ${i} product does not cover copy`);
  for (let j=0;j<copy.length;j++) for(let k=j+1;k<copy.length;k++) assert.ok(separate(copy[j],copy[k],8));
  assert.ok(contains(SHOP_SIGN_INSETS[i],slots.claim),`Bundle ${i} claim stays on red sign`);
  assert.equal(slots.hit[0],slots.claim[0]); assert.equal(slots.hit[1],slots.claim[1]);
  for (const other of SHOP_SLOTS.slice(i+1)) assert.ok(separate(slots.hit,other.hit),'Purchase hit bands do not intersect');
  for (const code of LANGUAGES) {
    setLanguage(code.code);
    for(const text of [SHOP_BUNDLES[i].name,SHOP_BUNDLES[i].detail,'ADD COINS  +']) assert.ok(tr(text).length>0);
  }
  for (const [w,h] of [[320,568],[390,844],[430,932]]) {
    const scale=Math.min(w/1024,h/1800);
    for(const slot of [...copy,slots.claim,slots.product]) {
      const p=shopPlacement(slot,SHOP_CABINET.width,SHOP_CABINET.height);
      const left=w/2+(p.x+SHOP_CABINET.x-p.width/2)*scale;
      const right=w/2+(p.x+SHOP_CABINET.x+p.width/2)*scale;
      const top=h/2-(p.y+SHOP_CABINET.y+p.height/2)*scale;
      const bottom=h/2-(p.y+SHOP_CABINET.y-p.height/2)*scale;
      assert.ok(left>=0 && right<=w && top>=0 && bottom<=h,`Bundle ${i} visible at ${w}×${h}`);
    }
  }
}
const app=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
const store=app.slice(app.indexOf('  private storePage('),app.indexOf('  private rewardsPage('));
assert.ok(store.includes('shopPlacement(slot, cabinetSize.width, cabinetSize.height)'));
assert.ok(store.includes('label.enableWrapText = false') && store.includes('signText.enableWrapText = false'),'Names, values and captions stay single-line');
assert.ok(!store.includes('const textX =') && !store.includes('const lineY ='),'Remove unrelated manual per-screen offsets');
assert.ok(store.includes('if (!sign.isValid || claiming) return;') && store.includes('claiming = true;'),'One credit per shop claim');
assert.ok(store.includes('this.save.coins.toLocaleString(), 205, 0, 205, 50') && store.includes('walletAmount.enableWrapText = false'), 'Long wallet amounts stay in the inner ivory area, not the red end ornament');
assert.ok(store.includes('this.save.coins += amount') && store.includes('this.showRewardClaim('),'Retain virtual coin and reveal flow');
console.log('PASS four source-registered shop niches/signs; copy/product separation; three mobile sizes; five-language keys; preserved demo economy and claim guard');
