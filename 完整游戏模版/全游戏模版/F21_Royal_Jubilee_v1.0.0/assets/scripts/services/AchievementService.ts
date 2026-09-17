import {ECONOMY} from '../math/EconomyProfile';
import { EconomyService } from './EconomyService';
import { SaveService } from './SaveService';

export interface Achievement { id: string; title: string; target: number; reward: number; category: 'spin' | 'win' | 'feature'; }
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-spin', title: 'First Orbit', target: ECONOMY.targets[0], reward: ECONOMY.achievements[0], category: 'spin' },
  { id: 'spin-25', title: 'Steady Navigator', target: ECONOMY.targets[1], reward: ECONOMY.achievements[1], category: 'spin' },
  { id: 'win-10000', title: 'Luminous Haul', target: ECONOMY.targets[2], reward: ECONOMY.achievements[2], category: 'win' },
  { id: 'feature-3', title: 'Feature Seeker', target: ECONOMY.targets[3], reward: ECONOMY.achievements[3], category: 'feature' },
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
    if (!achievement || current.progress < achievement.target || current.claimed || !this.economy.credit(achievement.reward, 'achievement', `achievement:${id}`)) return false;
    this.save.update((state) => { const userId = state.currentUserId; if (userId) state.playerData[userId].achievements[id] = { ...current, claimed: true }; }); return true;
  }
}
