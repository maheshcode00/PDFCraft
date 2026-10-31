import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { readFileAsArrayBuffer, formatBytes, downloadBytes, sanitizeFileName } from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  FileArchive,
  ArrowRight,
  Download,
  Percent,
  CheckCircle,
  Sparkles,
  Zap,
  TrendingDown,
  FileText,
} from 'lucide-react';

export default function CompressModule() {
  const { addToast } = useAppStore();

  const [file, setFile] = useState(null);
  const [level, setLevel] = useState('medium'); // 'low' | 'medium' | 'high' | 'extreme'
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedResult, setCompressedResult] = useState(null);

  const handleFileLoaded = async (uploadedFile) => {
    try {
      const buffer = await readFileAsArrayBuffer(uploadedFile);
      setFile({
        name: uploadedFile.name,
        size: uploadedFile.size,
        data: buffer,
      });
      setCompressedResult(null);
      addToast({ title: 'Document Loaded', message: `${uploadedFile.name} (${formatBytes(uploadedFile.size)})` });
    } catch (err) {
      addToast({ title: 'Failed to read file', message: err.message, type: 'error' });
    }
  };

  const levels = [
    {
      id: 'low',
      title: 'Low Compression',
      desc: 'High visual quality. Ideal for portfolios and image-heavy presentations.',
      est: '~25% reduction',
      icon: Sparkles,
      color: 'border-blue-500/30 text-blue-500',
    },
    {
      id: 'medium',
      title: 'Medium (Recommended)',
      desc: 'Balanced compression. Perfect for email attachments and office documents.',
      est: '~50% reduction',
      icon: Zap,
      color: 'border-emerald-500/30 text-emerald-500',
    },
    {
      id: 'high',
      title: 'High Compression',
      desc: 'Significant size reduction. Standard 120 DPI web optimization.',
      est: '~70% reduction',
      icon: TrendingDown,
      color: 'border-amber-500/30 text-amber-500',
    },
    {
      id: 'extreme',
      title: 'Extreme Compression',
      desc: 'Maximum shrinkage. Converts to optimized monochrome/grayscale images.',
      est: '~85% reduction',
      icon: Percent,
      color: 'border-rose-500/30 text-rose-500',
    },
  ];

  const handleCompress = async () => {
    if (!file || !file.data) return;
    setIsProcessing(true);

    try {
      addToast({ title: 'Compressing Document', message: `Applying ${level} compression algorithms...` });
      const newBytes = await pdfService.compressPdf(file.data, level);
      const newSize = newBytes.byteLength;
      const savings = Math.max(0, file.size - newSize);
      const savingsPercentage = Math.round((savings / file.size) * 100);

      setCompressedResult({
        bytes: newBytes,
        oldSize: file.size,
        newSize,
        savings,
        savingsPercentage,
      });

      addToast({
        title: 'Compression Complete!',
        message: `Saved ${formatBytes(savings)} (${savingsPercentage}% reduction)`,
        type: 'success',
      });
    } catch (err) {
      addToast({ title: 'Compression failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (compressedResult && compressedResult.bytes) {
      downloadBytes(compressedResult.bytes, sanitizeFileName(`compressed-${file.name}`));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white mx-auto shadow-md">
          <FileArchive className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Compress PDF Document
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Drastically reduce file size while retaining crystal clear reading clarity.
        </p>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileLoaded}
          title="Select PDF to Compress"
          subtitle="Drag and drop or browse from your device"
        />
      ) : (
        <div className="space-y-6">
          {/* File Card */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-surface-900 dark:text-surface-100 truncate">
                  {file.name}
                </h4>
                <p className="text-xs text-surface-400">Current Size: {formatBytes(file.size)}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setFile(null);
                setCompressedResult(null);
              }}
              className="text-xs text-surface-500 hover:text-pdf-500 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700"
            >
              Change PDF
            </button>
          </div>

          {/* Compression Level Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {levels.map((lvl) => {
              const Icon = lvl.icon;
              const isSelected = level === lvl.id;
              return (
                <div
                  key={lvl.id}
                  onClick={() => setLevel(lvl.id)}
                  className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:border-surface-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-emerald-500" />
                      <h4 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                        {lvl.title}
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {lvl.est}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                    {lvl.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Action or Result Area */}
          {!compressedResult ? (
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4">
              <div className="text-xs text-surface-500">
                Ready to compress with <strong>{level.toUpperCase()}</strong> preset.
              </div>
              <button
                onClick={handleCompress}
                disabled={isProcessing}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-glow disabled:opacity-50"
              >
                <span>{isProcessing ? 'Optimizing PDF...' : 'Compress PDF Now'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl p-6 border border-emerald-500/30 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>Document Optimized Successfully!</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-xs shadow">
                  -{compressedResult.savingsPercentage}%
                </span>
              </div>

              {/* Stats Comparison */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800">
                  <span className="text-xs text-surface-400 block mb-1">Original Size</span>
                  <span className="text-base font-bold text-surface-800 dark:text-surface-200">
                    {formatBytes(compressedResult.oldSize)}
                  </span>
                </div>
                <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800">
                  <span className="text-xs text-surface-400 block mb-1">Compressed Size</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBytes(compressedResult.newSize)}
                  </span>
                </div>
                <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800">
                  <span className="text-xs text-surface-400 block mb-1">Space Saved</span>
                  <span className="text-base font-bold text-brand-500">
                    {formatBytes(compressedResult.savings)}
                  </span>
                </div>
              </div>

              {/* Download Compressed File */}
              <button
                onClick={handleDownload}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01]"
              >
                <Download className="w-5 h-5" />
                <span>Download Compressed PDF ({formatBytes(compressedResult.newSize)})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
