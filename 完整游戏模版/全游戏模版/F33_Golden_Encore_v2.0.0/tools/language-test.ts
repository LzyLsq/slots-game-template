import { strict as assert } from 'node:assert';
import { COPY, initializeLanguage, LANGUAGE_KEY, LANGUAGES, language, resolveLanguage, setLanguage, tr } from '../assets/scripts/ui/Language';
const saved = new Map<string, string>();
const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } };
initializeLanguage(storage);
assert.equal(language(), 'en');
assert.equal(resolveLanguage('zh-Hant-HK'), 'zh-TW');
assert.equal(resolveLanguage('zh-Hans-CN'), 'zh-CN');
assert.equal(resolveLanguage('ja-JP'), 'ja');
assert.equal(resolveLanguage('ko-KR'), 'ko');
for (const { code } of LANGUAGES) {
  setLanguage(code);
  assert.equal(saved.get(LANGUAGE_KEY), code);
  assert.equal(tr('BET {amount}', { amount: 500 }), code === 'en' ? 'BET 500' : COPY['BET {amount}'][['zh-CN', 'zh-TW', 'ja', 'ko'].indexOf(code)].replace('{amount}', '500'));
  assert.equal(tr('COLLECT'), code === 'en' ? 'COLLECT' : COPY.COLLECT[['zh-CN', 'zh-TW', 'ja', 'ko'].indexOf(code)], 'Physical collect control is localized');
  assert.equal(tr('Player123'), 'Player123', 'Never translate an arbitrary player name');
  initializeLanguage(storage);
  assert.equal(language(), code, 'Persisted language survives a new app session');
  for (const [key, translations] of Object.entries(COPY)) {
    assert.equal(translations.length, 4, `${key} needs four translations`);
    assert(translations.every(Boolean), `${key} has an empty translation`);
  }
}
console.log(`PASS ${LANGUAGES.length} languages, persistence, dynamic values and ${Object.keys(COPY).length} localized UI keys`);
