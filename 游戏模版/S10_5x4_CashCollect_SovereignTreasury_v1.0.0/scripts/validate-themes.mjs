import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, 'assets/resources/config/themes.json'), 'utf8'));
const errors = [];
for (const theme of catalog.themes) {
  const config = JSON.parse(await readFile(path.join(root, `assets/resources/config/${theme}.json`), 'utf8'));
  if (config.columns !== 5 || config.rows !== 4) errors.push(`${theme}: expected a 5x4 grid`);
  if (!Array.isArray(config.cashMultipliers) || config.cashMultipliers.length < 5) errors.push(`${theme}: cashMultipliers are incomplete`);
  if (config.symbols.filter((symbol) => symbol.kind === 'coin').length !== 1) errors.push(`${theme}: exactly one cash coin is required`);
  if (config.symbols.filter((symbol) => symbol.kind === 'collector').length !== 1) errors.push(`${theme}: exactly one collector is required`);
  const resources = [config.visual.cabinet, config.visual.winStage, config.visual.homeIcon, config.visual.rulesIcon, config.visual.soundIcon, config.visual.addIcon, config.visual.minusIcon, config.visual.plusIcon, config.visual.autoIcon, config.visual.spinIcon, ...config.symbols.map((symbol) => symbol.texture)];
  for (const resource of resources) {
    const relative = resource.replace(/\/spriteFrame$/, '.png');
    try { await access(path.join(root, 'assets/resources', relative)); }
    catch { errors.push(`${theme}: missing ${relative}`); }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Theme validation passed: ${catalog.themes.length} theme, 0 warnings.`);
}
