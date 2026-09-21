// Playwright CLI run-code payload. Exercises all four WebGL game entries with
// real pointer input and samples Cocos transforms to prove idle motion is live.
async page => {
  const out = '/Users/xzkj/Documents/Codex/2026-08-28/gen/output/playwright';
  const issues = [];
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.status() >= 400) issues.push(`${response.status()} ${response.url()}`);
  });
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('http://127.0.0.1:4887/?debug=1&screen=home&v=motion-audit-v2');
  await page.waitForFunction(() => window.cc?.director.getScene()?.children[0]?.components[0]?.ready, undefined, {timeout: 60000});
  await page.waitForTimeout(500);

  const clickControl = async name => {
    await page.waitForFunction(controlName => {
      const app = window.cc?.director.getScene()?.children[0]?.components[0];
      return Boolean(app?.controls?.find(control => control.n.isValid && control.n.activeInHierarchy && control.n.name === controlName));
    }, name, {timeout: 60000});
    const point = await page.evaluate(controlName => {
      const app = cc.director.getScene().children[0].components[0];
      const control = app.controls.find(control => control.n.isValid && control.n.activeInHierarchy && control.n.name === controlName);
      if (!control) throw new Error(`Missing control ${controlName}`);
      const world = control.n.worldPosition;
      const visible = cc.view.getVisibleSize();
      return {x: world.x / visible.width * innerWidth, y: innerHeight - world.y / visible.height * innerHeight};
    }, name);
    await page.mouse.click(point.x, point.y);
  };
  const sample = () => page.evaluate(() => {
    const app = cc.director.getScene().children[0].components[0];
    const reelSprite = app.reels?.columns?.[0]?.sprites?.[2]?.node;
    const fx = (app.cabinetFx || []).map(item => ({
      name: item.n.name,
      x: Number(item.n.position.x.toFixed(3)),
      y: Number(item.n.position.y.toFixed(3)),
      opacity: item.opacity.opacity,
      scale: Number(item.n.scale.x.toFixed(4)),
    }));
    return {
      page: app.page,
      mode: app.mode,
      transition: app.modeTransition?.name || null,
      reel: reelSprite ? {
        x: Number(reelSprite.position.x.toFixed(3)),
        y: Number(reelSprite.position.y.toFixed(3)),
        scale: Number(reelSprite.scale.x.toFixed(4)),
        rotation: Number(reelSprite.eulerAngles.z.toFixed(3)),
      } : null,
      fx,
    };
  });
  const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
  const modes = [
    ["Captain's Cache", 'captain'],
    ['Pearl Passage', 'pearl'],
    ['Jewel Cargo', 'cargo'],
    ['Reef Riches', 'reef'],
  ];
  const results = [];
  for (const [control, id] of modes) {
    await clickControl(control);
    await page.waitForTimeout(180);
    const entry = await sample();
    await page.screenshot({path: `${out}/F28-${id}-entry-motion.png`, timeout: 90000});
    if (!entry.transition) throw new Error(`${id}: themed entry transition was not visible after real click`);
    await page.waitForFunction(mode => {
      const app = cc.director.getScene().children[0].components[0];
      return app.page === 'game' && app.mode === mode && !app.modeTransition;
    }, id, {timeout: 60000});
    await page.waitForTimeout(350);
    const first = await sample();
    await page.waitForTimeout(1850);
    const second = await sample();
    await page.screenshot({path: `${out}/F28-${id}-cabinet-idle.png`, timeout: 90000});
    if (!first.reel || !second.reel || !changed(first.reel, second.reel)) throw new Error(`${id}: reel idle pose did not change`);
    if (!first.fx.length || !changed(first.fx, second.fx)) throw new Error(`${id}: cabinet ambience did not change`);
    results.push({id, entry: entry.transition, reelBefore: first.reel, reelAfter: second.reel, fxBefore: first.fx, fxAfter: second.fx});
    await clickControl('Back');
    await page.waitForFunction(() => cc.director.getScene().children[0].components[0].page === 'home', undefined, {timeout: 60000});
    await page.waitForTimeout(300);
  }
  if (issues.length) throw new Error(issues.join('\n'));
  return results;
}
