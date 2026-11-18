import * as THREE from 'three';
import { ZenAudioEngine } from '../../audio/ZenAudioEngine';
import { TRANSLATIONS } from '../../i18n/translations';
import { BreathPhase, LanguageCode } from '../../types/zen';
import { ButterflyFlock } from '../ButterflyFlock';
import { DynamicCanvasPanel, drawRoundedRect } from '../CanvasTextHelper';
import { EnvironmentRig } from '../EnvironmentBuilder';
import { HandTracker } from '../HandTracker';

const _worldOrigin = new THREE.Vector3();
const PHASE_DURATION = 5.0; // Calm 5s per breath phase for soothing voice pacing

/**
 * Mode 1: Guided Breathing Golden Orb
 * Renders a volumetric golden glowing glass/light orb with swirling light motes
 * and expanding breath ripples over the 360° real-world panorama (zero cartoon meshes).
 */
export class BreatheMode {
  public readonly group = new THREE.Group();
  public phase: BreathPhase = 'inhale';
  public secondsLeft = PHASE_DURATION;
  public cyclesCompleted = 0;

  public onPhaseTransition?: (
    phase: BreathPhase,
    exerciseId: 'butterfly_wing_stretch' | 'horizon_neck_gaze' | 'lotus_sky_reach',
    cyclesCompleted: number
  ) => void;

  private readonly orbCluster = new THREE.Group();
  private readonly outerMat: THREE.ShaderMaterial;
  private readonly coreMesh: THREE.Mesh;
  private readonly coreMat: THREE.MeshBasicMaterial;
  private readonly haloRingA: THREE.Mesh;
  private readonly haloRingB: THREE.Mesh;
  private readonly rippleMesh: THREE.Mesh;
  private readonly rippleMat: THREE.MeshBasicMaterial;
  private readonly motePoints: THREE.Points;
  private readonly motePos: Float32Array;
  private readonly moteBaseAngles: Float32Array;
  private readonly labelPanel: DynamicCanvasPanel;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private phaseTimer = 0;
  private currentScale = 0.55;
  private lastDrawnKey = '';
  private lastHandY: number | null = null;
  private handActivityWeight = 0;
  private releasedThisCycle = false;
  private rippleProgress = 1;

  private exerciseId: 'butterfly_wing_stretch' | 'horizon_neck_gaze' | 'lotus_sky_reach' =
    'lotus_sky_reach';
  private language: LanguageCode = 'en';

  constructor(
    parentGroup: THREE.Object3D,
    maxAnisotropy: number,
    private readonly audio: ZenAudioEngine,
    private readonly flock: ButterflyFlock,
    private readonly env: EnvironmentRig
  ) {
    parentGroup.add(this.group);

    this.orbCluster.position.set(0, 1.2, -0.84);
    this.group.add(this.orbCluster);

    // 1. Volumetric Iridescent Golden Light Orb
    const outerGeo = new THREE.SphereGeometry(0.14, 40, 32);
    this.outerMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0xffd166) },
        uColorB: { value: new THREE.Color(0x8cf2d8) },
        uIntensity: { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);
          float ndotv = clamp(dot(N, V), 0.0, 1.0);
          float fresnel = pow(1.0 - ndotv, 2.2);
          float pulse = 0.5 + 0.5 * sin(uTime * 1.4 + N.y * 2.5);
          vec3 col = mix(uColorA, uColorB, fresnel * 0.75 + pulse * 0.15);
          col += vec3(1.0, 0.94, 0.78) * pow(ndotv, 3.0) * 0.35;
          float alpha = clamp(0.16 + fresnel * 0.74, 0.14, 0.88) * (0.75 + uIntensity * 0.3);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const outerMesh = new THREE.Mesh(outerGeo, this.outerMat);
    this.orbCluster.add(outerMesh);

    // Warm Golden Inner Core
    const coreGeo = new THREE.SphereGeometry(0.056, 24, 24);
    this.coreMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.orbCluster.add(this.coreMesh);

    // 2. Delicate Golden Orbital Hairline Rings
    const ringGeoA = new THREE.TorusGeometry(0.185, 0.0022, 10, 72);
    const ringMatA = new THREE.MeshBasicMaterial({
      color: 0xffe29a,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloRingA = new THREE.Mesh(ringGeoA, ringMatA);
    this.haloRingA.rotation.set(0.45, 0.25, 0);

    const ringGeoB = new THREE.TorusGeometry(0.215, 0.0018, 10, 72);
    const ringMatB = new THREE.MeshBasicMaterial({
      color: 0x8cf2d8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloRingB = new THREE.Mesh(ringGeoB, ringMatB);
    this.haloRingB.rotation.set(-0.5, -0.3, 0.2);
    this.orbCluster.add(this.haloRingA, this.haloRingB);

    // 3. Expanding Exhale Ripple Halo
    const rippleGeo = new THREE.RingGeometry(0.13, 0.146, 48);
    this.rippleMat = new THREE.MeshBasicMaterial({
      color: 0xffe29a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.rippleMesh = new THREE.Mesh(rippleGeo, this.rippleMat);
    this.rippleMesh.visible = false;
    this.orbCluster.add(this.rippleMesh);

    // 4. Orbital Golden Light Motes Around the Orb
    const moteCount = 32;
    this.motePos = new Float32Array(moteCount * 3);
    this.moteBaseAngles = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      this.moteBaseAngles[i] = (i / moteCount) * Math.PI * 2;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(this.motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xffe49e,
      size: 0.016,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.motePoints = new THREE.Points(moteGeo, moteMat);
    this.orbCluster.add(this.motePoints);

    this.disposables.push(
      outerGeo,
      this.outerMat,
      coreGeo,
      this.coreMat,
      ringGeoA,
      ringMatA,
      ringGeoB,
      ringMatB,
      rippleGeo,
      this.rippleMat,
      moteGeo,
      moteMat
    );

    // 5. Floating Calm Multi-Language Subtitle Card
    this.labelPanel = new DynamicCanvasPanel(960, 196, 0.78, 0.16, maxAnisotropy);
    this.labelPanel.mesh.position.set(0, 1.56, -0.84);
    this.group.add(this.labelPanel.mesh);
    this.redrawLabel();
  }

  public setLanguage(lang: LanguageCode): void {
    if (this.language === lang) return;
    this.language = lang;
    this.lastDrawnKey = '';
    this.redrawLabel();
  }

  public setExercise(ex: 'butterfly_wing_stretch' | 'horizon_neck_gaze' | 'lotus_sky_reach'): void {
    this.exerciseId = ex;
    this.lastDrawnKey = '';
    if (this.group.visible) {
      this.flock.setHorizonGazeMode(ex === 'horizon_neck_gaze');
    }
    this.redrawLabel();
  }

  public setFlowerColors(colors: [string, string]): void {
    (this.outerMat.uniforms.uColorA.value as THREE.Color).set(colors[0]);
    (this.outerMat.uniforms.uColorB.value as THREE.Color).set(colors[1]);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible) {
      this.env.setTwilight(0);
      this.flock.setHorizonGazeMode(this.exerciseId === 'horizon_neck_gaze');
      this.syncFlockToPhase();
    } else {
      this.flock.setHorizonGazeMode(false);
    }
  }

  public getCurrentSubtitle(): string {
    const t = TRANSLATIONS[this.language];
    const ex = t.exercises[this.exerciseId];
    return ex.steps?.[this.phase] ?? ex.subtitle;
  }

  private syncFlockToPhase(): void {
    if (this.phase === 'hold') {
      this.flock.setBehavior('halo');
    } else if (this.phase === 'exhale') {
      this.flock.setBehavior('breeze');
    } else {
      this.flock.setBehavior('garden');
    }
  }

  private releaseNewbornButterfly(): void {
    this.coreMesh.getWorldPosition(_worldOrigin);
    _worldOrigin.y += 0.05;
    this.flock.releaseButterflyAt(_worldOrigin, this.cyclesCompleted % 2);
  }

  private redrawLabel(): void {
    const ceilSec = Math.max(1, Math.ceil(this.secondsLeft));
    const key = `${this.language}-${this.exerciseId}-${this.phase}-${ceilSec}-${this.cyclesCompleted}`;
    if (key === this.lastDrawnKey) return;
    this.lastDrawnKey = key;

    const { ctx, canvas } = this.labelPanel;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    drawRoundedRect(ctx, 10, 10, w - 20, h - 20, 32);
    ctx.fillStyle = 'rgba(12, 24, 24, 0.72)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle =
      this.phase === 'inhale'
        ? 'rgba(255, 214, 122, 0.6)'
        : this.phase === 'hold'
          ? 'rgba(255, 195, 220, 0.65)'
          : 'rgba(130, 232, 210, 0.58)';
    ctx.stroke();

    const locale = TRANSLATIONS[this.language];
    const exInfo = locale.exercises[this.exerciseId];
    const stepText = exInfo.steps?.[this.phase] ?? exInfo.subtitle;

    ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFDF7';
    ctx.fillText(stepText, w / 2, 62, w - 70);

    const barW = 500;
    const barX = (w - barW) / 2;
    const barY = 108;
    drawRoundedRect(ctx, barX, barY, barW, 7, 3.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fill();

    const frac = 1 - this.secondsLeft / PHASE_DURATION;
    drawRoundedRect(ctx, barX, barY, Math.max(8, barW * frac), 7, 3.5);
    ctx.fillStyle = this.phase === 'hold' ? '#FFD166' : '#8CF2D8';
    ctx.fill();

    ctx.font = '500 20px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    ctx.fillStyle = 'rgba(245, 248, 244, 0.82)';
    ctx.fillText(
      `${exInfo.title} · ${ceilSec}s · ${locale.cyclesLabel}: ${this.cyclesCompleted}`,
      w / 2,
      146,
      w - 70
    );

    this.labelPanel.markUpdated();
  }

  public update(delta: number, elapsed: number, hands: HandTracker): void {
    if (!this.group.visible) return;

    this.phaseTimer += delta;
    if (this.phaseTimer >= PHASE_DURATION) {
      this.phaseTimer -= PHASE_DURATION;
      if (this.phase === 'inhale') {
        this.phase = 'hold';
        this.audio.playPhaseCue('hold');
        if (!this.releasedThisCycle) {
          this.releaseNewbornButterfly();
          this.releasedThisCycle = true;
        }
      } else if (this.phase === 'hold') {
        this.phase = 'exhale';
        this.rippleProgress = 0;
        this.env.triggerBreeze(1.0);
        this.audio.playPhaseCue('exhale');
      } else {
        this.phase = 'inhale';
        this.releasedThisCycle = false;
        this.cyclesCompleted += 1;
        this.audio.playCycleCompleteChord();
      }
      this.syncFlockToPhase();
      this.onPhaseTransition?.(this.phase, this.exerciseId, this.cyclesCompleted);
    }

    this.secondsLeft = Math.max(0, PHASE_DURATION - this.phaseTimer);
    this.redrawLabel();

    const phaseProgress = this.phaseTimer / PHASE_DURATION;
    let guideTarget = 0.65;
    if (this.phase === 'inhale') {
      guideTarget = THREE.MathUtils.lerp(0.62, 1.28, phaseProgress);
    } else if (this.phase === 'hold') {
      guideTarget = 1.28 + Math.sin(elapsed * 2.2) * 0.03;
    } else {
      guideTarget = THREE.MathUtils.lerp(1.28, 0.62, phaseProgress);
    }

    let targetScale = guideTarget;
    if (hands.averageHandHeightY !== null) {
      const handNorm = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(hands.averageHandHeightY, 0.94, 1.44, 0.58, 1.32),
        0.58,
        1.32
      );
      if (this.lastHandY !== null && Math.abs(hands.averageHandHeightY - this.lastHandY) > 0.0015) {
        this.handActivityWeight = 1.0;
      } else if (!hands.left.active && !hands.right.active) {
        this.handActivityWeight = Math.max(0, this.handActivityWeight - delta * 0.25);
      } else {
        this.handActivityWeight = 1.0;
      }
      this.lastHandY = hands.averageHandHeightY;
      targetScale = THREE.MathUtils.lerp(guideTarget, handNorm, this.handActivityWeight);
    }

    this.currentScale = THREE.MathUtils.damp(this.currentScale, targetScale, 5.4, delta);

    if (this.currentScale > 1.2 && !this.releasedThisCycle) {
      this.releasedThisCycle = true;
      this.releaseNewbornButterfly();
    }

    // Animate golden glowing breathing orb & orbital rings
    this.orbCluster.position.y = 1.19 + Math.sin(elapsed * 1.15) * 0.015;
    this.orbCluster.scale.setScalar(this.currentScale);

    this.outerMat.uniforms.uTime.value = elapsed;
    this.outerMat.uniforms.uIntensity.value = THREE.MathUtils.mapLinear(
      this.currentScale,
      0.58,
      1.32,
      0.45,
      1.15
    );
    this.coreMesh.scale.setScalar(0.85 + Math.sin(elapsed * 2.2) * 0.12);
    this.coreMat.opacity = THREE.MathUtils.mapLinear(this.currentScale, 0.58, 1.32, 0.65, 0.98);

    this.haloRingA.rotation.y += delta * 0.35;
    this.haloRingA.rotation.x = 0.45 + Math.sin(elapsed * 0.6) * 0.15;
    this.haloRingB.rotation.y -= delta * 0.28;
    this.haloRingB.rotation.z += delta * 0.16;

    // Update orbital golden motes around the orb
    const moteRadius = THREE.MathUtils.mapLinear(this.currentScale, 0.58, 1.32, 0.28, 0.17);
    const moteCount = this.moteBaseAngles.length;
    for (let i = 0; i < moteCount; i++) {
      const a = this.moteBaseAngles[i] + elapsed * (0.45 + (i % 3) * 0.12);
      const r = moteRadius + Math.sin(elapsed * 1.5 + i) * 0.028;
      this.motePos[i * 3] = Math.cos(a) * r;
      this.motePos[i * 3 + 1] = Math.sin(elapsed * 1.3 + i * 0.8) * 0.085;
      this.motePos[i * 3 + 2] = Math.sin(a) * r;
    }
    this.motePoints.geometry.attributes.position.needsUpdate = true;

    // Exhale ripple expansion
    if (this.rippleProgress < 1) {
      this.rippleProgress = Math.min(1, this.rippleProgress + delta * 0.48);
      this.rippleMesh.visible = true;
      const rScale = THREE.MathUtils.lerp(1.0, 2.8, this.rippleProgress);
      this.rippleMesh.scale.setScalar(rScale);
      this.rippleMat.opacity = (1 - this.rippleProgress) * (1 - this.rippleProgress) * 0.55;
    } else {
      this.rippleMesh.visible = false;
    }
  }

  public dispose(): void {
    this.group.parent?.remove(this.group);
    this.labelPanel.dispose();
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
