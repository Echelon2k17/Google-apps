import React, { useState } from 'react';
import {
  Sparkles,
  Smartphone,
  Monitor,
  Clock,
  Palette,
  Music,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';

interface CreationFormProps {
  onGenerate: (params: {
    description: string;
    aspectRatio: '9:16' | '16:9';
    durationSec: number;
    visualStyle: 'cyber' | 'minimal' | 'cosmic' | 'sunset' | 'emerald' | 'crimson';
    audioMood: 'ambient' | 'energetic' | 'lofi' | 'cinematic' | 'acoustic' | 'mute';
  }) => Promise<void>;
  isLoading: boolean;
}

const INSPIRATION_PROMPTS = [
  {
    label: '🧠 Neuroscience of Deep Focus',
    prompt:
      '3 scientific neuroscience rules to trigger an instant flow state and enter deep focus in under 2 minutes.',
  },
  {
    label: '🚀 Quantum Computing Explained',
    prompt:
      'How quantum computers solve problems in seconds that take supercomputers 10,000 years, explained in simple terms.',
  },
  {
    label: '✨ James Webb Telescope Wonders',
    prompt:
      'The 3 most mind-bending discoveries made by the James Webb Space Telescope at the edge of the observable universe.',
  },
  {
    label: '⚡ 5 Habits That Boost Energy',
    prompt:
      '5 micro-habits backed by biochemistry that naturally double your daily physical and mental energy without caffeine crashes.',
  },
  {
    label: '🏯 Hidden Gems in Tokyo',
    prompt:
      'Top 4 secret, aesthetic spots in Tokyo that most tourists completely miss, from neon retro arcades to serene bamboo shrines.',
  },
];

export const CreationForm: React.FC<CreationFormProps> = ({ onGenerate, isLoading }) => {
  const [description, setDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [durationSec, setDurationSec] = useState<number>(30);
  const [visualStyle, setVisualStyle] = useState<
    'cyber' | 'minimal' | 'cosmic' | 'sunset' | 'emerald' | 'crimson'
  >('cyber');
  const [audioMood, setAudioMood] = useState<
    'ambient' | 'energetic' | 'lofi' | 'cinematic' | 'acoustic' | 'mute'
  >('cinematic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isLoading) return;
    onGenerate({
      description,
      aspectRatio,
      durationSec,
      visualStyle,
      audioMood,
    });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="description" className="block text-sm font-semibold text-slate-200">
              Video Description & Topic
            </label>
            <span className="text-xs text-slate-400">
              Gemini 3.8 Flash will script scenes & generate SEO metadata
            </span>
          </div>

          <div className="relative">
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your video is about... (e.g. 'How neural networks actually learn patterns in 3 simple visual steps', '5 daily stoic principles for clarity', 'Top 3 AI breakthroughs of 2026')"
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-sm transition"
              disabled={isLoading}
              required
            />
          </div>

          {/* Prompt Inspiration Chips */}
          <div className="mt-3">
            <div className="flex items-center text-xs text-slate-400 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              <span>Quick Inspirations:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INSPIRATION_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDescription(item.prompt)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Video Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
          {/* Format / Aspect Ratio */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center">
              <Smartphone className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Format / Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  aspectRatio === '9:16'
                    ? 'bg-red-500/20 text-red-300 border-red-500/50 ring-1 ring-red-500/30'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Shorts (9:16)</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  aspectRatio === '16:9'
                    ? 'bg-red-500/20 text-red-300 border-red-500/50 ring-1 ring-red-500/30'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Wide (16:9)</span>
              </button>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Duration
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDurationSec(sec)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition text-center ${
                    durationSec === sec
                      ? 'bg-red-500/20 text-red-300 border-red-500/50 ring-1 ring-red-500/30'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Visual Theme Style */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center">
              <Palette className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Visual Theme
            </label>
            <select
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700/70 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="cyber">Cyber Neon (Cyan & Indigo)</option>
              <option value="cosmic">Cosmic Orbit (Purple & Violet)</option>
              <option value="sunset">Golden Sunset (Amber & Orange)</option>
              <option value="emerald">Emerald Nature (Teal & Green)</option>
              <option value="crimson">Crimson Impact (Rose & Magenta)</option>
              <option value="minimal">Minimal Dark (Slate & Indigo)</option>
            </select>
          </div>

          {/* Background Audio Mood */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center">
              <Music className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Soundtrack
            </label>
            <select
              value={audioMood}
              onChange={(e) => setAudioMood(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700/70 rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="cinematic">Cinematic Synth Ambient</option>
              <option value="energetic">Electronic Pulse & Beats</option>
              <option value="lofi">Lo-Fi Groove & Warm Chords</option>
              <option value="ambient">Deep Space Meditative</option>
              <option value="mute">Mute (Voiceover Only)</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !description.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:via-rose-500 hover:to-amber-500 shadow-lg shadow-red-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                <span>Crafting Video Script & YouTube SEO...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                <span>Generate Video Plan & YouTube SEO</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
