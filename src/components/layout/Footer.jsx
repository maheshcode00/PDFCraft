import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatBytes } from '../../utils/fileUtils';
import { ShieldCheck, Database, HardDrive, Sparkles } from 'lucide-react';

export default function Footer() {
  const { storageQuota, updateStorageQuota } = useAppStore();

  useEffect(() => {
    updateStorageQuota();
  }, [updateStorageQuota]);

  return (
    <footer className="mt-auto border-t border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/40 backdrop-blur-sm py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Privacy & Zero-Cloud Guarantee */}
          <div className="flex items-start gap-3 max-w-lg">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-1.5">
                <span>100% Client-Side PDF Privacy</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Zero Uploads
                </span>
              </h4>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 leading-relaxed">
                PdfCraft Pro runs all algorithms locally inside your browser WebAssembly and memory. Your PDFs are never transmitted to external cloud servers.
              </p>
            </div>
          </div>

          {/* Local IndexedDB Storage Meter */}
          <div className="flex items-center gap-4 bg-surface-100 dark:bg-surface-800/60 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700/60 text-xs">
            <Database className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <div>
              <div className="flex items-center justify-between gap-4 font-medium text-surface-700 dark:text-surface-300">
                <span>Browser Storage:</span>
                <span>{formatBytes(storageQuota.usage)} / {formatBytes(storageQuota.quota || 1073741824)}</span>
              </div>
              <div className="w-40 bg-surface-200 dark:bg-surface-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, storageQuota.percentage || 2)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-surface-200 dark:border-surface-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-400">
          <p>© {new Date().getFullYear()} PdfCraft Pro. Enterprise-Grade Self-Hosted PDF Workbench.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pdf-500" /> WebAssembly & PDF.js Powered
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
