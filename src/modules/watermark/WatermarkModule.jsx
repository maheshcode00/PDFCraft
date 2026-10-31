import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import {
  readFileAsArrayBuffer,
  readFileAsDataURL,
  downloadBytes,
  sanitizeFileName,
} from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  Stamp,
  Type,
  Image as ImageIcon,
  RotateCw,
  Palette,
  Download,
  FileText,
  Sliders,
} from 'lucide-react';

export default function WatermarkModule() {
  const { addToast } = useAppStore();

  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'image'

  // Text watermark options
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [angle, setAngle] = useState(45);
  const [opacity, setOpacity] = useState(0.25);
  const [color, setColor] = useState('#dc2626');
  const [tile, setTile] = useState(false);

  // Image watermark options
  const [imageBuffer, setImageBuffer] = useState(null);
  const [imageScale, setImageScale] = useState(0.4);
  const [imagePosition, setImagePosition] = useState('center');

  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);

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
      addToast({ title: 'PDF Loaded', message: uploadedFile.name });
    } catch (err) {
      addToast({ title: 'Error reading PDF', message: err.message, type: 'error' });
    }
  };

  // Render Page Preview with live watermark overlay
  useEffect(() => {
    if (!file || !canvasRef.current) return;
    async function renderPreview() {
      const pdfJs = await pdfService.loadPdfJsDoc(file.data);
      const dims = await pdfService.renderPageToCanvas(pdfJs, 1, canvasRef.current, 1.0);

      // Draw simulated live watermark on canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.save();

      if (watermarkType === 'text' && text.trim()) {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (tile) {
          const stepX = 220;
          const stepY = 160;
          for (let x = 0; x < canvas.width; x += stepX) {
            for (let y = 0; y < canvas.height; y += stepY) {
              ctx.save();
              ctx.translate(x + 50, y + 50);
              ctx.rotate((angle * Math.PI) / 180);
              ctx.fillText(text, 0, 0);
              ctx.restore();
            }
          }
        } else {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.fillText(text, 0, 0);
        }
      }

      ctx.restore();
    }

    renderPreview();
  }, [file, watermarkType, text, fontSize, angle, opacity, color, tile]);

  const handleUploadLogo = async (e) => {
    const uploaded = e.target.files?.[0];
    if (uploaded) {
      const buffer = await readFileAsArrayBuffer(uploaded);
      setImageBuffer(buffer);
      addToast({ title: 'Logo Uploaded', message: uploaded.name });
    }
  };

  const handleApplyWatermark = async () => {
    if (!file || !file.data) return;
    setIsProcessing(true);

    try {
      addToast({ title: 'Applying Watermark', message: 'Stamping document pages...' });

      // Convert hex color to rgb [0-1]
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      let watermarkedBytes;
      if (watermarkType === 'text') {
        watermarkedBytes = await pdfService.addTextWatermark(file.data, {
          text,
          fontSize,
          angle,
          opacity,
          color: { r, g, b },
          tile,
        });
      } else if (imageBuffer) {
        watermarkedBytes = await pdfService.addImageWatermark(file.data, imageBuffer, {
          scale: imageScale,
          opacity,
          position: imagePosition,
        });
      }

      if (watermarkedBytes) {
        downloadBytes(watermarkedBytes, sanitizeFileName(`watermarked-${file.name}`));
        addToast({ title: 'Success', message: 'Watermarked PDF downloaded.', type: 'success' });
      }
    } catch (err) {
      addToast({ title: 'Failed to watermark', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Stamp className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          PDF Watermark Studio
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Apply branded text stamps or high-resolution company logos to all pages with custom opacity and rotation.
        </p>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileLoaded}
          title="Select PDF Document to Watermark"
          subtitle="Drag and drop your file here"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Watermark Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-5 shadow-sm">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  onClick={() => setWatermarkType('text')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    watermarkType === 'text'
                      ? 'bg-pdf-600 text-white shadow'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Text Watermark</span>
                </button>
                <button
                  onClick={() => setWatermarkType('image')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    watermarkType === 'image'
                      ? 'bg-pdf-600 text-white shadow'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Image / Logo</span>
                </button>
              </div>

              {watermarkType === 'text' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL, DRAFT"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-bold focus:outline-none focus:border-pdf-500 uppercase"
                    />
                  </div>

                  {/* Size & Angle */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                        Font Size ({fontSize}px)
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="96"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-full accent-pdf-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                        Angle ({angle}°)
                      </label>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        value={angle}
                        onChange={(e) => setAngle(parseInt(e.target.value))}
                        className="w-full accent-pdf-600"
                      />
                    </div>
                  </div>

                  {/* Opacity & Color */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                        Opacity ({Math.round(opacity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        className="w-full accent-pdf-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-surface-500">{color}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tile across page */}
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tile}
                      onChange={(e) => setTile(e.target.checked)}
                      className="rounded text-pdf-600 focus:ring-0"
                    />
                    <span className="text-xs font-medium">Tile Pattern (Repeat across whole page)</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block p-5 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-700 text-center cursor-pointer hover:border-pdf-500">
                    <ImageIcon className="w-6 h-6 mx-auto text-surface-400 mb-2" />
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 block">
                      Choose PNG / JPG Logo
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                      Position
                    </label>
                    <select
                      value={imagePosition}
                      onChange={(e) => setImagePosition(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-semibold"
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                      Opacity ({Math.round(opacity * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-pdf-600"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleApplyWatermark}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-pdf-600 hover:bg-pdf-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-glow disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Watermarking...' : 'Apply & Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Watermark Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex items-center justify-between text-xs shadow-sm">
              <span className="font-semibold text-surface-700 dark:text-surface-200">
                Live Watermark Preview (Page 1)
              </span>
              <span className="text-surface-400">{numPages} Total Pages</span>
            </div>

            <div className="relative bg-white rounded-lg pdf-canvas-shadow overflow-hidden mx-auto inline-block">
              <canvas ref={canvasRef} className="block max-w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
