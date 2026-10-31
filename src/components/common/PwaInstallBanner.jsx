import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Download, X } from 'lucide-react';

export default function PwaInstallBanner() {
  const { installPrompt, setInstallPrompt, addToast } = useAppStore();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [setInstallPrompt]);

  if (!installPrompt) return null;

  const handleInstall = async () => {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      addToast({
        title: 'Installed Successfully',
        message: 'PdfCraft Pro has been installed as a standalone desktop app!',
        type: 'success',
      });
    }
    setInstallPrompt(null);
  };

  return (
    <div className="bg-gradient-to-r from-pdf-600 to-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-4 text-sm z-40 sticky top-0">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 animate-bounce" />
        <span className="font-medium">
          Install PdfCraft Pro for faster offline access, file associations, and full-screen workspace.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="bg-white text-pdf-700 hover:bg-surface-100 font-semibold text-xs px-3 py-1.5 rounded-lg shadow transition-colors"
        >
          Install App
        </button>
        <button
          onClick={() => setInstallPrompt(null)}
          className="text-white/80 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
