import React, { useEffect, useState } from 'react';
import {
  Youtube,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  X,
  Play,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadProgressInfo } from '../services/youtubeApi';
import { YouTubeUploadResult } from '../types/video';

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressInfo: UploadProgressInfo | null;
  result: YouTubeUploadResult | null;
  error: string | null;
  onRetry: () => void;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  onClose,
  progressInfo,
  result,
  error,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (result && isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  }, [result, isOpen]);

  if (!isOpen) return null;

  const isCompleted = !!result;
  const isError = !!error;
  const percent = progressInfo?.percent || 0;

  const handleCopyLink = () => {
    if (!result?.watchUrl) return;
    navigator.clipboard.writeText(result.watchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        {/* Close Button when done or error */}
        {(isCompleted || isError) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* State 1: In Progress */}
        {!isCompleted && !isError && (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center animate-pulse">
              <Youtube className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Publishing to YouTube</h3>
              <p className="text-xs text-slate-400 mt-1">
                {progressInfo?.statusText || 'Preparing video upload stream...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-mono px-1">
                <span>{percent}% Completed</span>
                {progressInfo?.bytesUploaded ? (
                  <span>
                    {(progressInfo.bytesUploaded / (1024 * 1024)).toFixed(1)} /{' '}
                    {(progressInfo.totalBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                ) : null}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Please keep this tab open while YouTube processes the upload.
            </p>
          </div>
        )}

        {/* State 2: Upload Succeeded */}
        {isCompleted && result && (
          <div className="space-y-5 text-center py-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Published to YouTube!</h3>
              <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-semibold">
                "{result.title}"
              </p>
              <div className="inline-flex items-center space-x-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Uploaded as {result.privacyStatus.toUpperCase()}</span>
              </div>
            </div>

            {/* Embedded YouTube preview iframe */}
            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black shadow-inner">
              <iframe
                src={`https://www.youtube.com/embed/${result.videoId}`}
                title={result.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Link Box */}
            <div className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs font-mono text-slate-300 truncate flex-1 text-left px-1">
                {result.watchUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Copy URL"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={result.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>

              <a
                href={result.studioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <Youtube className="w-3.5 h-3.5 text-red-400" />
                <span>YouTube Studio</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        )}

        {/* State 3: Upload Failed */}
        {isError && (
          <div className="space-y-4 text-center py-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Upload Interrupted</h3>
              <p className="text-xs text-rose-300 mt-2 bg-rose-950/40 p-3 rounded-xl border border-rose-900/50 text-left">
                {error}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Dismiss
              </button>
              <button
                onClick={onRetry}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
