/** Local demo services. Virtual coins have no cash value; no purchase grants. */
export const STORAGE_KEY = 'fortune-tides:v1';
export const INITIAL_COINS = 40000;
export const DAILY_COINS = 3000;
export const LANGUAGES = ['en', 'zh', 'zh-Hant', 'ja', 'ko'];
export const SHOP_PACKS = Object.freeze([
  { id: 'deckhand', coins: 20000, labelKey: 'packDeckhand', art: 'shop-starter' },
  { id: 'captain', coins: 110000, labelKey: 'packCaptain', art: 'shop-captain' },
  { id: 'admiral', coins: 240000, labelKey: 'packAdmiral', art: 'shop-admiral' },
  { id: 'treasure', coins: 520000, labelKey: 'packTreasure', art: 'shop-treasure' },
]);
export const shopPacks = SHOP_PACKS;
const MAIL = [{ id: 'welcome', coins: 5000, titleKey: 'mailWelcome', bodyKey: 'mailWelcomeBody' }, { id: 'harbor', coins: 2500, titleKey: 'mailHarbor', bodyKey: 'mailHarborBody' }];
const integer = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0 ? value : fallback;
const validAmount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 1e6;
const roundAmount = value => Math.round(value * 1e6) / 1e6;
const clone = value => JSON.parse(JSON.stringify(value));
const utcDay = () => new Date().toISOString().slice(0, 10);
function defaultStorage() { try { return globalThis.localStorage; } catch { return undefined; } }
function freshState() {
  return { purchaseIds: [], version: 1, name: 'Captain', coins: INITIAL_COINS, lang: 'en', sound: true, reducedMotion: false,
    spins: 0, bestWin: 0, totalWin: 0, totalBet: 0, dailyLast: '', dailyClaims: 0,
    mail: MAIL.map(mail => ({ ...mail, read: false, claimed: false })) };
}
function normalize(raw) {
  const state = freshState();
  if(Array.isArray(raw?.purchaseIds))state.purchaseIds=raw.purchaseIds.filter(id=>typeof id==='string'&&/^\d{1,40}$/.test(id));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;
  if (typeof raw.name === 'string' && raw.name.trim()) state.name = [...raw.name.trim()].slice(0, 20).join('');
  for (const key of ['spins', 'dailyClaims']) state[key] = integer(raw[key], state[key]);
  for (const key of ['coins', 'bestWin', 'totalWin', 'totalBet']) if (validAmount(raw[key])) state[key] = roundAmount(raw[key]);
  if (LANGUAGES.includes(raw.lang)) state.lang = raw.lang;
  for (const key of ['sound', 'reducedMotion']) if (typeof raw[key] === 'boolean') state[key] = raw[key];
  if (typeof raw.dailyLast === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyLast)) state.dailyLast = raw.dailyLast;
  if (Array.isArray(raw.mail)) for (const mail of state.mail) {
    const saved = raw.mail.find(item => item && item.id === mail.id);
    if (saved) { mail.claimed = saved.claimed === true; mail.read = saved.read === true || mail.claimed; }
  }
  return state;
}
export function createStore(storage = defaultStorage(), storageKey = STORAGE_KEY) {
  let current = freshState();
  let persistent = Boolean(storage);
  try { current = normalize(JSON.parse(storage?.getItem(storageKey) || 'null')); } catch { /* Recover corrupted data using validated defaults. */ }
  const listeners = new Set();
  function commit(update) {
    const next = clone(current);
    const result = update(next);
    if (!result.ok) return result;
    current = next;
    try { if (storage) { storage.setItem(storageKey, JSON.stringify(next)); persistent = true; } else persistent = false; }
    catch { persistent = false; }
    for (const listener of listeners) { try { listener(clone(current)); } catch { /* View errors do not undo a transaction. */ } }
    return { ...result, persistent };
  }
  const fail = error => ({ ok: false, error });
  return {
    get state() { return clone(current); },
    get persistent() { return persistent; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    rename(name) {
      if (typeof name !== 'string' || !name.trim() || [...name.trim()].length > 20) return fail('invalidName');
      return commit(state => { state.name = name.trim(); return { ok: true }; });
    },
    setSetting(key, value) {
      if (key === 'lang' ? !LANGUAGES.includes(value) : !['sound', 'reducedMotion'].includes(key) || typeof value !== 'boolean') return fail('invalidSetting');
      return commit(state => { state[key] = value; return { ok: true }; });
    },
    recordSpin(bet, win) {
      if (!validAmount(bet) || roundAmount(bet) <= 0 || !validAmount(win)) return fail('invalidSpin');
      return commit(state => {
        if (state.coins < bet) return fail('insufficientCoins');
        bet = roundAmount(bet); win = roundAmount(win);
        const coins = roundAmount(state.coins - bet + win);
        if (![coins, state.totalBet + bet, state.totalWin + win].every(validAmount) || !Number.isSafeInteger(state.spins + 1)) return fail('balanceLimit');
        state.coins = coins; state.spins += 1; state.totalBet = roundAmount(state.totalBet + bet); state.totalWin = roundAmount(state.totalWin + win); state.bestWin = Math.max(state.bestWin, win);
        return { ok: true, bet, win, coins };
      });
    },
    markRead(id) { return commit(state => {
      const mail = state.mail.find(item => item.id === id);
      if (!mail) return fail('mailMissing');
      mail.read = true; return { ok: true };
    }); },
    claimMail(id) { return commit(state => {
      const mail = state.mail.find(item => item.id === id);
      if (!mail) return fail('mailMissing');
      if (mail.claimed) return fail('alreadyClaimed');
      if (!validAmount(state.coins + mail.coins)) return fail('balanceLimit');
      state.coins = roundAmount(state.coins + mail.coins); mail.claimed = true; mail.read = true;
      return { ok: true, coins: mail.coins, amount: mail.coins };
    }); },
    claimDaily() { return commit(state => {
      const day = utcDay();
      if (state.dailyLast >= day) return fail('alreadyClaimed');
      if (!validAmount(state.coins + DAILY_COINS) || !Number.isSafeInteger(state.dailyClaims + 1)) return fail('balanceLimit');
      state.coins = roundAmount(state.coins + DAILY_COINS); state.dailyLast = day; state.dailyClaims += 1;
      return { ok: true, coins: DAILY_COINS, amount: DAILY_COINS };
    }); },
    canClaimDaily() { return current.dailyLast < utcDay(); },
    grantPurchase(id,amount) {
      if(current.purchaseIds.includes(id))return 'duplicate';
      if(!storage||!Number.isSafeInteger(amount)||amount<=0)throw Error('Invalid purchase save');
      const next=clone(current);next.coins+=amount;next.purchaseIds.push(id);
      if(!validAmount(next.coins))throw Error('Balance limit');
      storage.setItem(storageKey,JSON.stringify(next));current=next;persistent=true;
      for(const l of listeners)try{l(clone(current));}catch{}
      return 'new';
    },
    purchase() { return fail('nativeIAPNotice'); },
  };
}
export function getRanks(state) {
  const examples = [{"name": "Coral Voyager", "coins": 486400}, {"name": "Pearl Seeker", "coins": 372800}, {"name": "Moonlit Mariner", "coins": 298600}, {"name": "Amber Anchor", "coins": 241200}, {"name": "Sapphire Skipper", "coins": 198400}, {"name": "Silver Gull", "coins": 174600}, {"name": "Jade Navigator", "coins": 153200}, {"name": "Crimson Sail", "coins": 138800}, {"name": "Golden Current", "coins": 124600}, {"name": "Azure Compass", "coins": 112400}, {"name": "Ivory Islander", "coins": 98800}, {"name": "Copper Corsair", "coins": 87600}, {"name": "Opal Observer", "coins": 76400}, {"name": "Scarlet Starfish", "coins": 65200}, {"name": "Emerald Explorer", "coins": 54800}, {"name": "Indigo Captain", "coins": 46200}, {"name": "Turquoise Tide", "coins": 38600}, {"name": "Ruby Reef", "coins": 31200}, {"name": "Aqua Albatross", "coins": 24800}, {"name": "Velvet Voyager", "coins": 19600}, {"name": "Bronze Beacon", "coins": 14800}, {"name": "Crystal Cove", "coins": 10400}, {"name": "Misty Mariner", "coins": 6800}, {"name": "Sunny Seafarer", "coins": 3200}];
  return [...examples.map(row => ({ ...row, example: true, isPlayer: false })), { name: state.name, coins: state.coins, example: false, isPlayer: true }]
    .sort((a, b) => b.coins - a.coins).map((row, index) => ({ ...row, rank: index + 1 }));
}
