import type { PlayerRecord } from './SaveService';
import type { ProductionApiClient } from './ProductionApiClient';

export interface RankEntry { rank: number; nickname: string; winnings: number; avatar: number; current: boolean; }
export class RankService {
  private readonly snapshots = new Map<'daily' | 'weekly' | 'all-time', RankEntry[]>();
  public constructor(private readonly api?: ProductionApiClient) {}
  public hasSnapshot(tab: 'daily' | 'weekly' | 'all-time'): boolean { return this.snapshots.has(tab); }
  public list(tab: 'daily' | 'weekly' | 'all-time', current?: PlayerRecord): RankEntry[] {
    if (this.api) return this.snapshots.get(tab) ?? [];
    // Offline mode has no global leaderboard or period snapshots. Never fabricate opponents.
    return current && tab === 'all-time' ? [{rank:1,nickname:current.nickname,winnings:current.totalWin,avatar:current.avatar,current:true}] : [];
  }

  public async refresh(tab: 'daily' | 'weekly' | 'all-time'): Promise<RankEntry[]> {
    if (!this.api) return this.list(tab);
    const response = await this.api.leaderboard(tab); const entries = response.entries.filter((entry) => Number.isSafeInteger(entry.rank) && entry.rank > 0 && Number.isSafeInteger(entry.winnings) && entry.winnings >= 0 && Number.isSafeInteger(entry.avatar) && entry.avatar >= 0 && entry.avatar <= 15 && typeof entry.nickname === 'string' && entry.nickname.length > 0 && entry.nickname.length <= 18).slice(0, 8);
    this.snapshots.set(tab, entries); return entries;
  }
}
