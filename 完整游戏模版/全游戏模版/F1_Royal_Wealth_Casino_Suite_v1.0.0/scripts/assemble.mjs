import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const suiteRoot = resolve(scriptDir, '..');
const distRoot = join(suiteRoot, 'dist');
const manifest = JSON.parse(await readFile(join(suiteRoot, 'suite-manifest.json'), 'utf8'));
const shouldBuild = process.argv.includes('--build');
const cocosBinary = process.env.COCOS_CREATOR_BIN
  ?? '/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator';

function run(command, args, cwd, acceptedStatuses = [0]) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (!acceptedStatuses.includes(result.status)) {
    throw new Error(`${command} failed for ${cwd} (exit ${result.status})`);
  }
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

async function buildModule(module) {
  const projectRoot = resolve(suiteRoot, module.source);
  if (!existsSync(cocosBinary)) throw new Error(`Cocos Creator was not found: ${cocosBinary}`);
  process.stdout.write(`\n[F1] Building ${module.id}...\n`);
  const buildLog = run(cocosBinary, [
    '--project', projectRoot,
    '--build', 'platform=web-mobile;debug=false;buildPath=./build;outputName=web-mobile;md5Cache=false',
  ], projectRoot, [0, 36]);
  const buildDir = join(projectRoot, 'build', 'web-mobile');
  if (!existsSync(join(buildDir, 'index.html'))) {
    throw new Error(`${module.id} build did not produce build/web-mobile/index.html`);
  }
  if (!/build Task \(web-mobile\) Finished/i.test(buildLog)) {
    process.stdout.write(`[F1] ${module.id}: output exists; Cocos did not emit its usual completion phrase.\n`);
  }
  const patchScript = join(projectRoot, 'scripts', 'patch-web-build.mjs');
  if (existsSync(patchScript)) run(process.execPath, [patchScript, buildDir], projectRoot);
}

function bridgeSource(moduleId) {
  return `(() => {
  'use strict';
  const moduleId = ${JSON.stringify(moduleId)};
  let returning = false;
  const resolveHome = () => {
    const requested = new URLSearchParams(location.search).get('home') || '../../index.html?suite=f1&page=home';
    try {
      const candidate = new URL(requested, location.href);
      return candidate.origin === location.origin ? candidate.href : new URL('../../index.html?suite=f1&page=home', location.href).href;
    } catch {
      return new URL('../../index.html?suite=f1&page=home', location.href).href;
    }
  };
  const returnHome = (event) => {
    if (typeof event?.preventDefault === 'function') event.preventDefault();
    if (returning) return;
    returning = true;
    const veil = document.createElement('div');
    veil.setAttribute('aria-label', 'Returning to Royal Wealth lobby');
    veil.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:radial-gradient(circle at 50% 44%,#71331f 0,#240811 46%,#090207 100%);opacity:0;transition:opacity 180ms ease-out;color:#ffe7a3;font:700 14px/1.4 system-ui;letter-spacing:.18em;text-align:center';
    veil.innerHTML = '<div><div style="font-family:Georgia,serif;font-size:28px;letter-spacing:.08em;color:#fff5cf;text-shadow:0 2px 10px #c47723">ROYAL WEALTH</div><div style="margin-top:12px">RETURNING TO THE CASINO FLOOR</div></div>';
    document.body.appendChild(veil);
    requestAnimationFrame(() => { veil.style.opacity = '1'; });
    setTimeout(() => location.assign(resolveHome()), 220);
  };
  document.documentElement.dataset.homeUrl = '../../index.html?suite=f1&page=home';
  addEventListener('slot-home', returnHome);
  addEventListener('slot-home-requested', returnHome);
  window.__F1_SUITE__ = { id: 'F1', moduleId, returnHome };
})();\n`;
}

async function installBridge(outputDir, moduleId) {
  const indexPath = join(outputDir, 'index.html');
  const bridgeName = 'f1-suite-bridge.js';
  let html = await readFile(indexPath, 'utf8');
  if (!html.includes(bridgeName)) {
    html = html.includes('</body>')
      ? html.replace('</body>', `  <script src="./${bridgeName}"></script>\n</body>`)
      : `${html}\n<script src="./${bridgeName}"></script>\n`;
    await writeFile(indexPath, html);
  }
  await writeFile(join(outputDir, bridgeName), bridgeSource(moduleId));
}

if (shouldBuild) {
  for (const module of manifest.modules) await buildModule(module);
}

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });

for (const module of manifest.modules) {
  const projectRoot = resolve(suiteRoot, module.source);
  const buildRoot = join(projectRoot, 'build', 'web-mobile');
  if (!existsSync(join(buildRoot, 'index.html'))) {
    throw new Error(`${module.id} has no Web build. Run npm run assemble:build.`);
  }
  const outputRoot = resolve(distRoot, module.output);
  await mkdir(outputRoot, { recursive: true });
  await cp(buildRoot, outputRoot, { recursive: true, force: true });
  if (module.id !== 'L02') await installBridge(outputRoot, module.id);
  process.stdout.write(`[F1] Added ${module.id} -> ${module.output}\n`);
}

await writeFile(join(distRoot, 'f1-suite.json'), JSON.stringify({
  ...manifest.suite,
  assembledAt: new Date().toISOString(),
  modules: manifest.modules.map(({ id, output, mechanic }) => ({ id, output, mechanic })),
}, null, 2));

process.stdout.write(`\n[F1] Complete suite assembled at ${distRoot}\n`);
