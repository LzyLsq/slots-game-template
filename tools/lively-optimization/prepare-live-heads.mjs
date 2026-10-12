import {createRequire} from 'node:module';
import {existsSync,readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {profiles} from './profiles.mjs';
import {liveHeads} from './mascot-live-manifest.mjs';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=resolve('完整游戏模版/全游戏模版');
const ids=process.argv.slice(2).map(v=>Number(v.replace(/^F/i,'')));
function saveText(path, text) {
  const old=existsSync(path)?readFileSync(path,'utf8'):null;
  if(old===text)return;
  let patch='*** Begin Patch\n'+(old===null?'*** Add File: ':'*** Update File: ')+path+'\n';
  if(old!==null)patch+='@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n';
  patch+=text.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';
  execFileSync('apply_patch',[],{input:patch});
}
for(const h of liveHeads.filter(h=>!ids.length||ids.includes(h.id))){
  const profile=profiles.find(p=>p.id===h.id);
  const project=join(root,readdirSync(root).find(n=>n.startsWith(`F${h.id}_${profile.slug}_v`)));
  const out=join(project,'output/imagegen/live-heads');mkdirSync(out,{recursive:true});
  const stem=h.art+(h.index>=0?'-'+h.index:'');
  const input=join(out,stem+'-reference.png');
  await sharp(join(project,'assets/resources/art',h.art+'.'+h.ext)).extract({left:h.crop[0],top:h.crop[1],width:h.crop[2],height:h.crop[3]}).resize(512,512).png().toFile(input);
  const prompt=`Use case: precise-object-edit\nAsset type: nonviolent cartoon sprite animation layers\nInput images: Image 1 is the edit target, a square crop of ${h.species}.\nPrimary request: prepare THREE registered square animation tiles in one horizontal strip, canvas 1536 x 512. Match the original illustration, proportions and identity; do not redesign or enlarge the character.\nLEFT tile is the stationary backing layer: reproduce this crop, but omit just the face, ears and headgear of the cartoon mascot so they can be drawn on a separate animation layer. Paint the hidden scenery naturally. Keep the torso, clothing below the neck, hands, props and surrounding scene unchanged. This is an illustration-layer editing task, not a scene of injury.\nMIDDLE tile is the overlapping animated face layer: the mascot's exact original head, both ears, cheek fur, crown or hat if present, with a small neck overlap. No torso, clothes, scenery, floor or shadow.\nRIGHT tile is the same animated layer with a gentle natural blink: both eyelids closed, otherwise absolutely identical silhouette, crown, fur, expression and position.\nRegistration: each tile uses the SAME 512 x 512 coordinates as Image 1. Keep the head at its exact original size and position. Do not center, enlarge, shrink, shift or rotate it. Tile boundaries are x=512 and x=1024, without lines or gutters. Preserve left-tile outside edges.\nMiddle and right backgrounds: perfectly solid flat chroma green #00FF00, no shadows, gradients, texture or edge glow. Native transparent alpha is also acceptable if supported, but never draw a checkerboard. Preserve detailed fur without coloured fringes.\nConstraints: one face per animation tile, complete ears/headgear; no text, labels, watermark, new character or new props.\n`;
  const expressionPrompt = h.eyeState === 'closed' ? prompt.replace(
    'RIGHT tile is the same animated layer with a gentle natural blink: both eyelids closed, otherwise absolutely identical silhouette, crown, fur, expression and position.',
    'This mascot already smiles with closed eyes in Image 1. Preserve that exact expression in the MIDDLE tile; do not invent open eyes. RIGHT tile must be an identical duplicate of the MIDDLE tile, including eyelids. This character does not blink.'
  ) : prompt;
  const safePrompt = (h.version >= 3 ? expressionPrompt.replace(
    'Registration: each tile uses the SAME 512 x 512 coordinates as Image 1. Keep the head at its exact original size and position. Do not center, enlarge, shrink, shift or rotate it. Tile boundaries are x=512 and x=1024, without lines or gutters. Preserve left-tile outside edges.',
    'LEFT tile registration: use exactly the same composition and coordinates as Image 1, including all clothing, hands, props and scenery; only omit the animated head. MIDDLE and RIGHT tiles: center the COMPLETE extracted head with at least 40 pixels of empty margin on ALL four sides. Resize it uniformly to fit if necessary. Never clip an antenna tip, ear, crown, hat, cheek or snout against a tile edge. Preserve its exact original shape, identity and expression. Include a short natural rounded neck overlap, not a flat horizontal cut; do not include any hand, sleeve, torso, scarf or prop in the animated tiles. The two extracted heads must have identical size, position and silhouette; only eyelids change. Tile boundaries are x=512 and x=1024, without lines or gutters. Preserve left-tile outside edges.'
  ) : expressionPrompt).replace('only eyelids change.', h.eyeState === 'closed' ? 'the original closed-eye smile stays identical.' : 'only eyelids change.');
  const promptFile=join(out,stem+`-prompt-v${h.version||2}.txt`);
  saveText(promptFile,safePrompt);
  console.log(JSON.stringify({id:h.id,stem,input,prompt:promptFile,output:join(out,stem+`-layers-v${h.version||2}.png`)}));
}
