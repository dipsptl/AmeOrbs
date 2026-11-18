import { TRANSLATIONS } from '../i18n/translations';
import {
  AuraSceneResponse,
  EnvironmentConfig,
  GuidedExerciseId,
  LanguageCode,
  SoundscapeType,
} from '../types/zen';
import {
  getPanoramaUrl,
  VERIFIED_PANORAMA_IDS,
  WORLD_PRESETS,
} from './WorldPresets';

const VALID_SOUNDSCAPES: SoundscapeType[] = [
  'water_stream',
  'ocean_waves',
  'gentle_breeze',
  'bird_chimes',
];

const VALID_EXERCISES: GuidedExerciseId[] = [
  'butterfly_wing_stretch',
  'horizon_neck_gaze',
  'lotus_sky_reach',
  'dewdrop_release',
  'scenic_focus_5m',
];

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const num = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, num));
}

function safeHex(val: unknown, fallback: string): string {
  if (typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val.trim())) {
    return val.trim();
  }
  return fallback;
}

export function sanitizePanoramaId(raw: unknown, fallback = 'mossy_forest'): string {
  if (typeof raw === 'string') {
    const clean = raw.trim().replace(/\.jpg$/i, '');
    if (
      VERIFIED_PANORAMA_IDS.includes(clean as (typeof VERIFIED_PANORAMA_IDS)[number])
    ) {
      return clean;
    }
  }
  return fallback;
}

export function sanitizeEnvironmentConfig(
  raw: Partial<EnvironmentConfig> | undefined
): EnvironmentConfig {
  const def = WORLD_PRESETS[0].environmentConfig;
  const panoramaId = sanitizePanoramaId(raw?.panoramaId, def.panoramaId);
  const soundscape = VALID_SOUNDSCAPES.includes(raw?.audio?.soundscape as SoundscapeType)
    ? (raw!.audio!.soundscape as SoundscapeType)
    : def.audio.soundscape;

  return {
    panoramaId,
    panoramaUrl: getPanoramaUrl(panoramaId),
    tintColor: safeHex(raw?.tintColor, def.tintColor),
    orbColors: [
      safeHex(raw?.orbColors?.[0], def.orbColors[0]),
      safeHex(raw?.orbColors?.[1], def.orbColors[1]),
    ],
    butterflies: {
      count: Math.round(clamp(raw?.butterflies?.count, 1, 12, def.butterflies.count)),
      primaryColor: safeHex(raw?.butterflies?.primaryColor, def.butterflies.primaryColor),
      secondaryColor: safeHex(raw?.butterflies?.secondaryColor, def.butterflies.secondaryColor),
      flightSpeed: clamp(raw?.butterflies?.flightSpeed, 0.4, 1.8, def.butterflies.flightSpeed),
    },
    audio: {
      soundscape,
    },
  };
}

export function sanitizeExercise(
  raw: unknown,
  fallback: GuidedExerciseId = 'lotus_sky_reach'
): GuidedExerciseId {
  if (typeof raw === 'string' && VALID_EXERCISES.includes(raw as GuidedExerciseId)) {
    return raw as GuidedExerciseId;
  }
  return fallback;
}

function localizedFallbackWelcome(place: string, language: LanguageCode): string {
  switch (language) {
    case 'hi':
      return `${place} में आपका स्वागत है। गहरी सांस लें और शांत 360° दृश्य का आनंद लें।`;
    case 'gu':
      return `${place} માં આપનું સ્વાગત છે. ઊંડો શ્વાસ લો અને શાંત 360° દૃશ્ય માણો.`;
    case 'es':
      return `Bienvenido a ${place}. Respira con calma y contempla esta vista real en 360°.`;
    case 'ja':
      return `${place}へようこそ。深く呼吸をして、穏やかな360°の風景をお楽しみください。`;
    default:
      return `Welcome to ${place}. Breathe calmly and immerse yourself in this peaceful 360° view.`;
  }
}

/**
 * Intelligent built-in scene parser matching real-world biomes, climates, regions,
 * and exercises to verified Poly Haven 360° equirectangular photography.
 */
export function parseSceneLocally(
  query: string,
  language: LanguageCode = 'en'
): AuraSceneResponse {
  const q = query.trim();
  const lower = q.toLowerCase();

  let detectedExercise: GuidedExerciseId | null = null;
  if (/(wing|stretch|chest|arms|पंख|પાંખ|alas|羽)/.test(lower)) {
    detectedExercise = 'butterfly_wing_stretch';
  } else if (/(neck|gaze|horizon|shoulder|गर्दन|ગરદન|cuello|首)/.test(lower)) {
    detectedExercise = 'horizon_neck_gaze';
  } else if (/(reach|sky|lotus|breath|inhale|आकाश|આકાશ|શ્વાસ|सांस|alcance)/.test(lower)) {
    detectedExercise = 'lotus_sky_reach';
  } else if (/(dew|pop|orb|release|bubble|ओस|ઝાકળ|rocío|しずく)/.test(lower)) {
    detectedExercise = 'dewdrop_release';
  } else if (/(focus|5m|five|timer|meditat|twilight|ध्यान|ધ્યાન|enfoque|瞑想)/.test(lower)) {
    detectedExercise = 'scenic_focus_5m';
  }

  for (const preset of WORLD_PRESETS) {
    if (
      lower.includes(preset.id.replace('_', ' ')) ||
      lower.includes(preset.shortName.toLowerCase())
    ) {
      const tr = TRANSLATIONS[language].presets[preset.id];
      return {
        placeName: tr?.placeName ?? preset.placeName,
        welcomeLine: tr?.welcomeLine ?? preset.welcomeLine,
        environmentConfig: structuredClone(preset.environmentConfig),
        recommendedExercise: detectedExercise ?? preset.recommendedExercise,
        source: 'preset',
      };
    }
  }

  const cleanedName = q
    .replace(/^(take me to|go to|visit|show me|open|fly to|i want to see|let's go to)\s+/i, '')
    .trim();
  const displayPlace =
    cleanedName.length > 0
      ? cleanedName.replace(/\b\w/g, (c) => c.toUpperCase())
      : TRANSLATIONS[language].brandName;

  const makeScene = (
    panoramaId: string,
    tintColor: string,
    orbColors: [string, string],
    butterflies: { count: number; primaryColor: string; secondaryColor: string; flightSpeed: number },
    soundscape: SoundscapeType,
    fallbackExercise: GuidedExerciseId
  ): AuraSceneResponse => ({
    placeName: displayPlace,
    welcomeLine: localizedFallbackWelcome(displayPlace, language),
    environmentConfig: {
      panoramaId,
      panoramaUrl: getPanoramaUrl(panoramaId),
      tintColor,
      orbColors,
      butterflies,
      audio: { soundscape },
    },
    recommendedExercise: detectedExercise ?? fallbackExercise,
    source: 'local',
  });

  // Night / Aurora / Starry Lake
  if (/(aurora|northern light|iceland|norway|arctic|night|star|midnight|रात|રાત|noche|夜)/.test(lower)) {
    return makeScene(
      'rogland_clear_night',
      '#a8e0ff',
      ['#80ffdb', '#ffd166'],
      { count: 2, primaryColor: '#80ffdb', secondaryColor: '#b8c0ff', flightSpeed: 0.72 },
      'gentle_breeze',
      'scenic_focus_5m'
    );
  }

  // Ocean / Beach / Coast / Sea / Island
  if (/(ocean|sea|beach|island|cliff|coast|shore|wave|समुद्र|દરિયો|playa|海)/.test(lower)) {
    return makeScene(
      'umhlanga_sunrise',
      '#ffe5b8',
      ['#ffd166', '#90e0ef'],
      { count: 2, primaryColor: '#ffffff', secondaryColor: '#90e0ef', flightSpeed: 0.85 },
      'ocean_waves',
      'butterfly_wing_stretch'
    );
  }

  // River / Waterfall / Stream / Lake / Lagoon
  if (/(river|stream|waterfall|lagoon|lake|pond|brook|नदी|નદી|río|川|湖)/.test(lower)) {
    return makeScene(
      'lilienstein',
      '#c8f5e4',
      ['#ffd166', '#8cf2d8'],
      { count: 2, primaryColor: '#ffd166', secondaryColor: '#72efdd', flightSpeed: 0.85 },
      'water_stream',
      'lotus_sky_reach'
    );
  }

  // Sunflower / Blossom / Wildflower / Meadow / Garden
  if (/(sakura|cherry|meadow|flower|garden|sunflower|blossom|फूल|ફૂલ|jardín|桜|花)/.test(lower)) {
    return makeScene(
      'sunflowers_puresky',
      '#ffe7a8',
      ['#ffd166', '#ffb3cc'],
      { count: 3, primaryColor: '#ffd166', secondaryColor: '#ffcad4', flightSpeed: 0.8 },
      'bird_chimes',
      'dewdrop_release'
    );
  }

  // Sunset / Dusk / Evening
  if (/(sunset|dusk|golden|evening|सूर्यास्त|સાંજ|atardecer|夕暮れ)/.test(lower)) {
    return makeScene(
      'blouberg_sunrise_2',
      '#ffcca8',
      ['#ffb703', '#ff9ebb'],
      { count: 2, primaryColor: '#ffb703', secondaryColor: '#ffcad4', flightSpeed: 0.74 },
      'gentle_breeze',
      'scenic_focus_5m'
    );
  }

  // Autumn / Fall Woods
  if (/(autumn|fall|maple|woods|पतझड़|પાનખર|otoño|紅葉)/.test(lower)) {
    return makeScene(
      'autumn_forest_04',
      '#ffd9a8',
      ['#ffb703', '#fb8500'],
      { count: 2, primaryColor: '#ffd166', secondaryColor: '#ff9ebb', flightSpeed: 0.78 },
      'gentle_breeze',
      'horizon_neck_gaze'
    );
  }

  // Misty Hills / Alps / Mountains / Tea Valley
  if (/(mountain|alps|himalaya|hill|valley|mist|fog|पहाड़|પર્વત|montaña|山)/.test(lower)) {
    return makeScene(
      'drakensberg_solitary_mountain_puresky',
      '#d8f0ff',
      ['#ffe66d', '#9bf6ff'],
      { count: 2, primaryColor: '#ffe66d', secondaryColor: '#9bf6ff', flightSpeed: 0.82 },
      'gentle_breeze',
      'horizon_neck_gaze'
    );
  }

  // Forest / Jungle / Woods default
  return makeScene(
    'kloofendal_misty_morning_puresky',
    '#d9f5e6',
    ['#ffd166', '#8cf2d8'],
    { count: 2, primaryColor: '#ffd166', secondaryColor: '#8cf2d8', flightSpeed: 0.8 },
    'bird_chimes',
    'lotus_sky_reach'
  );
}
