import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ZenAudioEngine } from '../audio/ZenAudioEngine';
import { TRANSLATIONS } from '../i18n/translations';
import {
  BreathPhase,
  EnvironmentConfig,
  GuidedExerciseId,
  LanguageCode,
  SoundscapeType,
  ZenMode,
  ZenSnapshot,
} from '../types/zen';
import { speakCalmVoice, stopCalmVoice } from '../world/AuraGuideClient';
import { EXERCISE_MAP, WORLD_PRESETS } from '../world/WorldPresets';
import { ButterflyFlock } from './ButterflyFlock';
import { buildZenEnvironment, EnvironmentRig } from './EnvironmentBuilder';
import { HandTracker } from './HandTracker';
import { SpatialMenus } from './SpatialMenus';
import { BreatheMode } from './modes/BreatheMode';
import { FocusTimerMode } from './modes/FocusTimerMode';
import { PopOrbsMode } from './modes/PopOrbsMode';

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function shortestAngleDiff(current: number, target: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

const _rayMouse = new THREE.Vector2();
const _planeHit = new THREE.Vector3();
const _interactPlane = new THREE.Plane();
const _camForward = new THREE.Vector3();
const _planePoint = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _prevTarget = new THREE.Vector3(0, 1.32, 0);

export class ZenOrbsEngine {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly audio: ZenAudioEngine;

  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer | null = null;
  private readonly bloomPass: UnrealBloomPass | null = null;
  private readonly envRig: EnvironmentRig;
  private readonly foregroundRig: THREE.Group;
  private readonly flock: ButterflyFlock;
  private readonly hands: HandTracker;
  private readonly menus: SpatialMenus;
  private readonly breatheMode: BreatheMode;
  private readonly popMode: PopOrbsMode;
  private readonly focusMode: FocusTimerMode;

  private readonly raycaster = new THREE.Raycaster();
  private readonly clock = new THREE.Clock();
  private readonly isSoftwareGl: boolean;

  private mode: ZenMode = 'breathe';
  private exerciseId: GuidedExerciseId = WORLD_PRESETS[0].recommendedExercise;
  private language: LanguageCode = 'en';
  private placeName: string = WORLD_PRESETS[0].placeName;
  private welcomeLine: string = WORLD_PRESETS[0].welcomeLine;
  private activePresetId: string | null = WORLD_PRESETS[0].id;
  private soundscape: SoundscapeType = WORLD_PRESETS[0].environmentConfig.audio.soundscape;

  private voiceGuideEnabled = true;
  private autoGlide = true;
  private panoramaLoading = true;
  private experienceActive = false;
  private landingOverlayActive = true;
  private periodicCueTimer = 0;
  private periodicCueIdx = 0;

  private readonly landingOrbsGroup = new THREE.Group();
  private readonly landingOrbEntries: Array<{
    group: THREE.Group;
    ring: THREE.Mesh;
    core: THREE.Mesh;
    basePos: THREE.Vector3;
    phase: number;
    speed: number;
  }> = [];
  private readonly landingOrbDisposables: Array<{ dispose: () => void }> = [];

  private userDragging = false;
  private lastUserInteractTime = -10;
  private foregroundYaw = 0;

  private xrSupported = false;
  private inVR = false;
  private xrSession: XRSession | null = null;
  private disposed = false;
  private softwareTimerId = 0;
  private lastEmitTime = 0;
  private elapsed = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly onSnapshot: (snap: ZenSnapshot) => void
  ) {
    this.isSoftwareGl = detectSoftwareGl();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x0b1718, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.05, 120);
    this.camera.position.set(0, 1.32, 0.14);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.32, 0);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.rotateSpeed = 0.55;
    this.controls.minDistance = 0.08;
    this.controls.maxDistance = 0.28;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.88;
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.userDragging = true;
      this.lastUserInteractTime = this.elapsed;
    });
    this.controls.addEventListener('end', () => {
      this.userDragging = false;
      this.lastUserInteractTime = this.elapsed;
    });

    this.audio = new ZenAudioEngine();
    this.envRig = buildZenEnvironment(this.scene, this.renderer, this.isSoftwareGl);
    this.envRig.onLoadingChange = (loading) => {
      this.panoramaLoading = loading;
      this.emitSnapshot(true);
    };

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.flock = new ButterflyFlock(this.scene, maxAniso);
    this.hands = new HandTracker(this.renderer, this.scene);

    // Foreground rig gently faces desktop gaze yaw so orbs & 3D subtitles stay in front during Slow Glide
    this.foregroundRig = new THREE.Group();
    this.scene.add(this.foregroundRig);

    this.menus = new SpatialMenus(
      this.scene,
      maxAniso,
      (m) => this.setMode(m),
      () => this.toggleMute()
    );

    this.breatheMode = new BreatheMode(
      this.foregroundRig,
      maxAniso,
      this.audio,
      this.flock,
      this.envRig
    );
    this.breatheMode.onPhaseTransition = (phase, exId, cycles) => {
      if (!this.experienceActive) return;
      // Speak calm step-by-step cue on first 2 cycles and gently every 2 cycles thereafter
      if (cycles < 2 || cycles % 2 === 0) {
        this.speakExercisePhase(exId, phase);
      }
    };

    this.popMode = new PopOrbsMode(
      this.foregroundRig,
      maxAniso,
      this.audio,
      this.flock,
      this.envRig
    );
    this.focusMode = new FocusTimerMode(
      this.foregroundRig,
      maxAniso,
      this.audio,
      this.flock,
      this.envRig
    );

    this.buildLandingOrbs();
    this.setLandingOverlayActive(true);

    // Subtle bloom tuned high (0.88) so 360° photography stays razor sharp while golden orbs glow
    if (!this.isSoftwareGl) {
      const composer = new EffectComposer(this.renderer);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      composer.setSize(width, height);

      const renderPass = new RenderPass(this.scene, this.camera);
      composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.32,
        0.6,
        0.88
      );
      composer.addPass(bloomPass);

      const outputPass = new OutputPass();
      composer.addPass(outputPass);

      this.composer = composer;
      this.bloomPass = bloomPass;

      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    void this.checkXRSupport();
    this.startLoop();
    this.emitSnapshot(true);
  }

  private speakExercisePhase(
    exId: 'butterfly_wing_stretch' | 'horizon_neck_gaze' | 'lotus_sky_reach',
    phase: BreathPhase
  ): void {
    const stepText = TRANSLATIONS[this.language].exercises[exId].steps?.[phase];
    if (stepText) {
      speakCalmVoice(stepText, {
        voiceGuideEnabled: this.voiceGuideEnabled,
        muted: this.audio.isMuted(),
        language: this.language,
        interrupt: false,
      });
    }
  }

  public startExperience(): void {
    this.experienceActive = true;
    this.setLandingOverlayActive(false);
    this.audio.init();
    const tr = TRANSLATIONS[this.language];
    const ex = tr.exercises[this.exerciseId];
    void speakCalmVoice(ex.introVoice, {
      voiceGuideEnabled: this.voiceGuideEnabled,
      muted: this.audio.isMuted(),
      language: this.language,
      interrupt: true,
    });
  }

  private buildLandingOrbs(): void {
    const coreGeo = new THREE.IcosahedronGeometry(0.056, 0);
    const shellGeo = new THREE.SphereGeometry(0.118, 28, 24);
    const ringGeo = new THREE.TorusGeometry(0.16, 0.0046, 12, 64);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 0.94,
    });
    const shellMat = new THREE.ShaderMaterial({
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
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);
          float ndotv = clamp(dot(N, V), 0.0, 1.0);
          float fresnel = pow(1.0 - ndotv, 1.75);
          vec3 tint = mix(vec3(0.95, 0.88, 0.56), vec3(1.0, 0.97, 0.82), fresnel);
          float spec = pow(max(dot(reflect(-V, N), normalize(vec3(0.35, 0.8, 0.5))), 0.0), 18.0);
          tint += vec3(1.0) * spec * 0.65;
          float alpha = clamp(0.18 + fresnel * 0.42 + spec * 0.35, 0.16, 0.78);
          gl_FragColor = vec4(tint, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe29a,
      transparent: true,
      opacity: 0.84,
    });

    this.landingOrbDisposables.push(coreGeo, shellGeo, ringGeo, coreMat, shellMat, ringMat);

    const placements: Array<{
      pos: THREE.Vector3;
      scale: number;
      phase: number;
      speed: number;
    }> = [];
    const totalOrbs = 24;
    for (let i = 0; i < totalOrbs; i++) {
      const azimuth = (i / totalOrbs) * Math.PI * 2 + (i % 3) * 0.14;
      const radius = 1.65 + (i % 4) * 0.85;
      const elevation = 0.78 + ((i * 7) % 11) * 0.18;
      const scale = 0.68 + (i % 5) * 0.16;
      placements.push({
        pos: new THREE.Vector3(Math.cos(azimuth) * radius, elevation, Math.sin(azimuth) * radius),
        scale,
        phase: i * 1.37,
        speed: 0.45 + (i % 4) * 0.12,
      });
    }

    for (const p of placements) {
      const g = new THREE.Group();
      g.position.copy(p.pos);
      g.scale.setScalar(p.scale);

      const core = new THREE.Mesh(coreGeo, coreMat);
      const shell = new THREE.Mesh(shellGeo, shellMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(1.18, 0.25, 0.18);

      g.add(core, shell, ring);
      this.landingOrbsGroup.add(g);
      this.landingOrbEntries.push({
        group: g,
        ring,
        core,
        basePos: p.pos.clone(),
        phase: p.phase,
        speed: p.speed,
      });
    }

    // Add directly to 3D world space (this.scene) so bubbles float everywhere in 360° rather than fixed to camera
    this.scene.add(this.landingOrbsGroup);
  }

  public setLandingOverlayActive(active: boolean): void {
    this.landingOverlayActive = active;
    this.landingOrbsGroup.visible = active;
    this.flock.setLandingBoost(active);
    this.envRig.setSkyVisible(true);
    this.scene.background = new THREE.Color(0x0b1718);
    this.renderer.setClearColor(0x0b1718, 1);
    this.applyModeVisibility();
  }

  private async checkXRSupport(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'xr' in navigator && navigator.xr) {
      try {
        this.xrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch {
        this.xrSupported = false;
      }
    } else {
      this.xrSupported = false;
    }
    this.emitSnapshot(true);
  }

  public async enterVR(): Promise<void> {
    this.audio.init();
    this.experienceActive = true;
    this.setLandingOverlayActive(false);
    if (this.inVR && this.xrSession) {
      await this.xrSession.end();
      return;
    }
    if (!navigator.xr) return;

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking'],
      });
      this.xrSession = session;
      this.inVR = true;
      this.controls.enabled = false;
      this.foregroundYaw = 0;
      this.foregroundRig.rotation.y = 0;

      session.addEventListener('end', () => {
        this.xrSession = null;
        this.inVR = false;
        this.controls.enabled = true;
        this.startLoop();
        this.emitSnapshot(true);
      });

      window.clearTimeout(this.softwareTimerId);
      this.renderer.setAnimationLoop(() => this.tick());
      await this.renderer.xr.setSession(session);
      this.emitSnapshot(true);
    } catch {
      this.inVR = false;
      this.controls.enabled = true;
      this.emitSnapshot(true);
    }
  }

  public setLanguage(lang: LanguageCode): void {
    if (this.language === lang) return;
    this.language = lang;
    this.breatheMode.setLanguage(lang);
    this.popMode.setLanguage(lang);
    this.focusMode.setLanguage(lang);

    if (this.activePresetId) {
      const localized = TRANSLATIONS[lang].presets[this.activePresetId];
      if (localized) {
        this.placeName = localized.placeName;
        this.welcomeLine = localized.welcomeLine;
      }
    }

    if (this.experienceActive) {
      const ex = TRANSLATIONS[lang].exercises[this.exerciseId];
      speakCalmVoice(ex.introVoice, {
        voiceGuideEnabled: this.voiceGuideEnabled,
        muted: this.audio.isMuted(),
        language: lang,
        interrupt: true,
      });
    }
    this.emitSnapshot(true);
  }

  public setVoiceGuideEnabled(enabled: boolean): void {
    this.voiceGuideEnabled = enabled;
    if (!enabled) {
      stopCalmVoice();
    } else if (enabled && this.experienceActive) {
      const ex = TRANSLATIONS[this.language].exercises[this.exerciseId];
      void speakCalmVoice(ex.introVoice, {
        voiceGuideEnabled: true,
        muted: this.audio.isMuted(),
        language: this.language,
        interrupt: true,
      });
    }
    this.audio.playUiTap(enabled);
    this.emitSnapshot(true);
  }

  public setAutoGlide(enabled: boolean): void {
    this.autoGlide = enabled;
    if (!enabled && !this.inVR) {
      this.camera.fov = 62;
      this.camera.updateProjectionMatrix();
    }
    this.audio.playUiTap(enabled);
    this.emitSnapshot(true);
  }

  public setMode(mode: ZenMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.periodicCueTimer = 0;
    if (mode === 'pop') {
      this.exerciseId = 'dewdrop_release';
    } else if (mode === 'focus') {
      this.exerciseId = 'scenic_focus_5m';
    } else if (this.exerciseId === 'dewdrop_release' || this.exerciseId === 'scenic_focus_5m') {
      this.exerciseId = 'lotus_sky_reach';
      this.breatheMode.setExercise('lotus_sky_reach');
    }
    this.audio.playUiTap(true);
    this.applyModeVisibility();
    this.menus.setState(this.mode, this.audio.isMuted());
    this.emitSnapshot(true);
  }

  public setExercise(exerciseId: GuidedExerciseId): void {
    const info = EXERCISE_MAP[exerciseId];
    if (!info) return;
    this.exerciseId = exerciseId;
    this.mode = info.mode;
    this.periodicCueTimer = 0;
    this.periodicCueIdx = 0;

    if (
      exerciseId === 'butterfly_wing_stretch' ||
      exerciseId === 'horizon_neck_gaze' ||
      exerciseId === 'lotus_sky_reach'
    ) {
      this.breatheMode.setExercise(exerciseId);
    }
    this.audio.playUiTap(true);
    this.applyModeVisibility();
    this.menus.setState(this.mode, this.audio.isMuted());

    if (this.experienceActive) {
      const ex = TRANSLATIONS[this.language].exercises[exerciseId];
      speakCalmVoice(ex.introVoice, {
        voiceGuideEnabled: this.voiceGuideEnabled,
        muted: this.audio.isMuted(),
        language: this.language,
        interrupt: true,
      });
    }
    this.emitSnapshot(true);
  }

  public applyEnvironmentConfig(
    config: EnvironmentConfig,
    meta?: {
      placeName?: string;
      welcomeLine?: string;
      activePresetId?: string | null;
      recommendedExercise?: GuidedExerciseId;
    }
  ): void {
    this.envRig.applyEnvironmentConfig(config);
    this.flock.applyConfig(config.butterflies);
    this.breatheMode.setFlowerColors(config.orbColors);
    this.popMode.setFlowerColors(config.orbColors);

    this.soundscape = config.audio.soundscape;
    this.audio.setSoundscape(config.audio.soundscape);

    if (meta?.placeName) this.placeName = meta.placeName;
    if (meta?.welcomeLine) this.welcomeLine = meta.welcomeLine;
    if (meta && 'activePresetId' in meta) {
      this.activePresetId = meta.activePresetId ?? null;
    }
    if (meta?.recommendedExercise) {
      const info = EXERCISE_MAP[meta.recommendedExercise];
      if (info) {
        this.exerciseId = meta.recommendedExercise;
        this.mode = info.mode;
        if (
          meta.recommendedExercise === 'butterfly_wing_stretch' ||
          meta.recommendedExercise === 'horizon_neck_gaze' ||
          meta.recommendedExercise === 'lotus_sky_reach'
        ) {
          this.breatheMode.setExercise(meta.recommendedExercise);
        }
        this.applyModeVisibility();
        this.menus.setState(this.mode, this.audio.isMuted());
      }
    }
    this.emitSnapshot(true);
  }

  public applyPreset(presetId: string): void {
    const preset = WORLD_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const tr = TRANSLATIONS[this.language].presets[presetId];
    this.applyEnvironmentConfig(preset.environmentConfig, {
      placeName: tr?.placeName ?? preset.placeName,
      welcomeLine: tr?.welcomeLine ?? preset.welcomeLine,
      activePresetId: preset.id,
      recommendedExercise: preset.recommendedExercise,
    });
  }

  public toggleMute(): void {
    const next = !this.audio.isMuted();
    this.audio.setMuted(next);
    if (!next) {
      this.audio.init();
      this.audio.playUiTap(false);
    } else {
      stopCalmVoice();
    }
    this.menus.setState(this.mode, next);
    this.emitSnapshot(true);
  }

  public setSimulatedPalmUp(open: boolean): void {
    this.hands.simulatedPalmUp = open;
    this.audio.playUiTap(open);
    this.emitSnapshot(true);
  }

  public setSimulatedHandHeight(norm: number): void {
    this.hands.simulatedHandHeight = THREE.MathUtils.clamp(norm, 0, 1);
    this.emitSnapshot(true);
  }

  public triggerSimulatedPinch(active: boolean): void {
    this.audio.init();
    this.hands.triggerDesktopPinch(active);
  }

  public resetSeatedView(): void {
    this.controls.target.set(0, 1.32, 0);
    this.camera.position.set(0, 1.32, 0.14);
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.foregroundYaw = 0;
    this.foregroundRig.rotation.y = 0;
  }

  public resetFocusTimer(): void {
    this.focusMode.resetTimer();
    this.audio.playUiTap(true);
    this.emitSnapshot(true);
  }

  private applyModeVisibility(): void {
    const showModes = !this.landingOverlayActive;
    this.breatheMode.setVisible(showModes && this.mode === 'breathe');
    this.popMode.setVisible(showModes && this.mode === 'pop');
    this.focusMode.setVisible(showModes && this.mode === 'focus');
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleResize = (): void => {
    if (this.inVR || this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.inVR) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.camera.getWorldDirection(_camForward);
    _planePoint.copy(this.controls.target).addScaledVector(_camForward, 0.85);
    _interactPlane.setFromNormalAndCoplanarPoint(_camForward, _planePoint);

    this.raycaster.setFromCamera(_rayMouse, this.camera);
    if (this.raycaster.ray.intersectPlane(_interactPlane, _planeHit)) {
      _planeHit.y = THREE.MathUtils.clamp(_planeHit.y, 0.72, 1.78);
      this.hands.setDesktopCursorWorld(_planeHit);
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.audio.init();
    if (this.inVR) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(_rayMouse, this.camera);

    const menuHits = this.raycaster.intersectObjects(this.menus.clickableMeshes, false);
    for (const hit of menuHits) {
      if (!hit.object.visible) continue;
      let visible = true;
      let curr: THREE.Object3D | null = hit.object;
      while (curr) {
        if (!curr.visible) {
          visible = false;
          break;
        }
        curr = curr.parent;
      }
      if (visible && typeof hit.object.userData.menuAction === 'function') {
        hit.object.userData.menuAction();
        return;
      }
    }

    if (this.mode === 'pop') {
      const orbHits = this.raycaster.intersectObjects(this.popMode.clickableMeshes, false);
      for (const hit of orbHits) {
        if (hit.object.parent?.visible && typeof hit.object.userData.popOrb === 'function') {
          hit.object.userData.popOrb();
          this.emitSnapshot(true);
          return;
        }
      }
    } else if (this.mode === 'focus') {
      const focusHits = this.raycaster.intersectObjects(this.focusMode.clickableMeshes, false);
      if (focusHits.length > 0 && typeof focusHits[0].object.userData.toggleFocusTimer === 'function') {
        focusHits[0].object.userData.toggleFocusTimer();
        this.emitSnapshot(true);
        return;
      }
    }

    this.hands.triggerDesktopPinch(true);
  };

  private handlePointerUp = (): void => {
    if (!this.inVR) {
      this.hands.triggerDesktopPinch(false);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.repeat) return;
    if (e.code === 'KeyP') {
      this.setSimulatedPalmUp(!this.hands.simulatedPalmUp);
    } else if (e.code === 'Space') {
      this.triggerSimulatedPinch(true);
    } else if (e.code === 'Digit1') {
      this.setMode('breathe');
    } else if (e.code === 'Digit2') {
      this.setMode('pop');
    } else if (e.code === 'Digit3') {
      this.setMode('focus');
    } else if (e.code === 'KeyM') {
      this.toggleMute();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.triggerSimulatedPinch(false);
    }
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.renderer.setAnimationLoop(null);
    window.clearTimeout(this.softwareTimerId);
  };

  private handleContextRestored = (): void => {
    this.startLoop();
  };

  private startLoop(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl && !this.inVR) {
      this.renderer.setAnimationLoop(null);
      const swTick = () => {
        if (this.disposed || this.inVR) return;
        this.tick();
        this.afterDraw(swTick);
      };
      this.softwareTimerId = window.setTimeout(swTick, 16);
    } else {
      this.renderer.setAnimationLoop(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.softwareTimerId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.softwareTimerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.softwareTimerId = window.setTimeout(cb, 80);
      }
    };
    this.softwareTimerId = window.setTimeout(poll, 5);
  }

  private tick(): void {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.elapsed += delta;

    // 1. Automatic 360° "Slow Walk / Gentle Glide" Camera on Desktop (Active on both Landing & Sanctuary)
    if (!this.inVR) {
      if (
        (this.landingOverlayActive || this.autoGlide) &&
        !this.userDragging &&
        this.elapsed - this.lastUserInteractTime > 2.2
      ) {
        // Slowly pan horizontally 360° & add subtle forward/back walking breath sway
        _prevTarget.copy(this.controls.target);
        _camOffset.copy(this.camera.position).sub(_prevTarget);
        const rotRate = this.landingOverlayActive ? 0.085 : 0.044;
        _camOffset.applyAxisAngle(_upAxis, -delta * rotRate);

        const swayX = Math.sin(this.elapsed * 0.36) * 0.032;
        const swayY = 1.32 + Math.sin(this.elapsed * 0.62) * 0.016;
        const swayZ = Math.cos(this.elapsed * 0.31) * 0.032;

        this.controls.target.set(swayX, swayY, swayZ);
        this.camera.position.copy(this.controls.target).add(_camOffset);

        const targetFov = 62 + Math.sin(this.elapsed * 0.42) * 2.1;
        if (Math.abs(this.camera.fov - targetFov) > 0.01) {
          this.camera.fov = targetFov;
          this.camera.updateProjectionMatrix();
        }
      }

      if (this.controls.enabled) {
        this.controls.update();
      }

      this.camera.getWorldDirection(_camForward);
      const targetYaw = Math.atan2(-_camForward.x, -_camForward.z);
      const angleDelta = shortestAngleDiff(this.foregroundYaw, targetYaw);
      this.foregroundYaw += angleDelta * (1 - Math.exp(-5.0 * delta));
      this.foregroundRig.rotation.y = this.foregroundYaw;
    } else {
      this.foregroundYaw = 0;
      this.foregroundRig.rotation.y = 0;
    }

    // Animate floating golden ringed dewdrop bubbles across the full 360° world space
    if (this.landingOverlayActive) {
      for (const orb of this.landingOrbEntries) {
        const t = this.elapsed * orb.speed + orb.phase;
        orb.group.position.set(
          orb.basePos.x + Math.sin(t * 0.72) * 0.24,
          orb.basePos.y + Math.sin(t * 1.05) * 0.16,
          orb.basePos.z + Math.cos(t * 0.64) * 0.24
        );
        orb.ring.rotation.x = 1.12 + Math.cos(t * 0.5) * 0.25;
        orb.ring.rotation.z = 0.18 + Math.sin(t * 0.7) * 0.26;
        orb.ring.rotation.y = t * 0.45;
        orb.core.rotation.y = t * 0.55;
        orb.core.rotation.x = t * 0.35;
      }
    }

    // 2. Periodic Calm Voice Cues for Non-Breath Exercises (Dewdrops & 5m Focus)
    if (
      this.experienceActive &&
      (this.mode === 'pop' || (this.mode === 'focus' && this.focusMode.running))
    ) {
      this.periodicCueTimer += delta;
      if (this.periodicCueTimer >= 22.0) {
        this.periodicCueTimer = 0;
        const cues = TRANSLATIONS[this.language].exercises[this.exerciseId].periodicCues;
        if (cues && cues.length > 0) {
          const line = cues[this.periodicCueIdx % cues.length];
          this.periodicCueIdx += 1;
          speakCalmVoice(line, {
            voiceGuideEnabled: this.voiceGuideEnabled,
            muted: this.audio.isMuted(),
            language: this.language,
            interrupt: false,
          });
        }
      }
    }

    this.envRig.update(delta, this.elapsed, this.camera);
    this.hands.update(this.camera, this.inVR);
    this.flock.update(delta, this.elapsed, this.hands, this.foregroundYaw);
    this.menus.update(delta, this.camera, this.hands, this.inVR);

    if (!this.landingOverlayActive) {
      this.breatheMode.update(delta, this.elapsed, this.hands);
      this.popMode.update(delta, this.elapsed, this.hands, this.camera);
      this.focusMode.update(delta, this.elapsed, this.hands);
    }

    if (this.composer && !this.isSoftwareGl && !this.inVR) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (this.elapsed - this.lastEmitTime > 0.12) {
      this.emitSnapshot(false);
    }
  }

  private emitSnapshot(_force: boolean): void {
    this.lastEmitTime = this.elapsed;

    this.onSnapshot({
      mode: this.mode,
      exerciseId: this.exerciseId,
      language: this.language,
      placeName: this.placeName,
      welcomeLine: this.welcomeLine,
      activePresetId: this.activePresetId,
      soundscape: this.soundscape,
      muted: this.audio.isMuted(),
      voiceGuideEnabled: this.voiceGuideEnabled,
      autoGlide: this.autoGlide,
      panoramaLoading: this.panoramaLoading,
      xrSupported: this.xrSupported,
      inVR: this.inVR,
      handsDetected: {
        left: this.hands.left.active,
        right: this.hands.right.active,
      },
      leftPalmUp: this.hands.leftPalmUp,
      breathPhase: this.breatheMode.phase,
      breathSecondsLeft: this.breatheMode.secondsLeft,
      breathCycles: this.breatheMode.cyclesCompleted,
      orbsPopped: this.popMode.orbsPopped,
      focusSecondsLeft: this.focusMode.secondsLeft,
      focusRunning: this.focusMode.running,
      simulatedPalmUp: this.hands.simulatedPalmUp,
      simulatedHandHeight: this.hands.simulatedHandHeight,
    });
  }

  public dispose(): void {
    this.disposed = true;
    stopCalmVoice();
    this.renderer.setAnimationLoop(null);
    window.clearTimeout(this.softwareTimerId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.controls.dispose();
    this.composer?.dispose();
    this.envRig.dispose();
    this.flock.dispose();
    this.hands.dispose();
    this.menus.dispose();
    this.breatheMode.dispose();
    this.popMode.dispose();
    this.focusMode.dispose();
    for (const d of this.landingOrbDisposables) {
      d.dispose();
    }
    this.audio.dispose();

    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
