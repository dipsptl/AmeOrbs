import {
  GUJARATI_TO_HINDI_PHONETIC,
  LANGUAGE_LOCALE_MAP,
} from '../i18n/translations';
import { AuraSceneResponse, LanguageCode } from '../types/zen';
import { parseSceneLocally } from './SmartSceneParser';

export interface AuraRequestResult {
  scene: AuraSceneResponse;
  warning?: string;
}

/**
 * Calls the server-side Gemini Aura Guide endpoint (/api/aura/parse-scene).
 * Falls back transparently to the built-in 360° biome & region parser when
 * Gemini is not configured or temporarily unavailable.
 */
export async function requestAuraScene(
  query: string,
  language: LanguageCode = 'en'
): Promise<AuraRequestResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { scene: parseSceneLocally('Moss Woods', language) };
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch('/api/aura/parse-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed, language }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      configured?: boolean;
      result?: AuraSceneResponse;
      error?: string;
    } | null;

    if (!res.ok || !data?.ok) {
      const errMsg = data?.error || `Aura Guide service returned status ${res.status}.`;
      return {
        scene: parseSceneLocally(trimmed, language),
        warning: `${errMsg} Using smart 360° panorama selector.`,
      };
    }

    if (data.configured && data.result) {
      return { scene: data.result };
    }

    return { scene: parseSceneLocally(trimmed, language) };
  } catch {
    return {
      scene: parseSceneLocally(trimmed, language),
      warning: 'Connection timed out: matched real 360° panorama locally.',
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export interface SpeakVoiceOptions {
  voiceGuideEnabled: boolean;
  muted: boolean;
  language: LanguageCode;
  interrupt?: boolean;
}

const audioUrlCache = new Map<string, string>();
let activeAudio: HTMLAudioElement | null = null;
let speechSeq = 0;

function base64ToWavUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function playAudioUrl(url: string, seq: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (seq !== speechSeq) {
      resolve(false);
      return;
    }
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }

    const audio = new Audio(url);
    audio.volume = 0.78;
    activeAudio = audio;

    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      resolve(true);
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      resolve(false);
    };

    void audio.play().catch(() => {
      if (activeAudio === audio) activeAudio = null;
      resolve(false);
    });
  });
}

function speakViaBrowserSynth(
  text: string,
  language: LanguageCode,
  interrupt: boolean
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    const synth = window.speechSynthesis;
    if (!interrupt && synth.speaking) {
      return;
    }
    if (interrupt) {
      synth.cancel();
    }

    const voices = synth.getVoices();
    let targetLocale = LANGUAGE_LOCALE_MAP[language] || 'en-US';
    let speakText = text;

    // Gujarati fallback: when browser lacks a `gu-IN` voice, use `hi-IN` with Devanagari Gujarati phonetics
    if (language === 'gu') {
      const hasGuVoice = voices.some((v) => v.lang.toLowerCase().startsWith('gu'));
      if (!hasGuVoice) {
        const phonetic = GUJARATI_TO_HINDI_PHONETIC[text.trim()];
        if (phonetic) {
          speakText = phonetic;
          targetLocale = 'hi-IN';
        }
      }
    }

    const langPrefix = targetLocale.split('-')[0].toLowerCase();
    const utter = new SpeechSynthesisUtterance(speakText);
    utter.lang = targetLocale;
    utter.rate = 0.74;
    utter.pitch = 0.96;
    utter.volume = 0.76;

    if (voices.length > 0) {
      const exactMatches = voices.filter(
        (v) => v.lang.toLowerCase() === targetLocale.toLowerCase()
      );
      const prefixMatches = voices.filter((v) =>
        v.lang.toLowerCase().startsWith(langPrefix)
      );
      const pool = exactMatches.length > 0 ? exactMatches : prefixMatches;

      if (pool.length > 0) {
        const softFemale = pool.find((v) =>
          /(natural|neural|google|swara|lekha|kalpana|heera|samantha|aria|serena|kyoko|monica|paulina|female)/i.test(
            v.name
          )
        );
        utter.voice = softFemale ?? pool[0];
      }
    }

    synth.speak(utter);
  } catch {
    // Ignore speech synthesis restrictions
  }
}

export function stopCalmVoice(): void {
  speechSeq += 1;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

/**
 * Speaks ONLY guided exercise cues in a lovely, gentle, calm voice.
 * Prefers server-side Gemini 3.8 TTS (Zephyr) with client blob caching, and falls back
 * gracefully to browser Web Speech (with automatic `gu-IN` -> `hi-IN` phonetic Hindi
 * voice support when the device has no native Gujarati voice installed).
 */
export async function speakCalmVoice(
  text: string,
  options: SpeakVoiceOptions
): Promise<void> {
  const { voiceGuideEnabled, muted, language, interrupt = true } = options;
  const trimmed = text.trim();
  if (!voiceGuideEnabled || muted || !trimmed) return;

  if (!interrupt) {
    const synthSpeaking =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.speaking;
    if ((activeAudio && !activeAudio.paused) || synthSpeaking) {
      return;
    }
  } else {
    stopCalmVoice();
  }

  const seq = ++speechSeq;
  const cacheKey = `${language}:${trimmed}`;
  const cachedUrl = audioUrlCache.get(cacheKey);
  if (cachedUrl) {
    const played = await playAudioUrl(cachedUrl, seq);
    if (played || seq !== speechSeq) return;
  }

  const controller = new AbortController();
  const timerId = globalThis.setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, language }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      configured?: boolean;
      audioBase64?: string;
    } | null;

    if (seq !== speechSeq) return;

    if (res.ok && data?.ok && data.configured && data.audioBase64) {
      const url = base64ToWavUrl(data.audioBase64);
      if (audioUrlCache.size >= 80) {
        const firstKey = audioUrlCache.keys().next().value;
        if (firstKey) {
          const oldUrl = audioUrlCache.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          audioUrlCache.delete(firstKey);
        }
      }
      audioUrlCache.set(cacheKey, url);
      const played = await playAudioUrl(url, seq);
      if (played) return;
    }
  } catch {
    // Fall through cleanly to browser Web Speech engine
  } finally {
    globalThis.clearTimeout(timerId);
  }

  if (seq !== speechSeq) return;
  speakViaBrowserSynth(trimmed, language, interrupt);
}
