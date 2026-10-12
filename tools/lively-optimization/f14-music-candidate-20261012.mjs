// Isolated listening candidate. Never writes to an existing game or Xcode project.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, mkdtempSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

const exec = promisify(execFile);
const option = key => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const ffmpeg = option('ffmpeg');
const output = resolve(option('output') || '/Users/mengjunzhu/Desktop/F14_音乐试听候选_20261012');
const original = '/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010/F14_Cloud_Crown_OC_StoreKit2_Xcode/F14_H5/audio';
assert(ffmpeg && existsSync(ffmpeg), 'Provide --ffmpeg=<executable>');
assert(!existsSync(output), `Output already exists; not overwriting: ${output}`);
const cache = mkdtempSync(join(tmpdir(), 'f14-music-candidate.'));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const snapshot = () => Object.fromEntries(readdirSync(original).filter(n => statSync(join(original, n)).isFile()).sort().map(n => [n, sha(join(original, n))]));
const before = snapshot();
for (const dir of ['new', 'old', 'verification']) mkdirSync(join(output, dir), {recursive: true});
console.log(`Candidate output: ${output}\nSource cache: ${cache}`);

// Seven different compositions, not one tune with pitch, tempo or EQ variations.
const compositions = [
  {slug: 'simplicity', title: 'Simplicity', role: '大厅 · 温暖迎宾', note: '钢琴、轻爵士鼓、弦乐与拨弦乐器；先试听主旋律，再判断是否够喜庆。'},
  {slug: 'wonderful', title: 'Wonderful', role: '大厅 · 活泼备选', note: '钢琴、电风琴、颤音琴、贝斯与鼓；与主选是两首不同作品。'},
  {slug: 'felicity', title: 'Felicity', role: 'SKY ADMIRAL · 轻快航行', note: '钢琴、曼陀林、弦乐、提琴主奏与鼓；作为飞行主题候选。'},
  {slug: 'quirky-lane', title: 'Quirky Lane', role: 'PEARL VOYAGE · 俏皮探宝', note: '弦乐开场，后续进入木管和颤音琴；可用进度条试听不同段落。'},
  {slug: 'high-games', title: 'High Games', role: 'SUNSTONE EXPRESS · 弹跳节奏', note: '木管、弦乐、颤音琴与少量小号；注意听是否偏亮，暂不作为所有场景的默认。'},
  {slug: 'ice-cream', title: 'Ice Cream', role: 'MOON CAROUSEL · 轻甜旋律', note: '钢琴、单簧管、电风琴、曼陀林、鼓与贝斯；轻爵士方向。'},
  {slug: 'jubilee', title: 'Jubilee', role: '特殊奖励 · 隆重庆典', note: '铜管、弦乐与管弦打击乐；只作为特殊庆典候选，不在日常一直轰响。'},
];

async function ff(args) {
  return exec(ffmpeg, ['-nostdin', '-hide_banner', ...args], {maxBuffer: 16 * 1024 * 1024});
}
async function probe(file) {
  const {stderr} = await ff(['-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const d = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  assert(d, `No audio duration: ${file}`);
  const duration = Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]);
  const peakDb = Number(stderr.match(/max_volume: ([-\d.]+) dB/)?.[1]);
  assert(Number.isFinite(peakDb) && duration > 0, 'Invalid audio: ' + file);
  return {duration, peakDb};
}
async function measure(file, start, length) {
  const range = start === undefined ? [] : ['-ss', String(start), '-t', String(length)];
  const {stderr} = await ff([...range, '-i', file, '-af', 'loudnorm=I=-20:TP=-3:LRA=11:print_format=json', '-f', 'null', '-']);
  const json = stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
  assert(json, 'No loudness analysis for ' + file);
  const m = JSON.parse(json);
  assert(Number.isFinite(Number(m.input_i)) && Number.isFinite(Number(m.input_tp)), 'Silent source: ' + file);
  return m;
}

const sources = [];
for (const entry of compositions) {
  const page = `https://www.scottbuckley.com.au/library/${entry.slug}/`;
  const response = await fetch(page, {signal: AbortSignal.timeout(35000)});
  assert(response.ok, `Source page unavailable: ${page}`);
  const html = await response.text();
  assert(/Creative Commons Attribution 4\.0 International License/.test(html), 'Missing per-track licensing evidence: ' + page);
  assert(/including commercial/.test(html), 'Missing usage statement: ' + page);
  const mp3 = html.match(/https?:[^\s"'<>]+\.mp3/)?.[0]?.replace(/^http:/, 'https:');
  assert(mp3?.startsWith('https://www.scottbuckley.com.au/'), 'Unexpected audio host: ' + page);
  const download = await fetch(mp3, {signal: AbortSignal.timeout(90000)});
  assert(download.ok, 'Download failed: ' + mp3);
  const source = join(cache, entry.slug + '.mp3');
  writeFileSync(source, Buffer.from(await download.arrayBuffer()));
  assert(statSync(source).size > 50000, 'Unexpected small audio download');
  const analysis = await probe(source);
  sources.push({...entry, page, download: mp3, source, sourceSha256: sha(source), sourceSeconds: analysis.duration,
    license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', artist: 'Scott Buckley',
    attribution: `'${entry.title}' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au`,
    licenseCheckedAt: new Date().toISOString(), sourcePageSha256: createHash('sha256').update(html).digest('hex')});
  console.log(`Downloaded ${entry.title}: ${analysis.duration.toFixed(1)} seconds`);
}

const tracks = [];
async function encode(source, {id, label, section, seconds, start = 0, excerpt = false, note}) {
  const analysis = await measure(source.source, excerpt ? start : undefined, seconds);
  const targetLufs = section === 'wins' ? -18 : -20;
  // Static gain preserves original dynamics; never speeds up, transposes or stitches melodies.
  const gainDb = Math.min(targetLufs - Number(analysis.input_i), -3.5 - Number(analysis.input_tp));
  const filters = [`volume=${gainDb.toFixed(4)}dB`];
  if (excerpt) filters.push('afade=t=in:d=0.07', `afade=t=out:st=${(seconds - .045).toFixed(4)}:d=0.045`);
  const file = `new/${id}.m4a`;
  const target = join(output, file);
  const range = excerpt ? ['-ss', String(start), '-t', String(seconds)] : [];
  await ff(['-y', ...range, '-i', source.source, '-vn', '-af', filters.join(','), '-ar', '48000', '-ac', '2',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-metadata', `title=${source.title} / ${label}`,
    '-metadata', 'artist=Scott Buckley', '-metadata', 'comment=F14 listening candidate, not integrated', target]);
  const result = await probe(target);
  assert(result.peakDb <= -2.5, `Encoded peak too high: ${id}`);
  tracks.push({id, label, section, variant: 'new', title: source.title, artist: source.artist, note: note || source.note,
    file, ...result, bytes: statSync(target).size, sha256: sha(target), sourcePage: source.page, sourceUrl: source.download,
    license: source.license, licenseUrl: source.licenseUrl, attribution: source.attribution, sourceSha256: source.sourceSha256,
    sourceRange: excerpt ? {start, seconds} : {start: 0, seconds: source.sourceSeconds}, fullComposition: !excerpt,
    modifications: excerpt ? 'Single-source excerpt with short boundary fades, static gain, AAC encoding. No speed/pitch change or melody stitching.' : 'Complete composition, static gain, AAC encoding. Original speed and pitch; no rearrangement, cut or automatic loop seam.',
    gainDb: Number(gainDb.toFixed(4)), measuredSourceLufs: Number(analysis.input_i)});
  console.log(`Encoded ${label}: ${result.duration.toFixed(2)} seconds`);
}
for (const source of sources) await encode(source, {id: 'music-' + source.slug, label: source.role, section: 'music'});

// Closing passages retain each source's real ending. These are excerpts, NOT newly composed victory cues.
// Timing and fit are listening candidates; integrating longer cues also requires adjusting presentation timing.
const awards = [
  {id: 'win-small', label: '小奖 · 轻巧收尾', slug: 'ice-cream', seconds: 6, note: 'Ice Cream 的末段摘录；轻甜方向候选，不承诺已经与小奖动画对齐。'},
  {id: 'win-big', label: '大奖 · 明亮展开', slug: 'wonderful', seconds: 9, note: 'Wonderful 的末段摘录；与小奖不是同一声音加速或加大音量。'},
  {id: 'win-mega', label: '巨奖 · 旋律庆祝', slug: 'felicity', seconds: 12, note: 'Felicity 的末段摘录；较长的旋律庆祝候选。'},
  {id: 'win-epic', label: '史诗大奖 · 俏皮庆典', slug: 'high-games', seconds: 15, note: 'High Games 的末段摘录；活泼方向备选，需要你判断是否足够隆重。'},
  {id: 'win-super', label: '超级大奖 · 管弦庆典', slug: 'jubilee', seconds: 20, note: 'Jubilee 的末段摘录；管弦庆典方向候选，不是独立原创中奖曲。'},
];
for (const award of awards) {
  const source = sources.find(s => s.slug === award.slug);
  // Keep a natural ending rather than cutting an arbitrary middle section or adding repeated sound effects.
  const {stderr} = await ff(['-i', source.source, '-af', 'silencedetect=n=-55dB:d=0.25', '-f', 'null', '-']);
  const silenceStart = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map(m => Number(m[1])).at(-1);
  const end = silenceStart !== undefined && source.sourceSeconds - silenceStart < 5 ? Math.min(source.sourceSeconds, silenceStart + .35) : source.sourceSeconds;
  const start = Math.max(0, end - award.seconds);
  await encode(source, {...award, section: 'wins', start, excerpt: true});
}

const oldManifest = JSON.parse(readFileSync(join(original, 'music-manifest.json')));
for (const id of ['music-home', 'music-cabinet', 'music-spin', ...awards.map(a => a.id)]) {
  const old = oldManifest.tracks.find(t => t.id === id);
  assert(old, 'Missing old reference: ' + id);
  const file = 'old/' + old.file;
  copyFileSync(join(original, old.file), join(output, file));
  const analysis = await probe(join(output, file));
  const label = id === 'music-home' ? '旧大厅' : id === 'music-cabinet' ? '旧柜机（四台共用）' : id === 'music-spin' ? '旧旋转片段' : '旧' + awards.find(a => a.id === id).label.split(' · ')[0];
  tracks.push({...old, id: 'old-' + id, label, file, ...analysis, variant: 'old', section: id.startsWith('win-') ? 'wins' : 'music',
    note: '现有 F14 文件的原样副本；只供对比，未改原文件。', bytes: statSync(join(output, file)).size, sha256: sha(join(output, file))});
}
copyFileSync(join(original, 'CC-BY-4.0.html'), join(output, 'CC-BY-4.0.html'));
const usageUrl = 'https://www.scottbuckley.com.au/library/using-this-music/';
const usageResponse = await fetch(usageUrl, {signal: AbortSignal.timeout(35000)});
assert(usageResponse.ok);
const usage = await usageResponse.text();
assert(/adapt/.test(usage) && /commercial use/.test(usage), 'Could not verify artist usage page');
const manifest = {
  revision: 'f14-curated-composition-candidate-20261012', status: 'Listening candidate only; not installed into any game or Xcode project',
  createdAt: new Date().toISOString(), output, cache, original, tracks,
  licensing: {artistUsagePage: usageUrl, checkedAt: new Date().toISOString(),
    sourcePageSha256: createHash('sha256').update(usage).digest('hex'),
    notes: 'Preserve artist/title/license/source links and disclose edits if integrated. This private game-audio audition is not a resale music library or a streaming upload. Do not submit these recordings to audio fingerprinting services.'},
  compositions: sources.map(({source, ...s}) => s),
  counts: {newFullCompositions: 7, newWinExcerpts: 5, oldReferences: 8},
  limitations: ['No human listening approval.', 'No in-game mixing or animation sync test.', 'Full background compositions are not validated seamless loops.', 'No original game, StoreKit, signature or WebP assets changed.'],
};
writeFileSync(join(output, '音乐清单与授权.json'), JSON.stringify(manifest, null, 2) + '\n');
const template = readFileSync(join(import.meta.dirname, 'f14-music-candidate.template.html'), 'utf8');
writeFileSync(join(output, '音乐新旧对比.html'), template.replace('/* AUDIO_DATA */', JSON.stringify(manifest).replaceAll('<', '\\u003c')));
writeFileSync(join(output, '先看这里.md'), `# F14 音乐新旧对比候选\n\n双击“音乐新旧对比.html”试听。只打开试听文件，不会覆盖原游戏。\n\n- 新版：7 首不同的完整配乐，保留旋律发展和原作配器；不是变速、变调或单曲换 EQ。\n- 大厅有两个选曲方向；四个柜机各一首；另有特殊庆典配乐。\n- 5 个中奖候选为 6 / 9 / 12 / 15 / 20 秒的授权原作摘录，未宣称独立原创中奖音乐。\n- 旧版：保留大厅、柜机、旋转和五级中奖的原样副本作对比。\n- 全部新音频保持原速、原调，使用静态增益平衡响度、双声道 AAC；未增加运行时合成音。\n\n先听大厅、柜机与超级大奖，再对比旧版。选曲、奖段是否自然由实际试听确认，技术检测不等于听感验收。\n\n## 尚未接入\n\n没有改任何已有 H5 / Xcode 工程，也没有修改玩法、内购、签名、图片。更长奖段若接入，需要匹配演出时长与跳过/返回时的淡出；完整背景乐若循环，需要试听并单独制作循环边界。不能把本样版直接宣称全系列成品。\n\n## 作者与授权\n\n新作均由 Scott Buckley 发布，逐曲页面注明 CC BY 4.0。作品名、作者、原始链接、许可链接、改动范围见“音乐清单与授权.json”和试听页。正式接入时要把对应署名放入游戏内可访问的致谢页；不作为独立音乐素材转售或上传音乐流媒体，不提交音频指纹服务。\n\n旧版配乐作者 Kevin MacLeod，CC BY 4.0；旧版反馈素材 Kenney Vleugels，CC0。此文件夹仅用于本项目选曲对比。\n`);
assert.deepEqual(snapshot(), before, 'Original audio changed during candidate creation');
writeFileSync(join(output, 'verification', '原版未改与解码检查.json'), JSON.stringify({checkedAt: new Date().toISOString(), passed: true,
  originalAudioFiles: Object.keys(before).length, originalUnchanged: true, originalSha256: before,
  files: tracks.map(t => ({file: t.file, duration: t.duration, peakDb: t.peakDb, sha256: t.sha256, decodedWithoutError: true})),
  bytes: tracks.reduce((sum, t) => sum + t.bytes, 0), humanListeningApproved: false, gameIntegrationTested: false}, null, 2) + '\n');
console.log(`DONE: ${tracks.length} playable files; original ${Object.keys(before).length} files unchanged.`);
