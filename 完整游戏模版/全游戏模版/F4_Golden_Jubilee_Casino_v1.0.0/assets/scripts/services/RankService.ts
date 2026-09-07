import type { PlayerRecord } from './SaveService';
import type { ProductionApiClient } from './ProductionApiClient';

export interface RankEntry { rank: number; nickname: string; winnings: number; avatar: number; current: boolean; }
const names = ['Ruby Lin', 'Lucky Kai', 'Jade Moss', 'Coral Rue', 'Fortune Ash', 'Gold Wen', 'Amber Lux', 'Pearl Vale', 'Chip Quinn', 'Mint Ren'];
export class RankService {
  private readonly snapshots = new Map<'daily' | 'weekly' | 'all-time', RankEntry[]>();
  public constructor(private readonly api?: ProductionApiClient) {}
  public hasSnapshot(tab: 'daily' | 'weekly' | 'all-time'): boolean { return this.snapshots.has(tab); }
  public list(tab: 'daily' | 'weekly' | 'all-time', current?: PlayerRecord): RankEntry[] {
    if (this.api) return this.snapshots.get(tab) ?? [];
    const scale = tab === 'daily' ? 1 : tab === 'weekly' ? 6 : 24;
    const rows = names.map((nickname, index) => ({ nickname, winnings: (98_000 - index * 7_100) * scale, avatar: index % 12, current: false }));
    if (current) rows.push({ nickname: current.nickname, winnings: current.totalWin, avatar: current.avatar, current: true });
    return rows.sort((a, b) => b.winnings - a.winnings).map((row, index) => ({ ...row, rank: index + 1 }));
  }

  public async refresh(tab: 'daily' | 'weekly' | 'all-time'): Promise<RankEntry[]> {
    if (!this.api) return this.list(tab);
    const response = await this.api.leaderboard(tab); const entries = response.entries.filter((entry) => Number.isSafeInteger(entry.rank) && entry.rank > 0 && Number.isSafeInteger(entry.winnings) && entry.winnings >= 0 && Number.isSafeInteger(entry.avatar) && entry.avatar >= 0 && entry.avatar <= 11 && typeof entry.nickname === 'string' && entry.nickname.length > 0 && entry.nickname.length <= 18).slice(0, 8);
    this.snapshots.set(tab, entries); return entries;
  }
}
