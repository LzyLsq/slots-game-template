/** Exercise the actual Cocos GPU stencil with deliberately oversized content. */
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const project = path.resolve(__dirname, '../..');
const output = process.env.QA_OUTPUT ? path.resolve(process.env.QA_OUTPUT) : path.join(project, 'docs/screenshots/f44-reel-containment-20261010/final/stencil');
const modes = ['golden-otter', 'moon-rabbit', 'star-fox', 'cloud-elephant'];
fs.mkdirSync(output, { recursive: true });
const ready = () => {
  const a = window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
  return a?.reels && !a.busy && !a.node.getChildByName('Atelier loading') && !document.getElementById('csw-preloader');
};
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const results = [], errors = [];
  try {
    for (const [width, height] of [[390, 844], [320, 568]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      try {
        for (const mode of modes) {
          await page.goto(`http://127.0.0.1:6044/?debug=1&screen=game&game=${mode}&v=${encodeURIComponent(process.env.QA_VERSION || 'f44-reel-containment-20261010')}`);
          await page.waitForFunction(ready, null, { timeout: 90000 });
          await page.waitForTimeout(350);
          const geometry = await page.evaluate(() => {
            const cc = window.cc, a = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
            const r = a.reels, mask = r.maskRoot;
            const renderers = r.node.getComponentsInChildren('cc.Sprite').concat(r.node.getComponentsInChildren('cc.Graphics'));
            function inside(n) { while (n) { if (n === mask) return true; n = n.parent; } return false; }
            const escaped = renderers.filter(component => !inside(component.node)).map(component => component.node.name);
            // getBoundingBoxToWorld includes overscan children; measure the aperture itself.
            const position = mask.worldPosition, worldScale = mask.worldScale;
            const bounds = { x: position.x - r.width * worldScale.x / 2, y: position.y - r.height * worldScale.y / 2, width: r.width * worldScale.x, height: r.height * worldScale.y }, view = cc.view.getVisibleSize();
            const scale = innerWidth / view.width;
            const saved = mask.children.map(n => ({ node: n, active: n.active }));
            saved.forEach(item => item.node.active = false);
            const probe = new cc.Node('QA oversized stencil probe');
            probe.parent = mask;
            probe.addComponent('cc.UITransform').setContentSize(r.width * 3, r.height * 3);
            const paint = probe.addComponent('cc.Graphics');
            paint.fillColor = new cc.Color(255, 0, 255, 255);
            paint.rect(-r.width * 1.5, -r.height * 1.5, r.width * 3, r.height * 3);
            paint.fill();
            window.__qaApertureProbe = { probe, saved };
            return { x: bounds.x * scale, y: innerHeight - (bounds.y + bounds.height) * scale, width: bounds.width * scale, height: bounds.height * scale,
              sourceWidth: r.width, sourceHeight: r.height, radius: 6 * bounds.width / r.width * scale,
              stencilType: mask.getComponent('cc.Mask').type, expectedStencilType: cc.Mask.Type.GRAPHICS_STENCIL,
              renderers: renderers.length, escaped, viewport: { width: innerWidth, height: innerHeight } };
          });
          assert.equal(geometry.stencilType, geometry.expectedStencilType, `${mode} missing stencil`);
          assert.deepEqual(geometry.escaped, [], `${mode} reel renderers escaped root aperture`);
          await page.waitForTimeout(100);
          const file = `${mode}-${width}x${height}-oversized-probe.png`;
          const pixels = PNG.sync.read(await page.screenshot({ path: path.join(output, file) }));
          const dpr = pixels.width / geometry.viewport.width;
          const centerX = (geometry.x + geometry.width / 2) * dpr;
          const centerY = (geometry.y + geometry.height / 2) * dpr;
          const halfW = geometry.width * dpr / 2, halfH = geometry.height * dpr / 2, radius = geometry.radius * dpr;
          let painted = 0, outside = 0;
          // One physical pixel allows raster edge coverage; no CSS-pixel tolerance.
          const tolerance = 1;
          for (let y = 0; y < pixels.height; y++) for (let x = 0; x < pixels.width; x++) {
            const p = (y * pixels.width + x) * 4;
            if (pixels.data[p] < 245 || pixels.data[p + 1] > 10 || pixels.data[p + 2] < 245) continue;
            painted++;
            const dx = Math.max(Math.abs(x + .5 - centerX) - (halfW - radius), 0);
            const dy = Math.max(Math.abs(y + .5 - centerY) - (halfH - radius), 0);
            if (Math.hypot(dx, dy) > radius + tolerance) outside++;
          }
          assert(painted > geometry.width * geometry.height * dpr * dpr * .85, `${mode} probe did not render enough interior pixels`);
          assert.equal(outside, 0, `${mode} ${outside} magenta pixels escaped rounded glass`);
          await page.evaluate(() => {
            const { probe, saved } = window.__qaApertureProbe;
            probe.destroy();
            saved.forEach(item => item.node.active = item.active);
            delete window.__qaApertureProbe;
          });
          await page.waitForTimeout(100);
          results.push({ mode, viewport: [width, height], geometry, paintedPixels: painted, escapedPixels: outside, edgeToleranceDevicePixels: tolerance, file });
          console.log(`PASS actual stencil ${mode} ${width}x${height}: ${painted} interior pixels, ${outside} outside`);
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'reel-aperture-audit.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), method: 'Actual oversized GPU Graphics probe under the common Cocos stencil; screenshot pixels checked against rounded glass in device pixels; isolated local contexts', results, errors }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
