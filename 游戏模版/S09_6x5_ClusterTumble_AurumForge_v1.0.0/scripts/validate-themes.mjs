import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configRoot = path.join(projectRoot, 'assets/resources/config');
const resourcesRoot = path.join(projectRoot, 'assets/resources');
const errors = [];
const warnings = [];

const readJson = async (file) => {
    try {
        return JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
        errors.push(`${file}: JSON 无法解析 (${error.message})`);
        return null;
    }
};

const resourceExists = (resourcePath) => {
    if (typeof resourcePath !== 'string') return false;
    const base = resourcePath.replace(/\/spriteFrame$/, '');
    return ['.png', '.jpg', '.jpeg', '.webp'].some((extension) =>
        existsSync(path.join(resourcesRoot, `${base}${extension}`)),
    );
};

const catalog = await readJson(path.join(configRoot, 'themes.json'));
if (!catalog) process.exit(1);
if (!Array.isArray(catalog.themes) || catalog.themes.length === 0) {
    errors.push('themes.json: themes 必须是非空数组');
}
if (!catalog.themes?.includes(catalog.defaultTheme)) {
    errors.push('themes.json: defaultTheme 必须包含在 themes 中');
}
if (new Set(catalog.themes).size !== catalog.themes.length) {
    errors.push('themes.json: themes 中存在重复 id');
}

for (const id of catalog.themes ?? []) {
    const file = path.join(configRoot, `${id}.json`);
    if (!existsSync(file)) {
        errors.push(`${id}: 缺少配置文件 assets/resources/config/${id}.json`);
        continue;
    }
    const config = await readJson(file);
    if (!config) continue;
    if (config.id !== id) errors.push(`${id}: 配置 id 与文件名不一致`);
    if (!config.title || !config.subtitle) errors.push(`${id}: 缺少 title 或 subtitle`);
    if (!(config.winRate >= 0 && config.winRate <= 1)) errors.push(`${id}: winRate 必须在 0 到 1 之间`);
    if (!Array.isArray(config.betOptions) || !config.betOptions.includes(config.defaultBet)) {
        errors.push(`${id}: defaultBet 必须存在于 betOptions 中`);
    }
    if (!Number.isInteger(config.columns) || config.columns < 3) errors.push(`${id}: columns 必须是至少 3 的整数`);
    if (!Number.isInteger(config.rows) || config.rows < 3) errors.push(`${id}: rows 必须是至少 3 的整数`);
    if (!Number.isInteger(config.minimumCluster) || config.minimumCluster < 3) errors.push(`${id}: minimumCluster 必须是至少 3 的整数`);
    if (!Array.isArray(config.cascadeMultipliers) || config.cascadeMultipliers.length === 0 || config.cascadeMultipliers.some((value) => !(value > 0))) {
        errors.push(`${id}: cascadeMultipliers 必须是非空正数数组`);
    }
    if (!(config.forgeTarget > 0)) errors.push(`${id}: forgeTarget 必须大于 0`);
    if (!(config.freeSpinsAward >= 0)) errors.push(`${id}: freeSpinsAward 不能小于 0`);
    if (!Array.isArray(config.symbols) || config.symbols.length < 3) {
        errors.push(`${id}: 至少需要 3 个 symbols`);
        continue;
    }
    const symbolIds = new Set();
    for (const symbol of config.symbols) {
        if (!symbol.id || symbolIds.has(symbol.id)) errors.push(`${id}: symbol id 缺失或重复 (${symbol.id ?? '空'})`);
        symbolIds.add(symbol.id);
        if (!(symbol.weight > 0)) errors.push(`${id}/${symbol.id}: weight 必须大于 0`);
        if (!(symbol.clusterValue >= 0)) errors.push(`${id}/${symbol.id}: clusterValue 不能小于 0`);
        if ((symbol.kind === 'regular' || symbol.kind === 'wild') && !(symbol.clusterValue > 0)) {
            errors.push(`${id}/${symbol.id}: 普通符号和 WILD 的 clusterValue 必须大于 0`);
        }
        if (!resourceExists(symbol.texture)) errors.push(`${id}/${symbol.id}: 找不到素材 ${symbol.texture}`);
    }

    const visualPaths = Object.entries(config.visual ?? {}).flatMap(([key, value]) => {
        if (typeof value === 'string' && value.includes('/spriteFrame')) return [[key, value]];
        if (Array.isArray(value)) return value.map((item, index) => [`${key}[${index}]`, item]);
        return [];
    });
    for (const [key, value] of visualPaths) {
        if (!resourceExists(value)) errors.push(`${id}/${key}: 找不到素材 ${value}`);
    }
}

for (const warning of warnings) console.warn(`警告: ${warning}`);
if (errors.length) {
    for (const error of errors) console.error(`错误: ${error}`);
    console.error(`主题校验失败：${errors.length} 个错误，${warnings.length} 个警告。`);
    process.exit(1);
}
console.log(`主题校验通过：${catalog.themes.length} 个主题，${warnings.length} 个警告。`);
