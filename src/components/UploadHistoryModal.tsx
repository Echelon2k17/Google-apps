import React from 'react';
import { Youtube, ExternalLink, X, Clock, Play } from 'lucide-react';
import { YouTubeUploadResult } from '../types/video';

interface UploadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: YouTubeUploadResult[];
}

export const UploadHistoryModal: React.FC<UploadHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">YouTube Upload History</h3>
            <p className="text-xs text-slate-400">
              Videos uploaded in this session via YouTube Data API
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Youtube className="w-10 h-10 mx-auto text-slate-700 mb-2 opacity-50" />
              No videos uploaded yet in this session.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.videoId}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between space-x-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 text-red-500">
                    <Play className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-100 truncate">{item.title}</h4>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono text-slate-500">ID: {item.videoId}</span>
                      <span>•</span>
                      <span className="uppercase text-emerald-400 font-semibold">
                        {item.privacyStatus}
                      </span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Clock className="w-2.5 h-2.5 mr-0.5" />
                        {new Date(item.uploadedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <a
                    href={item.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white transition"
                    title="Watch on YouTube"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
