import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { profiles } from './profiles.mjs';
import { liveHeads } from './mascot-live-manifest.mjs';
import { bonesFor } from './mascot-bones.mjs';
const root = resolve('完整游戏模版/全游戏模版'), ids = process.argv.slice(2).map(v=>Number(v.replace(/^F/i,'')));
function save(path, text) {
  const old = existsSync(path) ? readFileSync(path, 'utf8') : null; if (old === text) return;
  let patch = '*** Begin Patch\n' + (old === null ? '*** Add File: ' : '*** Update File: ') + path + '\n';
  if (old !== null) patch += '@@\n' + old.trimEnd().split('\n').map(l => '-' + l).join('\n') + '\n';
  patch += text.trimEnd().split('\n').map(l => '+' + l).join('\n') + '\n*** End Patch\n';
  execFileSync('apply_patch', [], { input: patch });
}
function patch(path, edit) { const source = readFileSync(path, 'utf8'); save(path, edit(source)); }
for (const p of profiles.filter(p => (!ids.length || ids.includes(p.id)) && liveHeads.some(h => h.id === p.id))) {
  const project = join(root, readdirSync(root).find(n => n.startsWith(`F${p.id}_${p.slug}_v`)));
  const prepared = join(project, 'output/imagegen/live-heads/prepared.json');
  const data = JSON.parse(readFileSync(prepared, 'utf8')).map((entry, row) => {
    const definition = liveHeads.find(h => h.id === p.id && h.art === entry.art && (h.index ?? -1) === entry.index);
    if (!definition) throw new Error(`Unreviewed mascot F${p.id}: ${entry.art}:${entry.index}`);
    return {...entry, bones: bonesFor(p.id, row), eyeState: definition.eyeState, blinkEnabled: definition.eyeState === 'open' && entry.blinkSafe === true};
  });
  save(prepared, JSON.stringify(data, null, 2) + '\n');
  const vfx = join(project, 'assets/scripts/vfx');
  const template = readFileSync('tools/lively-optimization/LivingMascotRig.ts', 'utf8');
  save(join(vfx, 'LivingMascotRig.ts'), template);
  save(join(vfx, 'ArticulatedMascot.ts'), readFileSync('tools/lively-optimization/ArticulatedMascot.ts', 'utf8'));
  save(join(vfx, 'LivingMascotData.ts'), `import type { MascotBone } from './ArticulatedMascot';\nexport interface LivingMascotSpec { bones: readonly MascotBone[]; art: string; index: number; canvas: number[]; rect: number[]; pivot: number[]; frames: number[][]; phase: number; angle: number; period: number; eyeState: 'open' | 'closed'; blinkEnabled: boolean; blinkSafe: boolean; blinkIoU: number; }\nexport const LIVING_MASCOTS: readonly LivingMascotSpec[] = ${JSON.stringify(data, null, 2)};\n`);
  for (const file of ['LivingMascotRig.ts', 'LivingMascotData.ts', 'ArticulatedMascot.ts']) if (!existsSync(join(vfx, file + '.meta'))) save(join(vfx, file + '.meta'), JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:randomUUID(),files:[],subMetas:{},userData:{}},null,2)+'\n');
  const art = join(project, 'assets/resources/art');
  const sample = readdirSync(art).find(n => n.endsWith('.png.meta') || n.endsWith('.webp.meta'));
  for (const name of ['living-mascot-parts', ...new Set(data.map(s => s.art + '-live-bg'))]) {
    const target = join(art, name + '.png.meta'); if (existsSync(target)) continue;
    const meta = readFileSync(join(art, sample), 'utf8'), parsed = JSON.parse(meta), uuid = randomUUID();
    const next = JSON.parse(meta.split(parsed.uuid).join(uuid));
    for (const sub of Object.values(next.subMetas)) if ('displayName' in sub) sub.displayName = name;
    next.userData.hasAlpha = true; save(target, JSON.stringify(next, null, 2)+'\n');
  }
  if (p.id === 25) {
    const ui = join(project, 'assets/scripts/TheatreUI.ts');
    patch(ui, s => {
      if (!s.includes("import { LivingMascotRig }")) s = "import { LivingMascotRig } from './vfx/LivingMascotRig';\n" + s;
      if (!s.includes('LivingMascotRig.prepare(names)')) s = s.replace('await ThemeMotion.prepare();let done=0;', 'await ThemeMotion.prepare();await LivingMascotRig.prepare(names);let done=0;');
      s = s.replace('resources.load(`art/${name}/texture`', 'resources.load(`art/${LivingMascotRig.file(name)}/texture`');
      s = s.replace('s.spriteFrame=sf;ThemeMotion.attach(s,name);', 's.spriteFrame=sf;if(!LivingMascotRig.attach(s,name))ThemeMotion.attach(s,name);');
      // Collapse old repeated guards first, then only wrap the original call.
      // A second install must not nest another guard around an existing one.
      const materialCall = "sprite.customMaterial=mat;ThemeMotion.attachCompatible(sprite,mat,'cabinetMotion'+mode,mode);";
      const guardedCall = "if(!LivingMascotRig.contains(n)){" + materialCall + "}";
      s = s.replace(/(?:if\(!LivingMascotRig.contains\(n\)\)\{){2,}sprite.customMaterial=mat;ThemeMotion.attachCompatible\(sprite,mat,'cabinetMotion'\+mode,mode\);\}{2,}/, guardedCall);
      if (!s.includes(guardedCall)) s = s.replace(/sprite.customMaterial=mat;(?:if\(!LivingMascotRig.contains\(n\)\))?ThemeMotion.attachCompatible\(sprite,mat,'cabinetMotion'\+mode,mode\);/, guardedCall);
      s = s.replace('export function float(n:Node,seconds=5,amount=5){const p=', 'export function float(n:Node,seconds=5,amount=5){if(LivingMascotRig.contains(n))return;const p='); return s;
    });
  } else {
    const ui = join(project, 'assets/scripts/ui/SalonArt.ts');
    patch(ui, s => {
      if (!s.includes("import { LivingMascotRig }")) s = "import { LivingMascotRig } from '../vfx/LivingMascotRig';\n" + s;
      if (!s.includes('await LivingMascotRig.prepare(names);')) s = s.replace('await ThemeMotion.prepare();', 'await ThemeMotion.prepare();\n    await LivingMascotRig.prepare(names);');
      s = s.replace('resources.load(`art/${name}/texture`', 'resources.load(`art/${LivingMascotRig.file(name)}/texture`');
      s = s.replace(' : name;\n            resources.load(`art/${file}/texture`', ' : LivingMascotRig.file(name);\n            resources.load(`art/${file}/texture`');
      s = s.replace(/(?:if \(!LivingMascotRig.attach\(s,name,index\)\) )*ThemeMotion.attach\(s,name,index\);/, 'if (!LivingMascotRig.attach(s,name,index)) ThemeMotion.attach(s,name,index);'); return s;
    });
    patch(ui, s => s.includes('public replaceImage(') ? s : s.replace('  public frame(name:', '  public replaceImage(node: Node, name: string, index = -1): void {\n    const sprite = node.getComponent(Sprite)!; sprite.spriteFrame = this.frame(name,index);\n    if (!LivingMascotRig.attach(sprite,name,index)) ThemeMotion.attach(sprite,name,index);\n  }\n  public frame(name:'));
    const app = join(project, 'assets/scripts/ui/AureliaApp.ts');
    if (existsSync(app)) patch(app, s => {
      if (!s.includes("import { LivingMascotRig }")) s = "import { LivingMascotRig } from '../vfx/LivingMascotRig';\n" + s;
      s = s.replace(/private idleAccent\([^\n]+\):void\{/, (signature, offset) =>
        s.slice(offset + signature.length).trimStart().startsWith('if(LivingMascotRig.contains(n))')
          ? signature : signature + 'if(LivingMascotRig.contains(n))return;\n    ');
      s = s.replace('private breathe(n:Node,delay=0):void{if(this.reduced)', 'private breathe(n:Node,delay=0):void{if(LivingMascotRig.contains(n))return;if(this.reduced)'); return s;
    });
    if (p.id === 15) patch(app, s => s.replace("mount.setScale(.92,.92,1);this.idleAccent(mount,0,6,0);", "mount.setScale(.92,.92,1);")
      .replace("nodes.find(n=>n.name==='Featured festival')!.getComponent(Sprite)!.spriteFrame=this.art.frame('harvest-card-'+index);", "const featured=nodes.find(n=>n.name==='Featured festival')!;Tween.stopAllByTarget(featured);featured.angle=0;featured.setPosition(0,0);this.art.replaceImage(featured,'harvest-card-'+index);"));
  }
  console.log(`F${p.id}: installed ${data.length} independently animated heads`);
}
