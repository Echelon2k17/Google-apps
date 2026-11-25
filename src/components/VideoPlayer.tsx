import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Subtitles,
  Maximize2,
  SkipBack,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { Scene } from '../types/video';
import { VideoRenderer } from '../services/videoRenderer';
import { audioEngine, AudioMood } from '../services/audioEngine';

interface VideoPlayerProps {
  scenes: Scene[];
  aspectRatio: '9:16' | '16:9';
  audioMood: AudioMood;
  activeSceneIndex: number;
  onSceneChange: (index: number) => void;
  renderedVideoUrl?: string;
  isVeoVideo?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  scenes,
  aspectRatio,
  audioMood,
  activeSceneIndex,
  onSceneChange,
  renderedVideoUrl,
  isVeoVideo = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<VideoRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const activeSceneIndexRef = useRef<number>(activeSceneIndex);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [speakVoiceover, setSpeakVoiceover] = useState(true);
  const [viewMode, setViewMode] = useState<'canvas' | 'encoded'>(renderedVideoUrl ? 'encoded' : 'canvas');

  // Keep refs synchronized
  activeSceneIndexRef.current = activeSceneIndex;
  isPlayingRef.current = isPlaying;

  const totalDurationSec = scenes.reduce((acc, s) => acc + s.duration, 0) || 1;

  // If rendered video URL changes, switch to encoded video player
  useEffect(() => {
    if (renderedVideoUrl) {
      setViewMode('encoded');
    }
  }, [renderedVideoUrl]);

  // Initialize or update VideoRenderer
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!rendererRef.current) {
      rendererRef.current = new VideoRenderer(canvasRef.current, {
        aspectRatio,
        showSubtitles,
        showProgressBar: true,
      });
    } else {
      rendererRef.current.setOptions({
        aspectRatio,
        showSubtitles,
      });
    }
    drawCurrentFrame(currentTimeRef.current);
  }, [aspectRatio, showSubtitles]);

  // Keep frame updated when scenes change
  useEffect(() => {
    drawCurrentFrame(currentTimeRef.current);
  }, [scenes]);

  // Sync scene change from outside only when paused
  useEffect(() => {
    if (!isPlayingRef.current) {
      let time = 0;
      for (let i = 0; i < activeSceneIndex && i < scenes.length; i++) {
        time += scenes[i].duration;
      }
      currentTimeRef.current = time;
      setCurrentTimeSec(time);
      drawCurrentFrame(time);
    }
  }, [activeSceneIndex]);

  // Core render frame helper
  const drawCurrentFrame = (timeSec: number) => {
    if (!rendererRef.current || scenes.length === 0) return;

    let accumulated = 0;
    let sceneIdx = 0;
    let timeInScene = 0;

    for (let i = 0; i < scenes.length; i++) {
      const dur = scenes[i].duration;
      if (timeSec >= accumulated && timeSec < accumulated + dur) {
        sceneIdx = i;
        timeInScene = timeSec - accumulated;
        break;
      }
      accumulated += dur;
    }
    if (timeSec >= accumulated) {
      sceneIdx = scenes.length - 1;
      timeInScene = scenes[sceneIdx].duration;
    }

    const curScene = scenes[sceneIdx];
    const progress = Math.min(1, Math.max(0, timeInScene / (curScene?.duration || 1)));

    rendererRef.current.renderFrame(curScene, progress, sceneIdx, scenes.length, timeSec);
  };

  // Playback Loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp: number = performance.now();
    let lastSpokenScene = -1;

    if (isPlaying) {
      if (!isMuted && audioMood !== 'mute') {
        audioEngine.start(audioMood);
      }

      const loop = (now: number) => {
        const deltaSec = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        const nextTime = currentTimeRef.current + deltaSec;

        if (nextTime >= totalDurationSec) {
          setIsPlaying(false);
          audioEngine.stop();
          audioEngine.stopNarration();
          currentTimeRef.current = 0;
          setCurrentTimeSec(0);
          drawCurrentFrame(0);
          return;
        }

        currentTimeRef.current = nextTime;
        setCurrentTimeSec(nextTime);

        // Check active scene
        let accum = 0;
        let currentIdx = 0;
        for (let i = 0; i < scenes.length; i++) {
          if (nextTime >= accum && nextTime < accum + scenes[i].duration) {
            currentIdx = i;
            break;
          }
          accum += scenes[i].duration;
        }

        // Trigger scene change outside of render phase if changed
        if (currentIdx !== activeSceneIndexRef.current) {
          onSceneChange(currentIdx);
        }

        // Handle speech narration for the scene
        if (speakVoiceover && !isMuted && currentIdx !== lastSpokenScene) {
          lastSpokenScene = currentIdx;
          const textToSpeak = scenes[currentIdx]?.narration;
          if (textToSpeak) {
            audioEngine.speakNarration(textToSpeak);
          }
        }

        drawCurrentFrame(nextTime);
        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    } else {
      audioEngine.stop();
      audioEngine.stopNarration();
    }

    return () => {
      cancelAnimationFrame(animId);
      audioEngine.stop();
      audioEngine.stopNarration();
    };
  }, [isPlaying, isMuted, audioMood, scenes, totalDurationSec, speakVoiceover]);

  const togglePlay = () => {
    if (currentTimeRef.current >= totalDurationSec - 0.2) {
      currentTimeRef.current = 0;
      setCurrentTimeSec(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (newTime: number) => {
    currentTimeRef.current = newTime;
    setCurrentTimeSec(newTime);
    drawCurrentFrame(newTime);

    let accum = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (newTime >= accum && newTime < accum + scenes[i].duration) {
        onSceneChange(i);
        break;
      }
      accum += scenes[i].duration;
    }
  };

  const jumpScene = (direction: -1 | 1) => {
    const target = Math.max(0, Math.min(scenes.length - 1, activeSceneIndex + direction));
    onSceneChange(target);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative"
    >
      {/* Top Banner Mode Indicator */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">
            {isVeoVideo
              ? 'Veo 3 AI Video'
              : aspectRatio === '9:16'
              ? 'YouTube Shorts Preview (9:16)'
              : 'Standard 16:9 Video Preview'}
          </span>
          {!isVeoVideo && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">
                Scene {activeSceneIndex + 1} of {scenes.length}
              </span>
            </>
          )}
        </div>

        {renderedVideoUrl && (
          <div className="flex items-center space-x-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                viewMode === 'canvas' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Storyboard
            </button>
            <button
              onClick={() => setViewMode('encoded')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                viewMode === 'encoded' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Encoded MP4
            </button>
          </div>
        )}
      </div>

      {/* Viewport Frame */}
      <div className="relative flex-1 bg-black flex items-center justify-center p-3 min-h-[380px] sm:min-h-[460px] overflow-hidden">
        {viewMode === 'canvas' ? (
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800 flex items-center justify-center ${
              aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[460px] w-auto' : 'aspect-[16/9] w-full max-w-[640px]'
            }`}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />

            {!isPlaying && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/40 group-hover:scale-105 transition transform">
                  <Play className="w-8 h-8 ml-1" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800 flex items-center justify-center ${
              aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[460px] w-auto' : 'aspect-[16/9] w-full max-w-[640px]'
            }`}
          >
            <video
              src={renderedVideoUrl}
              controls
              className="w-full h-full object-contain"
              autoPlay
              loop
            />
          </div>
        )}
      </div>

      {/* Bottom Transport Controls (Active for Storyboard View) */}
      {viewMode === 'canvas' && (
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 space-y-3">
          <div className="space-y-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={totalDurationSec}
                step={0.1}
                value={currentTimeSec}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 px-0.5">
              <span>{formatTime(currentTimeSec)}</span>
              <div className="flex space-x-1.5">
                {scenes.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    onClick={() => onSceneChange(idx)}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition ${
                      activeSceneIndex === idx
                        ? 'bg-red-500/30 text-red-300 font-bold'
                        : 'hover:bg-slate-800 text-slate-500'
                    }`}
                  >
                    S{idx + 1}
                  </button>
                ))}
              </div>
              <span>{formatTime(totalDurationSec)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => jumpScene(-1)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Previous scene"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition shadow-md shadow-red-600/30"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => jumpScene(1)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Next scene"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSeek(0)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="Rewind to start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`p-2 rounded-lg border text-xs font-medium transition flex items-center space-x-1 ${
                  showSubtitles
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700/50'
                }`}
                title="Toggle Viral Shorts Karaoke Subtitles"
              >
                <Subtitles className="w-4 h-4" />
                <span className="hidden sm:inline">Captions</span>
              </button>

              <button
                onClick={() => setSpeakVoiceover(!speakVoiceover)}
                className={`p-2 rounded-lg border text-xs font-medium transition hidden sm:flex items-center space-x-1 ${
                  speakVoiceover
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700/50'
                }`}
                title="Toggle Browser Voiceover Narration"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Voice</span>
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-lg border transition ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Toggle Audio"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
