import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  ArrowRight,
  Youtube,
  Layers,
} from 'lucide-react';

export interface StoryGenerateParams {
  storyPrompt: string;
  aspectRatio: '9:16' | '16:9';
  privacyStatus: 'unlisted' | 'private' | 'public';
  durationSec: number;
  visualStyle: 'cyber' | 'minimal' | 'cosmic' | 'sunset' | 'emerald' | 'crimson';
  audioMood: 'ambient' | 'energetic' | 'lofi' | 'cinematic' | 'acoustic' | 'mute';
  autoPromptUpload: boolean;
}

interface StoryCreatorProps {
  onCreateVideo: (params: StoryGenerateParams) => Promise<void>;
  isWorking: boolean;
  progressStage: string;
  progressPercent: number;
}

const STORY_STARTERS = [
  {
    title: 'Arctic Discovery',
    text: 'A lone deep-sea explorer discovers a bioluminescent sunken temple beneath the Arctic ice sheet, illuminating glowing crystal murals of a forgotten civilization.',
  },
  {
    title: 'History of Penicillin',
    text: 'The true story of how a messy laboratory bench in 1928 led Alexander Fleming to notice a strange blue mold killing bacteria, accidentally inventing penicillin.',
  },
  {
    title: 'How Noise Canceling Works',
    text: 'Explain the science of active noise cancellation: tiny microphones hear chaotic city traffic and instantly fire an exact inverted sound wave to create pure silence.',
  },
  {
    title: 'Midnight Kyoto Alley',
    text: 'Midnight rain falling softly over a warm lantern-lit ramen alley in Kyoto, steam rising from street stalls while reflections shimmer across wet cobblestones.',
  },
];

export const StoryCreator: React.FC<StoryCreatorProps> = ({
  onCreateVideo,
  isWorking,
  progressStage,
  progressPercent,
}) => {
  const [storyPrompt, setStoryPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('16:9');
  const [privacyStatus, setPrivacyStatus] = useState<'unlisted' | 'private' | 'public'>('unlisted');
  const [durationSec, setDurationSec] = useState<number>(30);
  const [visualStyle, setVisualStyle] = useState<
    'cyber' | 'minimal' | 'cosmic' | 'sunset' | 'emerald' | 'crimson'
  >('cyber');
  const [audioMood, setAudioMood] = useState<
    'ambient' | 'energetic' | 'lofi' | 'cinematic' | 'acoustic' | 'mute'
  >('cinematic');
  const [autoPromptUpload, setAutoPromptUpload] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyPrompt.trim() || isWorking) return;
    onCreateVideo({
      storyPrompt: storyPrompt.trim(),
      aspectRatio,
      privacyStatus,
      durationSec,
      visualStyle,
      audioMood,
      autoPromptUpload,
    });
  };

  return (
    <div className="bg-zinc-900/75 border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
              Explain your story or context
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Describe what you want to tell or show. We will generate your multi-scene narrated video, write the YouTube title, description, and tags, and prepare it for publishing.
            </p>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 self-start whitespace-nowrap shrink-0">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Narrated Storyboard Engine</span>
          </div>
        </div>

        {/* Story / Context Prompt Input */}
        <div>
          <textarea
            id="story-prompt"
            rows={4}
            value={storyPrompt}
            onChange={(e) => setStoryPrompt(e.target.value)}
            placeholder="Write your story, scene description, or topic context here... (e.g. 'An astronaut steps out onto an emerald-lit alien canyon as two moons rise above misty cliffs, discovering a metallic beacon humming in the sand.')"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition leading-relaxed"
            disabled={isWorking}
            required
          />

          {/* Story Starters */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="text-zinc-500 font-medium">Examples:</span>
            {STORY_STARTERS.map((starter, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStoryPrompt(starter.text)}
                disabled={isWorking}
                className="text-zinc-400 hover:text-zinc-100 underline decoration-zinc-700 hover:decoration-red-500 underline-offset-4 transition cursor-pointer"
              >
                {starter.title}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-zinc-800/80">
          {/* Format / Ratio */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Video Format
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                disabled={isWorking}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  aspectRatio === '16:9'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>16:9 Wide</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                disabled={isWorking}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  aspectRatio === '9:16'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16 Shorts</span>
              </button>
            </div>
          </div>

          {/* YouTube Visibility */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              YouTube Visibility
            </label>
            <select
              value={privacyStatus}
              onChange={(e) => setPrivacyStatus(e.target.value as any)}
              disabled={isWorking}
              className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="unlisted">Unlisted (Share via link)</option>
              <option value="public">Public (Everyone on YouTube)</option>
              <option value="private">Private (Only your account)</option>
            </select>
          </div>

          {/* Storyboard Duration */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Target Duration
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
              {[15, 30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDurationSec(sec)}
                  disabled={isWorking}
                  className={`py-1.5 rounded-md text-xs font-medium font-mono tabular-nums transition cursor-pointer ${
                    durationSec === sec
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Visual Theme & Audio */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Visual Theme & Audio
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value as any)}
                disabled={isWorking}
                className="py-2 px-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="cyber">Cyber Neon</option>
                <option value="cosmic">Cosmic</option>
                <option value="sunset">Sunset</option>
                <option value="emerald">Emerald</option>
                <option value="crimson">Crimson</option>
                <option value="minimal">Minimal</option>
              </select>
              <select
                value={audioMood}
                onChange={(e) => setAudioMood(e.target.value as any)}
                disabled={isWorking}
                className="py-2 px-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="cinematic">Cinematic</option>
                <option value="energetic">Energetic</option>
                <option value="lofi">Lo-Fi</option>
                <option value="ambient">Ambient</option>
                <option value="mute">Voice Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Generation Progress Bar */}
        {isWorking && (
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-zinc-200 font-medium">
                <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span>{progressStage}</span>
              </div>
              <span className="font-mono tabular-nums text-zinc-400">{progressPercent}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-zinc-800/80">
          <label className="inline-flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoPromptUpload}
              onChange={(e) => setAutoPromptUpload(e.target.checked)}
              disabled={isWorking}
              className="rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-500"
            />
            <span>Open YouTube publish prompt automatically once video is ready</span>
          </label>

          <button
            type="submit"
            disabled={isWorking || !storyPrompt.trim()}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
          >
            {isWorking ? (
              <span>Creating Video...</span>
            ) : (
              <>
                <Youtube className="w-4 h-4" />
                <span>
                  {autoPromptUpload ? 'Generate Video & Post to YouTube' : 'Generate Video'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
