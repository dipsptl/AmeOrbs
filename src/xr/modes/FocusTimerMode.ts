import * as THREE from 'three';
import { ZenAudioEngine } from '../../audio/ZenAudioEngine';
import { TRANSLATIONS } from '../../i18n/translations';
import { LanguageCode } from '../../types/zen';
import { ButterflyFlock } from '../ButterflyFlock';
import { DynamicCanvasPanel, drawRoundedRect } from '../CanvasTextHelper';
import { EnvironmentRig } from '../EnvironmentBuilder';
import { HandTracker } from '../HandTracker';

const TOTAL_SECONDS = 300; // 5 minutes
const _centerWorld = new THREE.Vector3();

/**
 * Mode 3: 5m Scenic Focus
 * Delicate golden-teal celestial astrolabe ring + levitating glowing crystal
 * hovering softly in front of the 360° panorama.
 */
export class FocusTimerMode {
  public readonly group = new THREE.Group();
  public readonly clickableMeshes: THREE.Mesh[] = [];
  public secondsLeft = TOTAL_SECONDS;
  public running = true;

  private readonly sundialGroup = new THREE.Group();
  private readonly progressMat: THREE.ShaderMaterial;
  private readonly gimbalRingA: THREE.Mesh;
  private readonly gimbalRingB: THREE.Mesh;
  private readonly crystalGroup = new THREE.Group();
  private readonly crystalMat: THREE.MeshPhysicalMaterial;
  private readonly crystalCoreMat: THREE.MeshBasicMaterial;
  private readonly readoutPanel: DynamicCanvasPanel;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private lastDrawnKey = '';
  private pinchCooldown = 0;
  private language: LanguageCode = 'en';

  constructor(
    parentGroup: THREE.Object3D,
    maxAnisotropy: number,
    private readonly audio: ZenAudioEngine,
    private readonly flock: ButterflyFlock,
    private readonly env: EnvironmentRig
  ) {
    parentGroup.add(this.group);
    this.sundialGroup.position.set(0, 1.25, -0.84);
    this.group.add(this.sundialGroup);

    const progGeo = new THREE.PlaneGeometry(0.64, 0.64);
    this.progressMat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 1.0 },
        uTime: { value: 0 },
        uPaused: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uTime;
        uniform float uPaused;
        varying vec2 vUv;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);

          float outerHairline = smoothstep(0.86, 0.867, r) * (1.0 - smoothstep(0.874, 0.881, r));
          float activeBand = smoothstep(0.805, 0.816, r) * (1.0 - smoothstep(0.832, 0.843, r));
          float softAura = smoothstep(0.76, 0.825, r) * (1.0 - smoothstep(0.825, 0.90, r)) * 0.25;

          float angle = atan(p.x, p.y);
          float normAngle = mod(angle, 6.2831853) / 6.2831853;
          float ticks = smoothstep(0.92, 0.99, cos(normAngle * 6.2831853 * 20.0))
                      * smoothstep(0.77, 0.785, r) * (1.0 - smoothstep(0.805, 0.815, r));

          float edgeSoft = smoothstep(uProgress + 0.008, uProgress - 0.004, normAngle);

          vec3 morningGold = vec3(1.0, 0.84, 0.45);
          vec3 twilightLavender = vec3(0.78, 0.65, 1.0);
          vec3 activeCol = mix(twilightLavender, morningGold, uProgress);
          if (uPaused > 0.5) {
            activeCol = mix(activeCol, vec3(0.65, 0.85, 0.92), 0.5);
          }

          float shimmer = 0.88 + 0.12 * sin(uTime * 1.8);
          float alphaActive = (activeBand * 0.92 + softAura) * edgeSoft * shimmer;
          float alphaStatic = outerHairline * 0.35 + ticks * 0.42;

          vec3 col = activeCol * alphaActive + morningGold * alphaStatic;
          float totalAlpha = clamp(alphaActive + alphaStatic, 0.0, 1.0);
          if (totalAlpha < 0.008) discard;

          gl_FragColor = vec4(col, totalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const progMesh = new THREE.Mesh(progGeo, this.progressMat);
    this.sundialGroup.add(progMesh);
    this.disposables.push(progGeo, this.progressMat);

    const gimbalGeoA = new THREE.TorusGeometry(0.295, 0.0022, 12, 96);
    const gimbalMatA = new THREE.MeshStandardMaterial({
      color: 0xffe099,
      emissive: 0xa67c32,
      emissiveIntensity: 0.45,
      metalness: 0.85,
      roughness: 0.24,
      transparent: true,
      opacity: 0.72,
    });
    this.gimbalRingA = new THREE.Mesh(gimbalGeoA, gimbalMatA);
    this.gimbalRingA.rotation.set(0.32, 0.2, 0);

    const gimbalGeoB = new THREE.TorusGeometry(0.318, 0.0018, 12, 96);
    const gimbalMatB = new THREE.MeshStandardMaterial({
      color: 0x8ef2de,
      emissive: 0x35b8a4,
      emissiveIntensity: 0.4,
      metalness: 0.78,
      roughness: 0.24,
      transparent: true,
      opacity: 0.55,
    });
    this.gimbalRingB = new THREE.Mesh(gimbalGeoB, gimbalMatB);
    this.gimbalRingB.rotation.set(-0.36, -0.22, 0.14);

    this.sundialGroup.add(this.gimbalRingA, this.gimbalRingB);
    this.disposables.push(gimbalGeoA, gimbalMatA, gimbalGeoB, gimbalMatB);

    const crystalGeo = new THREE.OctahedronGeometry(0.052, 0);
    crystalGeo.scale(0.84, 1.44, 0.84);

    this.crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xbaf8ee,
      emissive: 0x35b8a4,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      ior: 2.0,
      transparent: true,
      opacity: 0.86,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, this.crystalMat);

    const innerGeo = new THREE.OctahedronGeometry(0.024, 0);
    innerGeo.scale(0.84, 1.44, 0.84);
    this.crystalCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffe082,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerCrystal = new THREE.Mesh(innerGeo, this.crystalCoreMat);

    this.crystalGroup.add(crystalMesh, innerCrystal);
    this.crystalGroup.position.set(0, 0.038, 0.015);
    this.sundialGroup.add(this.crystalGroup);

    crystalMesh.userData.toggleFocusTimer = () => this.togglePause();
    this.clickableMeshes.push(crystalMesh);

    const hitGeo = new THREE.SphereGeometry(0.115, 16, 16);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData.toggleFocusTimer = () => this.togglePause();
    this.crystalGroup.add(hitMesh);
    this.clickableMeshes.push(hitMesh);
    this.disposables.push(
      crystalGeo,
      this.crystalMat,
      innerGeo,
      this.crystalCoreMat,
      hitGeo,
      hitMat
    );

    this.readoutPanel = new DynamicCanvasPanel(620, 185, 0.4, 0.12, maxAnisotropy);
    this.readoutPanel.mesh.position.set(0, -0.115, 0.012);
    this.sundialGroup.add(this.readoutPanel.mesh);
    this.redrawReadout();
  }

  public setLanguage(lang: LanguageCode): void {
    if (this.language === lang) return;
    this.language = lang;
    this.lastDrawnKey = '';
    this.redrawReadout();
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible) {
      this.flock.setBehavior('spiral');
      const twilightProgress = 1 - this.secondsLeft / TOTAL_SECONDS;
      this.env.setTwilight(twilightProgress);
      this.flock.setTwilight(twilightProgress);
    } else {
      this.flock.setTwilight(0);
    }
  }

  public togglePause(): void {
    if (this.secondsLeft <= 0) {
      this.secondsLeft = TOTAL_SECONDS;
      this.running = true;
    } else {
      this.running = !this.running;
    }
    this.audio.playUiTap(this.running);
    this.redrawReadout();
  }

  public resetTimer(): void {
    this.secondsLeft = TOTAL_SECONDS;
    this.running = true;
    this.env.setTwilight(0);
    this.flock.setTwilight(0);
    this.redrawReadout();
  }

  private redrawReadout(): void {
    const whole = Math.ceil(this.secondsLeft);
    const key = `${this.language}-${whole}-${this.running}`;
    if (key === this.lastDrawnKey) return;
    this.lastDrawnKey = key;

    const mins = Math.floor(whole / 60);
    const secs = whole % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const twilightFrac = 1 - this.secondsLeft / TOTAL_SECONDS;
    const stages = TRANSLATIONS[this.language].focusStages;
    const stageLabel =
      twilightFrac < 0.33 ? stages.morning : twilightFrac < 0.72 ? stages.golden : stages.twilight;
    const statusText =
      whole <= 0
        ? stages.complete
        : this.running
          ? `${stageLabel} · ${stages.pinchPause}`
          : `${stages.paused} · ${stages.pinchResume}`;

    const { ctx, canvas } = this.readoutPanel;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    drawRoundedRect(ctx, 10, 8, w - 20, h - 16, 24);
    ctx.fillStyle = 'rgba(12, 24, 24, 0.72)';
    ctx.fill();

    ctx.font = '600 66px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = whole <= 0 ? '#FFD67A' : this.running ? '#FFFDF7' : '#B4C8FA';
    ctx.fillText(timeStr, w / 2, 74);

    ctx.font = '500 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(245, 248, 244, 0.85)';
    ctx.fillText(statusText, w / 2, 138, w - 50);

    this.readoutPanel.markUpdated();
  }

  public update(delta: number, elapsed: number, hands: HandTracker): void {
    if (!this.group.visible) return;

    this.pinchCooldown = Math.max(0, this.pinchCooldown - delta);

    if (this.running && this.secondsLeft > 0) {
      this.secondsLeft = Math.max(0, this.secondsLeft - delta);
      if (this.secondsLeft <= 0) {
        this.running = false;
        this.audio.playCycleCompleteChord();
      }
      this.redrawReadout();
    }

    const remainingFrac = this.secondsLeft / TOTAL_SECONDS;
    const twilightFrac = 1 - remainingFrac;

    this.env.setTwilight(twilightFrac);
    this.flock.setTwilight(twilightFrac);

    this.progressMat.uniforms.uProgress.value = remainingFrac;
    this.progressMat.uniforms.uTime.value = elapsed;
    this.progressMat.uniforms.uPaused.value = this.running ? 0.0 : 1.0;

    const rotSpeed = this.running ? 1.0 : 0.25;
    this.gimbalRingA.rotation.y += delta * 0.16 * rotSpeed;
    this.gimbalRingA.rotation.z += delta * 0.07 * rotSpeed;
    this.gimbalRingB.rotation.x -= delta * 0.12 * rotSpeed;
    this.gimbalRingB.rotation.y -= delta * 0.1 * rotSpeed;

    this.crystalGroup.position.y = 0.04 + Math.sin(elapsed * 1.3) * 0.012;
    this.crystalGroup.rotation.y += delta * (this.running ? 0.6 : 0.18);
    this.crystalMat.emissive.setHex(this.running ? 0x35b8a4 : 0x6f84bd);
    this.crystalMat.emissiveIntensity = (this.running ? 0.5 : 0.3) + Math.sin(elapsed * 2.0) * 0.1;

    this.crystalGroup.getWorldPosition(_centerWorld);
    if (this.pinchCooldown <= 0) {
      for (const h of [hands.left, hands.right]) {
        if (!h.active) continue;
        const pinchedCenter = h.justPinched && h.pinchMid.distanceTo(_centerWorld) < 0.14;
        const pokedCenter = h.indexTip.distanceTo(_centerWorld) < 0.068;
        if (pinchedCenter || pokedCenter) {
          this.pinchCooldown = 0.65;
          this.togglePause();
          break;
        }
      }
    }
  }

  public dispose(): void {
    this.group.parent?.remove(this.group);
    this.readoutPanel.dispose();
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
