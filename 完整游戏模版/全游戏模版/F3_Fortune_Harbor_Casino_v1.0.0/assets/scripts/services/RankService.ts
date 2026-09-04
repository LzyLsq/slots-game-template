import type { PlayerRecord } from './SaveService';

export interface RankEntry { rank: number; nickname: string; score: number; avatar: number; current: boolean; }
const names = ['Ruby Lin', 'Lucky Kai', 'Jade Moss', 'Coral Rue', 'Fortune Ash', 'Gold Wen', 'Amber Lux', 'Pearl Vale', 'Chip Quinn', 'Mint Ren'];
export class RankService {
  public list(tab: 'daily' | 'weekly' | 'all-time', current?: PlayerRecord): RankEntry[] {
    const scale = tab === 'daily' ? 1 : tab === 'weekly' ? 7 : 30;
    const rows = names.map((nickname, index) => ({ nickname, score: (98000 - index * 7100) * scale, avatar: index % 12, current: false }));
    if (current) rows.push({ nickname: current.nickname, score: Math.max(12000, current.totalWin) * scale, avatar: current.avatar, current: true });
    return rows.sort((a, b) => b.score - a.score).map((row, index) => ({ ...row, rank: index + 1 }));
  }
}
