import { _decorator, Color, Component, Graphics, Layers, Node, Sprite, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { ObjectPool } from '../core/ObjectPool';
import { GAME_CONFIGS } from '../math/GameConfigs';
import { SymbolAtlasCache, symbolAtlasForGame } from '../reels/SymbolAtlasCache';
import type { GameConfig } from '../math/types';
const { ccclass } = _decorator;

@ccclass('VFXManager')
export class VFXManager extends Component {
  private quality: 'low' | 'medium' | 'high' = 'medium';
  private coins!: ObjectPool<Node>;
  private sparks!: ObjectPool<Node>;
  protected onLoad(): void {
    this.coins = new ObjectPool(() => this.makeCoin(), (coin) => { coin.active = false; }, 72);
    this.sparks = new ObjectPool(() => this.makeSpark(), (spark) => { spark.active = false; }, 48);
  }
  public setQuality(value: 'low' | 'medium' | 'high'): void { this.quality = value; }
  public buttonBurst(target: Node, color: Color): void {
    const origin = new Vec3(); this.node.inverseTransformPoint(origin, target.worldPosition); const count = this.quality === 'low' ? 4 : this.quality === 'medium' ? 7 : 10;
    for (let index = 0; index < count; index += 1) { const angle = Math.PI * 2 * index / count; const spark = this.sparks.acquire(); spark.active = true; spark.setParent(this.node); spark.setPosition(origin); spark.angle = index * 37; spark.setScale(new Vec3(0.28, 0.28, 1)); const graphics = spark.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = index % 3 === 0 ? new Color(255, 236, 159) : color; graphics.moveTo(0, 10); graphics.lineTo(4, 0); graphics.lineTo(0, -10); graphics.lineTo(-4, 0); graphics.close(); graphics.fill(); const opacity = spark.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 235; const distance = 34 + index % 3 * 13; tween(spark).to(0.28, { position: new Vec3(origin.x + Math.cos(angle) * distance, origin.y + Math.sin(angle) * distance, 0), scale: new Vec3(0.75, 0.75, 1), angle: spark.angle + 100 }, { easing: 'quartOut' }).to(0.22, { scale: new Vec3(0.12, 0.12, 1) }).call(() => { spark.setScale(Vec3.ONE); this.sparks.release(spark); }).start(); tween(opacity).delay(0.16).to(0.32, { opacity: 0 }).start(); }
  }
  public spinCharge(position: Vec3, color: Color): void {
    // Spin feedback belongs to the physical button, not across the whole
    // cabinet. A compact inward jewel charge gives a crisp response without
    // the oversized neon ring that obscured the controls and reel stage.
    const count = this.quality === 'low' ? 6 : this.quality === 'medium' ? 10 : 14;
    for (let index = 0; index < count; index += 1) { const angle = Math.PI * 2 * index / count; const radius = 62 + index % 3 * 7; const spark = this.sparks.acquire(); spark.active = true; spark.setParent(this.node); spark.setPosition(position.x + Math.cos(angle) * radius, position.y + Math.sin(angle) * radius); spark.angle = -angle * 180 / Math.PI; spark.setScale(new Vec3(0.46, 0.46, 1)); const graphics = spark.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = index % 3 === 0 ? new Color(255, 236, 143) : color; graphics.roundRect(-9, -2, 18, 4, 2); graphics.fill(); const opacity = spark.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 0; tween(opacity).delay((index % 4) * 0.012).to(0.065, { opacity: 215 }).to(0.24, { opacity: 0 }).start(); tween(spark).delay((index % 4) * 0.012).to(0.28, { position, scale: new Vec3(0.12, 0.12, 1), angle: spark.angle + 115 }, { easing: 'quartIn' }).call(() => { spark.setScale(Vec3.ONE); this.sparks.release(spark); }).start(); }
  }
  public flyCredits(from: Vec3, to: Vec3, onComplete?: () => void): void {
    const count = this.quality === 'low' ? 6 : this.quality === 'medium' ? 12 : 20;
    let complete = 0;
    for (let index = 0; index < count; index += 1) {
      const coin = this.coins.acquire(); coin.active = true; coin.setParent(this.node); coin.setPosition(from);
      const mid = new Vec3(from.x + (index - count / 2) * 20, from.y + 140 + (index % 3) * 30);
      tween(coin).delay(index * 0.025).to(0.22, { position: mid }, { easing: 'quadOut' }).to(0.36, { position: to, scale: new Vec3(0.5, 0.5, 1) }, { easing: 'quadIn' }).call(() => {
        coin.setScale(Vec3.ONE); this.coins.release(coin); complete += 1; if (complete === count) onComplete?.();
      }).start();
    }
  }
  public pulse(node: Node): void { tween(node).to(0.12, { scale: new Vec3(1.08, 1.08, 1) }).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }
  public celebrateWin(position: Vec3, color: Color): void {
    this.screenFlash(color);
    const count = this.quality === 'low' ? 10 : this.quality === 'medium' ? 20 : 30;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * 2 * index / count + (index % 3) * 0.11; const distance = 120 + (index % 5) * 35;
      const spark = this.sparks.acquire(); spark.active = true; spark.setParent(this.node); spark.setPosition(position); spark.angle = index * 31; spark.setScale(new Vec3(0.3, 0.3, 1));
      const graphics = spark.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = index % 3 === 0 ? new Color(255, 246, 204, 220) : new Color(color.r, color.g, color.b, 205); graphics.roundRect(-18, -2, 36, 4, 2); graphics.fill(); graphics.fillColor = new Color(255, 255, 246, 235); graphics.roundRect(-8, -0.75, 16, 1.5, 1); graphics.fill();
      const opacity = spark.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 255;
      const target = new Vec3(position.x + Math.cos(angle) * distance, position.y + Math.sin(angle) * distance, 0);
      tween(spark).delay((index % 6) * 0.018).to(0.42, { position: target, scale: new Vec3(1, 1, 1), angle: spark.angle + 150 }, { easing: 'quartOut' }).to(0.38, { position: new Vec3(target.x, target.y - 90, 0), scale: new Vec3(0.25, 0.25, 1) }, { easing: 'quadIn' }).call(() => { spark.setScale(Vec3.ONE); this.sparks.release(spark); }).start();
      tween(opacity).delay(0.36).to(0.44, { opacity: 0 }).start();
    }
    this.shockwave(position, color);
  }

  public royalWinShower(position: Vec3, color: Color, major = false, config: GameConfig = GAME_CONFIGS[0]): void {
    const coinCount = this.quality === 'low' ? 6 : major ? this.quality === 'high' ? 22 : 16 : this.quality === 'high' ? 13 : 9;
    const particleSymbol = config.id === 'seven-skylight' ? 'coin' : config.id === 'clover-cash-club' ? 'coin-stack' : config.id === 'dice-drift-deluxe' ? 'gold-coin' : 'coin-pile';
    for (let index = 0; index < coinCount; index += 1) {
      const coin = this.coins.acquire(); coin.active = true; coin.setParent(this.node); coin.setScale(new Vec3(0.55, 0.55, 1)); coin.angle = index * 29; const opacity = coin.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 0;
      this.applyCreditArt(coin, config, particleSymbol);
      const spread = (index - (coinCount - 1) / 2) * (major ? 45 : 54); const start = new Vec3(position.x + spread * 0.24, position.y - 20 + index % 3 * 18, 0); const apex = new Vec3(position.x + spread, position.y + 245 + (index % 4) * 52, 0); const landing = new Vec3(position.x + spread * 1.35, position.y - 470 - (index % 3) * 55, 0); coin.setPosition(start);
      tween(opacity).delay(index * 0.035).to(0.1, { opacity: 255 }).delay(0.72 + (index % 4) * 0.04).to(0.3, { opacity: 0 }).start();
      tween(coin).delay(index * 0.035).to(0.42, { position: apex, scale: new Vec3(1.02, 1.02, 1), angle: coin.angle + 190 }, { easing: 'quartOut' }).to(0.72 + (index % 4) * 0.04, { position: landing, scale: new Vec3(0.72, 0.72, 1), angle: coin.angle + 620 }, { easing: 'quadIn' }).call(() => { coin.setScale(Vec3.ONE); opacity.opacity = 255; this.coins.release(coin); }).start();
    }
    const jewelCount = this.quality === 'low' ? 5 : major ? 14 : 9; const prizeSymbol = config.symbols.find((symbol) => symbol.tier === 'high')?.id ?? config.wildId;
    for (let index = 0; index < jewelCount; index += 1) {
      const jewel = this.coins.acquire(); jewel.active = true; jewel.setParent(this.node); jewel.setScale(new Vec3(0.48, 0.48, 1)); jewel.angle = index * 41; this.applyCreditArt(jewel, config, prizeSymbol);
      const opacity = jewel.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 0; const spread = (index - (jewelCount - 1) / 2) * 62; const start = new Vec3(position.x + spread * 0.15, position.y + 10, 0); const apex = new Vec3(position.x + spread, position.y + 210 + (index % 3) * 65, 0); const landing = new Vec3(position.x + spread * 1.42, position.y - 390 - (index % 4) * 60, 0); jewel.setPosition(start);
      tween(opacity).delay(0.08 + index * 0.05).to(0.08, { opacity: 245 }).delay(0.7).to(0.34, { opacity: 0 }).start();
      tween(jewel).delay(0.08 + index * 0.05).to(0.38, { position: apex, scale: new Vec3(0.95, 0.95, 1), angle: jewel.angle + 150 }, { easing: 'quartOut' }).to(0.7, { position: landing, scale: new Vec3(0.3, 0.3, 1), angle: jewel.angle + 460 }, { easing: 'quadIn' }).call(() => { jewel.setScale(Vec3.ONE); opacity.opacity = 255; this.coins.release(jewel); }).start();
    }
  }

  private screenFlash(color: Color): void {
    const node = new Node('WinScreenFlash'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(1400, 2200); this.node.addChild(node);
    const graphics = node.addComponent(Graphics); graphics.fillColor = new Color(color.r, color.g, color.b, 64); graphics.rect(-700, -1100, 1400, 2200); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 0;
    tween(opacity).to(0.08, { opacity: 120 }).to(0.42, { opacity: 0 }, { easing: 'quadOut' }).call(() => node.destroy()).start();
  }

  private shockwave(position: Vec3, color: Color): void {
    const node = new Node('WinShockwave'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(420, 420); node.setPosition(position); node.setScale(new Vec3(0.42, 0.42, 1)); this.node.addChild(node);
    const graphics = node.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, 152); graphics.lineWidth = 5; graphics.circle(0, 0, 132); graphics.stroke(); graphics.strokeColor = new Color(255, 237, 172, 118); graphics.lineWidth = 2; graphics.circle(0, 0, 156); graphics.stroke(); const opacity = node.addComponent(UIOpacity);
    tween(node).to(0.58, { scale: new Vec3(1.72, 1.72, 1) }, { easing: 'quartOut' }).call(() => node.destroy()).start(); tween(opacity).delay(0.1).to(0.48, { opacity: 0 }).start();
  }
  private makeCoin(): Node {
    const node = new Node('PooledCredit'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(44, 44); node.addComponent(UIOpacity);
    // Matter particles must always be atlas artwork. Keep the fallback hidden
    // while the texture warms so a plain code-drawn coin never flashes on the
    // premium win timeline.
    const graphics = node.addComponent(Graphics); graphics.enabled = false;
    const image = new Node('UnifiedEnergyCoin'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(44, 44); node.addChild(image); const sprite = image.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; const coinConfig = GAME_CONFIGS[0]; const atlas = symbolAtlasForGame(coinConfig); SymbolAtlasCache.load(atlas, () => { if (!node.isValid || !image.isValid) return; const frame = SymbolAtlasCache.frame(atlas, 'coin'); if (!frame) return; sprite.spriteFrame = frame; graphics.enabled = false; }); node.active = false; return node;
  }
  private applyCreditArt(node: Node, config: GameConfig, symbolId: string): void {
    const image = node.getChildByName('UnifiedEnergyCoin'); const sprite = image?.getComponent(Sprite); const graphics = node.getComponent(Graphics); if (!image || !sprite || !graphics) return; const requestName = `PooledCredit-${config.id}-${symbolId}`; node.name = requestName; graphics.enabled = false; const atlas = symbolAtlasForGame(config);
    const apply = (): void => { if (!node.isValid || !image.isValid || node.name !== requestName) return; const frame = SymbolAtlasCache.frame(atlas, symbolId); if (!frame) return; sprite.spriteFrame = frame; graphics.enabled = false; };
    apply(); SymbolAtlasCache.load(atlas, apply);
  }
  private makeSpark(): Node { const node = new Node('PooledSpark'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(32, 32); node.addComponent(UIOpacity); node.addComponent(Graphics); node.active = false; return node; }
}
