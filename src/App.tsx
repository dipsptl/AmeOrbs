import { useEffect, useRef, useState } from 'react';
import { ZenHUD } from './components/ZenHUD';
import { GuidedExerciseId, LanguageCode, ZenSnapshot } from './types/zen';
import { requestAuraScene } from './world/AuraGuideClient';
import { WORLD_PRESETS } from './world/WorldPresets';
import { ZenOrbsEngine } from './xr/ZenOrbsEngine';

const INITIAL_PRESET = WORLD_PRESETS[0];

const INITIAL_SNAPSHOT: ZenSnapshot = {
  mode: 'breathe',
  exerciseId: INITIAL_PRESET.recommendedExercise,
  language: 'en',
  placeName: INITIAL_PRESET.placeName,
  welcomeLine: INITIAL_PRESET.welcomeLine,
  activePresetId: INITIAL_PRESET.id,
  soundscape: INITIAL_PRESET.environmentConfig.audio.soundscape,
  muted: false,
  voiceGuideEnabled: true,
  autoGlide: true,
  panoramaLoading: true,
  xrSupported: false,
  inVR: false,
  handsDetected: { left: false, right: false },
  leftPalmUp: false,
  breathPhase: 'inhale',
  breathSecondsLeft: 5,
  breathCycles: 0,
  orbsPopped: 0,
  focusSecondsLeft: 300,
  focusRunning: true,
  simulatedPalmUp: false,
  simulatedHandHeight: 0.35,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ZenOrbsEngine | null>(null);

  const [snapshot, setSnapshot] = useState<ZenSnapshot>(INITIAL_SNAPSHOT);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [isGeneratingPlace, setIsGeneratingPlace] = useState<boolean>(false);
  const [auraNotice, setAuraNotice] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new ZenOrbsEngine(container, (snap) => {
      setSnapshot(snap);
    });
    engineRef.current = engine;
    engine.audio.ensureMusicPlaying();

    const unlockMusic = () => {
      engine.audio.ensureMusicPlaying();
      window.removeEventListener('pointerdown', unlockMusic);
      window.removeEventListener('keydown', unlockMusic);
    };
    window.addEventListener('pointerdown', unlockMusic, { passive: true });
    window.addEventListener('keydown', unlockMusic, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockMusic);
      window.removeEventListener('keydown', unlockMusic);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setLandingOverlayActive(showLanding);
  }, [showLanding]);

  const handleDismissLanding = () => {
    setShowLanding(false);
    engineRef.current?.startExperience();
  };

  const handleEnterVR = () => {
    engineRef.current?.audio.init();
    void engineRef.current?.enterVR();
  };

  const handleSelectPreset = (presetId: string) => {
    engineRef.current?.audio.init();
    setAuraNotice(null);
    engineRef.current?.applyPreset(presetId);
  };

  const handleSelectExercise = (exerciseId: GuidedExerciseId) => {
    engineRef.current?.audio.init();
    engineRef.current?.setExercise(exerciseId);
  };

  const handleSelectLanguage = (lang: LanguageCode) => {
    engineRef.current?.audio.init();
    engineRef.current?.setLanguage(lang);
  };

  const handleToggleVoiceGuide = () => {
    engineRef.current?.audio.init();
    engineRef.current?.setVoiceGuideEnabled(!snapshot.voiceGuideEnabled);
  };

  const handleToggleAutoGlide = () => {
    engineRef.current?.setAutoGlide(!snapshot.autoGlide);
  };

  const handleSubmitAuraQuery = async (query: string) => {
    engineRef.current?.audio.init();
    setIsGeneratingPlace(true);
    setAuraNotice(null);

    try {
      const { scene, warning } = await requestAuraScene(query, snapshot.language);
      engineRef.current?.applyEnvironmentConfig(scene.environmentConfig, {
        placeName: scene.placeName,
        welcomeLine: scene.welcomeLine,
        activePresetId: null,
        recommendedExercise: scene.recommendedExercise,
      });
      if (warning) {
        setAuraNotice(warning);
      }
    } finally {
      setIsGeneratingPlace(false);
    }
  };

  const handleToggleMute = () => {
    engineRef.current?.toggleMute();
  };

  const handleToggleSimPalmUp = () => {
    engineRef.current?.audio.init();
    engineRef.current?.setSimulatedPalmUp(!snapshot.simulatedPalmUp);
  };

  const handleChangeSimHeight = (val: number) => {
    engineRef.current?.audio.init();
    engineRef.current?.setSimulatedHandHeight(val);
  };

  const handleResetView = () => {
    engineRef.current?.resetSeatedView();
  };

  const handleResetFocusTimer = () => {
    engineRef.current?.resetFocusTimer();
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0B1718]">
      <div ref={mountRef} className="fixed inset-0 z-0 h-full w-full" />

      <ZenHUD
        snapshot={snapshot}
        showLanding={showLanding}
        isGeneratingPlace={isGeneratingPlace}
        auraNotice={auraNotice}
        onDismissLanding={handleDismissLanding}
        onOpenLanding={() => setShowLanding(true)}
        onEnterVR={handleEnterVR}
        onSelectPreset={handleSelectPreset}
        onSelectExercise={handleSelectExercise}
        onSelectLanguage={handleSelectLanguage}
        onToggleVoiceGuide={handleToggleVoiceGuide}
        onToggleAutoGlide={handleToggleAutoGlide}
        onSubmitAuraQuery={handleSubmitAuraQuery}
        onToggleMute={handleToggleMute}
        onToggleSimPalmUp={handleToggleSimPalmUp}
        onChangeSimHeight={handleChangeSimHeight}
        onResetView={handleResetView}
        onResetFocusTimer={handleResetFocusTimer}
      />
    </main>
  );
}
