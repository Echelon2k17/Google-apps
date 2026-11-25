import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Volume2,
  Square,
  Play,
  Pause,
  Clock,
  Layers,
  Tag,
  Zap,
  Film,
  Activity,
  Mic,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Scene } from '../types/video';
import { audioEngine } from '../services/audioEngine';

interface SceneEditorProps {
  scenes: Scene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onUpdateScene: (index: number, updated: Scene) => void;
  onAddScene: () => void;
  onDeleteScene: (index: number) => void;
  onDuplicateScene: (index: number) => void;
}

type TtsEngineMode = 'ai' | 'browser';
type GeminiVoiceName = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

interface CachedSceneAudio {
  url: string;
  blob: Blob;
  cacheKey: string;
  voiceName: GeminiVoiceName;
}

const AI_VOICES: { value: GeminiVoiceName; label: string }[] = [
  { value: 'Kore', label: 'Kore — Balanced narrator' },
  { value: 'Zephyr', label: 'Zephyr — Bright & clear' },
  { value: 'Puck', label: 'Puck — Energetic storyteller' },
  { value: 'Charon', label: 'Charon — Deep documentary' },
  { value: 'Fenrir', label: 'Fenrir — Authoritative' },
];

const AI_STYLES: { value: string; label: string }[] = [
  { value: 'Clear, natural YouTube narrator', label: 'Natural narrator' },
  { value: 'Energetic, engaging storyteller', label: 'Energetic storyteller' },
  { value: 'Calm, cinematic documentary voice', label: 'Calm documentary' },
  { value: 'Crisp, upbeat news presenter', label: 'Crisp presenter' },
];

const SPEECH_RATES = [0.85, 1.0, 1.15, 1.3];

export const SceneEditor: React.FC<SceneEditorProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
  onUpdateScene,
  onAddScene,
  onDeleteScene,
  onDuplicateScene,
}) => {
  const currentScene = scenes[activeSceneIndex] || scenes[0];

  // TTS Preview State
  const [ttsMode, setTtsMode] = useState<TtsEngineMode>('ai');
  const [aiVoice, setAiVoice] = useState<GeminiVoiceName>('Kore');
  const [aiStyle, setAiStyle] = useState<string>(AI_STYLES[0].value);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Per-scene cached AI audio map (keyed by scene.id)
  const [sceneAudioMap, setSceneAudioMap] = useState<Record<string, CachedSceneAudio>>({});
  const sceneAudioMapRef = useRef<Record<string, CachedSceneAudio>>({});
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [isAiPlaying, setIsAiPlaying] = useState(false);

  // Browser Web Speech API State
  const [browserVoices, setBrowserVoices] = useState<
    { voiceURI: string; name: string; lang: string; localService: boolean }[]
  >(() => audioEngine.getAvailableVoices());
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState(false);

  const isWebSpeechSupported = audioEngine.isSpeechSynthesisSupported();

  // Keep ref synced for cleanup on unmount
  useEffect(() => {
    sceneAudioMapRef.current = sceneAudioMap;
  }, [sceneAudioMap]);

  // Subscribe to browser voice list updates
  useEffect(() => {
    const syncVoices = () => {
      const list = audioEngine.getAvailableVoices();
      setBrowserVoices(list);
      setSelectedVoiceURI((prev) => {
        if (prev && list.some((v) => v.voiceURI === prev)) return prev;
        const preferred = list.find((v) => v.lang.toLowerCase().startsWith('en')) || list[0];
        return preferred?.voiceURI || '';
      });
    };
    syncVoices();
    return audioEngine.subscribeVoicesChanged(syncVoices);
  }, []);

  // Stop active playback when switching scenes
  useEffect(() => {
    audioEngine.stopNarration();
    setIsBrowserSpeaking(false);
    setTtsError(null);
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    setIsAiPlaying(false);
  }, [activeSceneIndex, currentScene?.id]);

  // Cleanup Blob URLs and stop audio on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopNarration();
      Object.values(sceneAudioMapRef.current).forEach((entry) => {
        URL.revokeObjectURL(entry.url);
      });
    };
  }, []);

  const handleFieldChange = (field: keyof Scene, value: any) => {
    if (!currentScene) return;
    onUpdateScene(activeSceneIndex, {
      ...currentScene,
      [field]: value,
    });
  };

  const currentCacheKey = currentScene
    ? `${currentScene.narration.trim()}::${aiVoice}::${aiStyle}`
    : '';
  const cachedAudio = currentScene ? sceneAudioMap[currentScene.id] : undefined;
  const isCachedAudioFresh = Boolean(cachedAudio && cachedAudio.cacheKey === currentCacheKey);

  // Generate AI TTS audio preview via server endpoint (/api/tts)
  const handleGenerateAiAudio = async () => {
    if (!currentScene) return;
    const text = currentScene.narration.trim();
    if (!text) {
      setTtsError('Enter narration text for this scene before generating audio.');
      return;
    }

    // Stop any current playback
    audioEngine.stopNarration();
    setIsBrowserSpeaking(false);
    if (audioElRef.current) {
      audioElRef.current.pause();
      setIsAiPlaying(false);
    }

    setIsGeneratingTts(true);
    setTtsError(null);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: aiVoice,
          style: aiStyle,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || `Audio preview failed (HTTP ${res.status})`);
      }

      if (!payload.audioBase64) {
        throw new Error('No audio payload was returned by the TTS service.');
      }

      const byteChars = atob(payload.audioBase64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: payload.mimeType || 'audio/wav' });
      const newUrl = URL.createObjectURL(blob);

      setSceneAudioMap((prev) => {
        const previous = prev[currentScene.id];
        if (previous?.url) {
          URL.revokeObjectURL(previous.url);
        }
        return {
          ...prev,
          [currentScene.id]: {
            url: newUrl,
            blob,
            cacheKey: currentCacheKey,
            voiceName: aiVoice,
          },
        };
      });

      // Auto-play newly generated preview on next microtask once <audio> src updates
      setTimeout(() => {
        if (audioElRef.current) {
          audioElRef.current.currentTime = 0;
          audioElRef.current.play().catch(() => {
            // Browser autoplay policies may block if delayed; user still has <audio> controls
          });
        }
      }, 40);
    } catch (err: any) {
      setTtsError(err?.message || 'Unable to generate AI voice preview.');
    } finally {
      setIsGeneratingTts(false);
    }
  };

  const handleToggleAiPlay = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (el.paused) {
      audioEngine.stopNarration();
      setIsBrowserSpeaking(false);
      el.play().catch(() => setTtsError('Unable to start audio playback.'));
    } else {
      el.pause();
    }
  };

  const handleDownloadSceneWav = () => {
    if (!cachedAudio || !currentScene) return;
    const a = document.createElement('a');
    a.href = cachedAudio.url;
    const safeHeading =
      currentScene.heading?.slice(0, 24).replace(/[^a-zA-Z0-9]/g, '_') ||
      `scene_${activeSceneIndex + 1}`;
    a.download = `${safeHeading}_${cachedAudio.voiceName.toLowerCase()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Web Speech API Preview
  const handleToggleBrowserSpeech = () => {
    if (!currentScene) return;
    setTtsError(null);

    if (isBrowserSpeaking) {
      audioEngine.stopNarration();
      setIsBrowserSpeaking(false);
      return;
    }

    const text = currentScene.narration.trim();
    if (!text) {
      setTtsError('Enter narration text for this scene before previewing.');
      return;
    }

    if (audioElRef.current && !audioElRef.current.paused) {
      audioElRef.current.pause();
      setIsAiPlaying(false);
    }

    setIsBrowserSpeaking(true);
    audioEngine.speakNarration(text, {
      voiceURI: selectedVoiceURI || undefined,
      rate: speechRate,
      onStart: () => setIsBrowserSpeaking(true),
      onEnd: () => setIsBrowserSpeaking(false),
      onError: (msg) => {
        setTtsError(msg);
        setIsBrowserSpeaking(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-zinc-200 tracking-wide">
            Storyboard Scenes ({scenes.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onAddScene}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Scene</span>
        </button>
      </div>

      {/* Scene Selector Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
        {scenes.map((scene, idx) => {
          const hasCachedTts = Boolean(sceneAudioMap[scene.id]);
          return (
            <button
              key={scene.id || idx}
              type="button"
              onClick={() => onSelectScene(idx)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition text-xs cursor-pointer ${
                activeSceneIndex === idx
                  ? 'bg-red-500/15 border-red-500/60 text-white ring-1 ring-red-500/40'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between space-x-3">
                <span className="font-semibold text-zinc-200 whitespace-nowrap">
                  Scene {idx + 1}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono tabular-nums whitespace-nowrap">
                  {scene.transition && scene.transition !== 'none'
                    ? `${scene.transition} · `
                    : ''}
                  {scene.duration}s
                  {hasCachedTts ? ' · Audio' : ''}
                </span>
              </div>
              <div className="truncate max-w-[140px] text-[11px] mt-0.5 text-zinc-300">
                {scene.heading || 'Untitled'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Scene Editor Form */}
      {currentScene && (
        <div className="bg-zinc-900/75 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-zinc-100">
                Scene {activeSceneIndex + 1}
              </span>
              <span className="text-zinc-600" aria-hidden="true">
                ·
              </span>
              <span className="text-zinc-400 font-mono tabular-nums">
                {currentScene.duration}s duration
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => onDuplicateScene(activeSceneIndex)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Duplicate scene"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {scenes.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteScene(activeSceneIndex)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                  title="Delete scene"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Heading & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Headline / Visual Title
              </label>
              <input
                type="text"
                value={currentScene.heading}
                onChange={(e) => handleFieldChange('heading', e.target.value)}
                placeholder="e.g. The Quantum Leap"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center">
                <Tag className="w-3 h-3 mr-1 text-zinc-400" /> Badge Text
              </label>
              <input
                type="text"
                value={currentScene.badge}
                onChange={(e) => handleFieldChange('badge', e.target.value)}
                placeholder="HOOK / FACT #1"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Subheading / Concept */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Subheading / Supporting Insight
            </label>
            <input
              type="text"
              value={currentScene.subheading}
              onChange={(e) => handleFieldChange('subheading', e.target.value)}
              placeholder="e.g. Traditional computers evaluate 1 path at a time..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Voiceover Narration & Text-to-Speech Preview */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="block text-xs font-medium text-zinc-300">
                Voiceover Narration (Spoken & Synced Subtitles)
              </label>

              {/* TTS Mode Switcher */}
              <div className="inline-flex items-center p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => {
                    setTtsMode('ai');
                    setTtsError(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    ttsMode === 'ai'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  AI Voice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTtsMode('browser');
                    setTtsError(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    ttsMode === 'browser'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Web Speech API
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={currentScene.narration}
              onChange={(e) => handleFieldChange('narration', e.target.value)}
              placeholder="Voiceover words spoken aloud during this scene..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 leading-relaxed focus:outline-none focus:ring-1 focus:ring-red-500"
            />

            {/* TTS Controls Panel (flat hairline separation, no nested heavy card) */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
              {ttsMode === 'ai' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        AI Voice
                      </label>
                      <select
                        value={aiVoice}
                        onChange={(e) => setAiVoice(e.target.value as GeminiVoiceName)}
                        className="w-full py-2 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      >
                        {AI_VOICES.map((v) => (
                          <option key={v.value} value={v.value}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Delivery Style
                      </label>
                      <select
                        value={aiStyle}
                        onChange={(e) => setAiStyle(e.target.value)}
                        className="w-full py-2 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      >
                        {AI_STYLES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateAiAudio}
                        disabled={isGeneratingTts || !currentScene.narration.trim()}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {isGeneratingTts ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>{cachedAudio ? 'Regenerate Audio' : 'Generate Audio'}</span>
                          </>
                        )}
                      </button>

                      {cachedAudio && (
                        <button
                          type="button"
                          onClick={handleToggleAiPlay}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition cursor-pointer shrink-0"
                          title={isAiPlaying ? 'Pause preview' : 'Play preview'}
                        >
                          {isAiPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cached Audio Player Bar */}
                  {cachedAudio && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
                      <audio
                        ref={audioElRef}
                        src={cachedAudio.url}
                        controls
                        onPlay={() => setIsAiPlaying(true)}
                        onPause={() => setIsAiPlaying(false)}
                        onEnded={() => setIsAiPlaying(false)}
                        className="h-8 flex-1 w-full"
                      />
                      <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-zinc-400 shrink-0">
                        <span className="whitespace-nowrap">
                          {cachedAudio.voiceName}
                          {!isCachedAudioFresh ? ' · Text edited (regenerate to update)' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={handleDownloadSceneWav}
                          className="inline-flex items-center space-x-1 text-zinc-300 hover:text-white transition cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3 h-3" />
                          <span>WAV</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {!isWebSpeechSupported ? (
                    <p className="text-xs text-amber-400">
                      Web Speech API is unavailable in this browser. Switch to AI Voice to generate a WAV preview.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          System Voice
                        </label>
                        <select
                          value={selectedVoiceURI}
                          onChange={(e) => setSelectedVoiceURI(e.target.value)}
                          className="w-full py-2 px-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                        >
                          {browserVoices.length === 0 ? (
                            <option value="">Default browser voice</option>
                          ) : (
                            browserVoices.map((v) => (
                              <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name} ({v.lang})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Speed
                        </label>
                        <select
                          value={speechRate}
                          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                          className="w-full py-2 px-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                        >
                          {SPEECH_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}x
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <button
                          type="button"
                          onClick={handleToggleBrowserSpeech}
                          disabled={!currentScene.narration.trim()}
                          className={`w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${
                            isBrowserSpeaking
                              ? 'bg-zinc-800 text-red-400 border border-red-500/40 hover:bg-zinc-700'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                          }`}
                        >
                          {isBrowserSpeaking ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop Preview</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Speak Narration</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {ttsError && (
                <div className="flex items-center space-x-1.5 text-xs text-rose-400 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{ttsError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metric Highlight, Transition & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center">
                <Zap className="w-3 h-3 mr-1 text-amber-400" /> Metric (Optional)
              </label>
              <input
                type="text"
                value={currentScene.metricValue || ''}
                onChange={(e) => handleFieldChange('metricValue', e.target.value || undefined)}
                placeholder="e.g. 10,000x or 99%"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Metric Label
              </label>
              <input
                type="text"
                value={currentScene.metricLabel || ''}
                onChange={(e) => handleFieldChange('metricLabel', e.target.value || undefined)}
                placeholder="e.g. Faster"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center">
                <Film className="w-3 h-3 mr-1 text-purple-400" /> Transition Effect
              </label>
              <select
                value={currentScene.transition || 'fade'}
                onChange={(e) => handleFieldChange('transition', e.target.value)}
                className="w-full py-2 px-3 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium cursor-pointer"
              >
                <option value="fade">Fade Dissolve (Smooth)</option>
                <option value="slide">Kinetic Slide (Dynamic)</option>
                <option value="zoom">Cinematic Zoom (Punchy)</option>
                <option value="none">Instant Cut (Hard cut)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-300 flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-zinc-400" /> Duration
                </label>
                <span className="text-xs font-semibold text-red-400 font-mono tabular-nums">
                  {currentScene.duration}s
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={currentScene.duration}
                onChange={(e) => handleFieldChange('duration', parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>
          </div>

          {/* Emotional Intensity Slider */}
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                Emotional Intensity (Pacing Arc)
              </label>
              <span className="text-xs font-semibold text-rose-400 font-mono tabular-nums">
                {currentScene.emotionalIntensity ?? 65}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={currentScene.emotionalIntensity ?? 65}
              onChange={(e) =>
                handleFieldChange('emotionalIntensity', parseInt(e.target.value, 10))
              }
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
