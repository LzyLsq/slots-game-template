import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve('完整游戏模版/全游戏模版');
function save(path, text) {
  const old = existsSync(path) ? readFileSync(path, 'utf8') : null; if (old === text) return;
  let patch = '*** Begin Patch\n' + (old === null ? '*** Add File: ' : '*** Update File: ') + path + '\n';
  if (old !== null) patch += '@@\n' + old.trimEnd().split('\n').map(l => '-' + l).join('\n') + '\n';
  patch += text.trimEnd().split('\n').map(l => '+' + l).join('\n') + '\n*** End Patch\n';
  execFileSync('apply_patch', [], { input: patch });
}
for (const id of [17, 23, 29]) {
  const dir = join(root, readdirSync(root).find(n => n.startsWith(`F${id}_`)));
  const file = join(dir, 'assets/scripts/vfx/CabinetReliefGlow.ts');
  save(file, readFileSync('tools/lively-optimization/CabinetReliefGlow.ts', 'utf8'));
  if (!existsSync(file + '.meta')) save(file + '.meta', JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:randomUUID(),files:[],subMetas:{},userData:{}},null,2)+'\n');
  const ui = join(dir, 'assets/scripts/ui/SalonArt.ts'); let source = readFileSync(ui, 'utf8');
  if (!source.includes('import { CabinetReliefGlow }')) source = "import { CabinetReliefGlow } from '../vfx/CabinetReliefGlow';\n" + source;
  if (id === 17 && !source.includes('CabinetReliefGlow.attach(n,')) {
    source = source.replace("if (name === 'caravan-card-0' && index === -1) {", "if (name.endsWith('-tall') && index === -1) {\n      const seed = ['golden-hour','jade-treasury','pearl-palace','ruby-revel'].indexOf(name.slice(0,-5));\n      CabinetReliefGlow.attach(n,[[.36,.25],[.63,.25],[.5,.35],[.26,.77],[.72,.78]],seed);\n    } else if (name === 'caravan-card-0' && index === -1) {");
  }
  if (id === 23 && !source.includes('CabinetReliefGlow.attach(room,')) {
    source = source.replace('    return room;\n  }\n  public primary', "    const seed = ['golden-hour','jade-treasury','pearl-palace','ruby-revel'].indexOf(name.slice(0,-5));\n    CabinetReliefGlow.attach(room,[[.43,.10],[.56,.11],[.33,.23],[.68,.25],[.27,.77],[.72,.77]],seed);\n    return room;\n  }\n  public primary");
  }
  if (id === 29 && !source.includes("if (name === 'f29-cabinet-jade-v1')")) {
    source = source.replace('    return n;\n  }\n  public cover', "    if (name === 'f29-cabinet-jade-v1') {\n      CabinetReliefGlow.attach(n,[[.5,.09],[.275,.215],[.735,.225],[.377,.603],[.777,.505]],29);\n    }\n    return n;\n  }\n  public cover");
    if (!source.includes("if (name === 'f29-cabinet-jade-v1')")) throw new Error('F29 image integration point not found');
  }
  save(ui, source);
  // Preserve every other existing shader region; static reliefs are not heads.
  const regions = join(dir, 'assets/scripts/vfx/ThemeMotionRegions.ts');
  const previous = readFileSync(regions, 'utf8');
  const data = JSON.parse(previous.slice(previous.indexOf('{'), previous.lastIndexOf('}') + 1));
  for (const name of Object.keys(data)) if (id !== 29 && name.endsWith('-tall')) delete data[name];
  save(regions, 'export const MOTION_REGIONS: Record<string, readonly (readonly number[])[]> = ' + JSON.stringify(data,null,2) + ';\n');
  console.log(`F${id}: fixed relief shimmer installed; ${id===29?'current jade cabinet connected':'whole relief warp removed'}`);
}
