import { _decorator, Color, Component, Graphics, Layers, Node, resources, Sprite, SpriteFrame, Texture2D, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { ObjectPool } from '../core/ObjectPool';
const { ccclass } = _decorator;

@ccclass('VFXManager')
export class VFXManager extends Component {
  private quality: 'low' | 'medium' | 'high' = 'high';
  private coins!: ObjectPool<Node>;
  private sparks!: ObjectPool<Node>;
  private currencyFrame?: SpriteFrame;
  protected onLoad(): void {
    this.coins = new ObjectPool(() => this.makeCoin(), (coin) => { coin.active = false; }, 52);
    this.sparks = new ObjectPool(() => this.makeSpark(), (spark) => { spark.active = false; }, 72);
    resources.load('generated/common/currency_coin_icon_v01/texture', Texture2D, (error, texture) => { if (error || !texture) return; const frame = new SpriteFrame(); frame.texture = texture; this.currencyFrame = frame; });
  }
  public setQuality(value: 'low' | 'medium' | 'high'): void { this.quality = value; }
  public buttonBurst(target: Node, color: Color): void {
    const origin = new Vec3(); this.node.inverseTransformPoint(origin, target.worldPosition); const count = this.quality === 'low' ? 6 : this.quality === 'medium' ? 10 : 14;
    for (let index = 0; index < count; index += 1) { const angle = Math.PI * 2 * index / count; const spark = this.sparks.acquire(); spark.active = true; spark.setParent(this.node); this.placeBelowOverlay(spark); spark.setPosition(origin); spark.angle = index * 37; spark.setScale(new Vec3(0.28, 0.28, 1)); const graphics = spark.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = index % 3 === 0 ? new Color(255, 236, 159) : color; graphics.moveTo(0, 10); graphics.lineTo(4, 0); graphics.lineTo(0, -10); graphics.lineTo(-4, 0); graphics.close(); graphics.fill(); const opacity = spark.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 235; const distance = 34 + index % 3 * 13; tween(spark).to(0.28, { position: new Vec3(origin.x + Math.cos(angle) * distance, origin.y + Math.sin(angle) * distance, 0), scale: new Vec3(0.75, 0.75, 1), angle: spark.angle + 100 }, { easing: 'quartOut' }).to(0.22, { scale: new Vec3(0.12, 0.12, 1) }).call(() => { spark.setScale(Vec3.ONE); this.sparks.release(spark); }).start(); tween(opacity).delay(0.16).to(0.32, { opacity: 0 }).start(); }
  }
  public spinCharge(position: Vec3, color: Color): void {
    const count = this.quality === 'low' ? 10 : this.quality === 'medium' ? 18 : 28;
    for (let index = 0; index < count; index += 1) { const angle = Math.PI * 2 * index / count; const radius = 135 + index % 4 * 16; const spark = this.sparks.acquire(); spark.active = true; spark.setParent(this.node); this.placeBelowOverlay(spark); spark.setPosition(position.x + Math.cos(angle) * radius, position.y + Math.sin(angle) * radius); spark.angle = -angle * 180 / Math.PI; spark.setScale(new Vec3(0.7, 0.7, 1)); const graphics = spark.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = index % 4 === 0 ? new Color(255, 236, 143) : color; graphics.roundRect(-14, -3, 28, 6, 3); graphics.fill(); const opacity = spark.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 0; tween(opacity).delay((index % 5) * 0.015).to(0.08, { opacity: 230 }).to(0.3, { opacity: 0 }).start(); tween(spark).delay((index % 5) * 0.015).to(0.34, { position, scale: new Vec3(0.15, 0.15, 1), angle: spark.angle + 150 }, { easing: 'quartIn' }).call(() => { spark.setScale(Vec3.ONE); this.sparks.release(spark); }).start(); }
    this.shockwave(position, color);
  }
  public flyCredits(from: Vec3, to: Vec3, onComplete?: () => void): void {
    const count = this.quality === 'low' ? 8 : this.quality === 'medium' ? 16 : 26;
    let complete = 0;
    for (let index = 0; index < count; index += 1) {
      const coin = this.coins.acquire(); coin.active = true; coin.setParent(this.node); this.placeBelowOverlay(coin); coin.setPosition(from); this.paintWealthToken(coin, index, false);
      const mid = new Vec3(from.x + (index - count / 2) * 20, from.y + 140 + (index % 3) * 30);
      tween(coin).delay(index * 0.025).to(0.22, { position: mid }, { easing: 'quadOut' }).to(0.36, { position: to, scale: new Vec3(0.5, 0.5, 1) }, { easing: 'quadIn' }).call(() => {
        coin.setScale(Vec3.ONE); this.coins.release(coin); complete += 1; if (complete === count) onComplete?.();
      }).start();
    }
  }
  public pulse(node: Node): void { tween(node).to(0.12, { scale: new Vec3(1.08, 1.08, 1) }).to(0.18, { scale: Vec3.ONE }, { easing: 'backOut' }).start(); }
  public celebrateWin(position: Vec3, color: Color): void {
    this.screenFlash(color);
    const count = this.quality === 'low' ? 16 : this.quality === 'medium' ? 30 : 46;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * 2 * index / count + (index % 3) * 0.11; const distance = 120 + (index % 5) * 35;
      const spark = this.sparks.acquire(); spark.active = true; spark.setParent(this.node); this.placeBelowOverlay(spark); spark.setPosition(position); spark.angle = index * 31; spark.setScale(new Vec3(0.3, 0.3, 1));
      const graphics = spark.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = index % 3 === 0 ? new Color(255, 230, 139) : color; graphics.moveTo(0, 15); graphics.lineTo(7, 0); graphics.lineTo(0, -15); graphics.lineTo(-7, 0); graphics.close(); graphics.fill();
      const opacity = spark.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 255;
      const target = new Vec3(position.x + Math.cos(angle) * distance, position.y + Math.sin(angle) * distance, 0);
      tween(spark).delay((index % 6) * 0.018).to(0.42, { position: target, scale: new Vec3(1, 1, 1), angle: spark.angle + 150 }, { easing: 'quartOut' }).to(0.38, { position: new Vec3(target.x, target.y - 90, 0), scale: new Vec3(0.25, 0.25, 1) }, { easing: 'quadIn' }).call(() => { spark.setScale(Vec3.ONE); this.sparks.release(spark); }).start();
      tween(opacity).delay(0.36).to(0.44, { opacity: 0 }).start();
    }
    this.shockwave(position, color);
  }

  public jackpotBurst(position: Vec3, color: Color): void {
    this.lightRays(position, color); this.bulbChase(new Vec3(0, 130, 0)); this.screenFlash(new Color(255, 231, 158)); this.royalSparkBurst(position, color); this.shockwave(position, new Color(255, 225, 143));
    this.scheduleOnce(() => this.royalSparkBurst(position, new Color(255, 210, 104)), 0.34);
    this.scheduleOnce(() => { this.screenFlash(new Color(255, 242, 207)); this.shockwave(position, new Color(218, 151, 45)); }, 0.86);
  }

  private royalSparkBurst(position: Vec3, color: Color): void {
    const count = this.quality === 'low' ? 18 : this.quality === 'medium' ? 28 : 40;
    for (let index = 0; index < count; index += 1) { const angle = Math.PI * 2 * index / count + (index % 2) * 0.08; const distance = 165 + index % 5 * 38; const spark = this.sparks.acquire(); spark.active = true; spark.setParent(this.node); this.placeBelowOverlay(spark); spark.setPosition(position); spark.angle = index * 29; spark.setScale(new Vec3(0.2, 0.2, 1)); const graphics = spark.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = index % 4 === 0 ? new Color(255, 249, 214) : index % 3 === 0 ? new Color(255, 209, 91) : color; graphics.moveTo(0, 18); graphics.lineTo(6, 4); graphics.lineTo(16, 0); graphics.lineTo(6, -4); graphics.lineTo(0, -18); graphics.lineTo(-6, -4); graphics.lineTo(-16, 0); graphics.lineTo(-6, 4); graphics.close(); graphics.fill(); const opacity = spark.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 0; const target = new Vec3(position.x + Math.cos(angle) * distance, position.y + Math.sin(angle) * distance, 0); tween(opacity).delay((index % 8) * 0.018).to(0.08, { opacity: 255 }).delay(0.28).to(0.38, { opacity: 0 }).start(); tween(spark).delay((index % 8) * 0.018).to(0.48, { position: target, scale: new Vec3(0.92, 0.92, 1), angle: spark.angle + 180 }, { easing: 'quartOut' }).to(0.34, { position: new Vec3(target.x, target.y - 55, 0), scale: new Vec3(0.18, 0.18, 1) }, { easing: 'quadIn' }).call(() => { spark.setScale(Vec3.ONE); this.sparks.release(spark); }).start(); }
  }

  private lightRays(position: Vec3, color: Color): void {
    const root = new Node('JackpotLightRays'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(1200, 1000); root.setPosition(position); this.node.addChild(root); this.placeBelowOverlay(root); const rootOpacity = root.addComponent(UIOpacity); rootOpacity.opacity = 0;
    const count = this.quality === 'low' ? 8 : this.quality === 'medium' ? 12 : 16;
    for (let index = 0; index < count; index += 1) { const ray = new Node(`JackpotRay-${index}`); ray.layer = Layers.Enum.UI_2D; ray.addComponent(UITransform).setContentSize(620, 90); ray.angle = index * 360 / count; root.addChild(ray); const graphics = ray.addComponent(Graphics); graphics.fillColor = index % 3 === 0 ? new Color(255, 244, 193, 42) : new Color(color.r, color.g, color.b, 28); graphics.moveTo(70, -9); graphics.lineTo(560, -38 - index % 2 * 18); graphics.lineTo(560, 38 + index % 2 * 18); graphics.lineTo(70, 9); graphics.close(); graphics.fill(); const opacity = ray.addComponent(UIOpacity); opacity.opacity = 45 + index % 4 * 18; tween(opacity).delay(index * 0.025).to(0.42, { opacity: 150 }).to(0.72, { opacity: 36 }, { easing: 'sineInOut' }).union().repeat(3).start(); }
    tween(rootOpacity).to(0.18, { opacity: 220 }).delay(2.15).to(0.45, { opacity: 0 }).start(); tween(root).by(3.1, { angle: 22, scale: new Vec3(0.18, 0.18, 0) }, { easing: 'sineInOut' }).call(() => root.destroy()).start();
  }

  private bulbChase(position: Vec3): void {
    const root = new Node('JackpotBulbChase'); root.layer = Layers.Enum.UI_2D; root.addComponent(UITransform).setContentSize(940, 650); root.setPosition(position); this.node.addChild(root); this.placeBelowOverlay(root);
    const points: Vec3[] = []; const horizontal = 12; const vertical = 6;
    for (let index = 0; index < horizontal; index += 1) { const x = -430 + index * 860 / (horizontal - 1); points.push(new Vec3(x, 305, 0), new Vec3(x, -305, 0)); }
    for (let index = 1; index < vertical - 1; index += 1) { const y = -305 + index * 610 / (vertical - 1); points.push(new Vec3(-430, y, 0), new Vec3(430, y, 0)); }
    points.forEach((point, index) => { const bulb = new Node(`ChaseBulb-${index}`); bulb.layer = Layers.Enum.UI_2D; bulb.addComponent(UITransform).setContentSize(24, 24); bulb.setPosition(point); root.addChild(bulb); const graphics = bulb.addComponent(Graphics); graphics.fillColor = new Color(112, 48, 17, 150); graphics.circle(0, 0, 10); graphics.fill(); graphics.fillColor = index % 4 === 0 ? new Color(255, 250, 222) : new Color(255, 204, 84); graphics.circle(-1, 1, 7); graphics.fill(); const opacity = bulb.addComponent(UIOpacity); opacity.opacity = 22; tween(opacity).delay((index % 10) * 0.045).to(0.1, { opacity: 255 }).to(0.22, { opacity: 58 }).union().repeat(7).start(); tween(bulb).delay((index % 10) * 0.045).to(0.1, { scale: new Vec3(1.28, 1.28, 1) }).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).union().repeat(7).start(); });
    this.scheduleOnce(() => { if (root.isValid) root.destroy(); }, 2.85);
  }

  private wealthRain(origin: Vec3): void {
    const count = this.quality === 'low' ? 10 : this.quality === 'medium' ? 20 : 30;
    for (let index = 0; index < count; index += 1) {
      const token = this.coins.acquire(); token.active = true; token.setParent(this.node); this.placeBelowOverlay(token); this.paintWealthToken(token, index, true);
      const start = new Vec3(-500 + (index * 193) % 1000, Math.max(760, origin.y + 620) + (index % 7) * 46, 0); const end = new Vec3(start.x + (index % 2 ? -1 : 1) * (35 + index % 6 * 17), -930, 0);
      token.setPosition(start); token.setScale(new Vec3(0.48 + index % 4 * 0.13, 0.48 + index % 4 * 0.13, 1)); token.angle = index * 23; const opacity = token.getComponent(UIOpacity) as UIOpacity; opacity.opacity = 0;
      tween(opacity).delay(index * 0.022).to(0.12, { opacity: 255 }).delay(0.85 + index % 5 * 0.08).to(0.42, { opacity: 0 }).start();
      tween(token).delay(index * 0.022).to(1.35 + index % 5 * 0.08, { position: end, angle: token.angle + (index % 2 ? -720 : 720), scale: new Vec3(0.8, 0.8, 1) }, { easing: 'quadIn' }).call(() => { token.setScale(Vec3.ONE); this.coins.release(token); }).start();
    }
  }

  private paintWealthToken(node: Node, index: number, mixed: boolean): void {
    const graphics = node.getComponent(Graphics) as Graphics; const sprite = node.getChildByName('CoinImage')?.getComponent(Sprite) as Sprite; graphics.clear(); sprite.spriteFrame = null; const mode = mixed ? index % 3 : 0;
    if (mode === 0 && this.currencyFrame) { sprite.spriteFrame = this.currencyFrame; sprite.sizeMode = Sprite.SizeMode.CUSTOM; return; }
    if (mode === 0) { graphics.fillColor = new Color(238, 177, 45); graphics.circle(0, 0, 19); graphics.fill(); graphics.strokeColor = new Color(255, 244, 176); graphics.lineWidth = 3; graphics.circle(0, 0, 14); graphics.stroke(); graphics.strokeColor = new Color(164, 91, 19, 180); graphics.lineWidth = 2; graphics.arc(0, 0, 9, 0.3, Math.PI * 1.65, false); graphics.stroke(); }
    else if (mode === 1) { graphics.fillColor = new Color(255, 248, 226); graphics.circle(0, 0, 17); graphics.fill(); graphics.strokeColor = new Color(222, 179, 93); graphics.lineWidth = 3; graphics.circle(0, 0, 18); graphics.stroke(); graphics.fillColor = new Color(255, 255, 255, 210); graphics.circle(-5, 6, 4); graphics.fill(); }
    else { graphics.fillColor = index % 2 ? new Color(54, 204, 139) : new Color(230, 70, 97); graphics.moveTo(0, 22); graphics.lineTo(17, 5); graphics.lineTo(11, -17); graphics.lineTo(-11, -17); graphics.lineTo(-17, 5); graphics.close(); graphics.fill(); graphics.strokeColor = new Color(255, 240, 185); graphics.lineWidth = 3; graphics.moveTo(0, 22); graphics.lineTo(17, 5); graphics.lineTo(11, -17); graphics.lineTo(-11, -17); graphics.lineTo(-17, 5); graphics.close(); graphics.stroke(); }
  }

  private screenFlash(color: Color): void {
    const node = new Node('WinScreenFlash'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(1400, 2200); this.node.addChild(node); this.placeBelowOverlay(node);
    const graphics = node.addComponent(Graphics); graphics.fillColor = new Color(color.r, color.g, color.b, 64); graphics.rect(-700, -1100, 1400, 2200); graphics.fill(); const opacity = node.addComponent(UIOpacity); opacity.opacity = 0;
    tween(opacity).to(0.08, { opacity: 120 }).to(0.42, { opacity: 0 }, { easing: 'quadOut' }).call(() => node.destroy()).start();
  }

  private shockwave(position: Vec3, color: Color): void {
    const node = new Node('WinShockwave'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(420, 420); node.setPosition(position); node.setScale(new Vec3(0.2, 0.2, 1)); this.node.addChild(node); this.placeBelowOverlay(node);
    const graphics = node.addComponent(Graphics); graphics.strokeColor = new Color(color.r, color.g, color.b, 220); graphics.lineWidth = 8; graphics.circle(0, 0, 145); graphics.stroke(); graphics.strokeColor = new Color(255, 237, 172, 150); graphics.lineWidth = 3; graphics.circle(0, 0, 178); graphics.stroke(); const opacity = node.addComponent(UIOpacity);
    tween(node).to(0.7, { scale: new Vec3(2.6, 2.6, 1) }, { easing: 'quartOut' }).call(() => node.destroy()).start(); tween(opacity).delay(0.16).to(0.54, { opacity: 0 }).start();
  }
  private makeCoin(): Node {
    const node = new Node('PooledWealthToken'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(56, 56); node.addComponent(UIOpacity); node.addComponent(Graphics); const image = new Node('CoinImage'); image.layer = Layers.Enum.UI_2D; image.addComponent(UITransform).setContentSize(56, 56); image.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM; node.addChild(image); node.active = false; return node;
  }
  private placeBelowOverlay(effect: Node): void { const overlay = this.node.getChildByName('OverlayLayer'); if (overlay && effect.parent === this.node) effect.setSiblingIndex(overlay.getSiblingIndex()); }
  private makeSpark(): Node { const node = new Node('PooledSpark'); node.layer = Layers.Enum.UI_2D; node.addComponent(UITransform).setContentSize(32, 32); node.addComponent(UIOpacity); node.addComponent(Graphics); node.active = false; return node; }
}
