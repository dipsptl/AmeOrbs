import * as THREE from 'three';
import { ButterflyConfig } from '../types/zen';
import { HandTracker } from './HandTracker';

export type FlockBehavior = 'garden' | 'halo' | 'breeze' | 'spiral' | 'horizon_gaze';

interface ButterflyAgent {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  target: THREE.Vector3;
  seed: number;
  orbitRadius: number;
  orbitSpeed: number;
  heightBase: number;
  flapSpeed: number;
  scale: number;
  paletteIndex: number;
  burstBoost: number;
  wingPhaseOffset: number;
}

const MAX_BUTTERFLIES = 18;

const _dummy = new THREE.Object3D();
const _lookTarget = new THREE.Vector3();
const _toHand = new THREE.Vector3();
const _targetPrimary = new THREE.Color(0xffd166);
const _targetSecondary = new THREE.Color(0x4cc9f0);

/**
 * Creates a high-resolution (1024x1024) grayscale/luminance-friendly butterfly wing pattern atlas
 * so dynamic primary & secondary world colors can tint wings cleanly while preserving dark veins & borders.
 */
function createWingPatternAtlas(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const patterns = [
    { inner: '#fff7d6', mid: '#e8e8e8', outer: '#c9c9c9', edge: '#1e1612', spot: '#ffffff' },
    { inner: '#ffffff', mid: '#dcdcdc', outer: '#b5b5b5', edge: '#141b24', spot: '#ffffff' },
    { inner: '#fff0f5', mid: '#e6d7dc', outer: '#c4b0b8', edge: '#2e1622', spot: '#ffffff' },
    { inner: '#ffffff', mid: '#edf5ef', outer: '#cdded3', edge: '#33423b', spot: '#ffffff' },
  ];

  patterns.forEach((p, idx) => {
    const ox = (idx % 2) * half;
    const oy = Math.floor(idx / 2) * half;

    ctx.save();
    ctx.translate(ox, oy);

    const grad = ctx.createRadialGradient(
      half * 0.08,
      half * 0.48,
      12,
      half * 0.48,
      half * 0.5,
      half * 0.92
    );
    grad.addColorStop(0.0, p.inner);
    grad.addColorStop(0.45, p.mid);
    grad.addColorStop(0.84, p.outer);
    grad.addColorStop(0.95, p.edge);
    grad.addColorStop(1.0, p.edge);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, half, half);

    // Organic wing veins
    ctx.strokeStyle = p.edge;
    ctx.lineCap = 'round';
    for (let v = 0; v < 9; v++) {
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = v % 2 === 0 ? 4.5 : 2.8;
      ctx.beginPath();
      ctx.moveTo(0, half * 0.48);
      const angle = -1.02 + v * 0.255;
      ctx.bezierCurveTo(
        half * 0.32,
        half * 0.48 + Math.sin(angle) * half * 0.16,
        half * 0.65,
        half * 0.48 + Math.sin(angle) * half * 0.34,
        half * 0.96,
        half * 0.48 + Math.sin(angle) * half * 0.48
      );
      ctx.stroke();
    }

    // Marginal bright spots
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = p.spot;
    for (let s = 0; s < 8; s++) {
      const t = s / 7;
      const sy = half * (0.12 + t * 0.76);
      const sx = half * (0.91 - Math.abs(t - 0.5) * 0.08);
      const r = 5.5 + (1 - Math.abs(t - 0.5)) * 3.5;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 0.75, r, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createButterflyWingGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const addSide = (sign: number) => {
    const baseVertex = positions.length / 3;
    const contour: Array<[number, number, number, number]> = [
      [0.0, 0.016, 0.02, 0.48],
      [0.0, -0.024, 0.02, 0.54],
      [0.024, 0.044, 0.36, 0.12],
      [0.056, 0.058, 0.84, 0.06],
      [0.074, 0.036, 0.96, 0.22],
      [0.062, 0.008, 0.88, 0.42],
      [0.04, -0.004, 0.58, 0.52],
      [0.056, -0.022, 0.86, 0.68],
      [0.044, -0.048, 0.72, 0.88],
      [0.024, -0.058, 0.42, 0.94],
      [0.01, -0.042, 0.18, 0.84],
    ];

    for (const [x, z, u, v] of contour) {
      const y = x * 0.07;
      positions.push(x * sign, y, z);
      uvs.push(u, v);
    }

    const tris = [
      [0, 2, 3],
      [0, 3, 4],
      [0, 4, 5],
      [0, 5, 6],
      [0, 6, 1],
      [1, 6, 7],
      [1, 7, 8],
      [1, 8, 9],
      [1, 9, 10],
    ];
    for (const [a, b, c] of tris) {
      if (sign > 0) {
        indices.push(baseVertex + a, baseVertex + b, baseVertex + c);
      } else {
        indices.push(baseVertex + a, baseVertex + c, baseVertex + b);
      }
    }
  };

  addSide(1);
  addSide(-1);

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createButterflyBodyGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, -0.028),
    new THREE.Vector2(0.0022, -0.02),
    new THREE.Vector2(0.0032, -0.008),
    new THREE.Vector2(0.0024, 0.002),
    new THREE.Vector2(0.0042, 0.01),
    new THREE.Vector2(0.0038, 0.017),
    new THREE.Vector2(0.0028, 0.023),
    new THREE.Vector2(0.0, 0.026),
  ];
  const geo = new THREE.LatheGeometry(pts, 12);
  geo.rotateX(Math.PI / 2);
  return geo;
}

/**
 * Dynamic parametric butterfly flock supporting live count, colors, flightSpeed,
 * and a dedicated glowing Golden Horizon Guide butterfly for Horizon Neck Gaze.
 */
export class ButterflyFlock {
  public readonly group = new THREE.Group();

  private readonly agents: ButterflyAgent[] = [];
  private readonly wingMesh: THREE.InstancedMesh;
  private readonly bodyMesh: THREE.InstancedMesh;
  private readonly wingMat: THREE.ShaderMaterial;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  private readonly aPaletteAttr: THREE.InstancedBufferAttribute;

  private behavior: FlockBehavior = 'garden';
  private twilight = 0;
  private spawnCursor = 0;
  private activeCount = 5;
  private flightSpeedMultiplier = 0.85;
  private horizonGazeActive = false;
  private landingBoost = false;

  constructor(scene: THREE.Scene, maxAnisotropy: number) {
    scene.add(this.group);

    const wingGeo = createButterflyWingGeometry();
    const atlasTex = createWingPatternAtlas(maxAnisotropy);

    const phases = new Float32Array(MAX_BUTTERFLIES);
    const palettes = new Float32Array(MAX_BUTTERFLIES);
    const flapSpeeds = new Float32Array(MAX_BUTTERFLIES);

    for (let i = 0; i < MAX_BUTTERFLIES; i++) {
      const angle = (i / MAX_BUTTERFLIES) * Math.PI * 2 + (i % 3) * 0.25;
      const radius = 1.45 + (i % 5) * 0.58;
      const height = 0.88 + (i % 5) * 0.34;
      const speed = (i % 2 === 0 ? 1 : -1) * (0.24 + (i % 5) * 0.055);
      const flap = 6.8 + (i % 4) * 0.85;

      this.agents.push({
        pos: new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius),
        vel: new THREE.Vector3(Math.sin(angle) * 0.14, 0.03, -Math.cos(angle) * 0.14),
        target: new THREE.Vector3(),
        seed: i * 2.17 + 0.6,
        orbitRadius: radius,
        orbitSpeed: speed,
        heightBase: height,
        flapSpeed: flap,
        scale: i === 0 ? 1.72 : 1.38 + (i % 4) * 0.22,
        paletteIndex: i % 4,
        burstBoost: 0,
        wingPhaseOffset: i * 1.4,
      });

      phases[i] = this.agents[i].wingPhaseOffset;
      palettes[i] = i % 4;
      flapSpeeds[i] = flap;
    }

    const aPhaseAttr = new THREE.InstancedBufferAttribute(phases, 1);
    this.aPaletteAttr = new THREE.InstancedBufferAttribute(palettes, 1);
    const aFlapSpeedAttr = new THREE.InstancedBufferAttribute(flapSpeeds, 1);

    wingGeo.setAttribute('aPhase', aPhaseAttr);
    wingGeo.setAttribute('aPalette', this.aPaletteAttr);
    wingGeo.setAttribute('aFlapSpeed', aFlapSpeedAttr);

    this.wingMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: atlasTex },
        uTwilight: { value: 0 },
        uPrimaryColor: { value: new THREE.Color(0xffd166) },
        uSecondaryColor: { value: new THREE.Color(0x4cc9f0) },
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aPalette;
        attribute float aFlapSpeed;

        uniform float uTime;

        varying vec2 vUv;
        varying float vPalette;
        varying float vFlap;

        void main() {
          vUv = uv;
          vPalette = aPalette;

          vec3 pos = position;
          float side = sign(pos.x);
          float distFromSpine = abs(pos.x);

          float cycle = uTime * 1.15 + aPhase;
          float glideEnv = smoothstep(-0.35, 0.35, sin(cycle));
          float rawAngle = uTime * aFlapSpeed + aPhase;
          float activeFlap = sin(rawAngle) * 0.88 + 0.14 * sin(rawAngle * 2.0);
          float flap = mix(0.28, activeFlap, 0.35 + 0.65 * glideEnv);
          vFlap = flap;

          if (distFromSpine > 0.002) {
            float flex = flap - distFromSpine * 1.65 * cos(rawAngle) * (0.35 + 0.65 * glideEnv);
            float c = cos(flex);
            float s = sin(flex);
            float rx = distFromSpine * c;
            float ry = distFromSpine * s;
            pos.x = side * rx;
            pos.y += ry;
          }

          vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTwilight;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;

        varying vec2 vUv;
        varying float vPalette;
        varying float vFlap;

        void main() {
          float idx = floor(vPalette + 0.5);
          float qx = mod(idx, 2.0) * 0.5;
          float qy = (1.0 - floor(idx / 2.0)) * 0.5;
          vec2 atlasUv = vec2(qx + vUv.x * 0.5, qy + vUv.y * 0.5);

          vec4 texCol = texture2D(uMap, atlasUv);
          vec3 tint = mix(uPrimaryColor, uSecondaryColor, mod(idx, 2.0));

          // Preserve dark wing margins & veins while tinting wing scales richly
          float lum = dot(texCol.rgb, vec3(0.299, 0.587, 0.114));
          vec3 tinted = mix(texCol.rgb, texCol.rgb * tint * 1.25, smoothstep(0.18, 0.72, lum));

          float iridShift = 0.06 * sin(vFlap * 2.2 + vUv.x * 4.0);
          vec3 col = tinted * (1.0 + uTwilight * 0.42 + abs(iridShift));

          gl_FragColor = vec4(col, 0.92);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    this.wingMesh = new THREE.InstancedMesh(wingGeo, this.wingMat, MAX_BUTTERFLIES);
    this.wingMesh.count = this.activeCount;
    this.wingMesh.frustumCulled = false;
    this.group.add(this.wingMesh);

    const bodyGeo = createButterflyBodyGeometry();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x241a14,
      roughness: 0.62,
      metalness: 0.08,
    });
    this.bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, MAX_BUTTERFLIES);
    this.bodyMesh.count = this.activeCount;
    this.bodyMesh.frustumCulled = false;
    this.group.add(this.bodyMesh);

    this.disposables.push(wingGeo, atlasTex, this.wingMat, bodyGeo, bodyMat);
  }

  public applyConfig(config: ButterflyConfig): void {
    this.activeCount = THREE.MathUtils.clamp(Math.round(config.count), 1, MAX_BUTTERFLIES);
    const visibleCount = this.landingBoost ? Math.max(this.activeCount, 14) : this.activeCount;
    this.wingMesh.count = visibleCount;
    this.bodyMesh.count = visibleCount;
    this.flightSpeedMultiplier = THREE.MathUtils.clamp(config.flightSpeed, 0.4, 1.8);
    _targetPrimary.set(config.primaryColor);
    _targetSecondary.set(config.secondaryColor);
  }

  public setLandingBoost(active: boolean): void {
    this.landingBoost = active;
    const visibleCount = active ? Math.max(this.activeCount, 14) : this.activeCount;
    this.wingMesh.count = visibleCount;
    this.bodyMesh.count = visibleCount;
  }

  public setHorizonGazeMode(active: boolean): void {
    this.horizonGazeActive = active;
  }

  public setBehavior(behavior: FlockBehavior): void {
    this.behavior = behavior;
  }

  public setTwilight(t: number): void {
    this.twilight = THREE.MathUtils.clamp(t, 0, 1);
    this.wingMat.uniforms.uTwilight.value = this.twilight;
  }

  public releaseButterflyAt(origin: THREE.Vector3, preferredPalette?: number): void {
    const count = Math.max(1, this.activeCount);
    const idx = this.spawnCursor % count;
    this.spawnCursor = (this.spawnCursor + 1) % count;

    const a = this.agents[idx];
    a.pos.copy(origin);
    a.vel.set(
      THREE.MathUtils.randFloat(-0.22, 0.22),
      THREE.MathUtils.randFloat(0.24, 0.42),
      THREE.MathUtils.randFloat(-0.18, 0.18)
    );
    a.burstBoost = 2.0;
    if (preferredPalette !== undefined) {
      a.paletteIndex = preferredPalette % 4;
      this.aPaletteAttr.setX(idx, a.paletteIndex);
      this.aPaletteAttr.needsUpdate = true;
    }
  }

  public update(delta: number, elapsed: number, hands: HandTracker, foregroundYaw = 0): void {
    this.wingMat.uniforms.uTime.value = elapsed;
    (this.wingMat.uniforms.uPrimaryColor.value as THREE.Color).lerp(
      _targetPrimary,
      1 - Math.exp(-3.0 * delta)
    );
    (this.wingMat.uniforms.uSecondaryColor.value as THREE.Color).lerp(
      _targetSecondary,
      1 - Math.exp(-3.0 * delta)
    );

    const hasRightHand = hands.right.active;
    const hasLeftHand = hands.left.active;
    const cosY = Math.cos(foregroundYaw);
    const sinY = Math.sin(foregroundYaw);

    const visibleCount = this.landingBoost ? Math.max(this.activeCount, 14) : this.activeCount;

    for (let i = 0; i < visibleCount; i++) {
      const a = this.agents[i];
      a.burstBoost = Math.max(0, a.burstBoost - delta);

      const t = elapsed * a.orbitSpeed * this.flightSpeedMultiplier + a.seed;

      if (this.landingBoost) {
        // Organic free-roaming 360° world-space flight across the entire valley & sky (NOT locked to camera)
        const baseAzimuth = (i / visibleCount) * Math.PI * 2;
        const roamAngle = baseAzimuth + t * 0.55 + Math.sin(t * 0.65 + a.seed) * 0.85;
        const r = a.orbitRadius + Math.sin(elapsed * 0.48 + a.seed * 1.3) * 0.72;
        const y =
          a.heightBase +
          Math.sin(elapsed * 0.85 + a.seed) * 0.42 +
          Math.cos(elapsed * 1.45 + a.seed * 0.7) * 0.18;
        a.target.set(
          Math.cos(roamAngle) * r,
          THREE.MathUtils.clamp(y, 0.72, 2.75),
          Math.sin(roamAngle) * r
        );
      } else if (this.horizonGazeActive && i === 0) {
        // Dedicated slow Golden Horizon Guide Butterfly sweeping gracefully across the user's current view
        const gazeAngle = elapsed * 0.42;
        const lx = Math.sin(gazeAngle) * 1.45;
        const lz = -1.75 + Math.cos(gazeAngle) * 0.26;
        a.target.set(
          lx * cosY + lz * sinY,
          1.3 + Math.sin(gazeAngle * 2.0) * 0.12,
          -lx * sinY + lz * cosY
        );
      } else if (this.behavior === 'spiral') {
        const spiralR = 0.65 + (i / Math.max(1, visibleCount)) * 0.9;
        const spiralA = elapsed * 0.34 * this.flightSpeedMultiplier + i * 1.25;
        const spiralY = 0.85 + Math.sin(elapsed * 0.45 + i * 1.6) * 0.32;
        a.target.set(Math.cos(spiralA) * spiralR, spiralY, Math.sin(spiralA) * spiralR - 0.88);
      } else if (this.behavior === 'halo') {
        const haloA = (i / Math.max(1, visibleCount)) * Math.PI * 2 + elapsed * 0.24;
        const haloR = 0.52 + (i % 3) * 0.14;
        const lx = Math.cos(haloA) * haloR;
        const lz = Math.sin(haloA) * haloR - 0.84;
        a.target.set(
          lx * cosY + lz * sinY,
          1.18 + Math.sin(elapsed * 1.2 + a.seed) * 0.1,
          -lx * sinY + lz * cosY
        );
      } else if (this.behavior === 'breeze') {
        const breezeA = t * 0.85;
        a.target.set(
          Math.cos(breezeA) * (a.orbitRadius + 0.42),
          a.heightBase + 0.16 + Math.sin(elapsed * 1.3 + a.seed) * 0.14,
          Math.sin(breezeA) * (a.orbitRadius + 0.42) - 0.35
        );
      } else {
        const curveX = Math.cos(t) * a.orbitRadius + Math.sin(t * 1.9 + a.seed) * 0.44;
        const curveZ = Math.sin(t) * a.orbitRadius + Math.cos(t * 1.5) * 0.38;
        const curveY = a.heightBase + Math.sin(elapsed * 1.35 + a.seed) * 0.28;
        a.target.set(curveX, curveY, curveZ);

        if (i === 0 && (hasRightHand || hasLeftHand)) {
          const handPos = hasRightHand ? hands.right.palmPos : hands.left.palmPos;
          if (handPos.lengthSq() > 0.01) {
            _toHand.copy(handPos);
            _toHand.y += 0.14 + Math.sin(elapsed * 2.0) * 0.04;
            _toHand.x += Math.cos(elapsed * 1.3) * 0.12;
            _toHand.z += Math.sin(elapsed * 1.3) * 0.12;
            a.target.lerp(_toHand, 0.55);
          }
        }
      }

      if (a.burstBoost > 1.35) {
        a.pos.addScaledVector(a.vel, delta);
        a.vel.y += 0.08 * delta;
      } else {
        const steerRate =
          this.landingBoost
            ? 1.65
            : this.horizonGazeActive && i === 0
              ? 2.2
              : this.behavior === 'halo'
                ? 1.5
                : 1.8;
        _lookTarget.copy(a.target).sub(a.pos);
        a.vel.lerp(_lookTarget.multiplyScalar(steerRate), 1 - Math.exp(-2.6 * delta));
        a.pos.addScaledVector(a.vel, delta);
      }

      a.pos.y = Math.max(0.28, a.pos.y);

      _dummy.position.copy(a.pos);
      if (a.vel.lengthSq() > 0.0002) {
        _lookTarget.copy(a.pos).add(a.vel);
        _dummy.lookAt(_lookTarget);
      }
      const gazeBoostScale = this.horizonGazeActive && i === 0 ? 1.55 : 1.0;
      const landingScaleBoost = this.landingBoost ? 1.38 : 1.0;
      _dummy.scale.setScalar(a.scale * gazeBoostScale * landingScaleBoost);
      _dummy.updateMatrix();

      this.wingMesh.setMatrixAt(i, _dummy.matrix);
      this.bodyMesh.setMatrixAt(i, _dummy.matrix);
    }

    this.wingMesh.instanceMatrix.needsUpdate = true;
    this.bodyMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.group.parent?.remove(this.group);
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
