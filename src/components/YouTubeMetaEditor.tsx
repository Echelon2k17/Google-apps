import React, { useState } from 'react';
import {
  Youtube,
  Hash,
  FileText,
  Copy,
  Check,
  Plus,
  X,
  Lock,
  Globe,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { YouTubeMetadata } from '../types/video';
import { YOUTUBE_CATEGORIES } from '../services/youtubeApi';

interface YouTubeMetaEditorProps {
  metadata: YouTubeMetadata;
  onChange: (updated: YouTubeMetadata) => void;
}

export const YouTubeMetaEditor: React.FC<YouTubeMetaEditorProps> = ({
  metadata,
  onChange,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [copiedTags, setCopiedTags] = useState(false);

  const handleFieldChange = (field: keyof YouTubeMetadata, value: any) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (metadata.tags.includes(trimmed)) {
      setNewTagInput('');
      return;
    }
    const updatedTags = [...metadata.tags, trimmed];
    handleFieldChange('tags', updatedTags);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = metadata.tags.filter((t) => t !== tagToRemove);
    handleFieldChange('tags', updatedTags);
  };

  const handleCopyAllTags = () => {
    navigator.clipboard.writeText(metadata.tags.join(', '));
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const titleLength = metadata.title.length;
  const isTitleGood = titleLength >= 40 && titleLength <= 90;

  return (
    <div className="bg-zinc-900/75 border border-zinc-800 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center text-white">
            <Youtube className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">
            YouTube Post Details
          </span>
        </div>
        <span className="text-xs text-zinc-400">
          Title · Description · Tags
        </span>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-200 flex items-center">
            <span>YouTube Title (High CTR & Search Optimized)</span>
          </label>
          <span
            className={`text-[11px] font-mono ${
              isTitleGood ? 'text-emerald-400' : titleLength > 100 ? 'text-rose-400' : 'text-amber-400'
            }`}
          >
            {titleLength}/100 chars
          </span>
        </div>
        <input
          type="text"
          maxLength={100}
          value={metadata.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="Captivating YouTube Title..."
          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-200 flex items-center">
            <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <span>YouTube Description (Includes Timestamps & Hashtags)</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {metadata.description.length} chars
          </span>
        </div>
        <textarea
          rows={6}
          value={metadata.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="Video description, timestamps, chapters, and social links..."
          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 leading-relaxed"
        />
      </div>

      {/* Tags Section */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-200 flex items-center">
            <Hash className="w-3.5 h-3.5 mr-1 text-red-400" />
            <span>Search Discovery Tags ({metadata.tags.length})</span>
          </label>
          <button
            type="button"
            onClick={handleCopyAllTags}
            className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition"
          >
            {copiedTags ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Tags</span>
              </>
            )}
          </button>
        </div>

        {/* Tag input */}
        <div className="flex space-x-2 mb-2.5">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Type new keyword and press Enter..."
            className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium rounded-xl text-slate-200 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tags chips */}
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800/80">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-200 border border-slate-700/60 group"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1.5 text-slate-400 hover:text-rose-400 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Category and Privacy Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            YouTube Category
          </label>
          <select
            value={metadata.categoryId}
            onChange={(e) => {
              const cat = YOUTUBE_CATEGORIES.find((c) => c.id === e.target.value);
              handleFieldChange('categoryId', e.target.value);
              if (cat) handleFieldChange('categoryName', cat.name);
            }}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {YOUTUBE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Privacy Status */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Privacy Visibility on YouTube
          </label>
          <select
            value={metadata.privacyStatus}
            onChange={(e) => handleFieldChange('privacyStatus', e.target.value as any)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="unlisted">Unlisted (Recommended for Testing)</option>
            <option value="private">Private (Only You)</option>
            <option value="public">Public (Instant Release)</option>
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            {metadata.privacyStatus === 'unlisted' && 'Anyone with the link can view.'}
            {metadata.privacyStatus === 'private' && 'Only your YouTube account can view.'}
            {metadata.privacyStatus === 'public' && 'Visible to all YouTube search & feeds.'}
          </p>
        </div>
      </div>
    </div>
  );
};
