import { GoogleGenAI } from '@google/genai';

export type GeminiTtsVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface TtsGenerateRequest {
  text: string;
  voiceName?: GeminiTtsVoice;
  style?: string;
}

export interface TtsGenerateResponse {
  audioBase64: string;
  mimeType: string;
  voiceName: GeminiTtsVoice;
}

const ALLOWED_VOICES: GeminiTtsVoice[] = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

/**
 * Wrap headerless 16-bit PCM (24kHz mono) in a standard 44-byte RIFF/WAV header
 * ONLY when the upstream payload is raw PCM without a RIFF header.
 */
function ensureWavBuffer(rawBuffer: Buffer, mimeType?: string): { buffer: Buffer; mimeType: string } {
  const hasRiffHeader =
    rawBuffer.length >= 12 &&
    rawBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    rawBuffer.toString('ascii', 8, 12) === 'WAVE';

  if (hasRiffHeader || mimeType === 'audio/wav' || mimeType === 'audio/wave') {
    return { buffer: rawBuffer, mimeType: 'audio/wav' };
  }

  // Fallback for raw L16/PCM payloads (24kHz, mono, 16-bit LE)
  const isRawPcm =
    !mimeType ||
    mimeType.toLowerCase().includes('l16') ||
    mimeType.toLowerCase().includes('pcm');

  if (!isRawPcm) {
    return { buffer: rawBuffer, mimeType };
  }

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = rawBuffer.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return {
    buffer: Buffer.concat([header, rawBuffer]),
    mimeType: 'audio/wav',
  };
}

/**
 * Generate scene narration audio using Gemini 3.8 Flash Lite TTS
 */
export async function generateSpeechPreview(req: TtsGenerateRequest): Promise<TtsGenerateResponse> {
  const cleanText = typeof req.text === 'string' ? req.text.trim() : '';
  if (!cleanText) {
    throw new Error('Narration text is required to generate an audio preview.');
  }
  if (cleanText.length > 2500) {
    throw new Error('Narration text exceeds the 2500-character preview limit.');
  }

  const voiceName: GeminiTtsVoice =
    req.voiceName && ALLOWED_VOICES.includes(req.voiceName) ? req.voiceName : 'Kore';
  const style = typeof req.style === 'string' && req.style.trim() ? req.style.trim() : undefined;

  const ai = getAI();

  const part: any = { text: cleanText };
  if (style) {
    part.speechMetadata = { style };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [part],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const audioPart = parts.find((p) => p.inlineData?.data);
  const rawBase64 = audioPart?.inlineData?.data;
  const rawMimeType = audioPart?.inlineData?.mimeType;

  if (!rawBase64) {
    throw new Error('Gemini TTS did not return any audio data.');
  }

  const decoded = Buffer.from(rawBase64, 'base64');
  const normalized = ensureWavBuffer(decoded, rawMimeType);

  return {
    audioBase64: normalized.buffer.toString('base64'),
    mimeType: normalized.mimeType,
    voiceName,
  };
}
