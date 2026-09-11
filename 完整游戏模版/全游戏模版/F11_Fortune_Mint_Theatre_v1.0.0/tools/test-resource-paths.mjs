import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const checked = new Set();
const missing = new Set();
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith('.ts')) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/['"](generated\/[\w/-]+)['"]/g)) {
        checked.add(match[1]);
        if (!fs.existsSync(path.join(root, 'assets/resources', `${match[1]}.png`))) missing.add(match[1]);
      }
    }
  }
}
walk(path.join(root, 'assets/scripts'));
const coverSource = fs.readFileSync(path.join(root, 'assets/scripts/ui/GameCoverAtlasCache.ts'), 'utf8');
const coverOrder = coverSource.match(/const ORDER[^=]*=\s*\[([^\]]+)\]/)?.[1] ?? '';
const coverIds = new Set([...coverOrder.matchAll(/'([^']+)'/g)].map(match => match[1]));
const app = fs.readFileSync(path.join(root, 'assets/scripts/ui/SkylightApp.ts'), 'utf8');
for (const match of app.matchAll(/\bgame:\s*'([^']+)'/g)) {
  if (!coverIds.has(match[1])) missing.add(`Unknown scene artwork ID: ${match[1]}`);
}
if (missing.size) {
  console.error('Missing referenced artwork:', [...missing]);
  process.exitCode = 1;
} else console.log(`PASS ${checked.size} literal artwork paths exist (dynamic references require runtime checks).`);
