import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Wifi, WifiOff, ShieldCheck } from 'lucide-react';

export default function OfflineBadge() {
  const { isOnline } = useAppStore();

  return (
    <div
      title={isOnline ? 'Self-hosted & offline capable PWA' : 'Working 100% offline'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        isOnline
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Offline Ready</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          <span>Offline Mode</span>
        </>
      )}
    </div>
  );
}
