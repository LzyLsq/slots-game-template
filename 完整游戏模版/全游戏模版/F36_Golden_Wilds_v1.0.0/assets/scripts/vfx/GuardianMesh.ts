import { _decorator, Sprite, UITransform } from 'cc';
const { ccclass } = _decorator;
const COLS = 64, ROWS = 40, WIDTH = 736, HEIGHT = 448;
const INDICES = new Uint16Array(COLS * ROWS * 6);
for (let row = 0, k = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
  const a = row * (COLS + 1) + col, b = a + 1, c = a + COLS + 1, d = c + 1;
  INDICES[k++] = a; INDICES[k++] = c; INDICES[k++] = b;
  INDICES[k++] = b; INDICES[k++] = c; INDICES[k++] = d;
}
export interface GuardianDeformation {
  point(x: number, y: number): readonly [number, number];
  writePoints?(target: Float64Array, columns: number, rows: number, width: number, height: number): void;
}
/** Sprite's normal UI material and batching, with a connected skin mesh.
 * Cocos 3.8 assembler integration follows this installed engine's Simple
 * assembler. Source UVs are immutable: there is one painted animal, no poses
 * blended or swapped. Native rendering needs separate device verification. */
const skinAssembler = {
  createData(sprite: GuardianMesh): any {
    const data = sprite.requestRenderData();
    data.dataLength = (COLS + 1) * (ROWS + 1);
    data.resize(data.dataLength, INDICES.length);
    data.chunk.setIndexBuffer(INDICES);
    return data;
  },
  updateRenderData(sprite: GuardianMesh): void {
    const data = sprite.renderData;
    if (!data || !sprite.spriteFrame) return;
    this.updateUVs(sprite);
    sprite.writeSkin();
    data.updateRenderData(sprite, sprite.spriteFrame);
  },
  updateUVs(sprite: GuardianMesh): void {
    const data = sprite.renderData, frame = sprite.spriteFrame;
    if (!data || !frame) return;
    const uv = frame.uv, vb = data.chunk.vb, stride = data.floatStride;
    for (let row = 0, k = 0; row <= ROWS; row++) for (let col = 0; col <= COLS; col++, k++) {
      const x = col / COLS, y = row / ROWS;
      const u = (uv[4] + (uv[6] - uv[4]) * x) * (1 - y) + (uv[0] + (uv[2] - uv[0]) * x) * y;
      const v = (uv[5] + (uv[7] - uv[5]) * x) * (1 - y) + (uv[1] + (uv[3] - uv[1]) * x) * y;
      vb[k * stride + 3] = u; vb[k * stride + 4] = v;
      data.data[k].u = u; data.data[k].v = v;
    }
  },
  updateColor(sprite: GuardianMesh): void {
    const data = sprite.renderData; if (!data) return;
    const vb = data.chunk.vb, color = sprite.color;
    for (let k = 0; k < data.dataLength; k++) {
      const offset = k * data.floatStride + 5;
      vb[offset] = color.r / 255; vb[offset + 1] = color.g / 255;
      vb[offset + 2] = color.b / 255; vb[offset + 3] = color.a / 255;
      data.data[k].color.set(color);
    }
  },
  fillBuffers(sprite: GuardianMesh, renderer: any): void {
    const data = sprite.renderData; if (!data?.chunk) return;
    const m = sprite.node.worldMatrix, vb = data.chunk.vb, stride = data.floatStride;
    // Both skin coordinates and parent transforms can change between draws.
    for (let k = 0; k < data.dataLength; k++) {
      const p = data.data[k], offset = k * stride;
      let rhw = m.m03 * p.x + m.m07 * p.y + m.m15; rhw = rhw ? 1 / rhw : 1;
      vb[offset] = (m.m00 * p.x + m.m04 * p.y + m.m12) * rhw;
      vb[offset + 1] = (m.m01 * p.x + m.m05 * p.y + m.m13) * rhw;
      vb[offset + 2] = (m.m02 * p.x + m.m06 * p.y + m.m14) * rhw;
    }
    data.vertDirty = false;
    const buffer = data.chunk.meshBuffer, origin = data.chunk.vertexOffset;
    // A grid uses nearly six indices per vertex; Cocos reserves four.
    // Reserve capacity for the complete shared vertex buffer, including the
    // normal Sprite/Label assemblers that append indices after this skin.
    // Growing only to our current offset lets those later draws overflow.
    const needed = Math.max(buffer.indexOffset + INDICES.length,
      Math.ceil(buffer.vData.length / stride) * 6);
    if (buffer.iData.length < needed) {
      const grown = new Uint16Array(needed);
      grown.set(buffer.iData); buffer.iData = grown;
    }
    for (let k = 0, offset = buffer.indexOffset; k < INDICES.length; k++) buffer.iData[offset + k] = origin + INDICES[k];
    buffer.indexOffset += INDICES.length;
  },
};
@ccclass('GuardianMesh')
export class GuardianMesh extends Sprite {
  public skin?: GuardianDeformation;
  private skinPoints = new Float64Array((COLS + 1) * (ROWS + 1) * 2);
  protected _flushAssembler(): void {
    if (this._assembler !== skinAssembler) { this.destroyRenderData(); this._assembler = skinAssembler; }
    if (!this.renderData) {
      const data = this._renderData = skinAssembler.createData(this);
      data.material = this.getRenderMaterial(0);
      skinAssembler.updateUVs(this); skinAssembler.updateColor(this);
      this.writeSkin(); this.markForUpdateRenderData();
    }
  }
  public redraw(): void { this.markForUpdateRenderData(); }
  public writeSkin(): void {
    const data = this.renderData; if (!data) return;
    const t = this.getComponent(UITransform)!;
    const cached = !!this.skin?.writePoints;
    this.skin?.writePoints?.(this.skinPoints, COLS, ROWS, WIDTH, HEIGHT);
    for (let row = 0, k = 0; row <= ROWS; row++) for (let col = 0; col <= COLS; col++, k++) {
      let x: number, y: number;
      if (cached) { x = this.skinPoints[k * 2]; y = this.skinPoints[k * 2 + 1]; }
      else {
        const sx = col / COLS * WIDTH, sy = row / ROWS * HEIGHT;
        const p = this.skin?.point(sx, sy); x = p?.[0] ?? sx; y = p?.[1] ?? sy;
      }
      data.data[k].x = (x / WIDTH - t.anchorX) * t.width;
      data.data[k].y = (1 - y / HEIGHT - t.anchorY) * t.height;
      data.data[k].z = 0;
    }
    data.vertDirty = true;
  }
}
