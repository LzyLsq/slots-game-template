// Run through the Playwright skill CLI. Uses real pointer input against WebGL.
async page => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('http://127.0.0.1:4887/?debug=1&screen=home&v=control-gestures');
  await page.waitForFunction(() => window.cc?.director.getScene()?.children[0]?.components[0]?.ready);
  await page.waitForTimeout(600);
  const point = name => page.evaluate(name => {
    const a = cc.director.getScene().children[0].components[0];
    const c = a.controls.find(c => c.n.isValid && c.n.activeInHierarchy && c.n.name === name);
    if (!c) throw new Error(`Missing ${name}`);
    const p = c.n.worldPosition, v = cc.view.getVisibleSize();
    return {x: p.x / v.width * innerWidth, y: innerHeight - p.y / v.height * innerHeight};
  }, name);
  const click = async name => {const p = await point(name); await page.mouse.click(p.x,p.y); await page.waitForTimeout(350);};
  const state = () => page.evaluate(() => {
    const a = cc.director.getScene().children[0].components[0];
    return {page:a.page,bet:a.betIndex,phase:a.session.phase,auto:a.session.remainingAuto,wallet:a.wallet.snapshot()};
  });
  const p = await point("Captain's Cache");
  await page.mouse.move(p.x,p.y); await page.mouse.down();
  await page.mouse.move(p.x+70,p.y+40,{steps:8}); await page.mouse.up();
  await page.waitForTimeout(400);
  if ((await state()).page !== 'home') throw new Error('Drag incorrectly entered a game');
  await click("Captain's Cache");
  await click('Max bet'); const maximum = (await state()).bet;
  await click('+');
  if ((await state()).bet !== maximum) throw new Error('Maximum wager exceeded');
  for(let i=0;i<maximum;i++) await click('−');
  await click('TURBO');
  const before = (await state()).wallet;
  const spin = await point('SPIN');
  await page.mouse.dblclick(spin.x,spin.y,{delay:40});
  await page.waitForFunction(() => cc.director.getScene().children[0].components[0].session.phase === 'idle');
  const after = (await state()).wallet;
  if(after.nextRoundId !== before.nextRoundId+1 || after.pending) throw new Error('Double press created multiple rounds');
  const receipt = after.receipts.find(r=>r.id===before.nextRoundId);
  if(!receipt || after.balance !== before.balance-receipt.bet+receipt.win) throw new Error('Settlement mismatch');
  await click('Back');
  return 'Drag cancellation, max-wager guard, double-press protection and exact single settlement passed.';
}
