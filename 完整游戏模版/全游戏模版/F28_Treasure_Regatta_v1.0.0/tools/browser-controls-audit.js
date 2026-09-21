// Pass this function to the Playwright skill CLI's run-code command.
// DOM refs are unavailable for this WebGL scene. Locate scene controls, then send
// real pointer events through the browser; never invoke their action callbacks.
async page => {
  const out = '/Users/xzkj/Documents/Codex/2026-08-28/gen/output/playwright';
  // Keep the interaction regression independent from macOS WebGL screenshot
  // capture, which can block despite the scene continuing to run correctly.
  // Visual evidence is captured by the dedicated final screenshot pass.
  const captureScreenshots = false;
  const shot = path => captureScreenshots ? page.screenshot({timeout:90000,path}) : Promise.resolve();
  const app = () => window.cc.director.getScene().children[0].components[0];
  async function click(name) {
    // Page transitions deliberately outlast the initial pointer release. Wait for
    // the destination control instead of treating a transient scene as failure.
    await page.waitForFunction(name => {
      const a = window.cc?.director.getScene()?.children[0]?.components[0];
      return Boolean(a?.controls?.find(c => c.n.isValid && c.n.activeInHierarchy && c.n.name === name));
    }, name, {timeout: 60000});
    const p = await page.evaluate(name => {
      const a = cc.director.getScene().children[0].components[0];
      const c = a.controls.find(c => c.n.isValid && c.n.activeInHierarchy && c.n.name === name);
      if (!c) throw new Error(`Missing control: ${name}`);
      const w = c.n.worldPosition;
      const v = cc.view.getVisibleSize();
      return {x:w.x/v.width*innerWidth, y:innerHeight-w.y/v.height*innerHeight};
    }, name);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(320);
  }
  async function ready() {
    await page.waitForFunction(() => window.cc?.director.getScene()?.children[0]?.components[0]?.ready, undefined, {timeout:60000});
    await page.waitForTimeout(400);
  }
  const issues = [];
  page.on('pageerror', e => issues.push(e.message));
  page.on('response', r => { if (r.status() >= 400) issues.push(`${r.status()} ${r.url()}`); });
  for (const [width,height] of [[320,568],[390,844],[430,932]]) {
    await page.setViewportSize({width,height});
    await page.goto('http://127.0.0.1:4887/?debug=1&screen=home&v=all-control-audit');
    await ready();
    await shot(`${out}/F28-controls-home-${width}.png`);
    for (const name of ["Captain's Cache",'Pearl Passage','Jewel Cargo','Reef Riches']) {
      await click(name);
      const mode = await page.evaluate(() => cc.director.getScene().children[0].components[0].mode);
      // At minimum wager the minus button must remain inert.
      await click('−');
      await click('+');
      if (await page.evaluate(() => cc.director.getScene().children[0].components[0].betIndex) !== 1) throw new Error('Bet step failed');
      await click('−');
      await click('TURBO');
      await shot(`${out}/F28-controls-${mode}-${width}.png`);
      await click('SPIN');
      try {
        await page.waitForFunction(() => cc.director.getScene().children[0].components[0].session.phase === 'idle', undefined, {timeout:45000});
      } catch (error) {
        const state = await page.evaluate(() => {
          const a = cc.director.getScene().children[0].components[0];
          return {mode:a.mode, phase:a.session.phase, remainingAuto:a.session.remainingAuto, wallet:a.wallet.balance};
        });
        throw new Error(`Spin did not settle at ${width}x${height}: ${JSON.stringify(state)}; ${String(error)}`);
      }
      await click('Menu');
      await click('Sound: on');
      await click('Sound: off');
      await click('Motion: full');
      await click('Motion: reduced');
      await shot(`${out}/F28-controls-settings-${width}.png`);
      await click('Close');
      await click('Back');
    }
    for (const [name,id] of [['Gifts','rewards'],['Rank','rank'],['Shop','shop'],['Crew','profile']]) {
      await click(name);
      await shot(`${out}/F28-controls-${id}-${width}.png`);
      if (id === 'profile') {
        await click('Erase data');
        await shot(`${out}/F28-controls-confirm-${width}.png`);
        await click('Cancel');
        await click('Privacy & data');
        await click('Next');
        await click('Previous');
        await click('Close');
      }
    }
  }
  if (issues.length) throw new Error(issues.join('\n'));
  return 'Three sizes, four modes, 12 real spins, theme controls, settings, navigation and confirmation cancellation passed.';
}
