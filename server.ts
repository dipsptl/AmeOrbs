import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { sanitizeEnvironmentConfig, sanitizeExercise } from './src/world/SmartSceneParser.ts';
import { VERIFIED_PANORAMA_IDS } from './src/world/WorldPresets.ts';
import { LanguageCode } from './src/types/zen.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

const LANGUAGE_NAME_MAP: Record<LanguageCode, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  gu: 'Gujarati (Gujarati script)',
  es: 'Spanish',
  ja: 'Japanese',
};

const SYSTEM_INSTRUCTION = `You are Aura Guide for ZenOrbs, a serene seated 360° real-world natural relaxation sanctuary.
Given a user's request for any real or imagined peaceful place (or seated relaxation exercise) and a target language, return JSON describing:
1) placeName: concise evocative NATURAL LANDSCAPE or NATURE WONDER title written in the requested target language (describe rivers, mountains, wildflowers, ocean cliffs, forests, waterfalls, or lagoons — NEVER include city, town, state, or country names like Kyoto, Udaipur, Kashmir, Swiss, Bali, or Kerala)
2) welcomeLine: 1 calm welcoming sentence (max 24 words) inviting the visitor to relax inside that natural landscape, written in the requested target language (no city names)
3) environmentConfig:
   - panoramaId: MUST be exactly one of [${VERIFIED_PANORAMA_IDS.join(', ')}] — pick the one whose real-world photography best matches the requested setting (e.g., mossy_forest for mossy woods/forest, lilienstein for green river valley/cliffs, meadow_2 for sunny wildflower meadow, forest_slope for lush hillside rainforest, venice_sunset for golden sunset lagoon, misty_pines for foggy pine/cloud forest, kiara_1_dawn for pastel lake dawn, alps_field for alpine mountain wildflower meadow, cape_hill for sunlit coastal ocean cliffs, green_sanctuary for misty green highland hills, rogland_clear_night or satara_night for night/aurora/stars, umhlanga_sunrise or blouberg_sunrise_2 for ocean waves/sunrise, sunflowers_puresky for bright flower park, autumn_forest_04 for autumn woods, drakensberg_solitary_mountain_puresky for open mountains, kloofendal_misty_morning_puresky for calm misty morning)
   - tintColor: soft pastel hex matching the ambiance
   - orbColors: 2 golden/pastel hex strings for foreground glowing orbs
   - butterflies: count (integer 1-6, calm & unobtrusive), primaryColor (hex), secondaryColor (hex), flightSpeed (0.5-1.2)
   - audio: soundscape MUST be one of ['water_stream','ocean_waves','gentle_breeze','bird_chimes']
4) recommendedExercise: MUST be one of ['butterfly_wing_stretch','horizon_neck_gaze','lotus_sky_reach','dewdrop_release','scenic_focus_5m']`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    placeName: { type: Type.STRING },
    welcomeLine: { type: Type.STRING },
    recommendedExercise: { type: Type.STRING },
    environmentConfig: {
      type: Type.OBJECT,
      properties: {
        panoramaId: { type: Type.STRING },
        tintColor: { type: Type.STRING },
        orbColors: { type: Type.ARRAY, items: { type: Type.STRING } },
        butterflies: {
          type: Type.OBJECT,
          properties: {
            count: { type: Type.INTEGER },
            primaryColor: { type: Type.STRING },
            secondaryColor: { type: Type.STRING },
            flightSpeed: { type: Type.NUMBER },
          },
          required: ['count', 'primaryColor', 'secondaryColor', 'flightSpeed'],
        },
        audio: {
          type: Type.OBJECT,
          properties: {
            soundscape: { type: Type.STRING },
          },
          required: ['soundscape'],
        },
      },
      required: ['panoramaId', 'tintColor', 'orbColors', 'butterflies', 'audio'],
    },
  },
  required: ['placeName', 'welcomeLine', 'recommendedExercise', 'environmentConfig'],
};

const ttsCache = new Map<string, string>();

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const configured = Boolean(key && key.trim() && key !== 'MY_GEMINI_API_KEY');
    res.json({ ok: true, geminiConfigured: configured });
  });

  app.post('/api/tts', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const rawLang = typeof req.body?.language === 'string' ? req.body.language : 'en';
    const language: LanguageCode =
      rawLang === 'hi' || rawLang === 'gu' || rawLang === 'es' || rawLang === 'ja' ? rawLang : 'en';

    if (!text || text.length > 400) {
      res.status(400).json({ ok: false, error: 'Valid exercise text is required.' });
      return;
    }

    const cacheKey = `${language}:${text}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ ok: true, configured: true, audioBase64: cached, mimeType: 'audio/wav', cached: true });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({ ok: true, configured: false });
      return;
    }

    try {
      const ttsAi = new GoogleGenAI({
        apiKey,
        apiVersion: 'v1beta',
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const ttsLocaleMap: Record<LanguageCode, string> = {
        en: 'en-US',
        hi: 'hi-IN',
        gu: 'gu-IN',
        es: 'es-ES',
        ja: 'ja-JP',
      };

      const interaction = await ttsAi.interactions.create({
        model: 'gemini-3.8-flash-lite-tts',
        store: false,
        input: [
          {
            type: 'text',
            text,
            annotations: [
              {
                type: 'speech_metadata',
                style:
                  'Warm, loving, gentle, deeply calm, slow-paced meditation teacher speaking softly with soothing breath pauses',
              },
            ],
          },
        ],
        response_format: { type: 'audio' },
        generation_config: {
          speech_config: [
            {
              language: ttsLocaleMap[language],
              voice: 'Zephyr',
            },
          ],
        },
      });

      const base64Audio = interaction.output_audio?.data;
      if (!base64Audio) {
        res.status(502).json({ ok: false, error: 'TTS returned empty audio.' });
        return;
      }

      if (ttsCache.size >= 120) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey) ttsCache.delete(oldestKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ ok: true, configured: true, audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err: unknown) {
      const isTimeout =
        err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      const status = isTimeout
        ? 504
        : typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 502;
      const msg = isTimeout
        ? 'TTS request timed out.'
        : err instanceof Error
          ? err.message
          : 'Unable to reach TTS service.';
      res.status(status >= 400 && status < 600 ? status : 502).json({ ok: false, error: msg });
    }
  });

  app.post('/api/aura/parse-scene', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const rawLang = typeof req.body?.language === 'string' ? req.body.language : 'en';
    const language: LanguageCode =
      rawLang === 'hi' || rawLang === 'gu' || rawLang === 'es' || rawLang === 'ja' ? rawLang : 'en';

    if (!query) {
      res.status(400).json({ ok: false, error: 'Please describe a place or exercise.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({ ok: true, configured: false });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const targetLangName = LANGUAGE_NAME_MAP[language];
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Target language for placeName and welcomeLine: ${targetLangName}\nUser request: "${query}"`,
        config: {
          abortSignal: AbortSignal.timeout(12000),
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const text = (response.text ?? '').trim();
      if (!text) {
        res.status(502).json({ ok: false, error: 'Aura Guide received an empty response from Gemini.' });
        return;
      }

      const parsed = JSON.parse(text) as {
        placeName?: string;
        welcomeLine?: string;
        recommendedExercise?: string;
        environmentConfig?: Record<string, unknown>;
      };

      const sanitized = {
        placeName:
          typeof parsed.placeName === 'string' && parsed.placeName.trim()
            ? parsed.placeName.trim()
            : query,
        welcomeLine:
          typeof parsed.welcomeLine === 'string' && parsed.welcomeLine.trim()
            ? parsed.welcomeLine.trim()
            : `Welcome to ${query}.`,
        environmentConfig: sanitizeEnvironmentConfig(parsed.environmentConfig as never),
        recommendedExercise: sanitizeExercise(parsed.recommendedExercise),
        source: 'gemini' as const,
      };

      res.json({ ok: true, configured: true, result: sanitized });
    } catch (err: unknown) {
      const isTimeout =
        err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      const status = isTimeout
        ? 504
        : typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 502;
      const msg = isTimeout
        ? 'Aura Guide timed out reaching Gemini API.'
        : err instanceof Error
          ? err.message
          : 'Unable to reach Gemini API.';
      res.status(status >= 400 && status < 600 ? status : 502).json({
        ok: false,
        error: msg,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZenOrbs server listening on http://localhost:${PORT}`);
  });
}

void startServer();
