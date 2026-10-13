import {tr} from '../ui/Language';
import { _decorator, BlockInputEvents, Color, Component, Graphics, Label, Layers, Node, ResolutionPolicy, screen, sys, UITransform, view } from 'cc';
const { ccclass } = _decorator;

@ccclass('SafeAreaAdapter')
export class SafeAreaAdapter extends Component {
  public static readonly DESIGN_WIDTH = 1080;
  public static readonly DESIGN_HEIGHT = 1920;
  public static visibleWidth = SafeAreaAdapter.DESIGN_WIDTH;
  public static visibleHeight = SafeAreaAdapter.DESIGN_HEIGHT;
  public static safeTop = 0;
  public static safeBottom = 0;
  public static safeLeft = 0;
  public static safeRight = 0;
  private rotateOverlay?: Node;
  private insetProbe?: HTMLDivElement;

  protected onLoad(): void {
    this.reflow(false);
    screen.on('window-resize', this.onResize, this);
  }

  protected onDestroy(): void { screen.off('window-resize', this.onResize, this);this.insetProbe?.remove(); }

  private onResize(): void { this.reflow(true); }

  private reflow(notify: boolean): void {
    const windowSize = screen.windowSize;
    const landscape = windowSize.width > windowSize.height;
    const portraitRatio = windowSize.height / Math.max(1, windowSize.width);
    const designRatio = SafeAreaAdapter.DESIGN_HEIGHT / SafeAreaAdapter.DESIGN_WIDTH;
    const policy = landscape || portraitRatio < designRatio ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH;
    view.setDesignResolutionSize(SafeAreaAdapter.DESIGN_WIDTH, SafeAreaAdapter.DESIGN_HEIGHT, policy);

    const visible = view.getVisibleSize();
    SafeAreaAdapter.visibleWidth = Math.max(SafeAreaAdapter.DESIGN_WIDTH, visible.width);
    SafeAreaAdapter.visibleHeight = Math.max(SafeAreaAdapter.DESIGN_HEIGHT, visible.height);
    // safeArea is not exposed by every web runtime. Treat the full browser
    // viewport as safe there, while still honoring native notch insets.
    const safe = (screen as unknown as { safeArea?: { x: number; y: number; width: number; height: number } }).safeArea
      ?? { x: 0, y: 0, width: windowSize.width, height: windowSize.height };
    const scaleX = SafeAreaAdapter.visibleWidth / Math.max(1, windowSize.width);
    const scaleY = SafeAreaAdapter.visibleHeight / Math.max(1, windowSize.height);
    SafeAreaAdapter.safeLeft = Math.max(0, safe.x * scaleX);
    SafeAreaAdapter.safeRight = Math.max(0, (windowSize.width - safe.x - safe.width) * scaleX);
    SafeAreaAdapter.safeBottom = Math.max(0, safe.y * scaleY);
    SafeAreaAdapter.safeTop = Math.max(0, (windowSize.height - safe.y - safe.height) * scaleY);

    if(typeof document!=='undefined'&&document.body){
      if(!this.insetProbe){
        this.insetProbe=document.createElement('div');this.insetProbe.id='f43-safe-area-probe';
        this.insetProbe.setAttribute('aria-hidden','true');
        this.insetProbe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
        document.body.appendChild(this.insetProbe);
      }
      const css=getComputedStyle(this.insetProbe),sx=SafeAreaAdapter.visibleWidth/Math.max(1,document.documentElement.clientWidth),sy=SafeAreaAdapter.visibleHeight/Math.max(1,document.documentElement.clientHeight);
      // Native and CSS values describe the same inset; taking max avoids double padding.
      SafeAreaAdapter.safeTop=Math.max(SafeAreaAdapter.safeTop,(parseFloat(css.paddingTop)||0)*sy);
      SafeAreaAdapter.safeBottom=Math.max(SafeAreaAdapter.safeBottom,(parseFloat(css.paddingBottom)||0)*sy);
      SafeAreaAdapter.safeLeft=Math.max(SafeAreaAdapter.safeLeft,(parseFloat(css.paddingLeft)||0)*sx);
      SafeAreaAdapter.safeRight=Math.max(SafeAreaAdapter.safeRight,(parseFloat(css.paddingRight)||0)*sx);
    }

    this.getComponent(UITransform)?.setContentSize(SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight);

    // A wide desktop preview is a viewport, not a phone held sideways.
    // Keep the portrait guard on mobile and native targets only.
    this.updateRotateOverlay(landscape && (sys.isNative || sys.isMobile));
    if (notify) this.node.emit('csw-layout-changed');
  }

  private updateRotateOverlay(landscape: boolean): void {
    if (!this.rotateOverlay) {
      const overlay = new Node('RotateDeviceOverlay'); overlay.layer = Layers.Enum.UI_2D; overlay.addComponent(UITransform); this.node.addChild(overlay);
      overlay.addComponent(Graphics);
      overlay.addComponent(BlockInputEvents);
      const message = new Node('Message'); message.layer = Layers.Enum.UI_2D; message.addComponent(UITransform); overlay.addChild(message);
      const label = message.addComponent(Label); label.string = tr('PORTRAIT MODE\nROTATE YOUR DEVICE'); label.fontSize = 42; label.lineHeight = 56; label.isBold = true; label.color = new Color(255, 229, 155); label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER;
      this.rotateOverlay = overlay;
    }
    const overlay = this.rotateOverlay; overlay.active = landscape; overlay.setSiblingIndex(this.node.children.length - 1);
    overlay.getComponent(UITransform)?.setContentSize(SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight);
    const graphics = overlay.getComponent(Graphics) as Graphics; graphics.clear(); graphics.fillColor = new Color(2, 8, 25, 248); graphics.rect(-SafeAreaAdapter.visibleWidth / 2, -SafeAreaAdapter.visibleHeight / 2, SafeAreaAdapter.visibleWidth, SafeAreaAdapter.visibleHeight); graphics.fill();
    overlay.getChildByName('Message')?.getComponent(UITransform)?.setContentSize(Math.min(900, SafeAreaAdapter.visibleWidth - 120), 260);
  }
}
