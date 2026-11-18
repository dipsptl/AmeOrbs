export type ZenMode = 'breathe' | 'pop' | 'focus';

export type BreathPhase = 'inhale' | 'hold' | 'exhale';

export type LanguageCode = 'en' | 'hi' | 'gu' | 'es' | 'ja';

export type SoundscapeType =
  | 'water_stream'
  | 'ocean_waves'
  | 'gentle_breeze'
  | 'bird_chimes';

export type GuidedExerciseId =
  | 'butterfly_wing_stretch'
  | 'horizon_neck_gaze'
  | 'lotus_sky_reach'
  | 'dewdrop_release'
  | 'scenic_focus_5m';

export interface ButterflyConfig {
  count: number; // 1 .. 18
  primaryColor: string;
  secondaryColor: string;
  flightSpeed: number; // 0.4 .. 1.8
}

export interface EnvironmentConfig {
  panoramaId: string;
  panoramaUrl: string;
  tintColor: string;
  orbColors: [string, string];
  butterflies: ButterflyConfig;
  audio: {
    soundscape: SoundscapeType;
  };
}

export interface WorldPreset {
  id: string;
  shortName: string;
  placeName: string;
  welcomeLine: string;
  recommendedExercise: GuidedExerciseId;
  environmentConfig: EnvironmentConfig;
}

export interface GuidedExerciseInfo {
  id: GuidedExerciseId;
  title: string;
  shortTitle: string;
  mode: ZenMode;
  subtitle: string;
  voicePrompt: string;
}

export interface AuraSceneResponse {
  placeName: string;
  welcomeLine: string;
  environmentConfig: EnvironmentConfig;
  recommendedExercise: GuidedExerciseId;
  source?: 'gemini' | 'local' | 'preset';
}

export interface ZenSnapshot {
  mode: ZenMode;
  exerciseId: GuidedExerciseId;
  language: LanguageCode;
  placeName: string;
  welcomeLine: string;
  activePresetId: string | null;
  soundscape: SoundscapeType;
  muted: boolean;
  voiceGuideEnabled: boolean;
  autoGlide: boolean;
  panoramaLoading: boolean;
  xrSupported: boolean;
  inVR: boolean;
  handsDetected: {
    left: boolean;
    right: boolean;
  };
  leftPalmUp: boolean;
  breathPhase: BreathPhase;
  breathSecondsLeft: number;
  breathCycles: number;
  orbsPopped: number;
  focusSecondsLeft: number;
  focusRunning: boolean;
  simulatedPalmUp: boolean;
  simulatedHandHeight: number; // 0..1 normalized
}
