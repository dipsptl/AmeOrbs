import * as THREE from 'three';

type JointName = keyof THREE.XRHandJoints;

const HAND_JOINT_NAMES: JointName[] = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
];

const BONE_CONNECTIONS: Array<[JointName, JointName]> = [
  ['wrist', 'thumb-metacarpal'],
  ['thumb-metacarpal', 'thumb-phalanx-proximal'],
  ['thumb-phalanx-proximal', 'thumb-phalanx-distal'],
  ['thumb-phalanx-distal', 'thumb-tip'],

  ['wrist', 'index-finger-metacarpal'],
  ['index-finger-metacarpal', 'index-finger-phalanx-proximal'],
  ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate'],
  ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal'],
  ['index-finger-phalanx-distal', 'index-finger-tip'],

  ['wrist', 'middle-finger-metacarpal'],
  ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal'],
  ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate'],
  ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal'],
  ['middle-finger-phalanx-distal', 'middle-finger-tip'],

  ['wrist', 'ring-finger-metacarpal'],
  ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal'],
  ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate'],
  ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal'],
  ['ring-finger-phalanx-distal', 'ring-finger-tip'],

  ['wrist', 'pinky-finger-metacarpal'],
  ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal'],
  ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate'],
  ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'],
  ['pinky-finger-phalanx-distal', 'pinky-finger-tip'],
];

export interface TrackedHandState {
  active: boolean;
  handedness: 'left' | 'right';
  wristPos: THREE.Vector3;
  palmPos: THREE.Vector3;
  palmNormal: THREE.Vector3;
  indexTip: THREE.Vector3;
  thumbTip: THREE.Vector3;
  pinchMid: THREE.Vector3;
  pinchDistance: number;
  isPinching: boolean;
  justPinched: boolean;
}

interface HandVisualRig {
  xrHand: THREE.XRHandSpace;
  handedness: 'left' | 'right' | null;
  visualGroup: THREE.Group;
  jointMeshes: Map<JointName, THREE.Mesh>;
  boneMeshes: Array<{ mesh: THREE.Mesh; a: JointName; b: JointName }>;
  pinchHalo: THREE.Mesh;
}

// Pre-allocated scratch math objects for zero-GC render loop
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _camPos = new THREE.Vector3();
const _toCam = new THREE.Vector3();

/**
 * 100% Procedural Hands-First WebXR Hand Tracker + Desktop Virtual Hand Simulator.
 * Never fetches external GLB profiles — renders sleek bioluminescent articulated joints & bones.
 */
export class HandTracker {
  public readonly left: TrackedHandState;
  public readonly right: TrackedHandState;
  public leftPalmUp = false;
  public averageHandHeightY: number | null = null;

  private readonly rigs: HandVisualRig[] = [];
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private readonly jointGeo: THREE.SphereGeometry;
  private readonly tipGeo: THREE.SphereGeometry;
  private readonly boneGeo: THREE.CylinderGeometry;
  private readonly jointMat: THREE.MeshStandardMaterial;
  private readonly tipMatLeft: THREE.MeshStandardMaterial;
  private readonly tipMatRight: THREE.MeshStandardMaterial;
  private readonly boneMat: THREE.MeshStandardMaterial;
  private readonly haloGeo: THREE.RingGeometry;
  private readonly haloMat: THREE.MeshBasicMaterial;

  // Desktop / Simulator state
  public simulatedPalmUp = false;
  public simulatedHandHeight = 0.35; // 0..1 normalized -> maps to 0.92m..1.48m
  private desktopLeftVisual: THREE.Group;
  private desktopRightVisual: THREE.Group;
  private desktopPinchActive = false;
  private desktopJustPinched = false;
  private desktopCursorWorld = new THREE.Vector3(0.18, 1.24, -0.78);

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly scene: THREE.Scene) {
    this.left = this.createEmptyState('left');
    this.right = this.createEmptyState('right');

    // Shared procedural geometries & bioluminescent materials
    this.jointGeo = new THREE.SphereGeometry(0.0085, 10, 10);
    this.tipGeo = new THREE.SphereGeometry(0.011, 12, 12);
    this.boneGeo = new THREE.CylinderGeometry(0.0048, 0.0062, 1, 8);

    this.jointMat = new THREE.MeshStandardMaterial({
      color: 0x88a2ff,
      emissive: 0x2a4594,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    });

    this.tipMatLeft = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.1,
      roughness: 0.15,
      metalness: 0.2,
    });

    this.tipMatRight = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.1,
      roughness: 0.15,
      metalness: 0.2,
    });

    this.boneMat = new THREE.MeshStandardMaterial({
      color: 0x4b65ad,
      emissive: 0x16244f,
      emissiveIntensity: 0.45,
      roughness: 0.45,
      metalness: 0.3,
      transparent: true,
      opacity: 0.65,
    });

    this.haloGeo = new THREE.RingGeometry(0.014, 0.022, 24);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.disposables.push(
      this.jointGeo,
      this.tipGeo,
      this.boneGeo,
      this.jointMat,
      this.tipMatLeft,
      this.tipMatRight,
      this.boneMat,
      this.haloGeo,
      this.haloMat
    );

    // Initialize both WebXR Hand slots (0 and 1)
    for (let i = 0; i < 2; i++) {
      const xrHand = this.renderer.xr.getHand(i);
      const visualGroup = new THREE.Group();
      visualGroup.visible = false;
      this.scene.add(visualGroup);
      this.scene.add(xrHand);

      const jointMeshes = new Map<JointName, THREE.Mesh>();
      for (const name of HAND_JOINT_NAMES) {
        const isTip = name.endsWith('-tip');
        const mesh = new THREE.Mesh(
          isTip ? this.tipGeo : this.jointGeo,
          isTip ? (i === 0 ? this.tipMatLeft : this.tipMatRight) : this.jointMat
        );
        mesh.visible = false;
        visualGroup.add(mesh);
        jointMeshes.set(name, mesh);
      }

      const boneMeshes: Array<{ mesh: THREE.Mesh; a: JointName; b: JointName }> = [];
      for (const [a, b] of BONE_CONNECTIONS) {
        const mesh = new THREE.Mesh(this.boneGeo, this.boneMat);
        mesh.visible = false;
        visualGroup.add(mesh);
        boneMeshes.push({ mesh, a, b });
      }

      const pinchHalo = new THREE.Mesh(this.haloGeo, this.haloMat.clone());
      pinchHalo.visible = false;
      this.disposables.push(pinchHalo.material as THREE.Material);
      visualGroup.add(pinchHalo);

      const rig: HandVisualRig = {
        xrHand,
        handedness: i === 0 ? 'left' : 'right',
        visualGroup,
        jointMeshes,
        boneMeshes,
        pinchHalo,
      };

      xrHand.addEventListener('connected', (event: { data?: XRInputSource }) => {
        const h = event.data?.handedness;
        if (h === 'left' || h === 'right') {
          rig.handedness = h;
        }
      });

      xrHand.addEventListener('disconnected', () => {
        rig.visualGroup.visible = false;
      });

      this.rigs.push(rig);
    }

    // Desktop Simulator subtle translucent hand anchors (shown only when simulated palm-up or desktop preview)
    this.desktopLeftVisual = this.createDesktopHandMarker(0x88a2ff);
    this.desktopRightVisual = this.createDesktopHandMarker(0x00f5d4);
    this.scene.add(this.desktopLeftVisual);
    this.scene.add(this.desktopRightVisual);
  }

  private createDesktopHandMarker(colorHex: number): THREE.Group {
    const g = new THREE.Group();
    const coreGeo = new THREE.SphereGeometry(0.016, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.75,
    });
    const ringGeo = new THREE.RingGeometry(0.022, 0.028, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    g.add(core, ring);
    g.visible = false;
    this.disposables.push(coreGeo, coreMat, ringGeo, ringMat);
    return g;
  }

  private createEmptyState(handedness: 'left' | 'right'): TrackedHandState {
    return {
      active: false,
      handedness,
      wristPos: new THREE.Vector3(),
      palmPos: new THREE.Vector3(),
      palmNormal: new THREE.Vector3(0, 1, 0),
      indexTip: new THREE.Vector3(),
      thumbTip: new THREE.Vector3(),
      pinchMid: new THREE.Vector3(),
      pinchDistance: 1,
      isPinching: false,
      justPinched: false,
    };
  }

  public setDesktopCursorWorld(pos: THREE.Vector3): void {
    this.desktopCursorWorld.copy(pos);
  }

  public triggerDesktopPinch(active: boolean): void {
    if (active && !this.desktopPinchActive) {
      this.desktopJustPinched = true;
    }
    this.desktopPinchActive = active;
  }

  public update(camera: THREE.Camera, isInVR: boolean): void {
    // Reset per-frame edge flags
    this.left.justPinched = false;
    this.right.justPinched = false;
    this.left.active = false;
    this.right.active = false;

    camera.getWorldPosition(_camPos);

    let anyXrHandTracked = false;

    for (const rig of this.rigs) {
      const joints = rig.xrHand.joints;
      const wrist = joints['wrist'];
      const indexTip = joints['index-finger-tip'];
      const thumbTip = joints['thumb-tip'];
      const middleMeta = joints['middle-finger-metacarpal'];
      const indexMeta = joints['index-finger-metacarpal'];
      const pinkyMeta = joints['pinky-finger-metacarpal'];

      // Check if WebXR hand joint data is actively populated
      if (!wrist || !indexTip || !thumbTip || wrist.position.lengthSq() === 0) {
        rig.visualGroup.visible = false;
        continue;
      }

      anyXrHandTracked = true;
      rig.visualGroup.visible = true;

      // Resolve handedness from inputState or rig fallback
      const handSide = rig.handedness ?? 'right';
      const state = handSide === 'left' ? this.left : this.right;
      state.active = true;

      // Update visual joint spheres
      for (const name of HAND_JOINT_NAMES) {
        const jointObj = joints[name];
        const mesh = rig.jointMeshes.get(name);
        if (jointObj && mesh && jointObj.position.lengthSq() > 0) {
          mesh.visible = true;
          mesh.position.copy(jointObj.position);
          mesh.quaternion.copy(jointObj.quaternion);
        } else if (mesh) {
          mesh.visible = false;
        }
      }

      // Update bone cylinders
      for (const bone of rig.boneMeshes) {
        const jA = joints[bone.a];
        const jB = joints[bone.b];
        if (jA && jB && jA.position.lengthSq() > 0 && jB.position.lengthSq() > 0) {
          bone.mesh.visible = true;
          bone.mesh.position.copy(jA.position).add(jB.position).multiplyScalar(0.5);
          _dir.copy(jB.position).sub(jA.position);
          const len = _dir.length();
          if (len > 0.0001) {
            bone.mesh.scale.set(1, len, 1);
            bone.mesh.quaternion.setFromUnitVectors(_up, _dir.divideScalar(len));
          }
        } else {
          bone.mesh.visible = false;
        }
      }

      // Compute tracking metrics
      state.wristPos.copy(wrist.position);
      state.indexTip.copy(indexTip.position);
      state.thumbTip.copy(thumbTip.position);
      state.pinchMid.copy(state.indexTip).add(state.thumbTip).multiplyScalar(0.5);
      state.pinchDistance = state.indexTip.distanceTo(state.thumbTip);

      // Pinch hysteresis: trigger < 2.5cm (0.025m), release > 3.5cm
      const wasPinching = state.isPinching;
      if (!wasPinching && state.pinchDistance < 0.025) {
        state.isPinching = true;
        state.justPinched = true;
      } else if (wasPinching && state.pinchDistance > 0.035) {
        state.isPinching = false;
      }

      // Pinch halo feedback
      rig.pinchHalo.visible = true;
      rig.pinchHalo.position.copy(state.pinchMid);
      rig.pinchHalo.lookAt(_camPos);
      const haloMat = rig.pinchHalo.material as THREE.MeshBasicMaterial;
      if (state.isPinching) {
        haloMat.color.setHex(0xffd166);
        haloMat.opacity = 0.9;
        rig.pinchHalo.scale.setScalar(1.25);
      } else if (state.pinchDistance < 0.055) {
        haloMat.color.setHex(0x00f5d4);
        haloMat.opacity = THREE.MathUtils.mapLinear(state.pinchDistance, 0.025, 0.055, 0.7, 0.12);
        rig.pinchHalo.scale.setScalar(1.0);
      } else {
        haloMat.opacity = 0.0;
      }

      // Compute Palm Center & Palm Normal
      if (middleMeta && indexMeta && pinkyMeta) {
        state.palmPos.copy(middleMeta.position);
        // Vector wrist -> middle metacarpal
        _vA.copy(middleMeta.position).sub(wrist.position).normalize();
        // Vector index metacarpal -> pinky metacarpal
        _vB.copy(pinkyMeta.position).sub(indexMeta.position).normalize();

        if (handSide === 'left') {
          state.palmNormal.crossVectors(_vA, _vB).normalize();
        } else {
          state.palmNormal.crossVectors(_vB, _vA).normalize();
        }
      } else {
        state.palmPos.copy(wrist.position);
        state.palmNormal.set(0, 1, 0);
      }
    }

    // Check Left Palm-Up Gesture (facing upward AND facing user's eyes)
    if (anyXrHandTracked) {
      this.desktopLeftVisual.visible = false;
      this.desktopRightVisual.visible = false;

      if (this.left.active) {
        _toCam.copy(_camPos).sub(this.left.palmPos).normalize();
        const facingHead = this.left.palmNormal.dot(_toCam);
        const facingUp = this.left.palmNormal.y;
        this.leftPalmUp = facingUp > 0.35 && facingHead > 0.48;
      } else {
        this.leftPalmUp = false;
      }

      // Average Y-height of tracked hands for Breathing Mode
      if (this.left.active && this.right.active) {
        this.averageHandHeightY = (this.left.palmPos.y + this.right.palmPos.y) * 0.5;
      } else if (this.left.active) {
        this.averageHandHeightY = this.left.palmPos.y;
      } else if (this.right.active) {
        this.averageHandHeightY = this.right.palmPos.y;
      } else {
        this.averageHandHeightY = null;
      }
    } else {
      // Desktop / Simulator fallback controls when XRHand joints are not active
      const mappedY = THREE.MathUtils.lerp(0.92, 1.48, this.simulatedHandHeight);
      this.averageHandHeightY = mappedY;

      this.leftPalmUp = this.simulatedPalmUp;

      // Place virtual left hand in seated left-front view when palm-up menu is toggled
      this.left.active = this.simulatedPalmUp;
      this.left.palmPos.set(-0.22, 1.12, -0.55);
      this.left.wristPos.set(-0.24, 1.07, -0.52);
      this.left.palmNormal.set(0.18, 0.85, 0.49).normalize();

      this.desktopLeftVisual.visible = !isInVR && this.simulatedPalmUp;
      this.desktopLeftVisual.position.copy(this.left.palmPos);
      this.desktopLeftVisual.lookAt(_camPos);

      // Virtual right hand tracks desktop raycast/cursor in front of user
      this.right.active = !isInVR;
      this.right.indexTip.copy(this.desktopCursorWorld);
      this.right.thumbTip.copy(this.desktopCursorWorld);
      this.right.pinchMid.copy(this.desktopCursorWorld);
      this.right.palmPos.set(this.desktopCursorWorld.x, mappedY, this.desktopCursorWorld.z);
      this.right.pinchDistance = this.desktopPinchActive ? 0.015 : 0.07;
      this.right.isPinching = this.desktopPinchActive;
      this.right.justPinched = this.desktopJustPinched;
      this.desktopJustPinched = false;

      this.desktopRightVisual.visible = !isInVR;
      this.desktopRightVisual.position.copy(this.right.indexTip);
      this.desktopRightVisual.lookAt(_camPos);
      this.desktopRightVisual.scale.setScalar(this.desktopPinchActive ? 0.78 : 1.0);
    }
  }

  public dispose(): void {
    for (const rig of this.rigs) {
      this.scene.remove(rig.visualGroup);
      this.scene.remove(rig.xrHand);
    }
    this.scene.remove(this.desktopLeftVisual);
    this.scene.remove(this.desktopRightVisual);
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
