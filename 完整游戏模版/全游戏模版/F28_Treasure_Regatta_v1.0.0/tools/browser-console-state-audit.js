// Run with the Playwright skill CLI. This sends real pointer input to the
// WebGL canvas and inspects only public Cocos node geometry/state afterward.
async page => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('http://127.0.0.1:4887/?debug=1&screen=game&game=cargo&v=console-state-audit');
  await page.waitForFunction(() => window.cc?.director.getScene()?.children[0]?.components[0]?.ready);
  await page.waitForTimeout(600);

  const point = name => page.evaluate(name => {
    const app = cc.director.getScene().children[0].components[0];
    const control = app.controls.find(control => control.n.isValid && control.n.activeInHierarchy && control.n.name === name);
    if (!control) throw new Error(`Missing control: ${name}`);
    const world = control.n.worldPosition, visible = cc.view.getVisibleSize();
    return {x: world.x / visible.width * innerWidth, y: innerHeight - world.y / visible.height * innerHeight};
  }, name);
  const click = async name => {
    const p = await point(name); await page.mouse.click(p.x, p.y); await page.waitForTimeout(250);
  };
  const enabled = names => page.evaluate(names => {
    const app = cc.director.getScene().children[0].components[0];
    return Object.fromEntries(names.map(name => {
      const control = app.controls.find(control => control.n.isValid && control.n.activeInHierarchy && control.n.name === name);
      if (!control) throw new Error(`Missing control: ${name}`);
      const opacity = control.n.getChildByName('Button surface')?.getComponent('cc.UIOpacity');
      if (!opacity) throw new Error(`Missing button opacity: ${name}`);
      const material = control.n.getChildByName('Button surface')?.getChildByName('Material')?.getComponent('cc.Sprite');
      return [name, {enabled: control.enabled(), opacity: opacity.opacity, tint: material?.color.r ?? 255}];
    }));
  }, names);
  const intersections = await page.evaluate(() => {
    const app = cc.director.getScene().children[0].components[0];
    const rect = name => {
      const control = app.controls.find(control => control.n.isValid && control.n.activeInHierarchy && control.n.name === name);
      const transform = control.n.getComponent('cc.UITransform') || control.n._uiProps?.uiTransformComp;
      if (!transform) throw new Error(`Missing UI transform: ${name}`);
      return transform.getBoundingBoxToWorld();
    };
    const spin = rect('SPIN');
    return ['AUTO', 'TURBO'].filter(name => spin.intersects(rect(name)));
  });
  if (intersections.length) throw new Error(`SPIN target overlaps ${intersections.join(', ')}`);

  await click('AUTO');
  await page.waitForFunction(() => cc.director.getScene().children[0].components[0].modal?.name === 'Modal');
  await page.waitForTimeout(350);
  await click('Start 10 rounds');
  await page.waitForFunction(() => cc.director.getScene().children[0].components[0].session.phase === 'spinning');
  const during = await enabled(['Back', 'Menu', 'Rules', 'AUTO', 'TURBO']);
  for (const name of ['Back', 'Menu', 'Rules', 'TURBO']) {
    if (during[name].enabled || during[name].opacity !== 255 || during[name].tint >= 255) throw new Error(`${name} was not visibly disabled with opaque hardware during spin`);
  }
  if (!during.AUTO.enabled || during.AUTO.opacity !== 255) throw new Error('Auto STOP was not available during its active round');

  const modalBefore = await page.evaluate(() => cc.director.getScene().children[0].components[0].modal?.name ?? null);
  await click('Rules');
  const modalAfter = await page.evaluate(() => cc.director.getScene().children[0].components[0].modal?.name ?? null);
  if (modalAfter !== modalBefore) throw new Error('Disabled Rules opened during a spin');

  await click('AUTO');
  const remaining = await page.evaluate(() => cc.director.getScene().children[0].components[0].session.remainingAuto);
  if (remaining !== 0) throw new Error('Auto STOP did not clear queued rounds');
  await page.waitForFunction(() => cc.director.getScene().children[0].components[0].session.phase === 'idle', undefined, {timeout: 45000});

  const turboBefore = await page.evaluate(() => cc.director.getScene().children[0].components[0].turbo);
  const turbo = await point('TURBO');
  await page.mouse.move(turbo.x, turbo.y); await page.mouse.down();
  await page.mouse.move(turbo.x + 70, turbo.y + 40, {steps: 8}); await page.mouse.up();
  await page.waitForTimeout(300);
  const turboAfter = await page.evaluate(() => cc.director.getScene().children[0].components[0].turbo);
  if (turboAfter !== turboBefore) throw new Error('Dragged Turbo activated instead of cancelling');

  return 'Console hit separation, disabled-state opacity, Auto STOP, blocked Rules and drag cancellation passed.';
}
