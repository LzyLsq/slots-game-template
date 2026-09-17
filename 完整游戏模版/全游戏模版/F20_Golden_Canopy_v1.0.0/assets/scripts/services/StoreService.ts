import {ECONOMY} from '../math/EconomyProfile';
import { SecureRNG } from '../core/SecureRNG';
import { EconomyService } from './EconomyService';
import { SaveService } from './SaveService';

export interface CoinProduct {
  readonly id: string;
  readonly appleProductId: string;
  readonly credits: number;
  readonly bonus: number;
  readonly label: string;
  readonly debugPrice: string;
}

// Create these identifiers as Consumable products in App Store Connect.
// StoreKit supplies localized prices; debugPrice is localhost-only.
export const LEGACY_STORE_PRODUCTS: readonly CoinProduct[] = [
  { id: 'purse', appleProductId: 'com.publisher.goldencanopy.coins.purse', credits: 10_000, bonus: 0, label: 'COIN PURSE', debugPrice: '$0.99' },
  { id: 'bullion', appleProductId: 'com.publisher.goldencanopy.coins.bullion', credits: 50_000, bonus: 5_000, label: 'GOLD RESERVE', debugPrice: '$4.99' },
  { id: 'chest', appleProductId: 'com.publisher.goldencanopy.coins.chest', credits: 120_000, bonus: 18_000, label: 'TREASURE CHEST', debugPrice: '$9.99' },
  { id: 'vault', appleProductId: 'com.publisher.goldencanopy.coins.vault', credits: 300_000, bonus: 60_000, label: 'ROYAL VAULT', debugPrice: '$19.99' },
];
const PREVIOUS_PACKS=[[5400, 0], [18000, 1800], [45000, 7200], [108000, 21600]] as const;
export const PREVIOUS_STORE_PRODUCTS:readonly CoinProduct[]=LEGACY_STORE_PRODUCTS.map((p,i)=>({...p,appleProductId:p.appleProductId+'.v2',credits:PREVIOUS_PACKS[i][0],bonus:PREVIOUS_PACKS[i][1]}));
export const STORE_PRODUCTS:readonly CoinProduct[]=LEGACY_STORE_PRODUCTS.map((p,i)=>({...p,appleProductId:p.appleProductId+'.v3',credits:ECONOMY.packs[i][0],bonus:ECONOMY.packs[i][1]}));
export const ALL_STORE_PRODUCTS:readonly CoinProduct[]=[...STORE_PRODUCTS,...PREVIOUS_STORE_PRODUCTS,...LEGACY_STORE_PRODUCTS];

export interface NativeProductInfo { readonly productId: string; readonly displayPrice: string; readonly displayName?: string; }
export type PurchaseStatus = 'verified' | 'cancelled' | 'pending' | 'failed';
export interface VerifiedPurchase {
  readonly status: PurchaseStatus;
  readonly productId?: string;
  readonly transactionId?: string;
  /** StoreKit JWS forwarded to the authenticated game server. */
  readonly signedTransactionInfo?: string;
  readonly message?: string;
}
export interface VerifiedServerPurchase { readonly status: 'verified'; readonly productId: string; readonly transactionId: string; readonly creditedCredits: number; readonly authoritativeBalance: number; }
export interface StoreServerClient {
  verifyApplePurchase(signedTransactionInfo: string): Promise<VerifiedServerPurchase>;
  synchronizePurchases(): Promise<{ status: 'verified'; authoritativeBalance: number }>;
}

/**
 * Contract implemented by the iOS StoreKit 2 layer.
 *
 * purchase() reports StoreKit verification and returns the signed JWS. This
 * TypeScript service submits the JWS to the authenticated server and calls
 * finish() only after the server accepts it, so interrupted purchases retry.
 */
export interface AureliaPurchaseBridge {
  products(productIds: readonly string[]): Promise<readonly NativeProductInfo[]>;
  purchase(productId: string, appAccountToken: string): Promise<VerifiedPurchase>;
  restore(appAccountToken: string): Promise<readonly VerifiedPurchase[]>;
  finish(transactionId: string): Promise<void>;
}

export interface StoreCatalogItem extends CoinProduct { readonly displayPrice: string; readonly available: boolean; }
export interface StoreActionResult {
  readonly ok: boolean;
  readonly status: PurchaseStatus | 'unavailable' | 'duplicate';
  readonly credited: number;
  readonly message: string;
}

type RuntimeWithIAP = typeof globalThis & { __AURELIA_IAP__?: AureliaPurchaseBridge };
const nativeBridge = (): AureliaPurchaseBridge | undefined => (globalThis as RuntimeWithIAP).__AURELIA_IAP__;
const validTransactionId = (value: string | undefined): value is string => Boolean(value && /^[A-Za-z0-9._:-]{3,160}$/.test(value));

export class StoreService {
  private debugGrants = false;
  private readonly purchasesInFlight = new Set<string>();

  public constructor(private readonly save: SaveService, private readonly economy: EconomyService, debugGrants = false, private readonly server?: StoreServerClient) { this.debugGrants = debugGrants; }

  public setDebugGrants(enabled: boolean): void { this.debugGrants = enabled; }
  public purchaseAvailable(): boolean { return this.debugGrants || Boolean(nativeBridge() && this.server); }

  public async catalog(): Promise<readonly StoreCatalogItem[]> {
    if (this.debugGrants) return STORE_PRODUCTS.map((product) => ({ ...product, displayPrice: `${product.debugPrice} SANDBOX`, available: true }));
    const bridge = nativeBridge();
    if (!bridge || !this.server) return STORE_PRODUCTS.map((product) => ({ ...product, displayPrice: 'UNAVAILABLE', available: false }));
    try {
      const products = await bridge.products(STORE_PRODUCTS.map((product) => product.appleProductId));
      const byId = new Map(products.map((product) => [product.productId, product]));
      return STORE_PRODUCTS.map((product) => ({ ...product, displayPrice: byId.get(product.appleProductId)?.displayPrice ?? 'UNAVAILABLE', available: byId.has(product.appleProductId) }));
    } catch {
      return STORE_PRODUCTS.map((product) => ({ ...product, displayPrice: 'UNAVAILABLE', available: false }));
    }
  }

  public async purchase(productId: string): Promise<StoreActionResult> {
    const product = STORE_PRODUCTS.find((item) => item.id === productId); const userId = this.save.read().currentUserId; const player = userId ? this.save.read().players[userId] : undefined;
    if (!product || !player || player.isGuest) return { ok: false, status: 'unavailable', credited: 0, message: 'Sign in to purchase virtual coins.' };
    const amount = product.credits + product.bonus;
    if (this.purchasesInFlight.has(product.id)) return { ok: false, status: 'pending', credited: 0, message: 'This purchase is already in progress.' };
    if (this.debugGrants) {
      const transactionId = SecureRNG.id(`sandbox-${product.id}`); const credited = this.economy.creditVerifiedPurchase(amount, transactionId);
      return { ok: credited, status: credited ? 'verified' : 'failed', credited: credited ? amount : 0, message: credited ? 'Sandbox purchase verified.' : 'Sandbox purchase failed.' };
    }
    const bridge = nativeBridge();
    if (!bridge || !this.server) return { ok: false, status: 'unavailable', credited: 0, message: 'Secure Apple purchases are unavailable on this device.' };
    this.purchasesInFlight.add(product.id);
    try {
      const native = await bridge.purchase(product.appleProductId, player.appAccountToken);
      if (native.status !== 'verified') return { ok: false, status: native.status, credited: 0, message: native.message ?? (native.status === 'cancelled' ? 'Purchase cancelled.' : native.status === 'pending' ? 'Purchase is awaiting approval.' : 'Purchase could not be verified by StoreKit.') };
      if (native.productId !== product.appleProductId || !validTransactionId(native.transactionId) || !native.signedTransactionInfo) return { ok: false, status: 'failed', credited: 0, message: 'StoreKit returned an incomplete transaction.' };
      const verified = await this.server.verifyApplePurchase(native.signedTransactionInfo);
      if (verified.status !== 'verified' || verified.productId !== product.appleProductId || verified.transactionId !== native.transactionId || verified.creditedCredits !== amount) return { ok: false, status: 'failed', credited: 0, message: 'The server-verified purchase did not match this product.' };
      const duplicate = this.save.currentScope()?.creditedPurchaseIds.includes(verified.transactionId) ?? false;
      const credited = duplicate || this.economy.creditVerifiedPurchase(amount, verified.transactionId, verified.authoritativeBalance);
      if (!credited) return { ok: false, status: 'failed', credited: 0, message: 'Verified purchase could not be credited.' };
      await bridge.finish(native.transactionId);
      return { ok: true, status: duplicate ? 'duplicate' : 'verified', credited: duplicate ? 0 : amount, message: duplicate ? 'This purchase was already credited.' : 'Purchase verified and coins delivered.' };
    } catch {
      return { ok: false, status: 'failed', credited: 0, message: 'Purchase verification is temporarily unavailable. No coins were granted.' };
    } finally { this.purchasesInFlight.delete(product.id); }
  }

  public async restore(): Promise<StoreActionResult> {
    const userId = this.save.read().currentUserId; const player = userId ? this.save.read().players[userId] : undefined;
    if (!player || player.isGuest) return { ok: false, status: 'unavailable', credited: 0, message: 'Sign in to synchronize purchases.' };
    if (this.debugGrants) return { ok: true, status: 'verified', credited: 0, message: 'Sandbox balance is already current.' };
    const bridge = nativeBridge(); if (!bridge || !this.server) return { ok: false, status: 'unavailable', credited: 0, message: 'Secure Apple purchases are unavailable on this device.' };
    try {
      const pending = await bridge.restore(player.appAccountToken);
      for (const native of pending) {
        if (native.status !== 'verified' || !native.signedTransactionInfo || !validTransactionId(native.transactionId)) continue;
        const verified = await this.server.verifyApplePurchase(native.signedTransactionInfo); const product = ALL_STORE_PRODUCTS.find((item) => item.appleProductId === verified.productId); if (!product || verified.transactionId !== native.transactionId || verified.creditedCredits !== product.credits + product.bonus) continue;
        if (!this.save.currentScope()?.creditedPurchaseIds.includes(verified.transactionId)) this.economy.creditVerifiedPurchase(verified.creditedCredits, verified.transactionId, verified.authoritativeBalance);
        await bridge.finish(native.transactionId);
      }
      const response = await this.server.synchronizePurchases(); const before = this.economy.balance(); const synchronized = this.economy.synchronizePurchasedBalance(response.authoritativeBalance, `apple-sync:${Date.now()}`);
      return { ok: synchronized, status: synchronized ? 'verified' : 'failed', credited: synchronized ? Math.max(0, response.authoritativeBalance - before) : 0, message: synchronized ? 'Purchase balance synchronized.' : 'Unable to synchronize the verified balance.' };
    } catch { return { ok: false, status: 'failed', credited: 0, message: 'Purchase synchronization is temporarily unavailable.' }; }
  }

  /** Localhost/debug compatibility for automated tests only. */
  public debugPurchase(productId: string): boolean {
    const product = STORE_PRODUCTS.find((item) => item.id === productId); const userId = this.save.read().currentUserId; const player = userId ? this.save.read().players[userId] : undefined;
    if (!this.debugGrants || !product || !player || player.isGuest) return false;
    return this.economy.creditVerifiedPurchase(product.credits + product.bonus, SecureRNG.id(`sandbox-${product.id}`));
  }

  public claimDaily(today: string): boolean {
    const scope = this.save.currentScope(); if (!scope || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return false;
    const key = `daily-free:${today}`; if (scope.claims[key]) return false;
    let credited = false;
    this.save.update((state) => { const id = state.currentUserId; if (!id || state.playerData[id].claims[key]) return; state.playerData[id].claims[key] = new Date().toISOString(); credited = true; });
    return credited && this.economy.credit(ECONOMY.daily, 'daily-free', key);
  }
}
