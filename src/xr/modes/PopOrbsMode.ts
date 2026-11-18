import * as THREE from 'three';
import { ZenAudioEngine } from '../../audio/ZenAudioEngine';
import { TRANSLATIONS } from '../../i18n/translations';
import { LanguageCode } from '../../types/zen';
import { ButterflyFlock } from '../ButterflyFlock';
import { DynamicCanvasPanel, drawRoundedRect } from '../CanvasTextHelper';
import { EnvironmentRig } from '../EnvironmentBuilder';
import { HandTracker } from '../HandTracker';

const ORB_ACCENT_COLORS = [
  0xffd166, // Warm Sunlit Gold
  0x4cc9f0, // Soft Sky Cyan
  0xff9ebb, // Pastel Blossom
  0xf8f9fa, // Pearl White
];

interface DewdropOrb {
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  miniButterfly: THREE.Group;
  leftMiniWing: THREE.Mesh;
  rightMiniWing: THREE.Mesh;
  shellMat: THREE.ShaderMaterial;
  velocityZ: number;
  wobblePhase: number;
  baseX: number;
  baseY: number;
  radius: number;
  active: boolean;
  spawnScale: number;
  paletteIndex: number;
}

interface RippleRing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  active: boolean;
}

const MAX_PETAL_PARTICLES = 360;
const MAX_RIPPLES = 6;
const _tmpWorldPos = new THREE.Vector3();
const _tmpLocalPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();

/**
 * Mode 2: Dewdrop Release
 * Translucent iridescent golden orbs carry sleeping miniature butterflies inside.
 * Pinching or clicking an orb bursts soft golden light motes and frees a butterfly.
 */
export class PopOrbsMode {
  public readonly group = new THREE.Group();
  public readonly clickableMeshes: THREE.Mesh[] = [];
  public orbsPopped = 0;

  private readonly orbs: DewdropOrb[] = [];
  private readonly ripples: RippleRing[] = [];
  private readonly counterPanel: DynamicCanvasPanel;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private readonly particleGeo: THREE.BufferGeometry;
  private readonly particleMat: THREE.ShaderMaterial;
  private readonly pPositions: Float32Array;
  private readonly pVelocities: Float32Array;
  private readonly pColors: Float32Array;
  private readonly pLife: Float32Array;
  private readonly pMaxLife: Float32Array;
  private readonly pAlpha: Float32Array;
  private particleCursor = 0;

  private spawnCooldown = 0.35;
  private lastBannerKey = '';
  private language: LanguageCode = 'en';

  constructor(
    parentGroup: THREE.Object3D,
    maxAnisotropy: number,
    private readonly audio: ZenAudioEngine,
    private readonly flock: ButterflyFlock,
    private readonly env: EnvironmentRig
  ) {
    parentGroup.add(this.group);

    this.counterPanel = new DynamicCanvasPanel(720, 118, 0.58, 0.098, maxAnisotropy);
    this.counterPanel.mesh.position.set(0, 1.62, -0.84);
    this.group.add(this.counterPanel.mesh);
    this.redrawCounter();

    const sharedShellGeo = new THREE.SphereGeometry(1, 32, 32);
    const miniWingGeo = new THREE.CircleGeometry(0.28, 12, -Math.PI * 0.45, Math.PI * 0.9);
    this.disposables.push(sharedShellGeo, miniWingGeo);

    for (let i = 0; i < 8; i++) {
      const orbGroup = new THREE.Group();
      orbGroup.visible = false;

      const paletteIdx = i % ORB_ACCENT_COLORS.length;
      const wingHex = ORB_ACCENT_COLORS[paletteIdx];

      const shellMat = new THREE.ShaderMaterial({
        uniforms: {
          uTint: { value: new THREE.Color(wingHex) },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewPos;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uTint;
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vViewPos;

          void main() {
            vec3 N = normalize(vNormal);
            vec3 V = normalize(vViewPos);
            float ndotv = clamp(dot(V, N), 0.0, 1.0);
            float fresnel = pow(1.0 - ndotv, 2.2);

            vec3 L = normalize(vec3(0.4, 0.9, 0.5));
            float spec = pow(max(dot(N, normalize(L + V)), 0.0), 54.0) * 0.95;

            vec3 col = mix(vec3(1.0, 0.92, 0.68), uTint, 0.4 + fresnel * 0.4) + vec3(spec);
            float alpha = clamp(0.14 + fresnel * 0.72 + spec * 0.4, 0.0, 0.90);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
      });

      const shellMesh = new THREE.Mesh(sharedShellGeo, shellMat);

      const miniButterfly = new THREE.Group();
      const miniWingMat = new THREE.MeshBasicMaterial({
        color: wingHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      const leftMiniWing = new THREE.Mesh(miniWingGeo, miniWingMat);
      leftMiniWing.rotation.y = Math.PI * 0.35;
      const rightMiniWing = new THREE.Mesh(miniWingGeo, miniWingMat);
      rightMiniWing.rotation.y = Math.PI - Math.PI * 0.35;
      miniButterfly.add(leftMiniWing, rightMiniWing);
      miniButterfly.rotation.x = 0.35;

      orbGroup.add(shellMesh, miniButterfly);
      this.group.add(orbGroup);
      this.disposables.push(shellMat, miniWingMat);

      const orb: DewdropOrb = {
        group: orbGroup,
        hitMesh: shellMesh,
        miniButterfly,
        leftMiniWing,
        rightMiniWing,
        shellMat,
        velocityZ: 0.1,
        wobblePhase: Math.random() * Math.PI * 2,
        baseX: 0,
        baseY: 1.2,
        radius: 0.075,
        active: false,
        spawnScale: 0,
        paletteIndex: paletteIdx,
      };

      shellMesh.userData.popOrb = () => this.popOrb(orb);
      this.clickableMeshes.push(shellMesh);
      this.orbs.push(orb);
    }

    const shockGeo = new THREE.RingGeometry(0.05, 0.068, 40);
    this.disposables.push(shockGeo);
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe29a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(shockGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.disposables.push(mat);
      this.ripples.push({ mesh, mat, age: 0, maxAge: 0.65, active: false });
    }

    this.pPositions = new Float32Array(MAX_PETAL_PARTICLES * 3);
    this.pVelocities = new Float32Array(MAX_PETAL_PARTICLES * 3);
    this.pColors = new Float32Array(MAX_PETAL_PARTICLES * 3);
    this.pLife = new Float32Array(MAX_PETAL_PARTICLES);
    this.pMaxLife = new Float32Array(MAX_PETAL_PARTICLES);
    this.pAlpha = new Float32Array(MAX_PETAL_PARTICLES);

    for (let i = 0; i < MAX_PETAL_PARTICLES; i++) {
      this.pPositions[i * 3 + 1] = -999;
      this.pLife[i] = 0;
      this.pMaxLife[i] = 1;
      this.pAlpha[i] = 0;
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.pPositions, 3));
    this.particleGeo.setAttribute('aColor', new THREE.BufferAttribute(this.pColors, 3));
    this.particleGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.pAlpha, 1));

    this.particleMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (22.0 + 10.0 * aAlpha) * (1.0 / max(0.35, -mv.z));
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float d = length(p);
          if (d > 0.5 || vAlpha <= 0.005) discard;
          float soft = pow(1.0 - d * 2.0, 1.8);
          gl_FragColor = vec4(vColor, soft * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(this.particleGeo, this.particleMat);
    points.frustumCulled = false;
    this.group.add(points);
    this.disposables.push(this.particleGeo, this.particleMat);
  }

  public setLanguage(lang: LanguageCode): void {
    if (this.language === lang) return;
    this.language = lang;
    this.lastBannerKey = '';
    this.redrawCounter();
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible) {
      this.env.setTwilight(0);
      this.flock.setBehavior('garden');
      const activeCount = this.orbs.filter((b) => b.active).length;
      if (activeCount < 3) {
        for (let i = 0; i < 4; i++) {
          this.spawnOrb(-1.12 + i * 0.14);
        }
      }
    }
  }

  private spawnOrb(initialZ = -1.25): void {
    const slot = this.orbs.find((b) => !b.active);
    if (!slot) return;

    const cIdx = Math.floor(Math.random() * ORB_ACCENT_COLORS.length);
    const hex = ORB_ACCENT_COLORS[cIdx];
    slot.paletteIndex = cIdx;
    slot.shellMat.uniforms.uTint.value.setHex(hex);
    (slot.leftMiniWing.material as THREE.MeshBasicMaterial).color.setHex(hex);

    slot.baseX = THREE.MathUtils.randFloat(-0.38, 0.38);
    slot.baseY = THREE.MathUtils.randFloat(0.98, 1.42);
    slot.radius = THREE.MathUtils.randFloat(0.068, 0.088);
    slot.velocityZ = THREE.MathUtils.randFloat(0.075, 0.125);
    slot.wobblePhase = Math.random() * Math.PI * 2;
    slot.spawnScale = 0.01;
    slot.active = true;

    slot.group.position.set(slot.baseX, slot.baseY, initialZ);
    slot.group.scale.setScalar(0.01);
    slot.group.visible = true;
  }

  public popOrb(orb: DewdropOrb): void {
    if (!orb.active) return;
    orb.active = false;
    orb.group.visible = false;

    this.orbsPopped += 1;
    this.redrawCounter();
    this.audio.playCrystalChime(orb.paletteIndex * 2);

    // Release butterfly in world space
    orb.group.getWorldPosition(_tmpWorldPos);
    this.flock.releaseButterflyAt(_tmpWorldPos, orb.paletteIndex);

    // Local space ripple & golden motes
    _tmpLocalPos.copy(orb.group.position);
    const wave = this.ripples.find((r) => !r.active);
    if (wave) {
      wave.active = true;
      wave.age = 0;
      wave.mesh.visible = true;
      wave.mesh.position.copy(_tmpLocalPos);
      wave.mesh.scale.setScalar(1.0);
      wave.mat.opacity = 0.72;
    }

    const burstPalette = [
      [1.0, 0.85, 0.45],
      [1.0, 0.75, 0.85],
      [0.62, 0.96, 0.9],
      [1.0, 0.97, 0.9],
    ];

    for (let i = 0; i < 64; i++) {
      const idx = this.particleCursor;
      this.particleCursor = (this.particleCursor + 1) % MAX_PETAL_PARTICLES;

      this.pPositions[idx * 3] = _tmpLocalPos.x + (Math.random() - 0.5) * 0.03;
      this.pPositions[idx * 3 + 1] = _tmpLocalPos.y + (Math.random() - 0.5) * 0.03;
      this.pPositions[idx * 3 + 2] = _tmpLocalPos.z + (Math.random() - 0.5) * 0.03;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 0.25 + Math.random() * 0.65;
      this.pVelocities[idx * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      this.pVelocities[idx * 3 + 1] = Math.cos(phi) * speed * 0.5 + 0.25;
      this.pVelocities[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      const col = burstPalette[i % burstPalette.length];
      this.pColors[idx * 3] = col[0];
      this.pColors[idx * 3 + 1] = col[1];
      this.pColors[idx * 3 + 2] = col[2];

      const maxLife = 1.2 + Math.random() * 0.7;
      this.pLife[idx] = maxLife;
      this.pMaxLife[idx] = maxLife;
      this.pAlpha[idx] = 1.0;
    }

    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.aColor.needsUpdate = true;
    this.particleGeo.attributes.aAlpha.needsUpdate = true;
  }

  public setFlowerColors(colors: [string, string]): void {
    const c0 = new THREE.Color(colors[0]);
    const c1 = new THREE.Color(colors[1]);
    for (let i = 0; i < this.orbs.length; i++) {
      this.orbs[i].shellMat.uniforms.uTint.value.copy(i % 2 === 0 ? c0 : c1);
    }
  }

  private redrawCounter(): void {
    const key = `${this.language}-${this.orbsPopped}`;
    if (key === this.lastBannerKey) return;
    this.lastBannerKey = key;

    const { ctx, canvas } = this.counterPanel;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    drawRoundedRect(ctx, 8, 8, w - 16, h - 16, 28);
    ctx.fillStyle = 'rgba(12, 24, 24, 0.72)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 214, 122, 0.5)';
    ctx.stroke();

    const banner = TRANSLATIONS[this.language].dewdropBanner;
    ctx.font = '600 26px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFDF7';
    ctx.fillText(`${banner}: ${this.orbsPopped}`, w / 2, h / 2 + 1, w - 50);

    this.counterPanel.markUpdated();
  }

  public update(delta: number, elapsed: number, hands: HandTracker, camera?: THREE.Camera): void {
    if (!this.group.visible) return;

    if (camera) {
      camera.getWorldPosition(_camPos);
    } else {
      _camPos.set(0, 1.32, 0.0);
    }

    this.spawnCooldown -= delta;
    const activeCount = this.orbs.reduce((acc, b) => acc + (b.active ? 1 : 0), 0);
    if (this.spawnCooldown <= 0 && activeCount < 6) {
      this.spawnOrb(-1.26);
      this.spawnCooldown = 1.15;
    }

    for (const o of this.orbs) {
      if (!o.active) continue;

      o.spawnScale = THREE.MathUtils.damp(o.spawnScale, o.radius, 8, delta);
      o.group.scale.setScalar(o.spawnScale);
      o.shellMat.uniforms.uTime.value = elapsed;

      const sleepFlap = Math.sin(elapsed * 2.4 + o.wobblePhase) * 0.22;
      o.leftMiniWing.rotation.y = Math.PI * 0.35 + sleepFlap;
      o.rightMiniWing.rotation.y = Math.PI - (Math.PI * 0.35 + sleepFlap);
      o.miniButterfly.rotation.y = Math.sin(elapsed * 0.7 + o.wobblePhase) * 0.4;

      o.group.position.z += o.velocityZ * delta;
      o.group.position.x = o.baseX + Math.sin(elapsed * 0.9 + o.wobblePhase) * 0.045;
      o.group.position.y = o.baseY + Math.cos(elapsed * 0.8 + o.wobblePhase) * 0.035;

      if (o.group.position.z > -0.32) {
        o.active = false;
        o.group.visible = false;
        continue;
      }

      o.group.getWorldPosition(_tmpWorldPos);
      let shouldPop = false;
      for (const h of [hands.left, hands.right]) {
        if (!h.active) continue;
        if (h.indexTip.distanceTo(_tmpWorldPos) < o.radius + 0.032) {
          shouldPop = true;
          break;
        }
        if (h.isPinching && h.pinchMid.distanceTo(_tmpWorldPos) < o.radius + 0.075) {
          shouldPop = true;
          break;
        }
      }

      if (shouldPop) {
        this.popOrb(o);
      }
    }

    for (const w of this.ripples) {
      if (!w.active) continue;
      w.age += delta;
      const t = w.age / w.maxAge;
      if (t >= 1) {
        w.active = false;
        w.mesh.visible = false;
        continue;
      }
      w.mesh.lookAt(_camPos);
      const scale = THREE.MathUtils.lerp(1.0, 3.6, 1 - Math.pow(1 - t, 2.5));
      w.mesh.scale.setScalar(scale);
      w.mat.opacity = (1 - t) * (1 - t) * 0.72;
    }

    let anyMoved = false;
    for (let i = 0; i < MAX_PETAL_PARTICLES; i++) {
      if (this.pLife[i] <= 0) continue;
      anyMoved = true;
      this.pLife[i] -= delta;

      if (this.pLife[i] <= 0) {
        this.pPositions[i * 3 + 1] = -999;
        this.pAlpha[i] = 0;
      } else {
        const lifeFrac = this.pLife[i] / this.pMaxLife[i];
        this.pPositions[i * 3] +=
          (this.pVelocities[i * 3] + Math.sin(elapsed * 3.0 + i) * 0.08) * delta;
        this.pPositions[i * 3 + 1] += this.pVelocities[i * 3 + 1] * delta;
        this.pPositions[i * 3 + 2] += this.pVelocities[i * 3 + 2] * delta;

        this.pVelocities[i * 3] *= 0.96;
        this.pVelocities[i * 3 + 1] = this.pVelocities[i * 3 + 1] * 0.965 - 0.08 * delta;
        this.pVelocities[i * 3 + 2] *= 0.96;

        this.pAlpha[i] = Math.pow(lifeFrac, 1.3);
      }
    }
    if (anyMoved) {
      this.particleGeo.attributes.position.needsUpdate = true;
      this.particleGeo.attributes.aAlpha.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.group.parent?.remove(this.group);
    this.counterPanel.dispose();
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
