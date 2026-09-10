import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const destination = resolve(root, 'build/web-mobile');
if (!existsSync(resolve(destination, 'index.html'))) throw new Error('Build web-mobile before finalizing public documents.');
for (const file of ['privacy.html', 'terms.html', 'support.html', 'legal.css']) {
  copyFileSync(resolve(root, 'build-templates/web-mobile', file), resolve(destination, file));
}
console.log('Public legal pages and stylesheet copied to web build. Publisher placeholders must still be finalized before release.');
