import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const expected = [
  ['L02', join(root, 'index.html')],
  ['S07', join(root, 'games/s07/index.html')],
  ['S08', join(root, 'games/s08/index.html')],
  ['S09', join(root, 'games/s09/index.html')],
  ['S10', join(root, 'games/s10/index.html')],
];

for (const [id, file] of expected) {
  await access(file);
  const html = await readFile(file, 'utf8');
  if (id !== 'L02' && !html.includes('f1-suite-bridge.js')) {
    throw new Error(`${id} is missing the F1 return bridge`);
  }
  process.stdout.write(`[F1] ${id} entry verified\n`);
}

const manifest = JSON.parse(await readFile(join(root, 'f1-suite.json'), 'utf8'));
if (manifest.id !== 'F1' || manifest.modules?.length !== 5) throw new Error('Invalid assembled suite manifest');
process.stdout.write('[F1] Suite manifest verified\n');
