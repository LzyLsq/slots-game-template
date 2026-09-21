import { existsSync, mkdtempSync, renameSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const editor = process.env.COCOS_CREATOR || '/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator';
// Creator 3.8.8 on this host restores stale importer registrations on incremental
// headless builds. Keep the previous generated cache recoverable; source is untouched.
const backup = mkdtempSync(join(tmpdir(), 'f28-build-cache-'));
for (const name of ['library', 'temp']) {
  const path = join(root, name);
  if (existsSync(path)) renameSync(path, join(backup, name));
}
console.log(`Previous generated cache: ${backup}`);
const prepare = spawnSync(process.execPath, ['tools/prepare-project.mjs'], { cwd: root, stdio: 'inherit' });
if (prepare.status !== 0) process.exit(1);
const build = spawnSync(editor, ['--project', root, '--build', `configPath=${root}/tools/web-mobile-release-build.json`], { cwd: root, stdio: 'inherit' });
// Creator returns 36 on successful command-line builds; runtime QA remains required.
if (build.status !== 36 && build.status !== 0) process.exit(1);
copyFileSync(join(root, 'assets/resources/art/coin.png'), join(root, 'build/web-mobile/favicon.png'));
copyFileSync(join(root, 'assets/resources/art/marina.jpg'), join(root, 'build/web-mobile/boot-marina.jpg'));
copyFileSync(join(root, 'assets/resources/art/title.png'), join(root, 'build/web-mobile/boot-title.png'));
copyFileSync(join(root, 'assets/resources/art/coin.png'), join(root, 'build/web-mobile/boot-coin.png'));
copyFileSync(join(root, 'tools/web-boot.js'), join(root, 'build/web-mobile/web-boot.js'));

const indexPath = join(root, 'build/web-mobile/index.html');
const bootMarkup = readFileSync(join(root, 'tools/web-boot.html'), 'utf8').trim();
let html = readFileSync(indexPath, 'utf8');
html = html
  .replace('<title>Cocos Creator | f28-treasure-regatta</title>', '<title>Treasure Regatta · F28</title>\n  <link rel="icon" type="image/png" href="favicon.png">\n  <link rel="preload" as="image" href="boot-marina.jpg">\n  <link rel="preload" as="image" href="boot-title.png">\n  <link rel="preload" as="image" href="boot-coin.png">')
  .replace('content="width=device-width,user-scalable=no,initial-scale=1,minimum-scale=1,maximum-scale=1,minimal-ui=true"', 'content="width=device-width,user-scalable=no,initial-scale=1,minimum-scale=1,maximum-scale=1,viewport-fit=cover"')
  .replace('<body>', `<body>\n${bootMarkup}\n  <script src="web-boot.js"></script>`);
writeFileSync(indexPath, html);

const stylePath = join(root, 'build/web-mobile/style.css');
let css = readFileSync(stylePath, 'utf8').replace('background-color: #333;', 'background: #075a70 url("boot-marina.jpg") center center / cover no-repeat;');
css += `\n${readFileSync(join(root, 'tools/web-boot.css'), 'utf8')}\n`;
writeFileSync(stylePath, css);
