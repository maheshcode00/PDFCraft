import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { readFileAsArrayBuffer } from '../../utils/fileUtils';
import { diffLines, computeCanvasVisualDiff } from '../../utils/diffUtils';
import DropZone from '../../components/common/DropZone';
import {
  Search,
  ArrowRightLeft,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function CompareModule() {
  const { addToast } = useAppStore();

  const [docA, setDocA] = useState(null);
  const [docB, setDocB] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPages, setMaxPages] = useState(1);
  const [compareMode, setCompareMode] = useState('visual'); // 'visual' | 'text'
  const [visualDiffPercent, setVisualDiffPercent] = useState(0);
  const [textDiff, setTextDiff] = useState([]);
  const [isComparing, setIsComparing] = useState(false);

  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  const canvasDiffRef = useRef(null);

  const handleUploadA = async (file) => {
    try {
      const buf = await readFileAsArrayBuffer(file);
      const pages = await pdfService.getPageCount(buf);
      setDocA({ name: file.name, data: buf, pageCount: pages });
      setMaxPages(Math.max(pages, docB?.pageCount || 1));
      addToast({ title: 'Document A Loaded', message: file.name });
    } catch (err) {
      addToast({ title: 'Error loading A', message: err.message, type: 'error' });
    }
  };

  const handleUploadB = async (file) => {
    try {
      const buf = await readFileAsArrayBuffer(file);
      const pages = await pdfService.getPageCount(buf);
      setDocB({ name: file.name, data: buf, pageCount: pages });
      setMaxPages(Math.max(pages, docA?.pageCount || 1));
      addToast({ title: 'Document B Loaded', message: file.name });
    } catch (err) {
      addToast({ title: 'Error loading B', message: err.message, type: 'error' });
    }
  };

  // Run Comparison when both docs are loaded or page changes
  useEffect(() => {
    if (!docA || !docB) return;

    let isCancelled = false;
    async function runComparison() {
      setIsComparing(true);
      try {
        const pdfJsA = await pdfService.loadPdfJsDoc(docA.data);
        const pdfJsB = await pdfService.loadPdfJsDoc(docB.data);

        // Visual Compare
        if (canvasARef.current && canvasBRef.current) {
          if (currentPage <= docA.pageCount) {
            await pdfService.renderPageToCanvas(pdfJsA, currentPage, canvasARef.current, 1.0);
          }
          if (currentPage <= docB.pageCount) {
            await pdfService.renderPageToCanvas(pdfJsB, currentPage, canvasBRef.current, 1.0);
          }

          if (canvasDiffRef.current) {
            const { diffCanvas, differencePercentage } = computeCanvasVisualDiff(
              canvasARef.current,
              canvasBRef.current
            );
            if (!isCancelled) {
              setVisualDiffPercent(differencePercentage);
              const ctx = canvasDiffRef.current.getContext('2d');
              canvasDiffRef.current.width = diffCanvas.width;
              canvasDiffRef.current.height = diffCanvas.height;
              ctx.drawImage(diffCanvas, 0, 0);
            }
          }
        }

        // Text Compare
        let textA = '';
        let textB = '';
        if (currentPage <= docA.pageCount) {
          const pA = await pdfJsA.getPage(currentPage);
          const tA = await pA.getTextContent();
          textA = tA.items.map((i) => i.str).join('\n');
        }
        if (currentPage <= docB.pageCount) {
          const pB = await pdfJsB.getPage(currentPage);
          const tB = await pB.getTextContent();
          textB = tB.items.map((i) => i.str).join('\n');
        }

        if (!isCancelled) {
          setTextDiff(diffLines(textA, textB));
        }
      } catch (err) {
        console.warn('Comparison error', err);
      } finally {
        if (!isCancelled) setIsComparing(false);
      }
    }

    runComparison();
    return () => {
      isCancelled = true;
    };
  }, [docA, docB, currentPage]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center text-white mx-auto shadow-md">
          <ArrowRightLeft className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          PDF Comparison & Diff Engine
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Compare two PDF versions with high-resolution visual pixel difference overlay and line-by-line text diffing.
        </p>
      </div>

      {/* Two Document Uploaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 space-y-3">
          <span className="text-xs font-bold text-surface-700 dark:text-surface-300 block uppercase tracking-wider">
            Original Document (Version A)
          </span>
          {!docA ? (
            <DropZone onFilesSelected={handleUploadA} title="Select Version A" compact={true} />
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-pdf-500" />
                <span className="text-xs font-semibold truncate max-w-xs">{docA.name}</span>
              </div>
              <button onClick={() => setDocA(null)} className="text-xs text-pdf-500 hover:underline">
                Replace
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 space-y-3">
          <span className="text-xs font-bold text-surface-700 dark:text-surface-300 block uppercase tracking-wider">
            Modified Document (Version B)
          </span>
          {!docB ? (
            <DropZone onFilesSelected={handleUploadB} title="Select Version B" compact={true} />
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-500" />
                <span className="text-xs font-semibold truncate max-w-xs">{docB.name}</span>
              </div>
              <button onClick={() => setDocB(null)} className="text-xs text-pdf-500 hover:underline">
                Replace
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison View */}
      {docA && docB && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompareMode('visual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  compareMode === 'visual'
                    ? 'bg-pdf-600 text-white shadow'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                }`}
              >
                Visual Pixel Diff
              </button>
              <button
                onClick={() => setCompareMode('text')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  compareMode === 'text'
                    ? 'bg-pdf-600 text-white shadow'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600'
                }`}
              >
                Text Differences Diff
              </button>
            </div>

            {/* Difference Indicator */}
            {compareMode === 'visual' && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-pdf-500/10 text-pdf-600 dark:text-pdf-400 border border-pdf-500/20">
                Visual Difference: {visualDiffPercent}% Changed
              </span>
            )}

            {/* Page Stepper */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded text-surface-500 hover:bg-surface-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {currentPage} of {maxPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
                disabled={currentPage >= maxPages}
                className="p-1 rounded text-surface-500 hover:bg-surface-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Visual Diff Viewport */}
          {compareMode === 'visual' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="space-y-2 text-center">
                <span className="text-xs font-bold text-surface-500 block">Version A</span>
                <div className="bg-white rounded-lg pdf-canvas-shadow overflow-hidden inline-block">
                  <canvas ref={canvasARef} className="block max-w-full" />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <span className="text-xs font-bold text-surface-500 block">Version B</span>
                <div className="bg-white rounded-lg pdf-canvas-shadow overflow-hidden inline-block">
                  <canvas ref={canvasBRef} className="block max-w-full" />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <span className="text-xs font-bold text-pdf-500 block">Difference Overlay (Red = Changed)</span>
                <div className="bg-white rounded-lg pdf-canvas-shadow overflow-hidden inline-block">
                  <canvas ref={canvasDiffRef} className="block max-w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Text Diff Viewport */}
          {compareMode === 'text' && (
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                Text Changes (Page {currentPage})
              </h4>
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-950 font-mono text-xs space-y-1 max-h-[500px] overflow-y-auto">
                {textDiff.map((line, i) => {
                  let lineStyle = 'text-surface-700 dark:text-surface-300';
                  let prefix = '  ';
                  if (line.type === 'added') {
                    lineStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold';
                    prefix = '+ ';
                  } else if (line.type === 'removed') {
                    lineStyle = 'bg-pdf-500/10 text-pdf-600 dark:text-pdf-400 line-through';
                    prefix = '- ';
                  }
                  return (
                    <div key={i} className={`px-2 py-0.5 rounded ${lineStyle}`}>
                      <span>{prefix}</span>
                      <span>{line.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
