import React from 'react';
import { Youtube, AlertTriangle, ShieldCheck, X, Upload } from 'lucide-react';
import { YouTubeMetadata, YouTubeChannelInfo } from '../types/video';

interface UploadConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  metadata: YouTubeMetadata;
  channelInfo: YouTubeChannelInfo | null;
  videoBlob: Blob | null;
}

export const UploadConfirmModal: React.FC<UploadConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  metadata,
  channelInfo,
  videoBlob,
}) => {
  if (!isOpen) return null;

  const fileSizeMb = videoBlob ? (videoBlob.size / (1024 * 1024)).toFixed(2) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
            <Youtube className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Confirm YouTube Upload</h3>
            <p className="text-xs text-slate-400">
              Publish directly via the YouTube Data API v3
            </p>
          </div>
        </div>

        {/* Confirmation Details Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          {/* Target Channel */}
          <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Target Channel:</span>
            <span className="font-semibold text-slate-200 flex items-center">
              {channelInfo?.thumbnailUrl && (
                <img
                  src={channelInfo.thumbnailUrl}
                  alt={channelInfo.title}
                  className="w-4 h-4 rounded-full mr-1.5"
                />
              )}
              {channelInfo?.title || 'Connected YouTube Account'}
            </span>
          </div>

          {/* Video Title */}
          <div className="py-1 border-b border-slate-800/80">
            <span className="text-slate-400 block mb-0.5">Video Title:</span>
            <span className="font-bold text-slate-100 text-sm">{metadata.title}</span>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Privacy Setting:</span>
            <span
              className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                metadata.privacyStatus === 'public'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : metadata.privacyStatus === 'unlisted'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {metadata.privacyStatus}
            </span>
          </div>

          {/* File Size */}
          <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400">Video Size:</span>
            <span className="font-mono text-slate-200 font-semibold">{fileSizeMb} MB</span>
          </div>

          {/* Tags */}
          <div className="py-1">
            <span className="text-slate-400 block mb-1">Tags ({metadata.tags.length}):</span>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {metadata.tags.slice(0, 8).map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300"
                >
                  #{t}
                </span>
              ))}
              {metadata.tags.length > 8 && (
                <span className="text-[10px] text-slate-400">
                  +{metadata.tags.length - 8} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Security & Explicit notice */}
        <div className="flex items-start space-x-2 text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p>
            With your explicit permission, TubeCraft AI will upload this video to your YouTube
            channel. You can edit or delete this video at any time through YouTube Studio.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Confirm & Upload to YouTube</span>
          </button>
        </div>
      </div>
    </div>
  );
};
