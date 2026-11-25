import { GoogleGenAI, ThinkingLevel } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export interface GeneratePlanRequest {
  description: string;
  aspectRatio?: '9:16' | '16:9';
  durationSec?: number;
  visualStyle?: 'cyber' | 'minimal' | 'cosmic' | 'sunset' | 'emerald' | 'crimson';
  audioMood?: 'ambient' | 'energetic' | 'lofi' | 'cinematic' | 'acoustic' | 'mute';
  privacyStatus?: 'unlisted' | 'private' | 'public';
}

export interface ScenePlan {
  id: string;
  sceneNumber: number;
  heading: string;
  subheading: string;
  narration: string;
  badge: string;
  metricValue?: string;
  metricLabel?: string;
  visualIcon: string;
  visualAnimation: 'pulse' | 'zoom' | 'float' | 'scanline' | 'radar';
  backgroundStyle: 'gradient_waves' | 'particle_matrix' | 'starfield' | 'geometric_grid' | 'glowing_rings' | 'aurora';
  bgColors: [string, string, string];
  duration: number;
  transition?: 'fade' | 'slide' | 'zoom' | 'none';
  emotionalIntensity?: number;
}

export interface YouTubeMetadataPlan {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  categoryName: string;
  privacyStatus: 'unlisted' | 'private' | 'public';
  aspectRatio: '9:16' | '16:9';
  visualStyle: string;
  audioMood: string;
}

export interface VideoPlanResponse {
  veoPrompt: string;
  musicPrompt: string;
  youtube: YouTubeMetadataPlan;
  scenes: ScenePlan[];
}

export async function generateVideoPlan(req: GeneratePlanRequest): Promise<VideoPlanResponse> {
  const {
    description,
    aspectRatio = '9:16',
    durationSec = 30,
    visualStyle = 'cyber',
    audioMood = 'cinematic',
    privacyStatus = 'unlisted',
  } = req;

  const targetSceneCount = Math.max(3, Math.min(6, Math.round(durationSec / 6)));
  const avgSceneDuration = Math.round(durationSec / targetSceneCount);

  const styleColorPresets: Record<string, [string, string, string]> = {
    cyber: ['#090d16', '#1e1b4b', '#06b6d4'],
    minimal: ['#0f172a', '#1e293b', '#6366f1'],
    cosmic: ['#050515', '#2e1065', '#a855f7'],
    sunset: ['#1c1917', '#451a03', '#f97316'],
    emerald: ['#022c22', '#064e3b', '#10b981'],
    crimson: ['#18050e', '#4c0519', '#f43f5e'],
  };

  const baseColors = styleColorPresets[visualStyle] || styleColorPresets.cyber;

  const systemInstruction = `You are a YouTube storyteller and SEO strategist.
Given a user's story or topic, produce a cohesive multi-scene storyboard and YouTube metadata package in valid JSON.

Required top-level JSON fields:
- "youtube": object with:
  - "title": Engaging YouTube title under 90 characters.
  - "description": Concise YouTube description summarizing the story with timestamps, 4-6 hashtags (#Shorts if 9:16), and a call to action.
  - "tags": Array of 10-14 relevant search keywords/tags.
  - "categoryId": Standard YouTube category ID ("24" Entertainment, "1" Film & Animation, "28" Science & Technology, "27" Education, "22" People & Blogs).
  - "categoryName": Human-readable name for the chosen category.
- "scenes": Array of exactly ${targetSceneCount} cohesive narrative scenes:
  - "heading": Punchy 3-6 word scene title.
  - "subheading": 1 crisp sentence supporting the beat.
  - "narration": Natural spoken voiceover (10-16 words per scene).
  - "badge": Short label (e.g., "CHAPTER 1", "THE TURN", "CLIMAX", "FINALE").
  - "metricValue": Optional short highlight stat if relevant, else null.
  - "metricLabel": Optional short label for the metric, else null.
  - "visualIcon": One of ['zap', 'star', 'trending-up', 'cpu', 'shield', 'sparkles', 'flame', 'target', 'globe', 'compass', 'lightbulb', 'atom'].
  - "visualAnimation": One of ['pulse', 'zoom', 'float', 'scanline', 'radar'].
  - "backgroundStyle": One of ['gradient_waves', 'particle_matrix', 'starfield', 'geometric_grid', 'glowing_rings', 'aurora'].
  - "transition": One of ['fade', 'slide', 'zoom', 'none'].
  - "duration": Integer seconds, roughly ${avgSceneDuration}s each.
  - "emotionalIntensity": Integer 1 to 100 representing emotional intensity of this scene.`;

  const prompt = `Story or context: "${description}"
Format: ${aspectRatio} (${aspectRatio === '9:16' ? 'YouTube Shorts' : '16:9'}), ~${durationSec}s total (${targetSceneCount} scenes), theme ${visualStyle}, audio mood ${audioMood}.
Return the complete JSON object.`;

  const ai = getAI();
  let response: any = null;
  let lastErr: any = null;

  const attemptsConfig: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
  ];

  for (let attempt = 0; attempt < attemptsConfig.length; attempt++) {
    const cfg = attemptsConfig[attempt];
    try {
      response = await ai.models.generateContent({
        model: cfg.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: cfg.thinkingLevel },
        },
      });
      break;
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || '');
      const status = err?.status;
      const isTransient =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        msg.includes('"code":503') ||
        msg.includes('UNAVAILABLE');
      if (!isTransient || attempt === attemptsConfig.length - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }

  if (!response) {
    throw lastErr || new Error('Gemini API request failed.');
  }

  const rawText = (response.text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  if (!rawText) {
    throw new Error('Gemini returned an empty response while generating the video plan.');
  }

  const parsed = JSON.parse(rawText);

  const veoPrompt =
    typeof parsed.veoPrompt === 'string' && parsed.veoPrompt.trim().length > 15
      ? parsed.veoPrompt.trim()
      : `Cinematic film scene depicting: ${description}. Rich atmospheric lighting, smooth slow camera motion, shallow depth of field, ultra-detailed textures, natural movement.`;

  const musicPrompt =
    typeof parsed.musicPrompt === 'string' && parsed.musicPrompt.trim().length > 5
      ? parsed.musicPrompt.trim()
      : `Atmospheric ${audioMood} soundtrack with warm synth pads and gentle rhythmic momentum`;

  const youtubeTitle = parsed.youtube?.title || `${description.slice(0, 65)} | Story`;
  const youtubeDescription = parsed.youtube?.description || `${description}\n\n#YouTube #Story`;
  const youtubeTags =
    Array.isArray(parsed.youtube?.tags) && parsed.youtube.tags.length > 0
      ? parsed.youtube.tags.map((t: any) => String(t).trim()).filter(Boolean)
      : ['story', 'ai video', 'youtube', 'creative', 'shorts'];
  const categoryId = String(parsed.youtube?.categoryId || '24');
  const categoryName = parsed.youtube?.categoryName || 'Entertainment';

  const rawScenes: any[] = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  const scenes: ScenePlan[] = rawScenes.map((sc: any, idx: number) => {
    const sceneNum = idx + 1;
    const duration = Number(sc.duration) || avgSceneDuration;
    return {
      id: `scene-${sceneNum}-${Date.now().toString(36)}`,
      sceneNumber: sceneNum,
      heading: sc.heading || `Scene ${sceneNum}`,
      subheading: sc.subheading || sc.narration || '',
      narration: sc.narration || sc.subheading || 'Watch as the story unfolds.',
      badge: sc.badge || `PART ${sceneNum}`,
      metricValue: sc.metricValue || undefined,
      metricLabel: sc.metricLabel || undefined,
      visualIcon: sc.visualIcon || 'sparkles',
      visualAnimation: sc.visualAnimation || 'pulse',
      backgroundStyle: sc.backgroundStyle || 'gradient_waves',
      bgColors: Array.isArray(sc.bgColors) && sc.bgColors.length === 3 ? sc.bgColors : baseColors,
      duration: Math.max(3, Math.min(15, duration)),
      transition: ['fade', 'slide', 'zoom', 'none'].includes(sc.transition)
        ? sc.transition
        : idx % 3 === 1
        ? 'slide'
        : idx % 3 === 2
        ? 'zoom'
        : 'fade',
      emotionalIntensity:
        typeof sc.emotionalIntensity === 'number' && sc.emotionalIntensity >= 1 && sc.emotionalIntensity <= 100
          ? Math.round(sc.emotionalIntensity)
          : Math.min(98, Math.max(30, 45 + Math.round((idx / Math.max(1, rawScenes.length - 1)) * 45))),
    };
  });

  if (scenes.length === 0) {
    scenes.push(...createFallbackScenes(description, targetSceneCount, avgSceneDuration, baseColors));
  }

  return {
    veoPrompt,
    musicPrompt,
    youtube: {
      title: youtubeTitle.slice(0, 100),
      description: youtubeDescription,
      tags: youtubeTags.slice(0, 20),
      categoryId,
      categoryName,
      privacyStatus,
      aspectRatio,
      visualStyle,
      audioMood,
    },
    scenes,
  };
}

function createFallbackScenes(
  description: string,
  count: number,
  avgDuration: number,
  baseColors: [string, string, string]
): ScenePlan[] {
  const titles = [
    'The Beginning',
    'The Turning Point',
    'Rising Tension',
    'The Discovery',
    'The Finale',
  ];
  const badges = ['OPENING', 'CONTEXT', 'TURNING POINT', 'CLIMAX', 'FINALE'];
  const icons = ['sparkles', 'compass', 'flame', 'lightbulb', 'star'];

  return Array.from({ length: count }, (_, i) => ({
    id: `scene-${i + 1}-${Math.random().toString(36).substring(7)}`,
    sceneNumber: i + 1,
    heading: titles[i % titles.length],
    subheading: `${description.slice(0, 65)}...`,
    narration: `Chapter ${i + 1}: ${description.slice(0, 80)}`,
    badge: badges[i % badges.length],
    visualIcon: icons[i % icons.length],
    visualAnimation: 'pulse',
    backgroundStyle: 'gradient_waves',
    bgColors: baseColors,
    duration: avgDuration,
    transition: (['fade', 'slide', 'zoom', 'fade', 'slide'][i % 5]) as 'fade' | 'slide' | 'zoom' | 'none',
    emotionalIntensity: [55, 70, 82, 95, 75][i % 5],
  }));
}

function createCompleteFallback(
  description: string,
  aspectRatio: '9:16' | '16:9',
  durationSec: number,
  visualStyle: string,
  audioMood: string,
  privacyStatus: 'unlisted' | 'private' | 'public',
  baseColors: [string, string, string]
): VideoPlanResponse {
  const shortSnippet = description.length > 55 ? description.slice(0, 55) + '...' : description;
  const count = Math.max(3, Math.min(6, Math.round(durationSec / 6)));
  const avgDuration = Math.round(durationSec / count);

  return {
    veoPrompt: `Cinematic atmospheric film scene illustrating: ${description}. Smooth camera motion, dramatic natural lighting, crisp details, rich depth of field.`,
    musicPrompt: `Evocative ${audioMood} film score matching the mood of the story`,
    youtube: {
      title: `${shortSnippet}`.slice(0, 95),
      description: `${description}\n\n${aspectRatio === '9:16' ? '#Shorts ' : ''}#Storytelling #YouTube`,
      tags: ['story', 'ai video', 'youtube', 'cinematic', 'creative', 'shorts'],
      categoryId: '24',
      categoryName: 'Entertainment',
      privacyStatus,
      aspectRatio,
      visualStyle,
      audioMood,
    },
    scenes: createFallbackScenes(description, count, avgDuration, baseColors),
  };
}
