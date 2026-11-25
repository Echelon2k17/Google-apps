import { Scene } from '../types/video';
import { VideoRenderer, RenderOptions } from './videoRenderer';
import { audioEngine, AudioMood } from './audioEngine';

export interface ExportProgress {
  percent: number;
  currentScene: number;
  totalScenes: number;
  elapsedSec: number;
  statusText: string;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export async function exportVideo(
  scenes: Scene[],
  options: RenderOptions & { audioMood: AudioMood },
  onProgress?: ExportProgressCallback
): Promise<{ blob: Blob; url: string }> {
  if (!scenes || scenes.length === 0) {
    throw new Error('No scenes provided for video rendering.');
  }

  // 1. Create off-screen canvas for rendering
  const canvas = document.createElement('canvas');
  const renderer = new VideoRenderer(canvas, {
    aspectRatio: options.aspectRatio,
    showSubtitles: options.showSubtitles ?? true,
    showProgressBar: options.showProgressBar ?? true,
    watermarkText: options.watermarkText,
  });

  const totalDurationSec = scenes.reduce((sum, s) => sum + s.duration, 0);

  // 2. Prepare audio stream
  let audioStream: MediaStream | null = null;
  if (options.audioMood !== 'mute') {
    audioEngine.start(options.audioMood);
    audioStream = audioEngine.getAudioStream();
  }

  // 3. Prepare canvas video stream
  const canvasStream = canvas.captureStream(30); // 30 FPS

  // 4. Combine audio and video tracks
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
  if (audioStream) {
    audioStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
  }

  // 5. Pick supported mime type
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  let selectedMimeType = '';
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMimeType = mime;
      break;
    }
  }

  const chunks: Blob[] = [];
  const recorderOptions: MediaRecorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : {};
  const recorder = new MediaRecorder(combinedStream, recorderOptions);

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    let animationFrameId: number;
    let isCancelled = false;

    recorder.onstop = () => {
      audioEngine.stop();
      const finalBlob = new Blob(chunks, { type: selectedMimeType || 'video/webm' });
      const url = URL.createObjectURL(finalBlob);
      resolve({ blob: finalBlob, url });
    };

    recorder.onerror = (e) => {
      audioEngine.stop();
      reject(new Error(`MediaRecorder error: ${(e as any).error?.message || 'unknown error'}`));
    };

    recorder.start(100); // 100ms slice chunks

    const startTime = performance.now();
    const fps = 30;
    const frameIntervalMs = 1000 / fps;
    let lastFrameTime = startTime;

    // Render loop
    const renderLoop = (now: number) => {
      if (isCancelled) return;

      const totalElapsedMs = now - startTime;
      const totalElapsedSec = totalElapsedMs / 1000;

      if (totalElapsedSec >= totalDurationSec) {
        // Finished all scenes!
        onProgress?.({
          percent: 100,
          currentScene: scenes.length,
          totalScenes: scenes.length,
          elapsedSec: totalDurationSec,
          statusText: 'Finalizing video file encoding...',
        });
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 300);
        return;
      }

      // Calculate which scene we are in
      let accumulatedTime = 0;
      let activeSceneIndex = 0;
      let timeWithinScene = 0;

      for (let i = 0; i < scenes.length; i++) {
        const dur = scenes[i].duration;
        if (totalElapsedSec >= accumulatedTime && totalElapsedSec < accumulatedTime + dur) {
          activeSceneIndex = i;
          timeWithinScene = totalElapsedSec - accumulatedTime;
          break;
        }
        accumulatedTime += dur;
      }

      const activeScene = scenes[activeSceneIndex];
      const sceneProgress = Math.min(1, Math.max(0, timeWithinScene / activeScene.duration));
      const overallPercent = Math.min(99, Math.round((totalElapsedSec / totalDurationSec) * 100));

      // Render frame
      renderer.renderFrame(
        activeScene,
        sceneProgress,
        activeSceneIndex,
        scenes.length,
        totalElapsedSec
      );

      // Report progress
      if (now - lastFrameTime > 200) {
        lastFrameTime = now;
        onProgress?.({
          percent: overallPercent,
          currentScene: activeSceneIndex + 1,
          totalScenes: scenes.length,
          elapsedSec: totalElapsedSec,
          statusText: `Encoding Scene ${activeSceneIndex + 1} of ${scenes.length} (${overallPercent}%)`,
        });
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
  });
}
