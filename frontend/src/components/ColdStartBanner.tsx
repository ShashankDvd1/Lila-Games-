import React from 'react';
import { Zap, RefreshCw } from 'lucide-react';

interface ColdStartBannerProps {
  isFallback: boolean;
  onRetry: () => void;
}

export const ColdStartBanner: React.FC<ColdStartBannerProps> = ({ isFallback, onRetry }) => {
  if (!isFallback) return null;

  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-600/40 text-amber-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-sans">
      <div className="flex items-center gap-2.5">
        <Zap size={16} className="text-amber-400 shrink-0 animate-bounce" />
        <div>
          <span className="font-bold text-amber-300">Live Backend Spinning Up (Cold-Start Protection Active):</span>
          <span className="ml-1.5 text-slate-300">
            Displaying pre-cached Ambrose Valley telemetry so you can explore immediately without waiting.
          </span>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 bg-amber-600/80 hover:bg-amber-600 text-white px-3 py-1 rounded-lg font-semibold transition shrink-0 shadow"
      >
        <RefreshCw size={12} />
        <span>Connect Live</span>
      </button>
    </div>
  );
};
