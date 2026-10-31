import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { readFileAsArrayBuffer, downloadBytes, downloadAsZip, sanitizeFileName } from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  Scissors,
  Check,
  Download,
  Archive,
  Layers,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react';

export default function SplitModule() {
  const { addToast } = useAppStore();
  const location = useLocation();

  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [splitMode, setSplitMode] = useState('ranges'); // 'ranges' | 'extract' | 'every_n'
  const [pageRangesInput, setPageRangesInput] = useState('1-2, 3');
  const [everyNInput, setEveryNInput] = useState(1);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'extract') {
      setSplitMode('extract');
    }
  }, [location]);

  const handleFileLoaded = async (uploadedFile) => {
    try {
      const buffer = await readFileAsArrayBuffer(uploadedFile);
      const doc = await pdfService.loadPdfJsDoc(buffer);
      const pageCount = doc.numPages;
      setFile({
        name: uploadedFile.name,
        size: uploadedFile.size,
        data: buffer,
        pageCount,
      });
      setNumPages(pageCount);

      // Default range input
      if (pageCount >= 2) {
        setPageRangesInput(`1-${Math.ceil(pageCount / 2)}, ${Math.ceil(pageCount / 2) + 1}-${pageCount}`);
      } else {
        setPageRangesInput('1');
      }

      // Preload thumbnails
      const thumbs = [];
      for (let i = 1; i <= Math.min(pageCount, 50); i++) {
        const url = await pdfService.generateThumbnail(doc, i, 120);
        thumbs.push({ page: i, url });
      }
      setThumbnails(thumbs);
      setSelectedPages(new Set([1]));
      addToast({ title: 'Document Loaded', message: `${uploadedFile.name} (${pageCount} pages)` });
    } catch (err) {
      addToast({ title: 'Error reading file', message: err.message, type: 'error' });
    }
  };

  const togglePageSelect = (page) => {
    const next = new Set(selectedPages);
    if (next.has(page)) {
      next.delete(page);
    } else {
      next.add(page);
    }
    setSelectedPages(next);
  };

  const selectAll = () => {
    const all = new Set();
    for (let i = 1; i <= numPages; i++) all.add(i);
    setSelectedPages(all);
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  // Parse custom range string like "1-3, 5, 8-10" into 0-indexed arrays
  const parseRanges = (input, maxPages) => {
    const chunks = input.split(',').map((s) => s.trim()).filter(Boolean);
    const result = [];

    for (const chunk of chunks) {
      if (chunk.includes('-')) {
        const [startStr, endStr] = chunk.split('-');
        let start = parseInt(startStr) || 1;
        let end = parseInt(endStr) || maxPages;
        start = Math.max(1, Math.min(start, maxPages));
        end = Math.max(1, Math.min(end, maxPages));
        if (start > end) [start, end] = [end, start];

        const rangeIndices = [];
        for (let p = start; p <= end; p++) {
          rangeIndices.push(p - 1);
        }
        if (rangeIndices.length > 0) result.push(rangeIndices);
      } else {
        const p = parseInt(chunk);
        if (p >= 1 && p <= maxPages) {
          result.push([p - 1]);
        }
      }
    }

    return result;
  };

  const handleSplit = async (downloadZip = false) => {
    if (!file || !file.data) return;
    setIsProcessing(true);

    try {
      let rangesToSplit = [];

      if (splitMode === 'ranges') {
        rangesToSplit = parseRanges(pageRangesInput, numPages);
      } else if (splitMode === 'extract') {
        const sorted = Array.from(selectedPages).sort((a, b) => a - b);
        if (sorted.length === 0) {
          addToast({ title: 'No Pages Selected', message: 'Select at least one page to extract.', type: 'error' });
          setIsProcessing(false);
          return;
        }
        rangesToSplit = [sorted.map((p) => p - 1)];
      } else if (splitMode === 'every_n') {
        const n = Math.max(1, parseInt(everyNInput) || 1);
        for (let i = 0; i < numPages; i += n) {
          const chunk = [];
          for (let j = i; j < Math.min(i + n, numPages); j++) {
            chunk.push(j);
          }
          rangesToSplit.push(chunk);
        }
      }

      if (rangesToSplit.length === 0) {
        addToast({ title: 'Invalid Ranges', message: 'Please enter valid page numbers or ranges.', type: 'error' });
        setIsProcessing(false);
        return;
      }

      const splitResults = await pdfService.splitPdf(file.data, rangesToSplit);

      if (splitResults.length === 1 && !downloadZip) {
        // Direct single file download
        const res = splitResults[0];
        const fname = sanitizeFileName(`pages-${res.pages.join('_')}-${file.name}`);
        downloadBytes(res.bytes, fname);
        addToast({ title: 'Split Complete', message: `Downloaded ${fname}`, type: 'success' });
      } else {
        // Zip bundle
        const zipFiles = splitResults.map((res) => ({
          name: sanitizeFileName(`part-${res.index}-pages-${res.pages.join('_')}.pdf`),
          data: res.bytes,
        }));
        await downloadAsZip(zipFiles, sanitizeFileName(`split-${file.name}.zip`));
        addToast({ title: 'Split Complete', message: `Downloaded ZIP with ${splitResults.length} files.`, type: 'success' });
      }
    } catch (err) {
      addToast({ title: 'Split failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Scissors className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Split & Extract PDF Pages
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Separate single pages, custom ranges, or extract selected sheets into clean documents.
        </p>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileLoaded}
          title="Select PDF to Split"
          subtitle="Drag and drop your document here"
        />
      ) : (
        <div className="space-y-6">
          {/* File Info Bar */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-surface-900 dark:text-surface-100">{file.name}</h4>
                <p className="text-xs text-surface-400">{numPages} Total Pages</p>
              </div>
            </div>

            <button
              onClick={() => setFile(null)}
              className="text-xs text-surface-500 hover:text-pdf-500 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700"
            >
              Change PDF
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-surface-200 dark:border-surface-800 gap-4 text-xs font-semibold">
            <button
              onClick={() => setSplitMode('ranges')}
              className={`pb-3 border-b-2 transition-colors ${
                splitMode === 'ranges'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Split by Page Ranges
            </button>
            <button
              onClick={() => setSplitMode('extract')}
              className={`pb-3 border-b-2 transition-colors ${
                splitMode === 'extract'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Extract Selected Pages ({selectedPages.size})
            </button>
            <button
              onClick={() => setSplitMode('every_n')}
              className={`pb-3 border-b-2 transition-colors ${
                splitMode === 'every_n'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Split Every N Pages
            </button>
          </div>

          {/* Mode Configuration Area */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-4">
            {splitMode === 'ranges' && (
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Page Ranges (Comma separated, e.g. "1-3, 5, 7-10")
                </label>
                <input
                  type="text"
                  value={pageRangesInput}
                  onChange={(e) => setPageRangesInput(e.target.value)}
                  placeholder="1-2, 3-5"
                  className="w-full sm:w-96 px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono font-medium focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-surface-400 mt-1">
                  Each range or number creates an independent PDF file.
                </p>
              </div>
            )}

            {splitMode === 'every_n' && (
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Split into chunks of every N pages
                </label>
                <input
                  type="number"
                  min="1"
                  max={numPages}
                  value={everyNInput}
                  onChange={(e) => setEveryNInput(parseInt(e.target.value))}
                  className="w-32 px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-bold focus:outline-none"
                />
              </div>
            )}

            {splitMode === 'extract' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                    Click pages to select/deselect for extraction:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-amber-500 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      onClick={deselectAll}
                      className="text-xs text-surface-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2">
                  {thumbnails.map((thumb) => {
                    const isSelected = selectedPages.has(thumb.page);
                    return (
                      <div
                        key={thumb.page}
                        onClick={() => togglePageSelect(thumb.page)}
                        className={`cursor-pointer rounded-xl p-2 border transition-all text-center relative group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                            : 'border-surface-200 dark:border-surface-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="absolute top-3 right-3 z-10">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded bg-amber-500 text-white flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded border border-surface-400 bg-white/80" />
                          )}
                        </div>

                        {thumb.url ? (
                          <img src={thumb.url} alt={`Page ${thumb.page}`} className="w-full h-auto rounded" />
                        ) : (
                          <div className="w-full h-24 bg-surface-100 rounded flex items-center justify-center text-xs">
                            {thumb.page}
                          </div>
                        )}
                        <span className="text-xs font-bold block mt-1.5">Page {thumb.page}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Split Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleSplit(false)}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-glow disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Splitting...' : 'Download Extracted PDF'}</span>
              </button>

              <button
                onClick={() => handleSplit(true)}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-xs flex items-center gap-2 border border-surface-200 dark:border-surface-700 disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                <span>Download as ZIP Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
