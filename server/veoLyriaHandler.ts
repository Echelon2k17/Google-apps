import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import type { Response } from 'express';

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

export interface VeoGenerateRequest {
  prompt?: string;
  image?: {
    dataUrl?: string; // base64 data URL e.g. "data:image/jpeg;base64,..."
    base64?: string;
    mimeType?: string;
  };
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
}

/**
 * Generate video using Veo 3: veo-3.1-fast-generate-preview
 * Supports text-to-video and image-to-video (animate images)
 */
export async function generateVeoVideo(req: VeoGenerateRequest): Promise<{ operationName: string }> {
  const ai = getAI();
  const model = 'veo-3.1-fast-generate-preview';
  const aspectRatio = req.aspectRatio || '16:9';
  const prompt = req.prompt || (req.image ? 'Animate this image with cinematic camera motion and vivid lighting' : 'A cinematic high definition scene');

  const config: any = {
    numberOfVideos: 1,
    resolution: req.resolution || '720p',
    aspectRatio,
  };

  // Check if image animation is requested
  if (req.image && (req.image.dataUrl || req.image.base64)) {
    let base64String = req.image.base64 || '';
    let mimeType = req.image.mimeType || 'image/png';

    if (req.image.dataUrl) {
      const match = req.image.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64String = match[2];
      } else {
        base64String = req.image.dataUrl;
      }
    }

    const operation = await ai.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: base64String,
        mimeType,
      },
      config,
    });

    if (!operation?.name) {
      throw new Error('Veo video generation operation returned no operation name.');
    }

    return { operationName: operation.name };
  }

  // Text-to-video generation
  const operation = await ai.models.generateVideos({
    model,
    prompt,
    config,
  });

  if (!operation?.name) {
    throw new Error('Veo video generation operation returned no operation name.');
  }

  return { operationName: operation.name };
}

/**
 * Poll Veo video generation status
 */
export async function checkVeoStatus(operationName: string): Promise<{ done: boolean; error?: string }> {
  if (!operationName) {
    throw new Error('Missing operationName parameter.');
  }

  const ai = getAI();
  const op = new GenerateVideosOperation();
  op.name = operationName;

  const updated = await ai.operations.getVideosOperation({ operation: op });

  if (updated.error) {
    return {
      done: true,
      error: typeof updated.error === 'string' ? updated.error : (updated.error as any).message || 'Video generation failed',
    };
  }

  return {
    done: !!updated.done,
  };
}

/**
 * Download completed Veo video and stream directly to client
 */
export async function downloadVeoVideo(operationName: string, res: Response): Promise<void> {
  if (!operationName) {
    res.status(400).json({ error: 'Missing operationName parameter.' });
    return;
  }

  const ai = getAI();
  const apiKey = process.env.GEMINI_API_KEY || '';
  const op = new GenerateVideosOperation();
  op.name = operationName;

  const updated = await ai.operations.getVideosOperation({ operation: op });
  const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

  if (!uri) {
    res.status(404).json({ error: 'Generated video URI not found in operation response.' });
    return;
  }

  const videoRes = await fetch(uri, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!videoRes.ok) {
    throw new Error(`Failed to fetch video stream from Gemini: ${videoRes.statusText}`);
  }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', 'attachment; filename="veo-video.mp4"');

  const arrayBuffer = await videoRes.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
}

/**
 * Generate music using Lyria: lyria-3-clip-preview (up to 30s) or lyria-3-pro-preview (full tracks)
 */
export async function generateLyriaMusic(params: {
  prompt: string;
  isFullLength?: boolean;
}): Promise<{ audioBase64: string; mimeType: string; lyrics?: string }> {
  const ai = getAI();
  const model = params.isFullLength ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
  const prompt = params.prompt || 'A modern cinematic soundtrack with rhythmic bass and electronic energy';

  const response = await ai.models.generateContentStream({
    model,
    contents: prompt,
  });

  let audioBase64 = '';
  let lyrics = '';
  let mimeType = 'audio/wav';

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
      }
      if (part.text && !lyrics) {
        lyrics = part.text;
      }
    }
  }

  if (!audioBase64) {
    throw new Error('Lyria did not return audio data for this prompt.');
  }

  return {
    audioBase64,
    mimeType,
    lyrics: lyrics || undefined,
  };
}
