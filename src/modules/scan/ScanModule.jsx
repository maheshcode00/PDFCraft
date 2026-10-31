import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cameraService } from '../../services/cameraService';
import { pdfService } from '../../services/pdfService';
import { dataURLtoBlob, downloadBytes, sanitizeFileName } from '../../utils/fileUtils';
import {
  Camera,
  CameraOff,
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Sliders,
  CheckCircle,
} from 'lucide-react';

export default function ScanModule() {
  const { addToast } = useAppStore();

  const [stream, setStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [filter, setFilter] = useState('bw'); // 'normal' | 'bw' | 'grayscale' | 'contrast'
  const [scannedPages, setScannedPages] = useState([]); // [{ id, dataUrl }]
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);

  // Start Camera
  const startCamera = async () => {
    try {
      if (!videoRef.current) return;
      const camStream = await cameraService.startCamera(videoRef.current, 'environment');
      setStream(camStream);
      setIsCameraActive(true);
      addToast({ title: 'Camera Started', message: 'Ready to capture document pages.' });
    } catch (err) {
      addToast({ title: 'Camera Error', message: err.message, type: 'error' });
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      cameraService.stopCamera(stream);
      setStream(null);
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Capture Page
  const capturePage = () => {
    if (!videoRef.current) return;
    const dataUrl = cameraService.captureFrame(videoRef.current, filter);
    const newPage = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl,
    };
    setScannedPages((prev) => [...prev, newPage]);
    addToast({ title: 'Page Captured', message: `Page ${scannedPages.length + 1} added to document.` });
  };

  const removePage = (id) => {
    setScannedPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Generate PDF from scanned pages
  const handleGeneratePdf = async () => {
    if (scannedPages.length === 0) {
      addToast({ title: 'No Pages', message: 'Please capture at least one page.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      addToast({ title: 'Creating Scanned PDF', message: 'Compiling photos into document...' });
      const imageBuffers = [];
      for (const p of scannedPages) {
        const blob = dataURLtoBlob(p.dataUrl);
        const buf = await blob.arrayBuffer();
        imageBuffers.push({
          name: 'scan.jpg',
          type: 'image/jpeg',
          data: buf,
        });
      }

      const pdfBytes = await pdfService.imagesToPdf(imageBuffers, { orientation: 'portrait', margin: 20 });
      downloadBytes(pdfBytes, sanitizeFileName(`scanned-document-${Date.now()}.pdf`));
      addToast({ title: 'Success!', message: 'Scanned PDF generated and downloaded.', type: 'success' });
    } catch (err) {
      addToast({ title: 'PDF Generation failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Camera className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Scan to PDF
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Capture paper documents using your webcam or phone camera with real-time document enhancement filters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Camera Feed & Capture Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-black rounded-2xl overflow-hidden aspect-[4/3] relative flex items-center justify-center shadow-xl border border-surface-800">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${
                !isCameraActive ? 'hidden' : ''
              } ${filter === 'bw' ? 'contrast-150 grayscale' : filter === 'grayscale' ? 'grayscale' : ''}`}
            />

            {!isCameraActive && (
              <div className="text-center space-y-3 p-6">
                <CameraOff className="w-12 h-12 text-surface-600 mx-auto" />
                <p className="text-sm text-surface-400 font-medium">Camera is currently paused.</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 rounded-xl bg-pdf-600 hover:bg-pdf-500 text-white font-bold text-xs shadow-md"
                >
                  Start Camera Feed
                </button>
              </div>
            )}
          </div>

          {/* Camera Filter & Capture Buttons */}
          {isCameraActive && (
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="text-surface-500 mr-1">Filter:</span>
                <button
                  onClick={() => setFilter('bw')}
                  className={`px-3 py-1.5 rounded-lg ${
                    filter === 'bw' ? 'bg-pdf-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  B&W Document
                </button>
                <button
                  onClick={() => setFilter('grayscale')}
                  className={`px-3 py-1.5 rounded-lg ${
                    filter === 'grayscale' ? 'bg-pdf-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  Grayscale
                </button>
                <button
                  onClick={() => setFilter('normal')}
                  className={`px-3 py-1.5 rounded-lg ${
                    filter === 'normal' ? 'bg-pdf-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  Color (Original)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-surface-500 hover:text-pdf-500"
                >
                  Stop
                </button>
                <button
                  onClick={capturePage}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Page</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Scanned Pages Tray */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                Document Pages ({scannedPages.length})
              </h3>
              {scannedPages.length > 0 && (
                <button
                  onClick={() => setScannedPages([])}
                  className="text-xs text-pdf-500 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {scannedPages.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-surface-200 dark:border-surface-800 rounded-xl text-xs text-surface-400">
                Snap photos using the camera feed to assemble your document pages.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                {scannedPages.map((page, idx) => (
                  <div
                    key={page.id}
                    className="relative group rounded-xl overflow-hidden border border-surface-200 dark:border-surface-800 shadow-sm"
                  >
                    <img src={page.dataUrl} alt={`Page ${idx + 1}`} className="w-full h-auto block" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => removePage(page.id)}
                        className="p-1.5 rounded-full bg-pdf-600 text-white hover:scale-110 shadow"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                      Page {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleGeneratePdf}
              disabled={isProcessing || scannedPages.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-glow disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isProcessing ? 'Generating PDF...' : 'Compile & Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
