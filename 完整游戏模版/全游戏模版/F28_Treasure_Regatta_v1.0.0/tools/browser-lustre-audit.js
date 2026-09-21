async (page) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4887/?debug=1&screen=game&game=captain&v=lustre-audit');
  await page.waitForFunction(() => window.cc?.director.getScene()?.children[0]?.components[0]?.ready);
  await page.waitForTimeout(500);
  const result = await page.evaluate(async () => {
    const app = cc.director.getScene().children[0].components[0];
    const sprite = c => c.n.getChildByName('Button surface').getChildByName('Material').getComponent(cc.Sprite);
    const controls = app.controls;
    if (controls.some(c => !sprite(c).customMaterial)) throw new Error('Unfinished control material');
    const minus = controls.find(c => c.n.name === '−');
    const spin = controls.find(c => c.n.name === 'SPIN');
    const copy = spin.n.getChildByName('Button surface').getChildByName('Text').getComponent(cc.Label);
    if (copy.customMaterial) throw new Error('Reflection must not shade copy');
    const samples = [], times = []; let previous = performance.now();
    for (let i = 0; i < 540; i++) {
      await new Promise(requestAnimationFrame);
      const now = performance.now(); times.push(now-previous); previous=now;
      samples.push(sprite(spin).customMaterial.getProperty('reflection').y);
      if (!minus.enabled() && sprite(minus).customMaterial.getProperty('reflection').y !== 0) throw new Error('Disabled bet key reflected');
    }
    if (Math.max(...samples) < .2 || !samples.includes(0)) throw new Error('Missing sweep or quiet interval');
    // Exercise the actual persisted accessibility setting, then allow an update frame.
    const old = app.wallet.snapshot().settings.reducedMotion;
    app.wallet.setting('reducedMotion', true); app.reduced = true;
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    if (controls.some(c => sprite(c).customMaterial.getProperty('reflection').y !== 0)) throw new Error('Reduced motion reflection');
    app.wallet.setting('reducedMotion', old); app.reduced = old;
    times.sort((a,b)=>a-b);
    return {controls: controls.length, peak:Math.max(...samples), quietFrames:samples.filter(x=>x===0).length,
      medianMs:times[270],p95Ms:times[Math.floor(times.length*.95)]};
  });
  return result;
}
