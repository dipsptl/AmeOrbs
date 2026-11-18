import * as THREE from 'three';
import { ZenMode } from '../types/zen';
import { DynamicCanvasPanel, drawRoundedRect } from './CanvasTextHelper';
import { HandTracker } from './HandTracker';

interface SpatialButton {
  id: ZenMode | 'mute';
  label: string;
  panel: DynamicCanvasPanel;
  worldPos: THREE.Vector3;
  active: boolean;
  hovered: boolean;
  scale: number;
  cooldown: number;
}

const _camPos = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _btnWorld = new THREE.Vector3();

/**
 * SpatialMenus manages:
 * 1) Palm-Up Wrist Menu: 3 sleek holographic pill buttons above the left palm.
 * 2) Floating Minimal Dock: Secondary easy-access 3D bar in front of the seated user.
 */
export class SpatialMenus {
  public readonly wristGroup: THREE.Group;
  public readonly dockGroup: THREE.Group;
  public readonly clickableMeshes: THREE.Mesh[] = [];

  private readonly wristButtons: SpatialButton[] = [];
  private readonly dockButtons: SpatialButton[] = [];
  private wristScale = 0;
  private currentMode: ZenMode = 'breathe';
  private muted = false;

  constructor(
    scene: THREE.Scene,
    maxAnisotropy: number,
    private readonly onSelectMode: (mode: ZenMode) => void,
    private readonly onToggleMute: () => void
  ) {
    this.wristGroup = new THREE.Group();
    this.wristGroup.visible = false;
    scene.add(this.wristGroup);

    const wristDefs: Array<{ id: ZenMode; label: string; offsetX: number; offsetY: number }> = [
      { id: 'breathe', label: '1. Breathe', offsetX: -0.078, offsetY: 0.015 },
      { id: 'pop', label: '2. Pop Orbs', offsetX: 0.0, offsetY: 0.036 },
      { id: 'focus', label: '3. Focus 5m', offsetX: 0.078, offsetY: 0.015 },
    ];

    for (const def of wristDefs) {
      const panel = new DynamicCanvasPanel(280, 92, 0.074, 0.025, maxAnisotropy);
      panel.mesh.position.set(def.offsetX, def.offsetY, 0);
      panel.mesh.userData.menuAction = () => this.onSelectMode(def.id);
      this.wristGroup.add(panel.mesh);
      this.clickableMeshes.push(panel.mesh);

      const btn: SpatialButton = {
        id: def.id,
        label: def.label,
        panel,
        worldPos: new THREE.Vector3(),
        active: def.id === this.currentMode,
        hovered: false,
        scale: 1,
        cooldown: 0,
      };
      this.redrawButton(btn);
      this.wristButtons.push(btn);
    }

    // Secondary Floating Minimal Dock (shown only in active WebXR VR sessions)
    this.dockGroup = new THREE.Group();
    this.dockGroup.position.set(0, 0.9, -0.76);
    this.dockGroup.rotation.x = -0.42; // Tilted ergonomically upward toward seated eyes
    this.dockGroup.visible = false;
    scene.add(this.dockGroup);

    // Subtle holographic backing bar
    const dockBack = new DynamicCanvasPanel(1024, 150, 0.56, 0.082, maxAnisotropy);
    this.drawDockBackplate(dockBack);
    dockBack.mesh.position.z = -0.004;
    this.dockGroup.add(dockBack.mesh);
    this.dockBackPanel = dockBack;

    const dockDefs: Array<{ id: ZenMode | 'mute'; label: string; x: number; w: number }> = [
      { id: 'breathe', label: '1. Breathe', x: -0.195, w: 0.125 },
      { id: 'pop', label: '2. Pop Orbs', x: -0.055, w: 0.13 },
      { id: 'focus', label: '3. Focus 5m', x: 0.085, w: 0.13 },
      { id: 'mute', label: 'Sound: On', x: 0.212, w: 0.10 },
    ];

    for (const def of dockDefs) {
      const panel = new DynamicCanvasPanel(320, 96, def.w, 0.044, maxAnisotropy);
      panel.mesh.position.set(def.x, 0, 0.004);
      panel.mesh.userData.menuAction = () => {
        if (def.id === 'mute') {
          this.onToggleMute();
        } else {
          this.onSelectMode(def.id);
        }
      };
      this.dockGroup.add(panel.mesh);
      this.clickableMeshes.push(panel.mesh);

      const btn: SpatialButton = {
        id: def.id,
        label: def.label,
        panel,
        worldPos: new THREE.Vector3(),
        active: def.id === this.currentMode,
        hovered: false,
        scale: 1,
        cooldown: 0,
      };
      this.redrawButton(btn);
      this.dockButtons.push(btn);
    }
  }

  private readonly dockBackPanel: DynamicCanvasPanel;

  private drawDockBackplate(panel: DynamicCanvasPanel): void {
    const { ctx, canvas } = panel;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawRoundedRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 48);
    ctx.fillStyle = 'rgba(10, 16, 36, 0.78)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(136, 162, 255, 0.26)';
    ctx.stroke();

    panel.markUpdated();
  }

  private redrawButton(btn: SpatialButton): void {
    const { ctx, canvas } = btn.panel;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const isMute = btn.id === 'mute';
    const isActive = isMute ? !this.muted : btn.active;
    const label = isMute ? (this.muted ? 'Sound: Off' : 'Sound: On') : btn.label;

    drawRoundedRect(ctx, 6, 6, w - 12, h - 12, (h - 12) / 2);

    if (isActive && !isMute) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(0, 245, 212, 0.28)');
      grad.addColorStop(1, 'rgba(136, 162, 255, 0.26)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00F5D4';
      ctx.stroke();
    } else if (btn.hovered) {
      ctx.fillStyle = 'rgba(136, 162, 255, 0.22)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#88A2FF';
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(15, 22, 46, 0.85)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isMute && this.muted ? 'rgba(247, 127, 0, 0.48)' : 'rgba(136, 162, 255, 0.28)';
      ctx.stroke();
    }

    ctx.font = '600 32px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isActive && !isMute ? '#00F5D4' : isMute && this.muted ? '#F7A072' : '#E6ECF8';
    ctx.fillText(label, w / 2, h / 2 + 1);

    btn.panel.markUpdated();
  }

  public setState(mode: ZenMode, muted: boolean): void {
    const modeChanged = mode !== this.currentMode;
    const muteChanged = muted !== this.muted;
    this.currentMode = mode;
    this.muted = muted;

    if (modeChanged || muteChanged) {
      for (const b of this.wristButtons) {
        b.active = b.id === mode;
        this.redrawButton(b);
      }
      for (const b of this.dockButtons) {
        b.active = b.id === mode;
        this.redrawButton(b);
      }
    }
  }

  public update(delta: number, camera: THREE.Camera, hands: HandTracker, isInVR = false): void {
    camera.getWorldPosition(_camPos);

    // 1. Update Palm-Up Wrist Menu visibility & placement
    const showWrist = hands.leftPalmUp && hands.left.active;
    this.wristScale = THREE.MathUtils.damp(this.wristScale, showWrist ? 1 : 0, 12, delta);

    if (this.wristScale > 0.02) {
      this.wristGroup.visible = true;
      // Float 11cm above the left palm along palm normal + slight upward bias
      _targetPos
        .copy(hands.left.palmPos)
        .addScaledVector(hands.left.palmNormal, 0.095);
      _targetPos.y += 0.035;

      if (this.wristGroup.position.lengthSq() === 0) {
        this.wristGroup.position.copy(_targetPos);
      } else {
        this.wristGroup.position.lerp(_targetPos, 1 - Math.exp(-16 * delta));
      }

      // Face the user's eyes gently
      _rightVec.copy(_camPos).sub(this.wristGroup.position).normalize();
      this.wristGroup.lookAt(_camPos);
      this.wristGroup.scale.setScalar(this.wristScale);
    } else {
      this.wristGroup.visible = false;
    }

    // 2. Finger-poke interaction for Wrist Menu (right index tip)
    if (this.wristGroup.visible && hands.right.active) {
      this.processButtonTouches(this.wristButtons, hands.right.indexTip, 0.042, delta);
    }

    // 3. Only display the secondary 3D dock inside active VR sessions (avoids duplicate center pill bar on desktop)
    this.dockGroup.visible = isInVR;
    if (!isInVR) return;

    // Finger-poke interaction for Front Floating Dock (either index tip)
    for (const btn of this.dockButtons) {
      btn.cooldown = Math.max(0, btn.cooldown - delta);
      btn.panel.mesh.getWorldPosition(_btnWorld);

      let minDist = Infinity;
      if (hands.right.active) {
        minDist = Math.min(minDist, hands.right.indexTip.distanceTo(_btnWorld));
      }
      if (hands.left.active) {
        minDist = Math.min(minDist, hands.left.indexTip.distanceTo(_btnWorld));
      }

      const wasHovered = btn.hovered;
      btn.hovered = minDist < 0.068;
      if (btn.hovered !== wasHovered) {
        this.redrawButton(btn);
      }

      const targetScale = btn.hovered ? 1.09 : 1.0;
      btn.scale = THREE.MathUtils.damp(btn.scale, targetScale, 14, delta);
      btn.panel.mesh.scale.setScalar(btn.scale);

      if (minDist < 0.042 && btn.cooldown <= 0) {
        btn.cooldown = 0.55;
        if (btn.id === 'mute') {
          this.onToggleMute();
        } else {
          this.onSelectMode(btn.id);
        }
      }
    }
  }

  private processButtonTouches(
    buttons: SpatialButton[],
    fingerTip: THREE.Vector3,
    triggerDist: number,
    delta: number
  ): void {
    for (const btn of buttons) {
      btn.cooldown = Math.max(0, btn.cooldown - delta);
      btn.panel.mesh.getWorldPosition(_btnWorld);
      const dist = fingerTip.distanceTo(_btnWorld);

      const wasHovered = btn.hovered;
      btn.hovered = dist < triggerDist * 1.65;
      if (btn.hovered !== wasHovered) {
        this.redrawButton(btn);
      }

      const targetScale = btn.hovered ? 1.12 : 1.0;
      btn.scale = THREE.MathUtils.damp(btn.scale, targetScale, 14, delta);
      btn.panel.mesh.scale.setScalar(btn.scale);

      if (dist < triggerDist && btn.cooldown <= 0) {
        btn.cooldown = 0.6;
        if (btn.id !== 'mute') {
          this.onSelectMode(btn.id);
        }
      }
    }
  }

  public dispose(): void {
    for (const b of this.wristButtons) b.panel.dispose();
    for (const b of this.dockButtons) b.panel.dispose();
    this.dockBackPanel.dispose();
    this.wristGroup.parent?.remove(this.wristGroup);
    this.dockGroup.parent?.remove(this.dockGroup);
  }
}
