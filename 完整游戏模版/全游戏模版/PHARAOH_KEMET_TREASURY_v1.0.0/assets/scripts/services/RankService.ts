import type { PlayerRecord } from './SaveService';

export type RankTab = 'daily' | 'weekly' | 'all-time';
export interface RankEntry { rank: number; rankLabel: string; nickname: string; score: number; avatar: number; current: boolean; }
export interface RankSnapshot { leaders: RankEntry[]; current?: RankEntry; populationLabel: string; simulated: true; }
const names = ['Nova Finch', 'Orbit Kai', 'Lyra Moss', 'Comet Rue', 'Vega Ash', 'Solis Wen', 'Aster Lux', 'Mira Vale', 'Cosmo Quinn', 'Halo Ren', 'Pearl Yue', 'Jade Lin'];
const fields: Readonly<Record<RankTab, { top: number; step: number; population: number; populationLabel: string }>> = {
  daily: { top: 98_000, step: 7_100, population: 12_800, populationLabel: '12.8K+ RANKING FIELD' },
  weekly: { top: 620_000, step: 43_000, population: 48_000, populationLabel: '48K+ RANKING FIELD' },
  'all-time': { top: 2_800_000, step: 190_000, population: 128_000, populationLabel: '128K+ RANKING FIELD' },
};

export class RankService {
  public snapshot(tab: RankTab, current?: PlayerRecord): RankSnapshot {
    const field = fields[tab]; const simulated = names.slice(0, 10).map((nickname, index) => ({ nickname, score: Math.max(1, field.top - index * field.step), avatar: index % 12, current: false }));
    const currentScore = current ? this.currentScore(tab, current) : 0; const topPool = current ? [...simulated, { nickname: current.nickname, score: currentScore, avatar: current.avatar, current: true }].sort((a, b) => b.score - a.score || Number(b.current) - Number(a.current)) : simulated;
    const currentTopIndex = current ? topPool.findIndex((entry) => entry.current) : -1; const exactTopRank = currentTopIndex >= 0 && currentTopIndex < 10 ? currentTopIndex + 1 : undefined;
    const estimatedRank = current ? exactTopRank ?? this.estimateRank(currentScore, simulated[simulated.length - 1].score, field.population) : undefined;
    const leaders = topPool.slice(0, 10).map((row, index): RankEntry => ({ ...row, rank: index + 1, rankLabel: `${index + 1}` }));
    const currentEntry = current && estimatedRank ? { rank: estimatedRank, rankLabel: RankService.rankLabel(estimatedRank), nickname: current.nickname, score: currentScore, avatar: current.avatar, current: true } : undefined;
    return { leaders, current: currentEntry, populationLabel: field.populationLabel, simulated: true };
  }

  public list(tab: RankTab, current?: PlayerRecord): RankEntry[] { const snapshot = this.snapshot(tab, current); return snapshot.current && !snapshot.leaders.some((entry) => entry.current) ? [...snapshot.leaders, snapshot.current] : snapshot.leaders; }

  public static rankLabel(rank: number): string { if (rank <= 100) return `${rank}`; if (rank < 1_000) return '100+'; if (rank < 10_000) return '1K+'; return '10K+'; }

  private currentScore(tab: RankTab, player: PlayerRecord): number {
    const games = Math.max(0, player.gamesPlayed); const total = Math.max(0, player.totalWin); const biggest = Math.max(0, player.biggestWin);
    if (tab === 'daily') return Math.round(biggest + total * 0.04 + games * 18);
    if (tab === 'weekly') return Math.round(biggest * 1.8 + total * 0.22 + games * 80);
    return Math.round(total + biggest * 0.45 + games * 120);
  }

  private estimateRank(score: number, tenthScore: number, population: number): number {
    if (score <= 0) return population; const ratio = Math.max(1, tenthScore / score); return Math.min(population, Math.max(11, 11 + Math.round((ratio - 1) * 72)));
  }
}
