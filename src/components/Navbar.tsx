import React from 'react';
import { Video, Youtube, CheckCircle2, LogOut, History } from 'lucide-react';
import { YouTubeChannelInfo } from '../types/video';

interface NavbarProps {
  userEmail: string | null;
  channelInfo: YouTubeChannelInfo | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  userEmail,
  channelInfo,
  isLoggingIn,
  onLogin,
  onLogout,
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shadow-md shadow-red-600/20">
            <Video className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-zinc-100">
              TubeCraft<span className="text-red-500"> Studio</span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Story-to-Video & Direct YouTube Publishing
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span>Uploads</span>
            {historyCount > 0 && (
              <span className="text-red-400 font-semibold">· {historyCount}</span>
            )}
          </button>

          {channelInfo || userEmail ? (
            <div className="flex items-center space-x-2.5 pl-3 border-l border-zinc-800">
              <div className="flex items-center space-x-2">
                {channelInfo?.thumbnailUrl ? (
                  <img
                    src={channelInfo.thumbnailUrl}
                    alt={channelInfo.title}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white">
                    <Youtube className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-zinc-100 flex items-center">
                    <span className="truncate max-w-[140px]">
                      {channelInfo?.title || userEmail}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1.5 flex-shrink-0" />
                  </div>
                  {channelInfo?.subscriberCount && (
                    <div className="text-[11px] text-zinc-400">
                      {Number(channelInfo.subscriberCount).toLocaleString()} subscribers
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition cursor-pointer"
                title="Disconnect YouTube Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <div className="w-4 h-4 mr-2 flex items-center justify-center">
                <svg viewBox="0 0 48 48" className="w-4 h-4">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              </div>
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
