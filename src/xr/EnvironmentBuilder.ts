import * as THREE from 'three';
import { EnvironmentConfig } from '../types/zen';
import { WORLD_PRESETS } from '../world/WorldPresets';

export interface EnvironmentRig {
  group: THREE.Group;
  applyEnvironmentConfig: (config: EnvironmentConfig) => void;
  setTwilight: (t: number) => void;
  setSkyVisible: (visible: boolean) => void;
  triggerBreeze: (strength?: number) => void;
  onLoadingChange?: (loading: boolean) => void;
  update: (delta: number, elapsed: number, camera?: THREE.Camera) => void;
  dispose: () => void;
}

const MAX_MOTES = 85;
const _white = new THREE.Color(0xffffff);
const _twilightTint = new THREE.Color(0x7c88b8);
const _curTint = new THREE.Color(0xffffff);
const _moteTargetTint = new THREE.Color(0xffd166);

export function buildZenEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  _isSoftwareGl: boolean
): EnvironmentRig {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  let twilight = 0;
  let breezeBoost = 0;
  let currentUrl = '';
  let loadRequestId = 0;
  let transitionProgress = 1;
  let activeEnvTex: THREE.Texture | null = null;

  // 1. Clean 360° Equirectangular Panorama Spheres (Back + Crossfade Front)
  // Inverted sphere: SphereGeometry(50, 64, 40) with scale(-1, 1, 1)
  const backGeo = new THREE.SphereGeometry(50, 64, 40);
  backGeo.scale(-1, 1, 1);

  const frontGeo = new THREE.SphereGeometry(49.4, 64, 40);
  frontGeo.scale(-1, 1, 1);

  const backMat = new THREE.MeshBasicMaterial({
    color: 0x162926,
    toneMapped: false,
    fog: false,
  });

  const frontMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });

  const backSphere = new THREE.Mesh(backGeo, backMat);
  backSphere.renderOrder = -10;
  const frontSphere = new THREE.Mesh(frontGeo, frontMat);
  frontSphere.renderOrder = -9;
  frontSphere.visible = false;

  // Seamless 360° Mirrored Live Video Dome (for flat 16:9 river video mapped cleanly across 360° without ground/seams)
  let skyVisible = true;
  let videoModeActive = false;
  let activeVideoEl: HTMLVideoElement | null = null;
  let activeVideoTex: THREE.VideoTexture | null = null;

  const videoGeo = new THREE.SphereGeometry(49.7, 72, 48);
  videoGeo.scale(-1, 1, 1);

  const videoMat = new THREE.ShaderMaterial({
    uniforms: {
      uVideoMap: { value: null },
      uTime: { value: 0 },
      uTwilight: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uVideoMap;
      uniform float uTime;
      uniform float uTwilight;
      varying vec2 vUv;

      void main() {
        // Seamless 2x palindrome mirror wrap centered at front (-Z, vUv.x = 0.75)
        float t = fract(vUv.x - 0.5);
        float videoU = 1.0 - abs(t * 2.0 - 1.0);
        videoU = clamp(videoU, 0.002, 0.998);

        // Preserve natural 16:9 vertical proportions (101 deg vertical span inside 180 deg sphere)
        float rawV = (vUv.y - 0.21) / 0.56;
        float videoV = clamp(rawV, 0.004, 0.996);

        vec3 col = texture2D(uVideoMap, vec2(videoU, videoV)).rgb;

        // Soft seamless blend into upper alpine zenith blue sky (zero sky pole pinch)
        float topEdge = smoothstep(0.72, 0.96, vUv.y);
        vec3 zenithSky = mix(vec3(0.32, 0.58, 0.86), vec3(0.46, 0.72, 0.95), smoothstep(0.75, 1.0, vUv.y));
        col = mix(col, zenithSky, topEdge);

        // Soft seamless blend into lower shimmering turquoise glacial river water (zero ground/dirt)
        float botEdge = 1.0 - smoothstep(0.03, 0.25, vUv.y);
        float ripple = sin(vUv.x * 62.0 + uTime * 1.4) * 0.5 + cos(vUv.y * 95.0 - uTime * 2.1) * 0.5;
        vec3 deepWater = vec3(0.04, 0.34, 0.43) + vec3(0.03, 0.11, 0.12) * ripple;
        col = mix(col, deepWater, botEdge);

        // Gentle twilight dimming when 5m Focus progresses
        vec3 twilightTint = vec3(0.48, 0.53, 0.72);
        col *= mix(vec3(1.0), twilightTint, uTwilight * 0.5);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.FrontSide,
    depthWrite: true,
    fog: false,
  });

  const videoSphere = new THREE.Mesh(videoGeo, videoMat);
  videoSphere.renderOrder = -10;
  videoSphere.visible = false;

  group.add(backSphere, frontSphere, videoSphere);
  disposables.push(backGeo, frontGeo, backMat, frontMat, videoGeo, videoMat);

  // Clear any legacy fog or flat background so 360° world shines crisply
  scene.fog = null;
  scene.background = new THREE.Color(0x0b1718);

  // 2. Soft Natural Lighting for Foreground Butterflies & Golden Orbs
  const hemiLight = new THREE.HemisphereLight(0xfff5e0, 0x3b4f45, 1.15);
  const keyLight = new THREE.DirectionalLight(0xfff1d4, 1.55);
  keyLight.position.set(3.5, 5.5, -4.5);
  const rimLight = new THREE.DirectionalLight(0x9ce8dc, 0.55);
  rimLight.position.set(-4.0, 2.2, 3.5);
  group.add(hemiLight, keyLight, rimLight);

  // 3. Delicate Foreground Golden Light Motes Floating Over the 360° Photography
  const motePos = new Float32Array(MAX_MOTES * 3);
  const moteSeeds = new Float32Array(MAX_MOTES);
  const moteRadii = new Float32Array(MAX_MOTES);

  for (let i = 0; i < MAX_MOTES; i++) {
    const angle = (i / MAX_MOTES) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 1.05 + Math.random() * 2.6;
    motePos[i * 3] = Math.cos(angle) * dist;
    motePos[i * 3 + 1] = 0.68 + Math.random() * 1.45;
    motePos[i * 3 + 2] = Math.sin(angle) * dist;
    moteSeeds[i] = Math.random() * Math.PI * 2;
    moteRadii[i] = 0.65 + Math.random() * 0.75;
  }

  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(moteSeeds, 1));
  moteGeo.setAttribute('aRadius', new THREE.BufferAttribute(moteRadii, 1));

  const moteMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffd166) },
      uTwilight: { value: 0 },
    },
    vertexShader: `
      attribute float aSeed;
      attribute float aRadius;
      uniform float uTime;
      varying float vPulse;

      void main() {
        vPulse = 0.45 + 0.55 * sin(uTime * 1.4 + aSeed * 3.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (18.0 * aRadius) * (1.0 / max(0.55, -mv.z));
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTwilight;
      varying float vPulse;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float glow = pow(1.0 - d * 2.0, 2.2);
        vec3 col = mix(uColor, vec3(1.0, 0.88, 0.52), 0.35 + uTwilight * 0.25);
        gl_FragColor = vec4(col, glow * vPulse * (0.62 + uTwilight * 0.25));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const motePoints = new THREE.Points(moteGeo, moteMat);
  motePoints.frustumCulled = false;
  group.add(motePoints);
  disposables.push(moteGeo, moteMat);

  // 4. CORS-Enabled TextureLoader + Cache for Poly Haven 360° Equirectangular JPGs
  const textureCache = new Map<string, THREE.Texture>();
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const applyLoadedTexture = (tex: THREE.Texture) => {
    // Update PBR reflection environment map from real-world 360° photo
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const envTarget = pmrem.fromEquirectangular(tex);
    tex.mapping = THREE.UVMapping;

    if (activeEnvTex) {
      activeEnvTex.dispose();
    }
    activeEnvTex = envTarget.texture;
    scene.environment = activeEnvTex;
    scene.environmentIntensity = 0.85;

    if (!backMat.map) {
      backMat.map = tex;
      backMat.color.setHex(0xffffff);
      backMat.needsUpdate = true;
      frontMat.opacity = 0;
      frontSphere.visible = false;
      transitionProgress = 1;
    } else if (backMat.map !== tex) {
      frontMat.map = tex;
      frontMat.opacity = 0;
      frontMat.needsUpdate = true;
      frontSphere.visible = true;
      transitionProgress = 0;
    }
  };

  const buildFallbackAlpineEnvMap = () => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.0, '#5a96e3');
    g.addColorStop(0.45, '#b6dcf8');
    g.addColorStop(0.62, '#2d7c72');
    g.addColorStop(1.0, '#0a3a47');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    const canvasTex = new THREE.CanvasTexture(c);
    canvasTex.colorSpace = THREE.SRGBColorSpace;
    canvasTex.mapping = THREE.EquirectangularReflectionMapping;
    const envTarget = pmrem.fromEquirectangular(canvasTex);
    canvasTex.dispose();
    if (activeEnvTex) {
      activeEnvTex.dispose();
    }
    activeEnvTex = envTarget.texture;
    scene.environment = activeEnvTex;
    scene.environmentIntensity = 0.85;
  };

  const cleanupVideo = () => {
    if (activeVideoEl) {
      activeVideoEl.pause();
      activeVideoEl.removeAttribute('src');
      activeVideoEl.load();
      activeVideoEl = null;
    }
    if (activeVideoTex) {
      activeVideoTex.dispose();
      activeVideoTex = null;
    }
    videoMat.uniforms.uVideoMap.value = null;
  };

  const rig: EnvironmentRig = {
    group,
    applyEnvironmentConfig(config: EnvironmentConfig) {
      _moteTargetTint.set(config.orbColors[0] || config.tintColor || '#ffd166');
      const url = config.panoramaUrl;
      if (!url || url === currentUrl) return;
      currentUrl = url;

      const reqId = ++loadRequestId;

      if (/\.mp4($|\?)/i.test(url)) {
        cleanupVideo();
        videoModeActive = true;
        backSphere.visible = false;
        frontSphere.visible = false;
        buildFallbackAlpineEnvMap();
        rig.onLoadingChange?.(true);

        const vid = document.createElement('video');
        vid.src = url;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'auto';
        vid.crossOrigin = 'anonymous';
        activeVideoEl = vid;

        const vidTex = new THREE.VideoTexture(vid);
        vidTex.colorSpace = THREE.SRGBColorSpace;
        vidTex.minFilter = THREE.LinearFilter;
        vidTex.magFilter = THREE.LinearFilter;
        vidTex.generateMipmaps = false;
        activeVideoTex = vidTex;

        videoMat.uniforms.uVideoMap.value = vidTex;
        videoSphere.visible = skyVisible;

        const onReady = () => {
          if (reqId !== loadRequestId) return;
          rig.onLoadingChange?.(false);
          void vid.play().catch(() => {});
        };
        vid.addEventListener('loadeddata', onReady, { once: true });
        vid.addEventListener(
          'error',
          () => {
            if (reqId === loadRequestId) rig.onLoadingChange?.(false);
          },
          { once: true }
        );
        void vid.play().catch(() => {});
        return;
      }

      // 360° Photo Panorama Mode
      videoModeActive = false;
      videoSphere.visible = false;
      cleanupVideo();
      backSphere.visible = skyVisible;

      const cached = textureCache.get(url);
      if (cached) {
        rig.onLoadingChange?.(false);
        applyLoadedTexture(cached);
        return;
      }

      rig.onLoadingChange?.(true);

      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAniso;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.needsUpdate = true;
          textureCache.set(url, tex);

          if (reqId === loadRequestId) {
            rig.onLoadingChange?.(false);
            applyLoadedTexture(tex);
          }
        },
        undefined,
        () => {
          if (reqId === loadRequestId) {
            rig.onLoadingChange?.(false);
          }
        }
      );
    },
    setTwilight(t: number) {
      twilight = THREE.MathUtils.clamp(t, 0, 1);
      moteMat.uniforms.uTwilight.value = twilight;
      videoMat.uniforms.uTwilight.value = twilight;
    },
    setSkyVisible(visible: boolean) {
      skyVisible = visible;
      if (videoModeActive) {
        videoSphere.visible = visible;
        backSphere.visible = false;
        frontSphere.visible = false;
      } else {
        videoSphere.visible = false;
        backSphere.visible = visible;
        frontSphere.visible = visible && transitionProgress < 1 && frontMat.opacity > 0.001;
      }
    },
    triggerBreeze(strength = 1.0) {
      breezeBoost = Math.min(2.0, breezeBoost + strength * 0.75);
    },
    update(delta: number, elapsed: number) {
      breezeBoost = Math.max(0, breezeBoost - delta * 0.55);
      videoMat.uniforms.uTime.value = elapsed;

      if (videoModeActive && activeVideoEl && activeVideoEl.paused && activeVideoEl.readyState >= 2) {
        void activeVideoEl.play().catch(() => {});
      }

      // Smooth crossfade between 360° panoramas
      if (!videoModeActive && transitionProgress < 1 && frontSphere.visible) {
        transitionProgress = Math.min(1, transitionProgress + delta * 1.45);
        const eased = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
        frontMat.opacity = eased;

        if (transitionProgress >= 1) {
          backMat.map = frontMat.map;
          backMat.color.copy(_curTint);
          backMat.needsUpdate = true;
          frontMat.map = null;
          frontMat.opacity = 0;
          frontSphere.visible = false;
        }
      }

      // Subtle twilight darkening for 5m Focus mode
      if (!videoModeActive && backMat.map) {
        _curTint.copy(_white).lerp(_twilightTint, twilight * 0.5);
        backMat.color.copy(_curTint);
        frontMat.color.copy(_curTint);
      }

      // Animate delicate golden glowing light motes floating in foreground
      moteMat.uniforms.uTime.value = elapsed;
      (moteMat.uniforms.uColor.value as THREE.Color).lerp(
        _moteTargetTint,
        1 - Math.exp(-3.0 * delta)
      );

      const posAttr = moteGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < MAX_MOTES; i++) {
        const seed = moteSeeds[i];
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        const swirl = (0.045 + breezeBoost * 0.14) * delta;
        const nx = x * Math.cos(swirl) - z * Math.sin(swirl);
        const nz = x * Math.sin(swirl) + z * Math.cos(swirl);
        x = nx + Math.sin(elapsed * 0.45 + seed) * 0.015 * delta;
        z = nz + Math.cos(elapsed * 0.4 + seed) * 0.015 * delta;
        y += (0.032 + Math.sin(elapsed * 0.8 + seed) * 0.025) * delta;

        if (y > 2.25) y = 0.65;
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    },
    dispose() {
      loadRequestId++;
      cleanupVideo();
      group.parent?.remove(group);
      pmrem.dispose();
      if (activeEnvTex) {
        activeEnvTex.dispose();
        activeEnvTex = null;
      }
      textureCache.forEach((tex) => tex.dispose());
      textureCache.clear();
      for (const d of disposables) {
        d.dispose();
      }
    },
  };

  scene.add(group);
  // Immediately start loading the default Kyoto 360° panorama
  rig.applyEnvironmentConfig(WORLD_PRESETS[0].environmentConfig);

  return rig;
}
