import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { storageService } from '../../services/storageService';
import { readFileAsArrayBuffer, downloadBytes, formatBytes } from '../../utils/fileUtils';
import { createSamplePdf } from '../../utils/samplePdf';
import DropZone from '../../components/common/DropZone';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCw,
  Search,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Moon,
  Sun,
  X,
  FilePlus,
  Columns,
  Square,
  ScrollText,
  BookmarkCheck,
  Sidebar,
  FileText,
  Sparkles,
} from 'lucide-react';

export default function PdfViewerModule() {
  const { openTabs, activeTabId, openInViewer, closeTab, setActiveTabId, addToast } = useAppStore();

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'dual' | 'continuous'
  const [nightMode, setNightMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('thumbnails'); // 'thumbnails' | 'bookmarks' | 'search'
  const [thumbnails, setThumbnails] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasDualRef = useRef(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId) || openTabs[0];

  // Load document whenever activeTab changes
  useEffect(() => {
    if (!activeTab || !activeTab.data) {
      setPdfDoc(null);
      setNumPages(0);
      setThumbnails([]);
      return;
    }

    let isCancelled = false;
    async function loadDoc() {
      setIsLoading(true);
      try {
        const doc = await pdfService.loadPdfJsDoc(activeTab.data);
        if (isCancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);

        // Generate thumbnails directly from loaded document
        const thumbs = [];
        for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
          const thumbUrl = await pdfService.generateThumbnail(doc, i, 140);
          thumbs.push({ page: i, url: thumbUrl });
        }
        if (!isCancelled) setThumbnails(thumbs);
      } catch (err) {
        addToast({
          title: 'Failed to open PDF',
          message: err.message || 'File may be corrupted or password-protected',
          type: 'error',
        });
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, addToast]);

  // Render Page to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    async function renderPage() {
      try {
        await pdfService.renderPageToCanvas(
          pdfDoc,
          currentPage,
          canvasRef.current,
          scale,
          rotation
        );

        if (viewMode === 'dual' && currentPage + 1 <= numPages && canvasDualRef.current) {
          await pdfService.renderPageToCanvas(
            pdfDoc,
            currentPage + 1,
            canvasDualRef.current,
            scale,
            rotation
          );
        }
      } catch (err) {
        console.warn('Canvas render interrupted', err);
      }
    }

    renderPage();
  }, [pdfDoc, currentPage, scale, rotation, viewMode, numPages]);

  // Handle Search in Document
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!pdfDoc || !searchQuery.trim()) return;

    setIsLoading(true);
    const results = [];
    const q = searchQuery.toLowerCase();

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((it) => it.str).join(' ');
      if (text.toLowerCase().includes(q)) {
        // Snippet around match
        const idx = text.toLowerCase().indexOf(q);
        const snippet = text.substring(Math.max(0, idx - 40), Math.min(text.length, idx + 80));
        results.push({ page: i, snippet });
      }
    }

    setSearchResults(results);
    setSidebarTab('search');
    setIsLoading(false);
    if (results.length > 0) {
      setCurrentPage(results[0].page);
    } else {
      addToast({ title: 'No matches found', message: `"${searchQuery}" not found in PDF`, type: 'info' });
    }
  };

  // Bookmark Toggle
  const toggleBookmark = () => {
    if (bookmarks.includes(currentPage)) {
      setBookmarks(bookmarks.filter((p) => p !== currentPage));
      addToast({ title: 'Bookmark Removed', message: `Page ${currentPage} unbookmarked` });
    } else {
      setBookmarks([...bookmarks, currentPage].sort((a, b) => a - b));
      addToast({ title: 'Bookmark Added', message: `Page ${currentPage} saved to bookmarks` });
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Upload New File
  const handleOpenFile = async (file) => {
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const saved = await storageService.saveRecentFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: buffer,
        pageCount: 1,
      });
      openInViewer(saved);
      addToast({ title: 'Document Loaded', message: file.name, type: 'success' });
    } catch (err) {
      addToast({ title: 'Error opening file', message: err.message, type: 'error' });
    }
  };

  const handleLoadSample = async () => {
    try {
      addToast({ title: 'Generating Sample PDF', message: 'Creating in-memory test document...' });
      const sampleBytes = await createSamplePdf();
      const saved = await storageService.saveRecentFile({
        name: 'Sample-Executive-Report.pdf',
        size: sampleBytes.byteLength,
        type: 'application/pdf',
        data: sampleBytes.slice().buffer,
        pageCount: 2,
      });
      if (saved) {
        openInViewer(saved);
        addToast({ title: 'Sample PDF Loaded', message: '2-page document ready for testing!', type: 'success' });
      }
    } catch (err) {
      addToast({ title: 'Sample generation failed', message: err.message, type: 'error' });
    }
  };

  const handleDownload = () => {
    if (activeTab && activeTab.data) {
      downloadBytes(activeTab.data, activeTab.name || 'document.pdf');
    }
  };

  const handlePrint = () => {
    if (activeTab && activeTab.data) {
      const blob = new Blob([activeTab.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-surface-100 dark:bg-surface-950 min-h-[calc(100vh-4rem)]">
      {/* Top Document Tabs Strip */}
      <div className="bg-surface-200 dark:bg-surface-900 border-b border-surface-300 dark:border-surface-800 px-4 flex items-center gap-1 overflow-x-auto select-none pt-2">
        {openTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-medium cursor-pointer transition-colors max-w-[200px] border-t border-x ${
                isActive
                  ? 'bg-white dark:bg-surface-950 text-pdf-600 dark:text-pdf-400 border-surface-300 dark:border-surface-800 font-semibold shadow-sm'
                  : 'bg-surface-300/60 dark:bg-surface-800/60 text-surface-600 dark:text-surface-400 border-transparent hover:bg-surface-200 dark:hover:bg-surface-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-60 hover:opacity-100 hover:text-pdf-500 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        <label className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-surface-500 hover:text-surface-900 dark:hover:text-white cursor-pointer transition-colors">
          <FilePlus className="w-3.5 h-3.5" />
          <span>Open File</span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleOpenFile(e.target.files[0])}
          />
        </label>
      </div>

      {!activeTab ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
          <div className="max-w-md w-full">
            <DropZone
              onFilesSelected={handleOpenFile}
              title="Select a PDF to view"
              subtitle="Open multiple documents in tabs for parallel viewing"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-surface-400">Want to test right now?</span>
            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pdf-600 to-rose-600 text-white font-bold shadow hover:shadow-glow transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample PDF (Instant Demo)</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Toolbar */}
          <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-10 shadow-sm">
            {/* Left Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  sidebarOpen
                    ? 'bg-pdf-50 dark:bg-pdf-950/60 text-pdf-600 border-pdf-500/20'
                    : 'text-surface-500 border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
                title="Toggle Sidebar"
              >
                <Sidebar className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-surface-200 dark:bg-surface-800 mx-1" />

              {/* Page Stepper */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 font-medium text-surface-700 dark:text-surface-200">
                <input
                  type="number"
                  min="1"
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => {
                    const p = parseInt(e.target.value);
                    if (p >= 1 && p <= numPages) setCurrentPage(p);
                  }}
                  className="w-12 text-center py-1 rounded bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 font-bold focus:outline-none"
                />
                <span>/ {numPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Zoom & Orientation */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}
                title="Zoom Out"
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="w-14 text-center font-semibold text-surface-600 dark:text-surface-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(3.0, s + 0.2))}
                title="Zoom In"
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-surface-200 dark:bg-surface-800 mx-1" />

              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate View Clockwise"
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* View Layouts */}
              <button
                onClick={() => setViewMode('single')}
                title="Single Page View"
                className={`p-1.5 rounded-lg ${
                  viewMode === 'single'
                    ? 'bg-pdf-50 dark:bg-pdf-950/60 text-pdf-600 font-bold'
                    : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('dual')}
                title="Dual Page Spread"
                className={`p-1.5 rounded-lg ${
                  viewMode === 'dual'
                    ? 'bg-pdf-50 dark:bg-pdf-950/60 text-pdf-600 font-bold'
                    : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <Columns className="w-4 h-4" />
              </button>

              <button
                onClick={() => setNightMode(!nightMode)}
                title="Night Invert Mode"
                className={`p-1.5 rounded-lg ${
                  nightMode
                    ? 'bg-purple-500/20 text-purple-400 font-bold'
                    : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <Moon className="w-4 h-4" />
              </button>

              <button
                onClick={toggleBookmark}
                title="Bookmark Current Page"
                className={`p-1.5 rounded-lg ${
                  bookmarks.includes(currentPage)
                    ? 'text-amber-500 bg-amber-500/10'
                    : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarks.includes(currentPage) ? 'fill-amber-500' : ''}`} />
              </button>
            </div>

            {/* Right Quick Actions */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Find text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1 w-36 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs focus:outline-none focus:w-48 transition-all"
                />
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-surface-400" />
              </form>

              <button
                onClick={toggleFullscreen}
                title="Fullscreen"
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrint}
                title="Print PDF"
                className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                title="Download PDF"
                className="p-1.5 rounded-lg bg-pdf-600 text-white hover:bg-pdf-500 font-semibold flex items-center gap-1 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>

          {/* Main Stage with Sidebar */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Collapsible Sidebar */}
            {sidebarOpen && (
              <div className="w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col z-10 flex-shrink-0 animate-in slide-in-from-left-4 duration-200">
                {/* Sidebar Navigation */}
                <div className="flex border-b border-surface-200 dark:border-surface-800 text-xs font-semibold">
                  <button
                    onClick={() => setSidebarTab('thumbnails')}
                    className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                      sidebarTab === 'thumbnails'
                        ? 'border-pdf-500 text-pdf-600 dark:text-pdf-400'
                        : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
                    }`}
                  >
                    Pages ({numPages})
                  </button>
                  <button
                    onClick={() => setSidebarTab('bookmarks')}
                    className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                      sidebarTab === 'bookmarks'
                        ? 'border-pdf-500 text-pdf-600 dark:text-pdf-400'
                        : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
                    }`}
                  >
                    Bookmarks ({bookmarks.length})
                  </button>
                  <button
                    onClick={() => setSidebarTab('search')}
                    className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                      sidebarTab === 'search'
                        ? 'border-pdf-500 text-pdf-600 dark:text-pdf-400'
                        : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
                    }`}
                  >
                    Search ({searchResults.length})
                  </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {sidebarTab === 'thumbnails' && (
                    <div className="grid grid-cols-2 gap-3">
                      {thumbnails.map((thumb) => (
                        <div
                          key={thumb.page}
                          onClick={() => setCurrentPage(thumb.page)}
                          className={`cursor-pointer rounded-xl p-1.5 border transition-all text-center group ${
                            currentPage === thumb.page
                              ? 'border-pdf-500 bg-pdf-50 dark:bg-pdf-950/40 shadow-md ring-2 ring-pdf-500/30'
                              : 'border-surface-200 dark:border-surface-800 hover:border-surface-400 bg-surface-50 dark:bg-surface-800/40'
                          }`}
                        >
                          {thumb.url ? (
                            <img
                              src={thumb.url}
                              alt={`Page ${thumb.page}`}
                              className="w-full h-auto rounded shadow-sm group-hover:scale-102 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-28 bg-surface-200 dark:bg-surface-700 rounded flex items-center justify-center text-xs">
                              Page {thumb.page}
                            </div>
                          )}
                          <span className="text-[11px] font-semibold mt-1 block text-surface-600 dark:text-surface-300">
                            {thumb.page}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sidebarTab === 'bookmarks' && (
                    <div className="space-y-2">
                      {bookmarks.length === 0 ? (
                        <div className="text-center py-8 text-xs text-surface-400">
                          <Bookmark className="w-8 h-8 mx-auto text-surface-300 dark:text-surface-700 mb-2" />
                          No bookmarks added yet. Click the ribbon icon to save pages.
                        </div>
                      ) : (
                        bookmarks.map((bmPage) => (
                          <div
                            key={bmPage}
                            onClick={() => setCurrentPage(bmPage)}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700/60 hover:border-pdf-500 cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <BookmarkCheck className="w-4 h-4 text-amber-500" />
                              <span className="font-semibold">Page {bmPage}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBookmarks(bookmarks.filter((b) => b !== bmPage));
                              }}
                              className="text-surface-400 hover:text-pdf-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {sidebarTab === 'search' && (
                    <div className="space-y-2">
                      {searchResults.length === 0 ? (
                        <div className="text-center py-8 text-xs text-surface-400">
                          Type in the search box to find text across all pages.
                        </div>
                      ) : (
                        searchResults.map((res, i) => (
                          <div
                            key={i}
                            onClick={() => setCurrentPage(res.page)}
                            className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700/60 hover:border-pdf-500 cursor-pointer text-xs"
                          >
                            <div className="font-bold text-pdf-600 dark:text-pdf-400 mb-1">
                              Page {res.page}
                            </div>
                            <p className="text-[11px] text-surface-600 dark:text-surface-300 line-clamp-3 leading-relaxed">
                              "...{res.snippet}..."
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Canvas Scroll Area */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              <div
                className={`transition-all duration-200 flex gap-6 items-center justify-center ${
                  nightMode ? 'invert hue-rotate-180 contrast-125' : ''
                }`}
              >
                {/* Primary Page Canvas */}
                <div className="relative bg-white rounded-lg pdf-canvas-shadow overflow-hidden">
                  <canvas ref={canvasRef} className="block" />
                </div>

                {/* Dual Page Mode Second Canvas */}
                {viewMode === 'dual' && currentPage + 1 <= numPages && (
                  <div className="relative bg-white rounded-lg pdf-canvas-shadow overflow-hidden">
                    <canvas ref={canvasDualRef} className="block" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
