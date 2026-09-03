import { sys } from 'cc';

// One wallet shared by the lobby and every slot machine. The lobby persists
// player credits inside the app save; the machines mirror that balance so
// coins follow the player across all four games and back into the lobby.
const SAVE_KEY = 'gilded-pearl-empire.save.v1';
const LEGACY_SAVE_KEY = 'celestial-spin-world.save.v4';
const WALLET_KEY = 'gilded-pearl-empire.wallet.v1';

interface WalletSave {
    currentUserId?: string | null;
    players?: Record<string, { credits?: number }>;
}

const readNumber = (raw: string | null): number | null => {
    if (raw === null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
};

const readSaveCredits = (): number | null => {
    for (const key of [SAVE_KEY, LEGACY_SAVE_KEY]) {
        const raw = sys.localStorage.getItem(key);
        if (!raw) continue;
        try {
            const save = JSON.parse(raw) as WalletSave;
            const id = save.currentUserId;
            const credits = id ? save.players?.[id]?.credits : undefined;
            if (typeof credits === 'number' && Number.isFinite(credits) && credits >= 0) {
                return Math.floor(credits);
            }
        } catch {
            // Corrupted save: keep reading the standalone wallet below.
        }
    }
    return null;
};

const writeSaveCredits = (coins: number): void => {
    const key = sys.localStorage.getItem(SAVE_KEY)
        ? SAVE_KEY
        : (sys.localStorage.getItem(LEGACY_SAVE_KEY) ? LEGACY_SAVE_KEY : null);
    if (!key) return;
    try {
        const save = JSON.parse(sys.localStorage.getItem(key) as string) as WalletSave;
        const id = save.currentUserId;
        if (!id || !save.players || !save.players[id]) return;
        save.players[id].credits = Math.max(0, Math.min(1_000_000_000, Math.floor(coins)));
        sys.localStorage.setItem(key, JSON.stringify(save));
    } catch {
        // Keep the machine-side wallet even if the save is temporarily unreadable.
    }
};

export const GameWallet = {
    read(fallback: number): number {
        return readSaveCredits() ?? readNumber(sys.localStorage.getItem(WALLET_KEY)) ?? fallback;
    },
    write(coins: number): void {
        const value = Math.max(0, Math.floor(coins));
        sys.localStorage.setItem(WALLET_KEY, String(value));
        writeSaveCredits(value);
    },
};
