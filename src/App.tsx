import React, { useState, useEffect, useRef } from 'react';
import {
  Youtube,
  Download,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StoryCreator, StoryGenerateParams } from './components/StoryCreator';
import { VideoPlayer } from './components/VideoPlayer';
import { SceneEditor } from './components/SceneEditor';
import { YouTubeMetaEditor } from './components/YouTubeMetaEditor';
import { PacingChart } from './components/PacingChart';
import { UploadConfirmModal } from './components/UploadConfirmModal';
import { UploadProgressModal } from './components/UploadProgressModal';
import { UploadHistoryModal } from './components/UploadHistoryModal';
import {
  VideoProject,
  Scene,
  YouTubeMetadata,
  YouTubeChannelInfo,
  YouTubeUploadResult,
} from './types/video';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  fetchYouTubeChannelInfo,
} from './services/firebaseAuth';
import { exportVideo } from './services/videoExporter';
import { uploadVideoToYouTube, UploadProgressInfo } from './services/youtubeApi';

export default function App() {
  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [channelInfo, setChannelInfo] = useState<YouTubeChannelInfo | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Project State (null until user creates a video from their story/context)
  const [project, setProject] = useState<VideoProject | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [workspaceTab, setWorkspaceTab] = useState<'youtube' | 'scenes'>('youtube');
  const [isVeoVideoActive, setIsVeoVideoActive] = useState(false);

  // Unified Generation Progress State
  const [isWorking, setIsWorking] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Video Blob & URL
  const [isExporting, setIsExporting] = useState(false);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [renderedUrl, setRenderedUrl] = useState<string | undefined>(undefined);

  // YouTube Upload State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [uploadResult, setUploadResult] = useState<YouTubeUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<YouTubeUploadResult[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Initialize Firebase Auth listener
  useEffect(() => {
    initAuth(
      async (user, token) => {
        setUserEmail(user.email);
        const channel = await fetchYouTubeChannelInfo(token);
        if (channel) {
          setChannelInfo(channel);
        }
      },
      () => {
        setUserEmail(null);
        setChannelInfo(null);
      }
    );
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleLogin = async (): Promise<string | null> => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUserEmail(res.user.email);
        const channel = await fetchYouTubeChannelInfo(res.accessToken);
        if (channel) {
          setChannelInfo(channel);
          showToast(`Connected to YouTube: ${channel.title}`);
        } else {
          showToast('Signed in with Google.');
        }
        return res.accessToken;
      }
      return null;
    } catch (err: any) {
      console.error('Login error:', err);
      showToast(`Google Sign-In failed: ${err.message || 'Cancelled'}`);
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserEmail(null);
    setChannelInfo(null);
    showToast('Disconnected YouTube account.');
  };

  // End-to-End Story/Context -> Video + YouTube Metadata -> Optional Publish Prompt
  const handleCreateVideoFromStory = async (params: StoryGenerateParams) => {
    setIsWorking(true);
    setErrorBanner(null);
    setRenderedBlob(null);
    setRenderedUrl(undefined);
    setProgressPercent(10);
    setProgressStage('Understanding your story & writing YouTube title, description, and tags...');

    try {
      // Step 1: Generate story blueprint, scenes, and YouTube SEO metadata
      let plan: any = null;
      let lastFetchError: Error | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        const planRes = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            description: params.storyPrompt,
            aspectRatio: params.aspectRatio,
            durationSec: params.durationSec,
            visualStyle: params.visualStyle,
            audioMood: params.audioMood,
            privacyStatus: params.privacyStatus,
          }),
        });

        const rawBody = await planRes.text();
        const trimmed = rawBody.trimStart();
        const looksLikeHtml =
          trimmed.startsWith('<') ||
          (planRes.headers.get('content-type') || '').includes('text/html');

        if (looksLikeHtml) {
          lastFetchError = new Error(
            `Backend returned HTML instead of JSON (HTTP ${planRes.status}). If the preview server just restarted, please retry.`
          );
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          throw lastFetchError;
        }

        let parsedBody: any = {};
        try {
          parsedBody = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          throw new Error(`Invalid JSON response from /api/generate-plan (HTTP ${planRes.status}).`);
        }

        if (!planRes.ok) {
          throw new Error(
            parsedBody.error || `Failed to generate story plan (HTTP ${planRes.status})`
          );
        }

        plan = parsedBody;
        break;
      }

      if (!plan) {
        throw lastFetchError || new Error('Failed to generate story plan.');
      }

      const newProject: VideoProject = {
        id: `proj-${Date.now().toString(36)}`,
        promptDescription: params.storyPrompt,
        veoPrompt: plan.veoPrompt,
        musicPrompt: plan.musicPrompt,
        generationEngine: 'storyboard',
        createdAt: Date.now(),
        youtube: {
          ...plan.youtube,
          privacyStatus: params.privacyStatus,
          aspectRatio: params.aspectRatio,
          visualStyle: params.visualStyle,
          audioMood: params.audioMood,
        },
        scenes: plan.scenes,
      };

      setProject(newProject);
      setActiveSceneIndex(0);

      setProgressPercent(30);
      setProgressStage('Rendering narrated multi-scene video...');
      setIsVeoVideoActive(false);

      const rendered = await exportVideo(
        newProject.scenes,
        {
          aspectRatio: params.aspectRatio,
          audioMood: params.audioMood,
          showSubtitles: true,
          showProgressBar: true,
          watermarkText: 'TubeCraft Studio',
        },
        (prog) => {
          const scaled = Math.min(98, 30 + Math.round(prog.percent * 0.68));
          setProgressPercent(scaled);
          setProgressStage(prog.statusText);
        }
      );

      const finalBlob = rendered.blob;
      const finalUrl = rendered.url;

      setRenderedBlob(finalBlob);
      setRenderedUrl(finalUrl);
      setProgressPercent(100);
      setProgressStage('Video ready!');
      setWorkspaceTab('youtube');

      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);

      showToast('Video created and YouTube details prepared.');

      // If user checked "Open YouTube publish prompt automatically once video is ready"
      if (params.autoPromptUpload) {
        let token = await getAccessToken();
        if (!token) {
          showToast('Sign in with Google to authorize posting to your YouTube channel.');
          token = await handleLogin();
        }
        if (token) {
          setIsConfirmModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error('Creation workflow error:', err);
      setErrorBanner(err.message || 'Video generation failed. Please try again.');
      showToast(err.message || 'Video generation failed.');
    } finally {
      setIsWorking(false);
    }
  };

  // Re-render Storyboard video after scene edits
  const handleReRenderStoryboard = async (): Promise<{ blob: Blob; url: string }> => {
    if (!project) throw new Error('No active project');
    setIsExporting(true);
    try {
      const rendered = await exportVideo(
        project.scenes,
        {
          aspectRatio: project.youtube.aspectRatio,
          audioMood: project.youtube.audioMood as any,
          showSubtitles: true,
          showProgressBar: true,
          watermarkText: 'TubeCraft Studio',
        },
        (prog) => {
          setProgressStage(prog.statusText);
          setProgressPercent(prog.percent);
        }
      );
      setRenderedBlob(rendered.blob);
      setRenderedUrl(rendered.url);
      setIsVeoVideoActive(false);
      showToast('Storyboard video re-encoded.');
      return rendered;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadVideo = async () => {
    if (!project) return;
    let url = renderedUrl;
    if (!url || !renderedBlob) {
      const res = await handleReRenderStoryboard();
      url = res.url;
    }
    const a = document.createElement('a');
    a.href = url;
    const ext = renderedBlob?.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${project.youtube.title.slice(0, 35).replace(/[^a-zA-Z0-9]/g, '_') || 'story_video'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Post to YouTube button click
  const handleInitiateUpload = async () => {
    if (!project) return;
    let token = await getAccessToken();
    if (!token) {
      showToast('Please sign in with Google to authorize your YouTube channel.');
      token = await handleLogin();
      if (!token) return;
    }

    if (!renderedBlob) {
      try {
        await handleReRenderStoryboard();
      } catch {
        return;
      }
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmUpload = async () => {
    if (!project) return;
    setIsConfirmModalOpen(false);
    setIsProgressModalOpen(true);
    setUploadProgress({
      percent: 2,
      bytesUploaded: 0,
      totalBytes: renderedBlob?.size || 0,
      statusText: 'Connecting to YouTube Data API...',
    });
    setUploadResult(null);
    setUploadError(null);

    const token = await getAccessToken();
    if (!token || !renderedBlob) {
      setUploadError('Authorization token or video file missing. Please sign in and retry.');
      return;
    }

    try {
      const res = await uploadVideoToYouTube(
        token,
        renderedBlob,
        project.youtube,
        (prog) => setUploadProgress(prog)
      );
      setUploadResult(res);
      setUploadHistory((prev) => [res, ...prev]);
      showToast('Video published to YouTube!');
    } catch (err: any) {
      console.error('YouTube upload failure:', err);
      setUploadError(err.message || 'Upload failed.');
    }
  };

  // Scene Editing handlers
  const handleUpdateScene = (index: number, updated: Scene) => {
    if (!project) return;
    const newScenes = [...project.scenes];
    newScenes[index] = updated;
    setProject({ ...project, scenes: newScenes });
    if (!isVeoVideoActive) {
      setRenderedBlob(null);
      setRenderedUrl(undefined);
    }
  };

  const handleAddScene = () => {
    if (!project) return;
    const num = project.scenes.length + 1;
    const newScene: Scene = {
      id: `sc-${num}-${Date.now().toString(36)}`,
      sceneNumber: num,
      heading: `Scene ${num}`,
      subheading: 'Supporting beat for your story.',
      narration: 'Voiceover narration for this scene.',
      badge: `CHAPTER ${num}`,
      visualIcon: 'sparkles',
      visualAnimation: 'pulse',
      backgroundStyle: 'gradient_waves',
      bgColors: project.scenes[0]?.bgColors || ['#090d16', '#1e1b4b', '#06b6d4'],
      duration: 5,
      transition: 'slide',
      emotionalIntensity: 65,
    };
    setProject({ ...project, scenes: [...project.scenes, newScene] });
    setActiveSceneIndex(project.scenes.length);
    if (!isVeoVideoActive) {
      setRenderedBlob(null);
      setRenderedUrl(undefined);
    }
  };

  const handleDeleteScene = (index: number) => {
    if (!project || project.scenes.length <= 1) return;
    const newScenes = project.scenes.filter((_, i) => i !== index);
    setProject({ ...project, scenes: newScenes });
    setActiveSceneIndex(Math.max(0, index - 1));
    if (!isVeoVideoActive) {
      setRenderedBlob(null);
      setRenderedUrl(undefined);
    }
  };

  const handleDuplicateScene = (index: number) => {
    if (!project) return;
    const toClone = project.scenes[index];
    const cloned: Scene = {
      ...toClone,
      id: `sc-clone-${Date.now().toString(36)}`,
      heading: `${toClone.heading} (Copy)`,
    };
    const newScenes = [...project.scenes];
    newScenes.splice(index + 1, 0, cloned);
    setProject({ ...project, scenes: newScenes });
    setActiveSceneIndex(index + 1);
    if (!isVeoVideoActive) {
      setRenderedBlob(null);
      setRenderedUrl(undefined);
    }
  };

  const handleUpdateYouTubeMeta = (meta: YouTubeMetadata) => {
    if (!project) return;
    setProject({ ...project, youtube: meta });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Navbar
        userEmail={userEmail}
        channelInfo={channelInfo}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={uploadHistory.length}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Step 1: Story & Context Input */}
        <section>
          <StoryCreator
            onCreateVideo={handleCreateVideoFromStory}
            isWorking={isWorking}
            progressStage={progressStage}
            progressPercent={progressPercent}
          />
        </section>

        {/* Error Alert Banner */}
        {errorBanner && (
          <div className="p-4 bg-rose-950/50 border border-rose-900 rounded-xl text-xs text-rose-200 flex items-center justify-between">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-300 hover:text-white underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step 2: Generated Video Preview & YouTube Publishing Workspace */}
        {project && (
          <section ref={workspaceRef} className="space-y-4 pt-2 border-t border-zinc-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-zinc-100">
                  Generated Video & YouTube Post
                </h2>
                <p className="text-xs text-zinc-400">
                  Narrated Storyboard · {project.youtube.aspectRatio} ·{' '}
                  {renderedBlob
                    ? `${(renderedBlob.size / (1024 * 1024)).toFixed(1)} MB ready`
                    : 'Needs re-encoding'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Video Player & Publish Action */}
              <div className="lg:col-span-5 space-y-4">
                <VideoPlayer
                  scenes={project.scenes}
                  aspectRatio={project.youtube.aspectRatio}
                  audioMood={project.youtube.audioMood as any}
                  activeSceneIndex={activeSceneIndex}
                  onSceneChange={(idx) => setActiveSceneIndex(idx)}
                  renderedVideoUrl={renderedUrl}
                  isVeoVideo={false}
                />

                {/* Export & Direct YouTube Post Buttons */}
                <div className="bg-zinc-900/75 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadVideo}
                      disabled={isExporting || isWorking}
                      className="inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Encoding...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Video</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleInitiateUpload}
                      disabled={isExporting || isWorking}
                      className="inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Youtube className="w-4 h-4" />
                      <span>Post to YouTube</span>
                    </button>
                  </div>

                  {!channelInfo && !userEmail && (
                    <p className="text-[11px] text-zinc-400 text-center">
                      You will be prompted to sign in with Google before uploading to YouTube.
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: YouTube Post Details & Optional Scene Storyboard Editor */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center space-x-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab('youtube')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition flex items-center justify-center space-x-2 cursor-pointer ${
                      workspaceTab === 'youtube'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span>YouTube Title, Description & Tags</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkspaceTab('scenes')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition flex items-center justify-center space-x-2 cursor-pointer ${
                      workspaceTab === 'scenes'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Storyboard Scenes ({project.scenes.length})</span>
                  </button>
                </div>

                {workspaceTab === 'youtube' ? (
                  <YouTubeMetaEditor
                    metadata={project.youtube}
                    onChange={handleUpdateYouTubeMeta}
                  />
                ) : (
                  <SceneEditor
                    scenes={project.scenes}
                    activeSceneIndex={activeSceneIndex}
                    onSelectScene={(idx) => setActiveSceneIndex(idx)}
                    onUpdateScene={handleUpdateScene}
                    onAddScene={handleAddScene}
                    onDeleteScene={handleDeleteScene}
                    onDuplicateScene={handleDuplicateScene}
                  />
                )}
              </div>
            </div>

            {/* Pacing & Emotional Intensity Dashboard Chart */}
            <PacingChart
              scenes={project.scenes}
              activeSceneIndex={activeSceneIndex}
              onSelectScene={(idx) => {
                setActiveSceneIndex(idx);
                setWorkspaceTab('scenes');
              }}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-500">
        <p>
          TubeCraft Studio · Story-to-Video Creation & Direct YouTube Data API v3 Publishing
        </p>
      </footer>

      {/* Confirmation Modal */}
      {project && (
        <UploadConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmUpload}
          metadata={project.youtube}
          channelInfo={channelInfo}
          videoBlob={renderedBlob}
        />
      )}

      {/* Progress & Result Modal */}
      <UploadProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        progressInfo={uploadProgress}
        result={uploadResult}
        error={uploadError}
        onRetry={handleConfirmUpload}
      />

      {/* Upload History Modal */}
      <UploadHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={uploadHistory}
      />
    </div>
  );
}
