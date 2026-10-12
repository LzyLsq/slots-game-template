import { _decorator, Component, EffectAsset, Layers, Material, Node, Rect, Size, Sprite, SpriteFrame, UIOpacity, UITransform, Vec2, Vec4 } from 'cc';
import { TaskGoldCharacter, TaskGoldCue, TaskGoldPlayback, TaskGoldPose, TASK_GOLD_SMILE, taskGoldStagePlacement } from './TaskGoldMotion';

import { TASK_GOLD_RIGS } from './TaskGoldRigLayout';
import { TASK_GOLD_FACES } from './TaskGoldFaceLayout';
import { goldElbowAngle, JointPoint, TASK_GOLD_JOINTS, TO_RADIANS, transformGoldBody, transformGoldWrist } from './TaskGoldJoints';

const { ccclass } = _decorator;
export type TaskGoldArtwork = { body: SpriteFrame; heldArm: SpriteFrame; smileAtlas?: SpriteFrame; glint: SpriteFrame; jointEffect?: EffectAsset };

/** A continuous hand-held reveal assembled from an original generated rig.
 * Gold is painted into the gripping paw, so it cannot drift away from the hand.
 * The complete arm lives behind the torso: the coat really conceals it when it
 * returns to the waistband. Only the registered mouth changes; no doubled face.
 */
@ccclass('TaskGoldReveal')
export class TaskGoldReveal extends Component {
  private playback?: TaskGoldPlayback;
  private actor?: Node;
  private shoulder?: Node;
  private mouthNode?: Node;
  private bodyMaterial?: Material;
  private armMaterial?: Material;
  private bodyA = new Vec4(); private bodyB = new Vec4(); private wristA = new Vec4();
  private point: JointPoint = { x: 0, y: 0 };
  private facePoint: JointPoint = { x: 0, y: 0 };
  private toothPoint: JointPoint = { x: 0, y: 0 };
  private mouth?: Sprite;
  private glint?: Node;
  private glintOpacity?: UIOpacity;
  private toothLight?: Node;
  private toothOpacity?: UIOpacity;
  private mouthFrames: SpriteFrame[] = [];
  private onCue?: (cue: TaskGoldCue) => void;
  private onFinished?: () => void;
  private finished = false;
  private disposed = false;
  private mode: TaskGoldCharacter = 0;
  private stageScale = 1;
  private entranceTime = 0;
  private entranceDuration = .24;
  private actorOpacity?: UIOpacity;

  public initialize(art: TaskGoldArtwork, reduced: boolean, mode: TaskGoldCharacter, stageScale: number,
    onCue: (cue: TaskGoldCue) => void, onFinished: () => void): this {
    if (this.playback || this.disposed) return this;
    this.mode = mode; this.stageScale = stageScale; this.entranceDuration = reduced ? 0 : .24;
    this.playback = new TaskGoldPlayback(reduced, mode);
    this.onCue = onCue; this.onFinished = onFinished;
    // Source-pixel registration ties the feet to the generated stone dais at
    // every aspect ratio. Each forearm pivots inside its own existing sleeve.
    const rig = TASK_GOLD_RIGS[mode];
    const placement = taskGoldStagePlacement(stageScale);
    const actor = this.makeNode('Treasure keeper · feet registered to stone dais',
      placement.x, placement.y, 590, 732, this.node);
    actor.setScale(placement.scale, placement.scale, 1); this.actor = actor;
    // The generated canvases include tails and gowns. Their center is not the
    // center between the soles: shift the artwork, not the scene's foot anchor.
    const artwork = this.makeNode('Registered whole character · pivot between soles', -rig.soleX, 0, 590, 732, actor);
    this.actorOpacity = actor.addComponent(UIOpacity);
    this.actorOpacity.opacity = reduced ? 255 : 0;
    const shoulder = this.makeNode('Treasure forearm · pivot concealed inside sleeve', rig.elbow[0], rig.elbow[1], 1, 1, artwork);
    this.shoulder = shoulder;
    const joints = TASK_GOLD_JOINTS[mode];
    const arm = this.jointSprite('Generated paw · independently articulated wrist', art.heldArm,
      rig.armCenter[0], rig.armCenter[1], rig.armSize[0], rig.armSize[1], shoulder, reduced ? undefined : art.jointEffect,
      new Vec4(joints.wrist[0], joints.wrist[1], 0, 1), new Vec4(0, 0, 0, 1),
      new Vec4(joints.wristBand[0], joints.wristBand[1], 10000, 10001), new Vec4(1, 0, 0, 1));
    this.armMaterial = arm.material;
    const glint = this.sprite('Gold reflection · registered to held treasure', art.glint,
      rig.gold[0], rig.gold[1], rig.lightSize[0], rig.lightSize[1], shoulder);
    this.glint = glint; this.glintOpacity = glint.addComponent(UIOpacity);
    this.glintOpacity.opacity = 0;
    // The intact body covers the elbow seam. No duplicated hand/face dissolve.
    const body = this.jointSprite('Generated keeper · grounded feet, torso and rigid head', art.body, 0, 366, 590, 732, artwork,
      reduced ? undefined : art.jointEffect,
      new Vec4(joints.hip[0], joints.hip[1], 0, 1), new Vec4(joints.neck[0], joints.neck[1], 0, 1),
      new Vec4(joints.torsoBand[0], joints.torsoBand[1], joints.headBand[0], joints.headBand[1]), new Vec4(0, 1, 0, 1));
    this.bodyMaterial = body.material;
    if (art.smileAtlas) {
      const { columns, frames } = TASK_GOLD_SMILE;
      const face = TASK_GOLD_FACES[mode]; const { width, height } = face;
      for (let i = 0; i < frames; i++) {
        const frame = new SpriteFrame(); frame.texture = art.smileAtlas.texture;
        frame.rect = new Rect(i % columns * width, Math.floor(i / columns) * height, width, height);
        frame.originalSize = new Size(width, height); frame.offset = new Vec2(); frame.packable = false;
        this.mouthFrames.push(frame);
      }
      const mouth = this.sprite('Single registered toothy smile · original eyes retained',
        this.mouthFrames[0], face.center[0], face.center[1], width, height, artwork);
      this.mouthNode = mouth; this.mouth = mouth.getComponent(Sprite)!;
      const tooth = this.sprite('Single tiny enamel reflection · no face glow', art.glint, face.tooth[0], face.tooth[1], face.toothSize, face.toothSize, artwork);
      this.toothLight = tooth; this.toothOpacity = tooth.addComponent(UIOpacity); this.toothOpacity.opacity = 0;
    }
    this.applyPose(this.playback.advance(0).pose);
    return this;
  }

  protected update(dt: number): void {
    if (!this.playback || this.finished || this.disposed) return;
    // Fade just the keeper over an already-opaque stage. Dissolving two entire
    // scenes would show the previous mascot through this one (double exposure).
    const before = this.entranceTime;
    this.entranceTime += Number.isFinite(dt) && dt > 0 ? dt : 0;
    const p = this.entranceDuration ? Math.min(1, this.entranceTime / this.entranceDuration) : 1;
    if (this.actorOpacity) this.actorOpacity.opacity = Math.round(255 * p * p * (3 - 2 * p));
    if (this.entranceTime < this.entranceDuration) return;
    const playingDt = Math.max(0, dt - Math.max(0, this.entranceDuration - before));
    const step = this.playback.advance(playingDt);
    this.applyPose(step.pose);
    for (const cue of step.cues) {
      if (this.disposed || !this.node.isValid) return;
      this.onCue?.(cue);
    }
    if (step.pose.complete) this.finish();
  }

  protected onDisable(): void { this.cancel(); }
  protected onDestroy(): void {
    this.cancel();
    for (const frame of this.mouthFrames) frame.destroy();
    this.mouthFrames.length = 0;
    this.bodyMaterial?.destroy(); this.armMaterial?.destroy();
    this.bodyMaterial = undefined; this.armMaterial = undefined;
  }

  /** Leaving the page never executes a stale callback or settles a second award. */
  public cancel(): void {
    this.disposed = true; this.playback?.cancel();
    this.onCue = undefined; this.onFinished = undefined;
  }

  private applyPose(pose: TaskGoldPose): void {
    if (!this.actor?.isValid || !this.shoulder?.isValid) return;
    const rig = TASK_GOLD_RIGS[this.mode], joints = TASK_GOLD_JOINTS[this.mode], face = TASK_GOLD_FACES[this.mode];
    // No whole-image breathing, sliding soles, or scaled faces.
    if (this.bodyMaterial) {
      this.bodyA.set(joints.hip[0], joints.hip[1], Math.sin(pose.torsoAngle * TO_RADIANS), Math.cos(pose.torsoAngle * TO_RADIANS));
      this.bodyB.set(joints.neck[0], joints.neck[1], Math.sin(pose.headAngle * TO_RADIANS), Math.cos(pose.headAngle * TO_RADIANS));
      this.bodyMaterial.setProperty('jointA', this.bodyA); this.bodyMaterial.setProperty('jointB', this.bodyB);
      transformGoldBody(rig.elbow[0], rig.elbow[1], pose, this.mode, this.point);
      this.shoulder.setPosition(this.point.x, this.point.y, 0);
      this.shoulder.angle = goldElbowAngle(pose, this.mode);
      transformGoldBody(face.center[0], face.center[1], pose, this.mode, this.facePoint);
      transformGoldBody(face.tooth[0], face.tooth[1], pose, this.mode, this.toothPoint);
      this.mouthNode?.setPosition(this.facePoint.x, this.facePoint.y, 0);
      if (this.mouthNode) this.mouthNode.angle = pose.torsoAngle + pose.headAngle;
      this.toothLight?.setPosition(this.toothPoint.x, this.toothPoint.y, 0);
    } else {
      // Material-unavailable / reduced-motion path never strands a persisted claim.
      this.shoulder.setPosition(rig.elbow[0], rig.elbow[1], 0);
      this.shoulder.angle = pose.armAngle;
    }
    if (this.armMaterial) {
      this.wristA.set(joints.wrist[0], joints.wrist[1], Math.sin(pose.wristAngle * TO_RADIANS), Math.cos(pose.wristAngle * TO_RADIANS));
      this.armMaterial.setProperty('jointA', this.wristA);
      transformGoldWrist(rig.gold[0], rig.gold[1], pose, this.mode, this.point);
      this.glint?.setPosition(this.point.x, this.point.y, 0);
    }
    if (this.mouth) this.mouth.spriteFrame = this.mouthFrames[pose.smileFrame];
    if (this.glintOpacity) this.glintOpacity.opacity = pose.glint;
    this.glint?.setScale(pose.glintScale, pose.glintScale, 1);
    if (this.toothOpacity) this.toothOpacity.opacity = pose.toothGlint;
    this.toothLight?.setScale(pose.toothScale, pose.toothScale, 1);
  }

  private jointSprite(name: string, frame: SpriteFrame, x: number, y: number, width: number, height: number, parent: Node,
    effect: EffectAsset | undefined, jointA: Vec4, jointB: Vec4, bands: Vec4, axes: Vec4): { node: Node; material?: Material } {
    // Extra quad margin keeps all moving fur, sleeves, ears and treasure intact;
    // the source is sampled 1:1 in its registered coordinates, not stretched.
    const w = width + (effect ? 96 : 0), h = height + (effect ? 96 : 0);
    const child = this.sprite(name, frame, x, y, w, h, parent);
    if (!effect) return { node: child };
    const material = new Material();
    material.initialize({ effectAsset: effect, defines: { USE_TEXTURE: true } });
    material.setProperty('canvas', new Vec4(w, h, width, height));
    material.setProperty('origin', new Vec4(x, y, 0, 0));
    material.setProperty('jointA', jointA); material.setProperty('jointB', jointB);
    material.setProperty('bands', bands); material.setProperty('axes', axes);
    child.getComponent(Sprite)!.customMaterial = material;
    return { node: child, material };
  }

  private makeNode(name: string, x: number, y: number, width: number, height: number, parent: Node): Node {
    const child = new Node(name); child.layer = Layers.Enum.UI_2D;
    child.addComponent(UITransform).setContentSize(width, height); child.setPosition(x, y, 0);
    parent.addChild(child); return child;
  }
  private sprite(name: string, frame: SpriteFrame, x: number, y: number, width: number, height: number, parent: Node): Node {
    const child = this.makeNode(name, x, y, width, height, parent);
    const sprite = child.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame;
    return child;
  }
  private finish(): void {
    if (this.finished || this.disposed) return;
    this.finished = true;
    const callback = this.onFinished; this.onFinished = undefined; this.onCue = undefined;
    callback?.();
  }
}
