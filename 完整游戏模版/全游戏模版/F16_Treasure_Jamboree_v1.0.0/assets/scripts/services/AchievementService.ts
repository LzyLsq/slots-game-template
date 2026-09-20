import { EconomyService } from './EconomyService';
import { SaveService } from './SaveService';

export interface Achievement { id: string; title: string; target: number; reward: number; category: 'spin' | 'win' | 'feature'; }
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-spin', title: 'First Orbit', target: 1, reward: 1_000, category: 'spin' },
  { id: 'spin-25', title: 'Steady Navigator', target: 25, reward: 5_000, category: 'spin' },
  { id: 'win-10000', title: 'Luminous Haul', target: 10_000, reward: 8_000, category: 'win' },
  { id: 'feature-3', title: 'Feature Seeker', target: 3, reward: 12_000, category: 'feature' },
];
export class AchievementService {
  public constructor(private readonly save: SaveService, private readonly economy: EconomyService) {}
  public state(id: string): { progress: number; claimed: boolean } { return this.save.currentScope()?.achievements[id] ?? { progress: 0, claimed: false }; }
  public add(category: Achievement['category'], value: number): void {
    if (!Number.isFinite(value) || value <= 0) return;
    this.save.update((state) => { const userId = state.currentUserId; if (!userId) return; const scoped = state.playerData[userId].achievements; ACHIEVEMENTS.filter((item) => item.category === category).forEach((item) => { const old = scoped[item.id] ?? { progress: 0, claimed: false }; scoped[item.id] = { ...old, progress: Math.min(item.target, old.progress + Math.floor(value)) }; }); });
  }
  public claim(id: string): boolean {
    const achievement = ACHIEVEMENTS.find((item) => item.id === id); const current = this.state(id);
    if (!achievement || current.progress < achievement.target || current.claimed) return false;
    return this.economy.credit(achievement.reward, 'achievement', `achievement:${id}`, (scope) => { scope.achievements[id] = { ...current, claimed: true }; });
  }
}
