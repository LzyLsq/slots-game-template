import { EconomyService } from './EconomyService';
import { SaveService } from './SaveService';

export interface DemoProduct { id: string; credits: number; bonus: number; label: string; }
export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  { id: 'spark', credits: 10_000, bonus: 0, label: 'SPARK PACK' },
  { id: 'orbit', credits: 50_000, bonus: 5_000, label: 'ORBIT PACK' },
  { id: 'nova', credits: 120_000, bonus: 18_000, label: 'NOVA PACK' },
  { id: 'galaxy', credits: 300_000, bonus: 60_000, label: 'GALAXY PACK' },
];

export class StoreService {
  public constructor(private readonly save: SaveService, private readonly economy: EconomyService, private readonly demoMode = true) {}
  public demoPurchase(productId: string): boolean {
    const product = DEMO_PRODUCTS.find((item) => item.id === productId); const userId = this.save.read().currentUserId; const player = userId ? this.save.read().players[userId] : undefined;
    if (!this.demoMode || !product || !player || player.isGuest) return false;
    return this.economy.credit(product.credits + product.bonus, 'store-demo', `demo-product:${product.id}`);
  }
  public claimDaily(today: string): boolean {
    const scope = this.save.currentScope(); if (!scope || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return false;
    const key = `daily-free:${today}`; if (scope.claims[key]) return false;
    let credited = false;
    this.save.update((state) => { const id = state.currentUserId; if (!id || state.playerData[id].claims[key]) return; state.playerData[id].claims[key] = new Date().toISOString(); credited = true; });
    return credited && this.economy.credit(5_000, 'daily-free', key);
  }
}
