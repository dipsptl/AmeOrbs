import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Footprints,
  Globe,
  Hand,
  HelpCircle,
  Loader2,
  MessageSquare,
  MessageSquareOff,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import {
  LANGUAGE_LOCALE_MAP,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
} from '../i18n/translations';
import { GuidedExerciseId, LanguageCode, ZenSnapshot } from '../types/zen';
import { GUIDED_EXERCISES, WORLD_PRESETS } from '../world/WorldPresets';

const LOGO_SRC = '/assets/aistudio/AmeOrbs_Nature-Tech_Logo_bb7f3fa9.png';
const HANDS_SRC = '/assets/real_hands_phone.png';

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface ZenHUDProps {
  snapshot: ZenSnapshot;
  showLanding: boolean;
  isGeneratingPlace: boolean;
  auraNotice: string | null;
  onDismissLanding: () => void;
  onOpenLanding: () => void;
  onEnterVR: () => void;
  onSelectPreset: (presetId: string) => void;
  onSelectExercise: (exerciseId: GuidedExerciseId) => void;
  onSelectLanguage: (lang: LanguageCode) => void;
  onToggleVoiceGuide: () => void;
  onToggleAutoGlide: () => void;
  onSubmitAuraQuery: (query: string) => Promise<void>;
  onToggleMute: () => void;
  onToggleSimPalmUp: () => void;
  onChangeSimHeight: (val: number) => void;
  onResetView: () => void;
  onResetFocusTimer: () => void;
}

function formatTime(totalSec: number): string {
  const ceil = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(ceil / 60);
  const s = ceil % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ZenHUD: React.FC<ZenHUDProps> = ({
  snapshot,
  showLanding,
  isGeneratingPlace,
  auraNotice,
  onDismissLanding,
  onOpenLanding,
  onEnterVR,
  onSelectPreset,
  onSelectExercise,
  onSelectLanguage,
  onToggleVoiceGuide,
  onToggleAutoGlide,
  onSubmitAuraQuery,
  onToggleMute,
  onToggleSimPalmUp,
  onChangeSimHeight,
  onResetView,
  onResetFocusTimer,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hudIdle, setHudIdle] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [handsFailed, setHandsFailed] = useState(false);
  const [tabletScale, setTabletScale] = useState<number>(0.92);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const t = TRANSLATIONS[snapshot.language];
  const exInfo = t.exercises[snapshot.exerciseId];
  const liveSubtitle =
    snapshot.mode === 'breathe'
      ? exInfo.steps?.[snapshot.breathPhase] ?? exInfo.subtitle
      : exInfo.subtitle;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'KeyH' && !e.repeat) {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!showLanding) return;

    const updateTabletScale = () => {
      const w = window.innerWidth;
      const compact = w < 1024;
      setIsCompactViewport((prev) => (prev === compact ? prev : compact));

      const wrap = stageWrapperRef.current;
      const stage = stageRef.current;
      if (!wrap || !stage) return;

      const wrapW = wrap.clientWidth;
      const wrapH = wrap.clientHeight;
      const stageW = stage.offsetWidth || 1116;
      const stageH = stage.offsetHeight || (compact ? 720 : 576);
      const isMobile = w < 640;

      if (compact) {
        const padX = isMobile ? 16 : 24;
        const padY = isMobile ? 20 : 28;
        const rawScale = Math.min(
          1.08,
          Math.max(0.24, (wrapW - padX) / stageW),
          Math.max(0.24, (wrapH - padY) / stageH)
        );
        setTabletScale(rawScale);
      } else {
        const padX = 24;
        const padTop = 74;
        const rawScale = Math.min(
          1.16,
          Math.max(0.42, (wrapW - padX) / stageW),
          Math.max(0.42, (wrapH - padTop) / stageH)
        );
        setTabletScale(rawScale);
      }
    };

    updateTabletScale();
    const ro = new ResizeObserver(updateTabletScale);
    if (stageWrapperRef.current) ro.observe(stageWrapperRef.current);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener('resize', updateTabletScale);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateTabletScale);
    };
  }, [showLanding, snapshot.language, isCompactViewport]);

  // Auto-hide bottom dock after 3 seconds of inactivity unless typing or listening
  useEffect(() => {
    if (showLanding || inputFocused || listening || isGeneratingPlace) {
      setHudIdle(false);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      return;
    }

    const wakeHud = () => {
      setHudIdle(false);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        setHudIdle(true);
      }, 3000);
    };

    wakeHud();
    window.addEventListener('mousemove', wakeHud, { passive: true });
    window.addEventListener('pointerdown', wakeHud, { passive: true });
    window.addEventListener('keydown', wakeHud);

    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      window.removeEventListener('mousemove', wakeHud);
      window.removeEventListener('pointerdown', wakeHud);
      window.removeEventListener('keydown', wakeHud);
    };
  }, [showLanding, inputFocused, listening, isGeneratingPlace]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isGeneratingPlace) return;
    setChatInput('');
    setMicError(null);
    await onSubmitAuraQuery(trimmed);
  };

  const handleToggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!SpeechCtor) {
      setMicError('Voice input requires Chrome/Edge Web Speech support.');
      return;
    }

    try {
      setMicError(null);
      const rec = new SpeechCtor();
      rec.lang = LANGUAGE_LOCALE_MAP[snapshot.language] || 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (ev: SpeechRecognitionEventLike) => {
        const transcript = ev.results?.[0]?.[0]?.transcript?.trim() ?? '';
        if (transcript) {
          setChatInput(transcript);
          void onSubmitAuraQuery(transcript);
        }
      };
      rec.onerror = (ev: { error?: string }) => {
        setMicError(
          ev.error === 'not-allowed'
            ? 'Microphone permission blocked. Type your destination instead.'
            : 'Could not hear clearly. Try again.'
        );
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
      };

      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setMicError('Unable to start microphone.');
      setListening(false);
    }
  };

  const fadeOutDock = !showLanding && hudIdle;

  const handleCyclePreset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = WORLD_PRESETS.findIndex((p) => p.id === snapshot.activePresetId);
    const next = WORLD_PRESETS[(idx + 1) % WORLD_PRESETS.length];
    onSelectPreset(next.id);
  };

  const renderSanctuaryCornerLogo = () => (
    <div
      className="pointer-events-auto inline-flex items-center p-0 m-0 bg-transparent border-0"
      aria-label={t.brandName}
    >
      {!logoFailed ? (
        <img
          src={LOGO_SRC}
          alt={t.brandName}
          referrerPolicy="no-referrer"
          onError={() => setLogoFailed(true)}
          className="h-6 sm:h-7 w-auto p-0 m-0 bg-transparent border-0 select-none object-contain brightness-105 contrast-105 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
        />
      ) : (
        <span className="text-sm font-extrabold tracking-tight text-[#FFFDF7] whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
          {t.brandName}
        </span>
      )}
    </div>
  );

  const landingLogoBlock = (
    <div
      className="flex items-center justify-center"
      style={{
        transform: 'perspective(900px) rotateX(22deg)',
        transformOrigin: '50% 85%',
      }}
    >
      {!logoFailed ? (
        <img
          src={LOGO_SRC}
          alt={t.brandName}
          referrerPolicy="no-referrer"
          onError={() => setLogoFailed(true)}
          className="h-[136px] w-[860px] sm:h-[154px] sm:w-[940px] max-w-none select-none object-fill [filter:drop-shadow(0_0_2px_rgba(0,0,0,1))_drop-shadow(0_0_6px_rgba(0,0,0,0.98))_drop-shadow(0_3px_8px_rgba(0,0,0,0.98))_drop-shadow(0_7px_16px_rgba(0,0,0,0.95))_drop-shadow(0_14px_26px_rgba(0,0,0,0.88))_brightness(1.12)_contrast(1.08)]"
        />
      ) : (
        <span className="text-6xl font-extrabold tracking-[0.18em] text-[#FFFDF7] [text-shadow:0_2px_4px_rgba(0,0,0,0.98),0_4px_14px_rgba(0,0,0,0.85)]">
          {t.brandName}
        </span>
      )}
    </div>
  );

  const landingTabletBlock = (
    <div className="pointer-events-auto relative w-[820px]">
      {/* Left Real Hand Grip Holding Tablet (z-0 behind Tablet) */}
      {!handsFailed && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute hidden sm:block z-0"
          style={{
            left: '-148px',
            top: '-10px',
            width: '175px',
            height: '615px',
            overflow: 'hidden',
            transform: 'scaleX(-1)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 18px)',
            maskImage: 'linear-gradient(to right, transparent 0px, black 18px)',
          }}
        >
          <img
            src={HANDS_SRC}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setHandsFailed(true)}
            className="select-none drop-shadow-[0_18px_36px_rgba(0,0,0,0.75)]"
            style={{
              width: '528px',
              height: '640px',
              maxWidth: 'none',
              marginLeft: '-353px',
            }}
          />
        </div>
      )}

      {/* Right Real Hand Grip Holding Tablet (z-0 behind Tablet) */}
      {!handsFailed && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute hidden sm:block z-0"
          style={{
            right: '-148px',
            top: '-10px',
            width: '175px',
            height: '615px',
            overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 18px)',
            maskImage: 'linear-gradient(to right, transparent 0px, black 18px)',
          }}
        >
          <img
            src={HANDS_SRC}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setHandsFailed(true)}
            className="select-none drop-shadow-[0_18px_36px_rgba(0,0,0,0.75)]"
            style={{
              width: '528px',
              height: '640px',
              maxWidth: 'none',
              marginLeft: '-353px',
            }}
          />
        </div>
      )}

      {/* Centered Dark Emerald-Slate Tablet Bezel */}
      <div className="relative z-10 w-full rounded-[28px] border-[3px] border-[#385451]/90 bg-[#081213] p-3 shadow-[0_28px_75px_rgba(0,0,0,0.85)]">
        {/* Slim Top Tablet Camera Dot */}
        <div className="mb-1.5 flex items-center justify-center" aria-hidden="true">
          <span className="h-2 w-2 rounded-full border border-[#8CF2D8]/25 bg-[#132524]" />
        </div>

        {/* Interactive Tablet Sanctuary Display */}
        <div
          role="button"
          tabIndex={0}
          onClick={onDismissLanding}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDismissLanding();
            }
          }}
          aria-label={t.enterSanctuary}
          className="flex flex-col justify-between rounded-[20px] border border-[#8CF2D8]/20 bg-gradient-to-br from-[#0A1A1B] via-[#0F2726] to-[#081515] px-7 py-5 text-[#F2F6EE] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFD166]"
        >
          {/* Top Tabs Bar Inside Tablet: Place Button (only Place name) + Language & Enter VR Tabs */}
          <div>
            <div
              className="mb-3 flex items-center justify-between gap-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleCyclePreset}
                className="min-w-0 inline-flex items-center rounded-xl border border-[#8CF2D8]/35 bg-[#0B191A]/95 px-3.5 py-2 text-[14.5px] font-semibold text-[#FFFDF7] transition-colors hover:border-[#8CF2D8]/70 cursor-pointer max-w-[260px]"
                title="Switch Place"
              >
                <span className="truncate">{snapshot.placeName}</span>
              </button>

              <div className="flex items-center gap-2.5 shrink-0">
                <label
                  className="inline-flex items-center gap-2 rounded-xl border border-[#8CF2D8]/35 bg-[#0B191A]/95 px-3.5 py-2 text-[14.5px] font-semibold text-[#E8F6F1] cursor-pointer"
                  title="Language"
                >
                  <Globe className="h-4 w-4 text-[#8CF2D8]" />
                  <select
                    value={snapshot.language}
                    onChange={(e) => onSelectLanguage(e.target.value as LanguageCode)}
                    aria-label="Language Selector"
                    className="bg-transparent text-[14.5px] font-semibold text-[#FFFDF7] outline-none cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-[#0B1718] text-[#FFFDF7]">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissLanding();
                    onEnterVR();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#FFD166]/55 bg-[#122625] px-4 py-2 text-[14.5px] font-bold text-[#FFE29A] transition-colors hover:bg-[#1B3835] hover:text-white whitespace-nowrap cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>{snapshot.inVR ? t.exitVR : t.enterVR}</span>
                </button>
              </div>
            </div>

            <h2 className="text-[26px] font-bold leading-tight tracking-tight text-[#FFFDF7] text-balance">
              {t.landingTitle}
            </h2>
            <p className="mt-1.5 text-[14.5px] leading-snug text-[#CDE2DC]">
              {t.landingDescription}
            </p>
          </div>

          {/* 3 Upright Feature Cards Side-by-Side */}
          <div className="my-4 grid grid-cols-3 gap-3.5">
            <div className="flex flex-col justify-between rounded-2xl border border-[#8CF2D8]/25 bg-[#12292A]/95 p-4 min-h-[200px]">
              <div className="mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#8CF2D8]/30 bg-[#0B191A]">
                <Compass className="h-5.5 w-5.5 text-[#8CF2D8]" />
              </div>
              <div>
                <div className="text-[16.5px] font-bold leading-snug text-[#FFFDF7]">
                  {t.cardAuraTitle}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-snug text-[#B8D4CC]">
                  {t.cardAuraBody}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#8CF2D8]/25 bg-[#12292A]/95 p-4 min-h-[200px]">
              <div className="mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#FFD166]/30 bg-[#0B191A]">
                <Hand className="h-5.5 w-5.5 text-[#FFD166]" />
              </div>
              <div>
                <div className="text-[16.5px] font-bold leading-snug text-[#FFFDF7]">
                  {t.cardPalmTitle}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-snug text-[#B8D4CC]">
                  {t.cardPalmBody}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#8CF2D8]/25 bg-[#12292A]/95 p-4 min-h-[200px]">
              <div className="mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#FF9EBB]/30 bg-[#0B191A]">
                <Sparkles className="h-5.5 w-5.5 text-[#FF9EBB]" />
              </div>
              <div>
                <div className="text-[16.5px] font-bold leading-snug text-[#FFFDF7]">
                  {t.cardStretchTitle}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-snug text-[#B8D4CC]">
                  {t.cardStretchBody}
                </p>
              </div>
            </div>
          </div>

          {/* Footer: Shortcuts + Tactile 3D Enter Buttons + Home Pill */}
          <div>
            <div className="flex items-center justify-between gap-2 border-t border-[#8CF2D8]/16 pt-2.5 text-[13px]">
              <div className="text-[#B2CEC6]">
                {snapshot.xrSupported ? (
                  <span className="text-[#8CF2D8]">WebXR hand tracking ready</span>
                ) : (
                  <span>
                    <span className="font-mono-tabular text-[#FFFDF7]">P</span> Wrist ·{' '}
                    <span className="font-mono-tabular text-[#FFFDF7]">H</span> Dock ·{' '}
                    <span className="font-mono-tabular text-[#FFFDF7]">M</span> Mute
                  </span>
                )}
              </div>
              <span className="text-[#FFD166] font-semibold whitespace-nowrap">{t.badgeHandsFirst}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissLanding();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8CF2D8]/60 border-b-4 border-b-[#0D2421] bg-gradient-to-b from-[#235E56] to-[#163B36] px-4 py-3 text-[15px] font-bold text-[#FFFDF7] shadow-[0_6px_14px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:from-[#2A7067] hover:to-[#1B4943] active:translate-y-[2px] active:border-b-2 whitespace-nowrap cursor-pointer"
              >
                <Wind className="h-4.5 w-4.5 text-[#8CF2D8]" />
                <span>{t.enterSanctuary}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissLanding();
                  onEnterVR();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFF2B2]/75 border-b-4 border-b-[#A67400] bg-gradient-to-b from-[#FFE082] to-[#F4B400] px-4 py-3 text-[15px] font-extrabold text-[#0B1718] shadow-[0_6px_16px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.65)] transition-all hover:from-[#FFE8A3] hover:to-[#FFBF1A] active:translate-y-[2px] active:border-b-2 whitespace-nowrap cursor-pointer"
              >
                <Eye className="h-4.5 w-4.5" />
                <span>{t.enterVR}</span>
              </button>
            </div>

            <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-28 rounded-full bg-[#8CF2D8]/35" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-10 flex flex-col ${
        showLanding ? 'justify-between p-0 overflow-hidden' : 'justify-between px-2.5 pt-2 pb-3 sm:px-4 sm:pt-2.5 sm:pb-3.5'
      }`}
    >
      {/* Top Bar: Shown Only Inside the Sanctuary (!showLanding) */}
      {!showLanding && (
        <header className="relative z-30 flex flex-wrap items-center justify-between gap-2">
          <div
            className={`flex items-center gap-2 transition-opacity duration-700 ${
              fadeOutDock ? 'opacity-65 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {renderSanctuaryCornerLogo()}

            <button
              type="button"
              onClick={() => setDockCollapsed(false)}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-[#8CF2D8]/35 bg-[#0B1718]/90 px-2.5 py-1 text-[11px] font-semibold text-[#FFFDF7] transition-colors hover:border-[#8CF2D8]/65 focus-visible:outline-2 focus-visible:outline-[#FFD166] cursor-pointer max-w-[190px]"
              title="Change Place"
            >
              <span className="truncate">{snapshot.placeName}</span>
              {snapshot.panoramaLoading && (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#FFD166]" />
              )}
            </button>
          </div>

          <div
            className={`pointer-events-auto flex flex-wrap items-center gap-1.5 transition-opacity duration-700 ${
              fadeOutDock ? 'opacity-65 hover:opacity-100' : 'opacity-100'
            }`}
          >
            <label
              className="inline-flex items-center gap-1 rounded-lg border border-[#8CF2D8]/30 bg-[#0B1718]/90 px-2 py-1 text-[11px] font-semibold text-[#E8F6F1] cursor-pointer"
              title="Language"
            >
              <Globe className="h-3 w-3 text-[#8CF2D8]" />
              <select
                value={snapshot.language}
                onChange={(e) => onSelectLanguage(e.target.value as LanguageCode)}
                aria-label="Language Selector"
                className="bg-transparent text-[11px] font-semibold text-[#FFFDF7] outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#0B1718] text-[#FFFDF7]">
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onOpenLanding}
              className="inline-flex items-center gap-1 rounded-lg border border-[#8CF2D8]/30 bg-[#0B1718]/90 px-2.5 py-1 text-[11px] font-semibold text-[#E8F6F1] transition-colors hover:border-[#8CF2D8]/65 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD166] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HelpCircle className="h-3 w-3 text-[#8CF2D8]" />
              <span>{t.gestures}</span>
            </button>

            <button
              type="button"
              onClick={onEnterVR}
              className="inline-flex items-center gap-1 rounded-lg border border-[#FFD166]/55 bg-[#112423]/94 px-2.5 py-1 text-[11px] font-bold text-[#FFE29A] transition-colors hover:bg-[#1B3835] hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD166] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Eye className="h-3 w-3" />
              <span>{snapshot.inVR ? t.exitVR : t.enterVR}</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Landing Composition Over Live Rotating 360° Nature Sanctuary */}
      {showLanding &&
        (isCompactViewport ? (
          /* Mobile & Tablet (< 1024px): Centered Unified Scale Box keeping desktop horizontal proportions + logo directly above tablet */
          <div
            ref={stageWrapperRef}
            className="pointer-events-none relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
          >
            <div
              ref={stageRef}
              className="relative z-10 flex shrink-0 flex-col items-center justify-center origin-center"
              style={{
                transform: `scale(${tabletScale})`,
              }}
            >
              <div className="pointer-events-none relative z-[5] -mb-3 flex items-center justify-center">
                {landingLogoBlock}
              </div>

              <div
                className="relative z-10 px-2 sm:px-[148px] pb-[14px] sm:pb-[18px]"
                style={{
                  transform: 'perspective(1120px) rotateX(10deg)',
                  transformOrigin: '50% 100%',
                }}
              >
                {landingTabletBlock}
              </div>
            </div>
          </div>
        ) : (
          /* Desktop (>= 1024px): Unchanged Full-Size Bottom-Anchored Tablet + Top-Center Tilted Logo */
          <div className="pointer-events-none relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-end overflow-hidden">
            <div className="pointer-events-none absolute -top-2.5 inset-x-0 z-[5] flex items-start justify-center">
              <div
                className="flex shrink-0 items-center justify-center origin-top"
                style={{
                  transform: `scale(${tabletScale})`,
                }}
              >
                {landingLogoBlock}
              </div>
            </div>

            <div
              ref={stageWrapperRef}
              className="pointer-events-none relative z-10 flex h-full min-h-0 w-full flex-1 items-end justify-center overflow-hidden"
            >
              <div
                className="relative z-10 flex items-end justify-center shrink-0 origin-bottom"
                style={{
                  transform: `scale(${tabletScale})`,
                }}
              >
                <div
                  ref={stageRef}
                  className="relative px-[148px] pb-[26px]"
                  style={{
                    transform: 'perspective(1120px) rotateX(10deg)',
                    transformOrigin: '50% 100%',
                  }}
                >
                  {landingTabletBlock}
                </div>
              </div>
            </div>
          </div>
        ))}

      {/* Compact Auto-Hiding Bottom Dock */}
      {!showLanding && (
        <div className="flex flex-col items-center">
          <div className="mb-1.5 max-w-xl rounded-md border border-[#FFD166]/30 bg-[#0B1718]/86 px-3 py-1 text-center text-[11px] sm:text-xs font-medium text-[#FFFDF7] transition-opacity duration-500">
            {liveSubtitle}
          </div>

          <div
            className={`flex w-full flex-col items-center transition-opacity duration-700 ${
              fadeOutDock ? 'pointer-events-none opacity-0' : 'pointer-events-none opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className={`mb-1 inline-flex items-center gap-1 rounded-t-md border border-b-0 border-[#8CF2D8]/25 bg-[#0B1718]/88 px-2.5 py-0.5 text-[10px] font-medium text-[#B2CEC6] transition-colors hover:text-[#FFFDF7] cursor-pointer ${
                fadeOutDock ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
              title="Toggle Controls (H)"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>{t.showDock}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>{t.hideControls}</span>
                </>
              )}
            </button>

            <div
              className={`w-full max-w-[880px] rounded-xl border border-[#8CF2D8]/25 bg-[#0B1718]/90 px-3 py-2 shadow-2xl transition-all duration-300 ${
                dockCollapsed || fadeOutDock ? 'pointer-events-none' : 'pointer-events-auto'
              } ${dockCollapsed ? 'translate-y-28 opacity-0' : 'translate-y-0 opacity-100'}`}
            >
              {/* Row 1: Aura Guide + Compact Chat & Voice Mic */}
              <div className="mb-1.5 flex flex-col gap-1.5 border-b border-[#8CF2D8]/15 pb-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <p className="text-[#CDE2DC] truncate max-w-[660px]">
                    <span className="font-semibold text-[#FFD166]">{t.auraGuidePrefix} </span>
                    {auraNotice || micError || snapshot.welcomeLine}
                  </p>
                  <span className="font-mono-tabular text-[10px] text-[#8CF2D8]/85 whitespace-nowrap">
                    {snapshot.soundscape.replace('_', ' ')}
                  </span>
                </div>

                <form onSubmit={handleChatSubmit} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder={t.chatPlaceholder}
                    className="min-w-0 flex-1 rounded-md border border-[#8CF2D8]/20 bg-[#071011]/92 px-2.5 py-1 text-[11px] text-[#FFFDF7] placeholder-[#89AAA2]/65 outline-none focus:border-[#8CF2D8]/60"
                  />
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      listening
                        ? 'border-[#FF9EBB]/70 bg-[#FF9EBB]/20 text-[#FFCAD9]'
                        : 'border-[#8CF2D8]/25 bg-[#14292A] text-[#CDE2DC] hover:text-[#FFFDF7]'
                    }`}
                  >
                    {listening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    <span>{listening ? t.listeningBtn : t.voiceBtn}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingPlace || !chatInput.trim()}
                    className="inline-flex items-center gap-1 rounded-md bg-[#8CF2D8] px-2.5 py-1 text-[11px] font-bold text-[#0B1718] transition-colors hover:bg-[#B4F8E6] disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isGeneratingPlace ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    <span>{isGeneratingPlace ? t.generatingBtn : t.travelBtn}</span>
                  </button>
                </form>
              </div>

              {/* Row 2: Compact Real-World 360° Panorama Presets */}
              <div className="mb-1.5 flex items-center gap-1 overflow-x-auto pb-0.5">
                <span className="mr-1 text-[10px] font-medium text-[#89AAA2] whitespace-nowrap">
                  {t.placesLabel}
                </span>
                {WORLD_PRESETS.map((preset) => {
                  const active = snapshot.activePresetId === preset.id;
                  const label = t.presets[preset.id]?.shortName ?? preset.shortName;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset.id)}
                      className={`rounded border px-2 py-0.5 text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-[#FFD166]/65 bg-[#FFD166]/18 text-[#FFE29A]'
                          : 'border-[#8CF2D8]/15 bg-[#112425]/85 text-[#B2CEC6] hover:border-[#8CF2D8]/45 hover:text-[#FFFDF7]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Compact 5 Guided Exercises + Hand Controls + Voice Guide + Slow Glide + Audio */}
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-[#8CF2D8]/15 bg-[#071011]/90 p-0.5">
                  {GUIDED_EXERCISES.map((ex) => {
                    const active = snapshot.exerciseId === ex.id;
                    const exLabel = t.exercises[ex.id]?.shortTitle ?? ex.shortTitle;
                    const exSub = t.exercises[ex.id]?.subtitle ?? ex.subtitle;
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => onSelectExercise(ex.id)}
                        className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#8CF2D8]/20 text-[#8CF2D8]'
                            : 'text-[#B2CEC6] hover:text-[#FFFDF7]'
                        }`}
                        title={exSub}
                      >
                        {exLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {snapshot.mode === 'breathe' && (
                    <label className="flex items-center gap-1 text-[11px] text-[#CDE2DC]">
                      <Wind className="h-3 w-3 text-[#8CF2D8]" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={snapshot.simulatedHandHeight}
                        onChange={(e) => onChangeSimHeight(parseFloat(e.target.value))}
                        className="zen-slider w-14 sm:w-16"
                        aria-label="Simulated Hand Height"
                      />
                      <span className="font-mono-tabular text-[10.5px] text-[#FFD166]">
                        {Math.ceil(snapshot.breathSecondsLeft)}s
                      </span>
                    </label>
                  )}

                  {snapshot.mode === 'pop' && (
                    <span className="font-mono-tabular text-[10.5px] text-[#FFD166]">
                      {snapshot.orbsPopped} {t.freedLabel}
                    </span>
                  )}

                  {snapshot.mode === 'focus' && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono-tabular text-[11px] text-[#FFFDF7]">
                        {formatTime(snapshot.focusSecondsLeft)}
                      </span>
                      <button
                        type="button"
                        onClick={onResetFocusTimer}
                        className="rounded border border-[#8CF2D8]/25 bg-[#14292A] px-1.5 py-0.5 text-[10px] font-medium text-[#FFFDF7] hover:border-[#8CF2D8]/55 cursor-pointer whitespace-nowrap"
                      >
                        {t.resetBtn}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onToggleAutoGlide}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      snapshot.autoGlide
                        ? 'border-[#8CF2D8]/60 bg-[#8CF2D8]/16 text-[#8CF2D8]'
                        : 'border-[#8CF2D8]/20 bg-[#14292A] text-[#9FB8B1] hover:text-[#FFFDF7]'
                    }`}
                    title="Toggle Slow Walk / Gentle Glide Camera"
                  >
                    <Footprints className="h-3 w-3" />
                    <span>{snapshot.autoGlide ? t.autoGlideOn : t.autoGlideOff}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleVoiceGuide}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      snapshot.voiceGuideEnabled
                        ? 'border-[#FFD166]/65 bg-[#FFD166]/18 text-[#FFE29A]'
                        : 'border-[#8CF2D8]/20 bg-[#14292A] text-[#9FB8B1] hover:text-[#FFFDF7]'
                    }`}
                    title="Toggle Spoken Step-by-Step Voice Guide"
                  >
                    {snapshot.voiceGuideEnabled ? (
                      <MessageSquare className="h-3 w-3" />
                    ) : (
                      <MessageSquareOff className="h-3 w-3" />
                    )}
                    <span>{snapshot.voiceGuideEnabled ? t.voiceGuideOn : t.voiceGuideOff}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleMute}
                    className="inline-flex items-center justify-center rounded-md border border-[#8CF2D8]/25 bg-[#14292A] p-1 text-[#CDE2DC] transition-colors hover:text-[#FFFDF7] cursor-pointer"
                    title={snapshot.muted ? 'Unmute Ambient Audio (M)' : 'Mute Ambient Audio (M)'}
                    aria-label={snapshot.muted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {snapshot.muted ? (
                      <VolumeX className="h-3.5 w-3.5 text-[#FFB703]" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5 text-[#8CF2D8]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onToggleSimPalmUp}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      snapshot.leftPalmUp
                        ? 'border-[#8CF2D8]/70 bg-[#8CF2D8]/15 text-[#8CF2D8]'
                        : 'border-[#8CF2D8]/25 bg-[#14292A] text-[#CDE2DC] hover:text-[#FFFDF7]'
                    }`}
                    title="Toggle Left Palm-Up Wrist Menu (P)"
                  >
                    <Hand className="h-3 w-3" />
                    <span>{t.wristBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetView}
                    className="inline-flex items-center justify-center rounded-md border border-[#8CF2D8]/25 bg-[#14292A] p-1 text-[#CDE2DC] transition-colors hover:text-[#FFFDF7] cursor-pointer"
                    title="Re-center View"
                    aria-label="Re-center View"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
