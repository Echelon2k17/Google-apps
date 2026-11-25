import React, { useState, useRef } from 'react';
import {
  Video,
  Image as ImageIcon,
  Music,
  Sparkles,
  Upload,
  Play,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Radio,
  FileMusic,
  Youtube,
} from 'lucide-react';

interface VeoLyriaStudioProps {
  onVeoVideoGenerated: (videoBlob: Blob, videoUrl: string, prompt: string, aspectRatio: '16:9' | '9:16') => void;
  onLyriaMusicGenerated: (audioUrl: string, audioBlob: Blob, prompt: string) => void;
}

export const VeoLyriaStudio: React.FC<VeoLyriaStudioProps> = ({
  onVeoVideoGenerated,
  onLyriaMusicGenerated,
}) => {
  const [activeMode, setActiveMode] = useState<'veo-text' | 'veo-image' | 'lyria-music'>('veo-text');

  // Veo Text State
  const [veoPrompt, setVeoPrompt] = useState('Cinematic aerial drone shot of neon-lit Tokyo in rain, 4k ultra-detailed reflections');
  const [veoAspect, setVeoAspect] = useState<'16:9' | '9:16'>('16:9');

  // Veo Image State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('image/png');
  const [imageMotionPrompt, setImageMotionPrompt] = useState('Subtle camera push-in with realistic cinematic lighting and natural movement');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lyria Music State
  const [lyriaPrompt, setLyriaPrompt] = useState('Upbeat modern electronic synthwave with rhythmic bass and energetic melodic pulse');
  const [isFullLength, setIsFullLength] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);

  // Status & Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedMimeType(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Veo Video Generation Handler
  const handleGenerateVeo = async (isImageMode: boolean) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(15);
    setStatusMessage('Initiating Veo 3 model (veo-3.1-fast-generate-preview)...');

    try {
      const payload: any = {
        aspectRatio: veoAspect,
        resolution: '720p',
      };

      if (isImageMode) {
        if (!uploadedImage) {
          throw new Error('Please select or upload a photo to animate.');
        }
        payload.prompt = imageMotionPrompt;
        payload.image = {
          dataUrl: uploadedImage,
          mimeType: uploadedMimeType,
        };
      } else {
        if (!veoPrompt.trim()) {
          throw new Error('Please enter a video prompt description.');
        }
        payload.prompt = veoPrompt;
      }

      // Step 1: Start Operation
      const initRes = await fetch('/api/veo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${initRes.status}: Failed to initiate Veo generation`);
      }

      const { operationName } = await initRes.json();
      if (!operationName) {
        throw new Error('No operation ID returned from Veo.');
      }

      // Step 2: Poll Operation
      setStatusMessage('Veo 3 is synthesizing video frames... (this may take 1-2 minutes)');
      setProgressPercent(35);

      let isDone = false;
      let attempts = 0;
      const maxAttempts = 90; // 90 * 4s = ~6 minutes

      while (!isDone && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, 4000));

        // Simulated progressive feedback
        const estProgress = Math.min(92, 35 + Math.round((attempts / 25) * 55));
        setProgressPercent(estProgress);
        setStatusMessage(
          attempts > 8
            ? `Deep neural diffusion in progress... (${attempts * 4}s)`
            : 'Rendering high-definition motion and camera physics...'
        );

        const statusRes = await fetch('/api/veo/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        if (!statusRes.ok) continue;

        const statusData = await statusRes.json();
        if (statusData.error) {
          throw new Error(`Veo generation error: ${statusData.error}`);
        }

        if (statusData.done) {
          isDone = true;
        }
      }

      if (!isDone) {
        throw new Error('Veo video generation timed out. Please try again.');
      }

      // Step 3: Download Video Stream
      setStatusMessage('Downloading encoded MP4 video...');
      setProgressPercent(96);

      const downloadRes = await fetch('/api/veo/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!downloadRes.ok) {
        throw new Error(`Failed to download completed video: HTTP ${downloadRes.status}`);
      }

      const blob = await downloadRes.blob();
      const videoUrl = URL.createObjectURL(blob);
      setProgressPercent(100);
      setStatusMessage('Video generated successfully!');

      onVeoVideoGenerated(
        blob,
        videoUrl,
        isImageMode ? imageMotionPrompt : veoPrompt,
        veoAspect
      );
    } catch (err: any) {
      console.error('Veo generation error:', err);
      setErrorMessage(err.message || 'Veo video generation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lyria Music Generation Handler
  const handleGenerateLyria = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(30);
    setStatusMessage(
      `Synthesizing soundtrack with ${isFullLength ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}...`
    );

    try {
      const res = await fetch('/api/lyria/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lyriaPrompt,
          isFullLength,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to generate music`);
      }

      setProgressPercent(85);
      setStatusMessage('Decoding audio stream into playable track...');

      const data = await res.json();
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      setGeneratedAudioBlob(audioBlob);
      setGeneratedAudioUrl(audioUrl);
      setProgressPercent(100);
      setStatusMessage('Music generated successfully!');

      onLyriaMusicGenerated(audioUrl, audioBlob, lyriaPrompt);
    } catch (err: any) {
      console.error('Lyria generation error:', err);
      setErrorMessage(err.message || 'Music generation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Top Studio Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Veo 3 & Lyria AI Studio</h3>
            <p className="text-[11px] text-slate-400">
              Generative Video with Veo 3 & Studio Music with Lyria
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveMode('veo-text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeMode === 'veo-text'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Veo Text-to-Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('veo-image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeMode === 'veo-image'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Animate Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('lyria-music')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeMode === 'lyria-music'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Lyria Music</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Veo Text-to-Video */}
      {activeMode === 'veo-text' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Veo 3 Prompt (veo-3.1-fast-generate-preview)
              </label>
              <span className="text-[11px] text-purple-400 font-mono">Veo 3 Fast</span>
            </div>
            <textarea
              rows={3}
              value={veoPrompt}
              onChange={(e) => setVeoPrompt(e.target.value)}
              placeholder="Describe your scene: lighting, camera motion, atmosphere, action... (e.g. 'A sleek metallic robot meditating on a misty mountain summit at sunrise, cinematic 8k')"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              disabled={isProcessing}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Aspect Ratio */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Aspect Ratio:</span>
              <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVeoAspect('16:9')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    veoAspect === '16:9'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  16:9 Landscape
                </button>
                <button
                  type="button"
                  onClick={() => setVeoAspect('9:16')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    veoAspect === '9:16'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  9:16 Shorts / Portrait
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={() => handleGenerateVeo(false)}
              disabled={isProcessing || !veoPrompt.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Veo 3 Video</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Animate Image into Video */}
      {activeMode === 'veo-image' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Upload Photo to Animate
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {uploadedImage ? (
                <div className="relative rounded-xl overflow-hidden border border-purple-500/50 bg-black aspect-video flex items-center justify-center group">
                  <img
                    src={uploadedImage}
                    alt="Uploaded to animate"
                    className="w-full h-full object-contain"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer"
                  >
                    <span className="text-xs font-bold text-white bg-purple-600 px-3 py-1.5 rounded-lg shadow">
                      Change Photo
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/60 aspect-video flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="w-8 h-8 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-300">
                    Click to upload photo
                  </span>
                  <span className="text-[10px] text-slate-500">
                    PNG, JPG, WebP supported
                  </span>
                </div>
              )}
            </div>

            {/* Motion Prompt & Options */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Animation & Camera Prompt
                </label>
                <textarea
                  rows={3}
                  value={imageMotionPrompt}
                  onChange={(e) => setImageMotionPrompt(e.target.value)}
                  placeholder="How should the photo move? (e.g. 'Slow cinematic camera zoom in, wind rippling through water, soft atmospheric light shifts')"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVeoAspect('16:9')}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      veoAspect === '16:9'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setVeoAspect('9:16')}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      veoAspect === '9:16'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    9:16 Portrait / Shorts
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGenerateVeo(true)}
                  disabled={isProcessing || !uploadedImage}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Animate Photo into Video</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Lyria AI Music Studio */}
      {activeMode === 'lyria-music' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Soundtrack Prompt (lyria-3-clip-preview / lyria-3-pro-preview)
              </label>
              <span className="text-[11px] text-indigo-400 font-mono">
                {isFullLength ? 'Lyria Pro (Full Track)' : 'Lyria Clip (30s)'}
              </span>
            </div>
            <textarea
              rows={2}
              value={lyriaPrompt}
              onChange={(e) => setLyriaPrompt(e.target.value)}
              placeholder="e.g. 'Chill lo-fi hip hop beat with warm rhodes piano and vinyl crackle' or 'Cinematic hans-zimmer style trailer music with huge percussion'"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              disabled={isProcessing}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Track Length:</span>
              <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFullLength(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    !isFullLength
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clip (Up to 30s)
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullLength(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    isFullLength
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full-Length Track
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateLyria}
              disabled={isProcessing || !lyriaPrompt.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
            >
              <Music className="w-4 h-4" />
              <span>Generate AI Music</span>
            </button>
          </div>

          {/* Generated Audio Player */}
          {generatedAudioUrl && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <FileMusic className="w-4 h-4" />
                </div>
                <audio controls src={generatedAudioUrl} className="h-8 flex-1" />
              </div>
              <a
                href={generatedAudioUrl}
                download="lyria-soundtrack.wav"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex-shrink-0"
                title="Download Audio"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Progress & Status Indicator */}
      {isProcessing && (
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-300 flex items-center">
              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />
              {statusMessage}
            </span>
            <span className="font-mono text-purple-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-900/60 flex items-start space-x-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
};
