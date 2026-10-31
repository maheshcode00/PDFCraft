import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { readFileAsArrayBuffer, readFileAsDataURL, downloadBytes, sanitizeFileName } from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  PenTool,
  Upload,
  Type,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Move,
  Check,
  FileText,
} from 'lucide-react';

export default function SignatureModule() {
  const { addToast } = useAppStore();

  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Signature Creation Tab: 'draw' | 'type' | 'upload'
  const [sigMode, setSigMode] = useState('draw');
  const [typedName, setTypedName] = useState('John Doe');
  const [typedFont, setTypedFont] = useState('font-signature');
  const [activeSignatureUrl, setActiveSignatureUrl] = useState(null);

  // Signature Placement: { x, y, width, height }
  const [placement, setPlacement] = useState({ x: 100, y: 150, width: 160, height: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Drawing Canvas Refs
  const drawCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // PDF Page Canvas Ref
  const pageCanvasRef = useRef(null);
  const pageContainerRef = useRef(null);

  const handleFileLoaded = async (uploadedFile) => {
    try {
      const buffer = await readFileAsArrayBuffer(uploadedFile);
      const pageCount = await pdfService.getPageCount(buffer);
      setFile({
        name: uploadedFile.name,
        size: uploadedFile.size,
        data: buffer,
        pageCount,
      });
      setNumPages(pageCount);
      setCurrentPage(1);
      addToast({ title: 'PDF Ready for Signature', message: uploadedFile.name });
    } catch (err) {
      addToast({ title: 'Failed to read PDF', message: err.message, type: 'error' });
    }
  };

  // Render Page to Canvas
  useEffect(() => {
    if (!file || !pageCanvasRef.current) return;
    async function renderPage() {
      const pdfJs = await pdfService.loadPdfJsDoc(file.data);
      await pdfService.renderPageToCanvas(pdfJs, currentPage, pageCanvasRef.current, 1.2);
    }
    renderPage();
  }, [file, currentPage]);

  // Drawing logic on canvas
  const startDrawing = (e) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (drawCanvasRef.current) {
      setActiveSignatureUrl(drawCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setActiveSignatureUrl(null);
    }
  };

  // Type Signature helper
  const generateTypedSignature = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    ctx.font = '64px Caveat, cursive';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Signature', 200, 75);
    setActiveSignatureUrl(canvas.toDataURL('image/png'));
  };

  useEffect(() => {
    if (sigMode === 'type') {
      generateTypedSignature();
    }
  }, [typedName, sigMode]);

  // Upload Signature Image
  const handleUploadSignature = async (e) => {
    const uploaded = e.target.files?.[0];
    if (uploaded) {
      const dataUrl = await readFileAsDataURL(uploaded);
      setActiveSignatureUrl(dataUrl);
    }
  };

  // Dragging placement on PDF Page
  const handleMouseDownOnSig = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - placement.x,
      y: e.clientY - placement.y,
    });
  };

  const handleMouseMoveOnPage = (e) => {
    if (!isDragging || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(rect.width - placement.width, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(rect.height - placement.height, e.clientY - rect.top - dragOffset.y));
    setPlacement((prev) => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Bake & Save Signed PDF
  const handleSignAndSave = async () => {
    if (!file || !file.data || !activeSignatureUrl) {
      addToast({ title: 'Missing Signature', message: 'Please create or upload your signature first.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      addToast({ title: 'Signing PDF', message: 'Applying signature stamp to document...' });
      const signedBytes = await pdfService.embedSignature(file.data, activeSignatureUrl, {
        pageIndex: currentPage - 1,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      });

      downloadBytes(signedBytes, sanitizeFileName(`signed-${file.name}`));
      addToast({ title: 'Signed Successfully', message: 'Your signed PDF has been downloaded.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Signing failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8" onMouseMove={handleMouseMoveOnPage} onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white mx-auto shadow-md">
          <PenTool className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Digital Signature & Sign PDF
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Draw, type, or upload your signature, place it interactively, and bake it into your PDF.
        </p>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileLoaded}
          title="Select PDF Document to Sign"
          subtitle="Drag and drop your document here"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Signature Generator */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-5 shadow-sm">
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                1. Create Your Signature
              </h3>

              {/* Mode Switcher */}
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  onClick={() => setSigMode('draw')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    sigMode === 'draw'
                      ? 'bg-pdf-600 text-white shadow'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Draw</span>
                </button>
                <button
                  onClick={() => setSigMode('type')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    sigMode === 'type'
                      ? 'bg-pdf-600 text-white shadow'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Type</span>
                </button>
                <button
                  onClick={() => setSigMode('upload')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    sigMode === 'upload'
                      ? 'bg-pdf-600 text-white shadow'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
              </div>

              {/* Draw Pad */}
              {sigMode === 'draw' && (
                <div className="space-y-2">
                  <div className="border border-surface-200 dark:border-surface-700 rounded-xl bg-white overflow-hidden">
                    <canvas
                      ref={drawCanvasRef}
                      width={380}
                      height={160}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="cursor-crosshair w-full block"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-400">Draw with mouse or fingertip</span>
                    <button
                      onClick={clearDrawing}
                      className="text-pdf-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Type Signature */}
              {sigMode === 'type' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Enter your full name..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-semibold focus:outline-none focus:border-pdf-500"
                  />
                  <div className="p-4 rounded-xl bg-white border border-surface-200 text-center font-signature text-4xl text-slate-900 select-none">
                    {typedName || 'Your Signature'}
                  </div>
                </div>
              )}

              {/* Upload Signature */}
              {sigMode === 'upload' && (
                <div className="space-y-3">
                  <label className="block p-6 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-700 text-center cursor-pointer hover:border-pdf-500">
                    <Upload className="w-6 h-6 mx-auto text-surface-400 mb-2" />
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 block">
                      Choose Signature Image (PNG or JPEG)
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleUploadSignature}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Active Signature Preview */}
              {activeSignatureUrl && (
                <div className="pt-2">
                  <span className="text-xs text-surface-400 block mb-1.5 font-medium">Active Signature Stamp:</span>
                  <div className="p-3 rounded-xl bg-white border border-surface-200 flex items-center justify-center">
                    <img src={activeSignatureUrl} alt="Active Signature" className="max-h-16 object-contain" />
                  </div>
                </div>
              )}

              {/* Save & Sign Button */}
              <button
                onClick={handleSignAndSave}
                disabled={isProcessing || !activeSignatureUrl}
                className="w-full py-3 rounded-xl bg-pdf-600 hover:bg-pdf-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-glow disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Baking Signature...' : 'Download Signed PDF'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: PDF Preview & Drag Placement */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex items-center justify-between text-xs shadow-sm">
              <span className="font-semibold text-surface-700 dark:text-surface-200">
                2. Position Signature on Page
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded text-surface-500 hover:bg-surface-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold">Page {currentPage} of {numPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  disabled={currentPage >= numPages}
                  className="p-1 rounded text-surface-500 hover:bg-surface-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Placement Stage */}
            <div
              ref={pageContainerRef}
              className="relative bg-white rounded-lg pdf-canvas-shadow overflow-hidden select-none mx-auto inline-block"
            >
              <canvas ref={pageCanvasRef} className="block" />

              {/* Draggable Signature Overlay */}
              {activeSignatureUrl && (
                <div
                  onMouseDown={handleMouseDownOnSig}
                  style={{
                    left: `${placement.x}px`,
                    top: `${placement.y}px`,
                    width: `${placement.width}px`,
                    height: `${placement.height}px`,
                  }}
                  className={`absolute z-20 cursor-move border-2 border-pdf-500 bg-white/70 backdrop-blur-[2px] rounded p-1 flex items-center justify-center shadow-lg transition-transform ${
                    isDragging ? 'scale-105 shadow-2xl ring-4 ring-pdf-500/30' : ''
                  }`}
                >
                  <img
                    src={activeSignatureUrl}
                    alt="Signature Stamp"
                    className="max-w-full max-h-full pointer-events-none object-contain"
                  />
                  <div className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-pdf-600 text-white flex items-center justify-center text-[10px] font-bold shadow">
                    <Move className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
