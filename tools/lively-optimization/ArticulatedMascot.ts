import { _decorator, Sprite, UITransform } from 'cc';
const { ccclass } = _decorator;

/** Normalized top-left artwork coordinates; the rectangle is a soft skin weight,
 * not a UV mask. Only transparent, isolated character layers may use this mesh. */
export interface MascotBone {
  name: string; pivot: readonly number[]; region: readonly number[];
  angle: number; period: number; phase: number; mode?: 'flick' | 'sway' | 'breath';
}
export const MASCOT_GRID = 22;
export const MASCOT_VERTICES = (MASCOT_GRID + 1) ** 2;
export const MASCOT_INDICES = new Uint16Array(MASCOT_GRID * MASCOT_GRID * 6);
for (let y = 0, k = 0; y < MASCOT_GRID; y++) for (let x = 0; x < MASCOT_GRID; x++) {
  const a = y * (MASCOT_GRID + 1) + x, b = a + MASCOT_GRID + 1;
  MASCOT_INDICES[k++] = a; MASCOT_INDICES[k++] = a + 1; MASCOT_INDICES[k++] = b;
  MASCOT_INDICES[k++] = a + 1; MASCOT_INDICES[k++] = b + 1; MASCOT_INDICES[k++] = b;
}
export function bonePose(bone: MascotBone, time: number): number {
  if (bone.mode === 'flick') {
    const t = ((time + bone.phase) % bone.period + bone.period) % bone.period;
    if (t > 1.35) return 0;
    // A quick attentive twitch, a smaller counter-motion, then a long rest.
    return Math.sin(t / 1.35 * Math.PI) ** 2 * Math.sin(t / 1.35 * 2 * Math.PI);
  }
  return .5 * (Math.sin(time * Math.PI * 2 / bone.period + bone.phase) - Math.sin(bone.phase));
}
export function skinWeights(bones: readonly MascotBone[]): Float32Array {
  const weights = new Float32Array(MASCOT_VERTICES * bones.length);
  for (let y = 0; y <= MASCOT_GRID; y++) for (let x = 0; x <= MASCOT_GRID; x++) {
    const u = x / MASCOT_GRID, v = 1 - y / MASCOT_GRID, offset = (y * (MASCOT_GRID + 1) + x) * bones.length;
    let sum = 0;
    for (let j = 0; j < bones.length; j++) {
      const r = bones[j].region, rx = (r[2] - r[0]) / 2, ry = (r[3] - r[1]) / 2;
      const distance = Math.hypot((u - r[0] - rx) / rx, (v - r[1] - ry) / ry);
      // A broad falloff prevents narrow ears from folding at the hinge.
      const edge = Math.min(1, Math.max(0, (1 - distance) * 1.5));
      sum += weights[offset + j] = edge * edge * (3 - 2 * edge);
    }
    if (sum > 1) for (let j = 0; j < bones.length; j++) weights[offset + j] /= sum;
  }
  return weights;
}

/** Linear-blend vertex skinning. Texture coordinates never move, one alpha
 * surface is rendered once, and no global Cocos assembler is patched. */
@ccclass('ArticulatedMascot')
export class ArticulatedMascot extends Sprite {
  private bones: readonly MascotBone[] = [];
  private weights: Float32Array = new Float32Array(0);
  private transforms = new Float64Array(0);
  private poseTime = 0;
  private resting = true;
  private readonly meshIndices = new Uint16Array(MASCOT_INDICES.length);
  public appendMeshIndices(): void {
    const rd = this.renderData; if (!rd) return;
    const chunk = rd.chunk, buffer = chunk.meshBuffer;
    // StaticVBAccessor's default IB_SCALE=4 is smaller than this grid's
    // triangle/vertex ratio. Reserve up to six indices per shared vertex so
    // ordinary sprites drawn AFTER this mesh are also safe. This allocates
    // only when the buffer first needs to grow, not once per frame or actor.
    const capacity = Math.max(buffer.indexOffset + MASCOT_INDICES.length,
      Math.ceil(buffer.vData.length / rd.floatStride) * 6);
    if (buffer.iData.length < capacity) {
      const expanded = new Uint16Array(capacity);
      expanded.set(buffer.iData); buffer.iData = expanded;
    }
    for (let i = 0; i < MASCOT_INDICES.length; i++) {
      this.meshIndices[i] = chunk.vertexOffset + MASCOT_INDICES[i];
    }
    // Use the engine's checked append path; do not write past a typed array
    // and then leave indexOffset out of range when uploadBuffers runs.
    chunk.vertexAccessor.appendIndices(chunk.bufferId, this.meshIndices);
  }
  public setBones(bones: readonly MascotBone[]): void {
    this.bones = bones; this.weights = skinWeights(bones); this.transforms = new Float64Array(bones.length * 4);
    this.setPose(0, true);
  }
  public setPose(time: number, resting = false): void {
    this.poseTime = time; this.resting = resting;
    if (this.renderData) this.renderData.vertDirty = true;
    this.markForUpdateRenderData();
  }
  public skinVertices(): void {
    const rd = this.renderData, ui = this.node.getComponent(UITransform);
    if (!rd || !ui) return;
    const w = ui.width, h = ui.height, bones = this.bones ?? [], matrices = this.transforms;
    // Portrait/full-body crops need less rotation than a square head: preserve
    // the hinge silhouette without allowing skinny triangles to turn inside out.
    const rotationLimit = .6 * Math.min(1, w / Math.max(1,h), h / Math.max(1,w));
    for (let j = 0; j < bones.length; j++) {
      const bone = bones[j], pose = this.resting ? 0 : bonePose(bone, this.poseTime), a = pose * bone.angle * rotationLimit * Math.PI / 180;
      matrices[j * 4] = bone.mode === 'breath' ? pose * .012 : Math.cos(a); matrices[j * 4 + 1] = Math.sin(a);
      matrices[j * 4 + 2] = bone.pivot[0] * w; matrices[j * 4 + 3] = (1 - bone.pivot[1]) * h;
    }
    for (let y = 0, i = 0; y <= MASCOT_GRID; y++) for (let x = 0; x <= MASCOT_GRID; x++, i++) {
      const bx = x / MASCOT_GRID * w, by = y / MASCOT_GRID * h; let px = bx, py = by;
      for (let j = 0; j < bones.length; j++) {
        const weight = this.weights[i * bones.length + j]; if (!weight) continue;
        const dx = bx - matrices[j * 4 + 2], dy = by - matrices[j * 4 + 3];
        if (bones[j].mode === 'breath') {
          const amount = matrices[j * 4];
          px += dx * amount * weight; py += dy * amount * weight;
        } else {
          const c = matrices[j * 4], s = matrices[j * 4 + 1];
          px += ((c - 1) * dx - s * dy) * weight; py += (s * dx + (c - 1) * dy) * weight;
        }
      }
      rd.data[i].x = px - ui.anchorX * w; rd.data[i].y = py - ui.anchorY * h;
    }
  }
  protected _flushAssembler(): void {
    // Cocos 3.8 UI RenderData contract; isolated to this subclass. The normal
    // Sprite lifecycle still owns frame changes, material, opacity and masks.
    if (this._assembler !== meshAssembler) { this.destroyRenderData(); this._assembler = meshAssembler; }
    if (!this._renderData) {
      const rd = this._renderData = meshAssembler.createData(this);
      rd.material = this.getRenderMaterial(0); this.markForUpdateRenderData();
      if (this.spriteFrame) meshAssembler.updateUVs(this);
      this._updateColor();
    }
  }
}
const meshAssembler = {
  createData(sprite: ArticulatedMascot) {
    const rd = sprite.requestRenderData(); rd.dataLength = MASCOT_VERTICES;
    rd.resize(MASCOT_VERTICES, MASCOT_INDICES.length); rd.chunk.setIndexBuffer(MASCOT_INDICES); return rd;
  },
  updateRenderData(sprite: ArticulatedMascot): void {
    const rd = sprite.renderData, frame = sprite.spriteFrame; if (!rd || !frame) return;
    if (rd.vertDirty) { sprite.skinVertices(); this.updateUVs(sprite); }
    rd.updateRenderData(sprite, frame);
  },
  updateUVs(sprite: ArticulatedMascot): void {
    const rd = sprite.renderData, frame = sprite.spriteFrame; if (!rd || !frame) return;
    const vb = rd.chunk.vb, stride = rd.floatStride, uv = frame.uv;
    for (let y = 0, i = 0; y <= MASCOT_GRID; y++) for (let x = 0; x <= MASCOT_GRID; x++, i++) {
      const u = x / MASCOT_GRID, v = y / MASCOT_GRID, offset = i * stride;
      vb[offset + 3] = (uv[0] * (1 - u) + uv[2] * u) * (1 - v) + (uv[4] * (1 - u) + uv[6] * u) * v;
      vb[offset + 4] = (uv[1] * (1 - u) + uv[3] * u) * (1 - v) + (uv[5] * (1 - u) + uv[7] * u) * v;
    }
  },
  updateColor(sprite: ArticulatedMascot): void {
    const rd = sprite.renderData; if (!rd) return;
    const color = sprite.color, vb = rd.chunk.vb;
    for (let i = 0; i < MASCOT_VERTICES; i++) {
      const k = i * rd.floatStride; vb[k + 5] = color.r / 255; vb[k + 6] = color.g / 255;
      vb[k + 7] = color.b / 255; vb[k + 8] = color.a / 255;
    }
  },
  fillBuffers(sprite: ArticulatedMascot): void {
    const rd = sprite.renderData; if (!rd) return;
    const chunk = rd.chunk, vb = chunk.vb, m = sprite.node.worldMatrix;
    // Recompute world positions even when a parent, not the mascot, was resized.
    for (let i = 0; i < MASCOT_VERTICES; i++) {
      const { x, y } = rd.data[i], k = i * rd.floatStride;
      const divisor = m.m03 * x + m.m07 * y + m.m15, inv = divisor ? 1 / divisor : 1;
      vb[k] = (m.m00 * x + m.m04 * y + m.m12) * inv;
      vb[k + 1] = (m.m01 * x + m.m05 * y + m.m13) * inv;
      vb[k + 2] = (m.m02 * x + m.m06 * y + m.m14) * inv;
    }
    rd.vertDirty = false;
    sprite.appendMeshIndices();
  },
};
