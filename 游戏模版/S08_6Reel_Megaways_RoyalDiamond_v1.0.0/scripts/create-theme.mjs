import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configRoot = path.join(projectRoot, 'assets/resources/config');
const themeRoot = path.join(projectRoot, 'assets/resources/theme');

const args = process.argv.slice(2);
const positional = args.filter((value) => !value.startsWith('--'));
const option = (name, fallback) => {
    const prefix = `--${name}=`;
    return args.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

const id = positional[0];
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
    console.error('用法: npm run theme:new -- <主题id> --title="游戏标题" --subtitle="副标题" --from=royal-diamond');
    console.error('主题 id 必须使用小写字母、数字和连字符，例如 ocean-treasure。');
    process.exit(1);
}

const sourceId = option('from', 'royal-diamond');
const title = option('title', id.replace(/-/g, ' ').toUpperCase());
const subtitle = option('subtitle', `${title} SLOT`);
const sourceConfigPath = path.join(configRoot, `${sourceId}.json`);
const targetConfigPath = path.join(configRoot, `${id}.json`);
const sourceThemePath = path.join(themeRoot, sourceId === 'fruit' ? 'classic' : sourceId);
const targetThemePath = path.join(themeRoot, id);

if (!existsSync(sourceConfigPath) || !existsSync(sourceThemePath)) {
    console.error(`找不到源主题 ${sourceId} 的配置或素材目录。`);
    process.exit(1);
}
if (existsSync(targetConfigPath) || existsSync(targetThemePath)) {
    console.error(`主题 ${id} 已存在；为避免覆盖，生成操作已停止。`);
    process.exit(1);
}

const replaceThemePaths = (value) => {
    if (typeof value === 'string') {
        const sourceFolder = sourceId === 'fruit' ? 'classic' : sourceId;
        return value.replaceAll(`theme/${sourceFolder}/`, `theme/${id}/`);
    }
    if (Array.isArray(value)) return value.map(replaceThemePaths);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceThemePaths(child)]));
    }
    return value;
};

const sourceConfig = JSON.parse(await readFile(sourceConfigPath, 'utf8'));
const config = replaceThemePaths(sourceConfig);
config.id = id;
config.title = title;
config.subtitle = subtitle;
const maxMultiplier = Math.max(...config.symbols.map((symbol) => symbol.multiplier));
config.copy = {
    autoStart: 'AUTO',
    autoStop: 'STOP',
    soundOn: 'SOUND',
    soundOff: 'MUTED',
    rulesLabel: 'RULES',
    rulesTitle: 'PAYTABLE & RULES',
    rulesMatch: 'DYNAMIC 2–7 ROW REELS  •  MATCH 3+ FROM THE LEFT',
    rulesFormula: 'WAYS WIN = BET × SYMBOL AWARD × MATCHING WAYS',
    meterLabel: 'VAULT CHARGE',
    idle: 'TAP SPIN TO PLAY',
    betLabel: 'BET LEVEL',
    spinLabel: 'SPIN',
    footer: 'MEGAWAYS  •  CASCADES  •  WILD  •  VAULT BONUS',
    loadingEyebrow: `${subtitle}  •  JACKPOT ARCADE`,
    loadingFeatures: [`${config.symbols.length} SYMBOLS`, `UP TO ${maxMultiplier}x`, 'LUCKY STREAKS'],
    loadingInitial: 'LOADING THE REELS...',
    loadingStages: ['POLISHING THE SYMBOLS...', 'CHARGING THE LIGHTS...', 'PREPARING THE JACKPOT...'],
    loadingReady: 'READY TO SPIN!',
    loadingTip: `COLLECT ${config.coinTarget ?? 12} COIN SYMBOLS TO OPEN THE VAULT`,
    insufficientCoins: 'NOT ENOUGH COINS',
    spinStart: 'GOOD LUCK!',
    winPrefix: 'WIN',
    nearMiss: 'SO CLOSE!',
    lose: 'TRY AGAIN',
    regularWinTitle: 'BIG WIN!',
    bigWinTitle: 'MEGA WIN!',
    jackpotTitle: 'JACKPOT!',
};

await mkdir(path.dirname(targetThemePath), { recursive: true });
await cp(sourceThemePath, targetThemePath, {
    recursive: true,
    filter: (source) => !source.endsWith('.meta') && !source.endsWith('.DS_Store'),
});
await writeFile(targetConfigPath, `${JSON.stringify(config, null, 2)}\n`);

const themesPath = path.join(configRoot, 'themes.json');
const themes = JSON.parse(await readFile(themesPath, 'utf8'));
if (!themes.themes.includes(id)) themes.themes.push(id);
themes.defaultTheme = id;
await writeFile(themesPath, `${JSON.stringify(themes, null, 2)}\n`);

const files = await readdir(targetThemePath);
console.log(`已创建主题: ${id}`);
console.log(`配置: assets/resources/config/${id}.json`);
console.log(`素材: assets/resources/theme/${id}/ (${files.length} 个顶层条目)`);
console.log(`默认启动主题已设置为: ${id}`);
console.log('下一步：替换复制出来的图片，保持文件名不变；打开 Cocos Creator 等待重新导入，然后预览。');
