async (page) => {
  // Run with the project's named, isolated Playwright CLI browser session.
  // Presentation-only fixtures: do not spin, claim, purchase, or write storage.
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const startingCoins = await page.evaluate(() => window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c => typeof c.bootReady === 'boolean').save.coins);
  const results = [];
  for (const mode of [0, 1, 2, 3]) {
    await page.evaluate(mode => {
      const a = window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c => typeof c.bootReady === 'boolean');
      a.save.selectedMode = mode; a.showTaskGoldReveal('OPEN THE HOUSE', 300);
    }, mode);
    const frameTiming = await page.evaluate(async () => {
      const deltas = []; let previous, first;
      await new Promise(resolve => {
        function sample(t) {
          if (previous !== undefined) deltas.push(t - previous);
          previous = t; first ??= t;
          if (t - first < 5700) requestAnimationFrame(sample); else resolve();
        }
        requestAnimationFrame(sample);
      });
      const warm = deltas.slice(8).sort((a, b) => a - b);
      return { samples: warm.length, p50Ms: warm[Math.floor(warm.length * .5)], p95Ms: warm[Math.floor(warm.length * .95)], maxMs: warm.at(-1) };
    });
    await page.waitForFunction(() => window.cc.director.getScene().getComponentsInChildren(window.cc.Component).some(c => c.playback?.time >= 5.2 && c.actor));
    const before = await page.evaluate(() => {
      const a = window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c => typeof c.bootReady === 'boolean');
      const c = a.activeOverlay.components.find(c => c.playback && c.actor);
      return { coins: a.save.coins, bodyMaterial: !!c.bodyMaterial, wristMaterial: !!c.armMaterial, time: c.playback.time, grounded: c.actor.angle === 0 };
    });
    await page.screenshot({ path: `output/playwright/treasure-fluid-${mode}-ready.png` });
    await page.mouse.click(195, 713, { delay: 90 });
    await page.waitForTimeout(360);
    const after = await page.evaluate(() => {
      const a = window.cc.director.getScene().getComponentsInChildren(window.cc.Component).find(c => typeof c.bootReady === 'boolean');
      return { coins: a.save.coins, overlay: !!a.activeOverlay, page: a.page };
    });
    if (before.coins !== startingCoins || after.coins !== startingCoins || after.overlay || after.page !== 'home') throw new Error(`mode ${mode}: acknowledgement or wallet regression`);
    results.push({ mode, before, after, frameTiming });
  }
  return { date: '2026-10-10', startingCoins, results, errors, scope: 'Independent QA browser; four real-time presentation previews, actual KEEP clicks; no wallet credits or user-preview changes.' };
}
