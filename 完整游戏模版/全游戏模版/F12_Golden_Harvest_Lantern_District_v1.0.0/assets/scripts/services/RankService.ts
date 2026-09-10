import type { PlayerRecord, SaveService } from './SaveService';
import type { ProductionApiClient } from './ProductionApiClient';

export interface RankEntry { rank: number; nickname: string; winnings: number; avatar: number; current: boolean; }
export class RankService {
  private readonly snapshots = new Map<'daily' | 'weekly' | 'all-time', RankEntry[]>();
  public constructor(private readonly api?: ProductionApiClient, private readonly save?: SaveService) {}
  public hasSnapshot(tab: 'daily' | 'weekly' | 'all-time'): boolean { return this.snapshots.has(tab); }
  public list(tab: 'daily' | 'weekly' | 'all-time', current?: PlayerRecord, at = new Date()): RankEntry[] {
    if (this.api) return this.snapshots.get(tab) ?? [];
    if (!current) return [];
    // These are explicitly labelled recent local records, not a global rank.
    // The save retains 200 transactions; do not imply a complete period history.
    const now = at; const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    if (tab === 'weekly') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    const winnings = tab === 'all-time' ? current.totalWin : (this.save?.currentScope()?.transactions ?? [])
      .filter(entry => (entry.type === 'spin-win' || entry.type === 'feature-win') && Date.parse(entry.at) >= start.getTime() && Date.parse(entry.at) <= now.getTime())
      .reduce((total, entry) => total + Math.max(0, entry.amount), 0);
    return [{rank:1,nickname:current.nickname,winnings,avatar:current.avatar,current:true}];
  }

  public async refresh(tab: 'daily' | 'weekly' | 'all-time'): Promise<RankEntry[]> {
    if (!this.api) return this.list(tab);
    const response = await this.api.leaderboard(tab); const entries = response.entries.filter((entry) => Number.isSafeInteger(entry.rank) && entry.rank > 0 && Number.isSafeInteger(entry.winnings) && entry.winnings >= 0 && Number.isSafeInteger(entry.avatar) && entry.avatar >= 0 && entry.avatar <= 15 && typeof entry.nickname === 'string' && entry.nickname.length > 0 && entry.nickname.length <= 18).slice(0, 8);
    this.snapshots.set(tab, entries); return entries;
  }
}
