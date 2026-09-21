export interface Size { width: number; height: number }
export interface Rect extends Size { x: number; y: number }
export interface Insets { top: number; right: number; bottom: number; left: number }
export interface CabinetLayout {
  scale: number;
  content: Rect;
  screen: Rect;
  controls: Rect;
  /** Full viewport, rendered with the SAME scale as the cabinet. */
  scene: Rect;
  /** Extra environment must exist in the artwork/world; never stretch cabinet art. */
  sceneWorld: Rect;
}
export const DESIGN: Size = { width: 1080, height: 1920 };
export function cabinetLayout(view: Size, safe: Insets): CabinetLayout {
  const values = [view.width, view.height, safe.top, safe.right, safe.bottom, safe.left];
  if (values.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Invalid viewport');
  const width = view.width - safe.left - safe.right, height = view.height - safe.top - safe.bottom;
  if (width < 1 || height < 1) throw new Error('Viewport is smaller than safe area');
  const scale = Math.min(width / DESIGN.width, height / DESIGN.height);
  const content = { x: safe.left + (width - DESIGN.width * scale) / 2, y: safe.top + (height - DESIGN.height * scale) / 2, width: DESIGN.width * scale, height: DESIGN.height * scale };
  const fromFraction = (x: number, y: number, w: number, h: number): Rect => ({ x: content.x + content.width * x, y: content.y + content.height * y, width: content.width * w, height: content.height * h });
  return {
    scale, content,
    screen: fromFraction(.12, .3, .76, .39),
    controls: fromFraction(.075, .73, .85, .15),
    scene: { x: 0, y: 0, width: view.width, height: view.height },
    sceneWorld: { x: -content.x / scale, y: -content.y / scale, width: view.width / scale, height: view.height / scale },
  };
}
export function cells(screen: Rect, columns: number, rows: number, gapFraction = .025): Rect[] {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || gapFraction < 0 || gapFraction > .1) throw new Error('Invalid reel layout');
  const width = screen.width / columns, height = screen.height / rows;
  return Array.from({ length: columns * rows }, (_, i) => ({ x: screen.x + Math.floor(i / rows) * width + width * gapFraction / 2, y: screen.y + (i % rows) * height + height * gapFraction / 2, width: width * (1 - gapFraction), height: height * (1 - gapFraction) }));
}
