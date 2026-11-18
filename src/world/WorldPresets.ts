import { GuidedExerciseId, GuidedExerciseInfo, WorldPreset } from '../types/zen';

export const VERIFIED_PANORAMA_IDS = [
  'mossy_forest',
  'lilienstein',
  'meadow_2',
  'forest_slope',
  'venice_sunset',
  'misty_pines',
  'kiara_1_dawn',
  'alps_field',
  'cape_hill',
  'green_sanctuary',
  'rogland_clear_night',
  'satara_night',
  'blouberg_sunrise_2',
  'umhlanga_sunrise',
  'spruit_sunrise',
  'sunflowers_puresky',
  'autumn_forest_04',
  'kloofendal_misty_morning_puresky',
  'pond_bridge_night',
  'drakensberg_solitary_mountain_puresky',
] as const;

export function getPanoramaUrl(panoramaId: string): string {
  const safeId = VERIFIED_PANORAMA_IDS.includes(
    panoramaId as (typeof VERIFIED_PANORAMA_IDS)[number]
  )
    ? panoramaId
    : 'mossy_forest';
  return `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${encodeURIComponent(safeId)}.jpg`;
}

export const GUIDED_EXERCISES: GuidedExerciseInfo[] = [
  {
    id: 'butterfly_wing_stretch',
    title: 'Butterfly Wing Stretch',
    shortTitle: 'Wing Stretch',
    mode: 'breathe',
    subtitle: 'Open your arms wide as you inhale and softly release as you exhale',
    voicePrompt:
      'Relax your shoulders... breathe in softly, and open both arms like gentle wings.',
  },
  {
    id: 'horizon_neck_gaze',
    title: 'Horizon Neck Gaze',
    shortTitle: 'Neck Gaze',
    mode: 'breathe',
    subtitle: 'Softly follow the glowing golden butterfly gliding across the horizon',
    voicePrompt:
      'Let your neck feel light... slowly follow the golden butterfly across the quiet horizon.',
  },
  {
    id: 'lotus_sky_reach',
    title: 'Lotus Sky Reach',
    shortTitle: 'Sky Reach',
    mode: 'breathe',
    subtitle: 'Breathe in deeply and slowly lift both hands toward the light',
    voicePrompt:
      'Breathe in slowly... and gently lift both hands toward the warm light.',
  },
  {
    id: 'dewdrop_release',
    title: 'Dewdrop Release',
    shortTitle: 'Dewdrops',
    mode: 'pop',
    subtitle: 'Pinch or tap glowing orbs to release golden motes and butterflies',
    voicePrompt:
      'Touch each glowing dewdrop softly... and breathe out any quiet tension.',
  },
  {
    id: 'scenic_focus_5m',
    title: '5m Scenic Focus',
    shortTitle: '5m Focus',
    mode: 'focus',
    subtitle: 'Rest effortlessly for five minutes as the light softens into calm twilight',
    voicePrompt:
      'Settle comfortably in stillness... let your breath flow slowly with the view.',
  },
];

export const EXERCISE_MAP: Record<GuidedExerciseId, GuidedExerciseInfo> = GUIDED_EXERCISES.reduce(
  (acc, ex) => {
    acc[ex.id] = ex;
    return acc;
  },
  {} as Record<GuidedExerciseId, GuidedExerciseInfo>
);

export const WORLD_PRESETS: WorldPreset[] = [
  {
    id: 'moss_woods',
    shortName: 'Moss Woods',
    placeName: 'Emerald Moss Woods',
    welcomeLine: 'Step inside an ancient mossy woodland bathed in soft emerald light.',
    recommendedExercise: 'lotus_sky_reach',
    environmentConfig: {
      panoramaId: 'mossy_forest',
      panoramaUrl: getPanoramaUrl('mossy_forest'),
      tintColor: '#9ef0c8',
      orbColors: ['#ffd166', '#8cf2d8'],
      butterflies: {
        count: 14,
        primaryColor: '#ffd166',
        secondaryColor: '#8cf2d8',
        flightSpeed: 0.88,
      },
      audio: {
        soundscape: 'water_stream',
      },
    },
  },
  {
    id: 'river_valley',
    shortName: 'River Valley',
    placeName: 'Flowing River Valley',
    welcomeLine: 'Breathe in cool valley air beside a winding river and lush green cliffs.',
    recommendedExercise: 'butterfly_wing_stretch',
    environmentConfig: {
      panoramaId: 'lilienstein',
      panoramaUrl: getPanoramaUrl('lilienstein'),
      tintColor: '#ffe3a8',
      orbColors: ['#ffbe5c', '#95f9e3'],
      butterflies: {
        count: 14,
        primaryColor: '#ffbe0b',
        secondaryColor: '#72efdd',
        flightSpeed: 0.88,
      },
      audio: {
        soundscape: 'water_stream',
      },
    },
  },
  {
    id: 'flower_meadow',
    shortName: 'Flower Meadow',
    placeName: 'Sunlit Wildflower Meadow',
    welcomeLine: 'Rest in a sunlit meadow of wild blossoms and a soft warm breeze.',
    recommendedExercise: 'dewdrop_release',
    environmentConfig: {
      panoramaId: 'meadow_2',
      panoramaUrl: getPanoramaUrl('meadow_2'),
      tintColor: '#ffdae8',
      orbColors: ['#ffd166', '#ffb3cc'],
      butterflies: {
        count: 12,
        primaryColor: '#ffccd5',
        secondaryColor: '#ffd166',
        flightSpeed: 0.84,
      },
      audio: {
        soundscape: 'bird_chimes',
      },
    },
  },
  {
    id: 'rainforest_canopy',
    shortName: 'Rainforest',
    placeName: 'Lush Rainforest Canopy',
    welcomeLine: 'Breathe deeply beneath sunlit forest leaves and tranquil woodland shade.',
    recommendedExercise: 'lotus_sky_reach',
    environmentConfig: {
      panoramaId: 'forest_slope',
      panoramaUrl: getPanoramaUrl('forest_slope'),
      tintColor: '#b7f4c9',
      orbColors: ['#ffd166', '#a8f0c6'],
      butterflies: {
        count: 3,
        primaryColor: '#ffd166',
        secondaryColor: '#56cfe1',
        flightSpeed: 0.88,
      },
      audio: {
        soundscape: 'water_stream',
      },
    },
  },
  {
    id: 'sunset_lagoon',
    shortName: 'Sunset Lagoon',
    placeName: 'Golden Sunset Lagoon',
    welcomeLine: 'Rest beside calm waters as warm amber sunset reflections glow softly.',
    recommendedExercise: 'scenic_focus_5m',
    environmentConfig: {
      panoramaId: 'venice_sunset',
      panoramaUrl: getPanoramaUrl('venice_sunset'),
      tintColor: '#ffcc8f',
      orbColors: ['#ffb703', '#ff9ebb'],
      butterflies: {
        count: 2,
        primaryColor: '#ffb703',
        secondaryColor: '#ffe29a',
        flightSpeed: 0.72,
      },
      audio: {
        soundscape: 'gentle_breeze',
      },
    },
  },
  {
    id: 'pine_mist',
    shortName: 'Pine Cloud',
    placeName: 'Misty Pine Cloud Forest',
    welcomeLine: 'Welcome to a quiet mountain forest of tall pines drifting through silver mist.',
    recommendedExercise: 'dewdrop_release',
    environmentConfig: {
      panoramaId: 'misty_pines',
      panoramaUrl: getPanoramaUrl('misty_pines'),
      tintColor: '#bfece4',
      orbColors: ['#ffd166', '#4cc9f0'],
      butterflies: {
        count: 4,
        primaryColor: '#00b4d8',
        secondaryColor: '#ffd166',
        flightSpeed: 0.92,
      },
      audio: {
        soundscape: 'bird_chimes',
      },
    },
  },
  {
    id: 'dawn_lake',
    shortName: 'Dawn Lake',
    placeName: 'Pastel Dawn Lake',
    welcomeLine: 'Take in cool rose-gold dawn light above tranquil mirror-still waters.',
    recommendedExercise: 'horizon_neck_gaze',
    environmentConfig: {
      panoramaId: 'kiara_1_dawn',
      panoramaUrl: getPanoramaUrl('kiara_1_dawn'),
      tintColor: '#ffe0cc',
      orbColors: ['#ffd166', '#f7b2bd'],
      butterflies: {
        count: 2,
        primaryColor: '#ffd166',
        secondaryColor: '#ffcad4',
        flightSpeed: 0.74,
      },
      audio: {
        soundscape: 'gentle_breeze',
      },
    },
  },
  {
    id: 'alpine_meadow',
    shortName: 'Mountain Valley',
    placeName: 'Alpine Mountain Meadow',
    welcomeLine: 'Breathe crisp mountain air in an open wildflower valley under clear skies.',
    recommendedExercise: 'horizon_neck_gaze',
    environmentConfig: {
      panoramaId: 'alps_field',
      panoramaUrl: getPanoramaUrl('alps_field'),
      tintColor: '#d9f5ff',
      orbColors: ['#ffe66d', '#9bf6ff'],
      butterflies: {
        count: 3,
        primaryColor: '#ffe66d',
        secondaryColor: '#a0c4ff',
        flightSpeed: 0.82,
      },
      audio: {
        soundscape: 'gentle_breeze',
      },
    },
  },
  {
    id: 'coastal_cliffs',
    shortName: 'Ocean Horizon',
    placeName: 'Sunlit Ocean Cliffs',
    welcomeLine: 'Feel the warm sea breeze drifting gently across sunlit coastal hills.',
    recommendedExercise: 'butterfly_wing_stretch',
    environmentConfig: {
      panoramaId: 'cape_hill',
      panoramaUrl: getPanoramaUrl('cape_hill'),
      tintColor: '#ffe8b8',
      orbColors: ['#ffd166', '#90e0ef'],
      butterflies: {
        count: 2,
        primaryColor: '#fff5d6',
        secondaryColor: '#90e0ef',
        flightSpeed: 0.84,
      },
      audio: {
        soundscape: 'ocean_waves',
      },
    },
  },
  {
    id: 'misty_highlands',
    shortName: 'Emerald Hills',
    placeName: 'Misty Highland Sanctuary',
    welcomeLine: 'Rest effortlessly among cool emerald hills and drifting morning mist.',
    recommendedExercise: 'horizon_neck_gaze',
    environmentConfig: {
      panoramaId: 'green_sanctuary',
      panoramaUrl: getPanoramaUrl('green_sanctuary'),
      tintColor: '#d4f5df',
      orbColors: ['#ffe066', '#a8f0c6'],
      butterflies: {
        count: 3,
        primaryColor: '#ffd166',
        secondaryColor: '#d8f3dc',
        flightSpeed: 0.8,
      },
      audio: {
        soundscape: 'bird_chimes',
      },
    },
  },
];
