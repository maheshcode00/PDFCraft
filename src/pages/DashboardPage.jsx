import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { storageService } from '../services/storageService';
import { readFileAsArrayBuffer, formatBytes, downloadBytes } from '../utils/fileUtils';
import { createSamplePdf } from '../utils/samplePdf';
import DropZone from '../components/common/DropZone';
import {
  Eye,
  Edit3,
  Layers,
  Scissors,
  FileArchive,
  RefreshCw,
  Copy,
  Trash2,
  RotateCw,
  Stamp,
  PenTool,
  Sparkles,
  Lock,
  Unlock,
  Grid,
  Search,
  Camera,
  Boxes,
  Star,
  Clock,
  ArrowRight,
  ShieldCheck,
  Download,
  Trash,
  FileText,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    recentFiles,
    starredFiles,
    loadRecentFiles,
    toggleStar,
    deleteFile,
    openInViewer,
    addToast,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadRecentFiles();
  }, [loadRecentFiles]);

  // Master Tools Directory
  const tools = [
    {
      id: 'viewer',
      name: 'PDF Viewer',
      desc: 'Multi-tab viewer with continuous scroll, dual page mode, search & thumbnails.',
      icon: Eye,
      path: '/viewer',
      category: 'view',
      color: 'from-blue-500 to-indigo-600',
      badge: 'Popular',
    },
    {
      id: 'editor',
      name: 'Edit PDF',
      desc: 'Add custom text, pencil drawings, highlighters, shapes, stamps, and logos.',
      icon: Edit3,
      path: '/editor',
      category: 'edit',
      color: 'from-rose-500 to-red-600',
      badge: 'Interactive',
    },
    {
      id: 'merge',
      name: 'Merge PDF',
      desc: 'Combine multiple PDF documents into a unified file with drag & drop reordering.',
      icon: Layers,
      path: '/merge',
      category: 'organize',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'split',
      name: 'Split PDF',
      desc: 'Extract specific pages, page ranges (e.g. 1-3, 5), or split every N pages.',
      icon: Scissors,
      path: '/split',
      category: 'organize',
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'organize',
      name: 'Organize Pages',
      desc: 'Reorder pages visually, rotate 90°, duplicate, delete, or insert blank sheets.',
      icon: Grid,
      path: '/organize',
      category: 'organize',
      color: 'from-teal-500 to-emerald-600',
    },
    {
      id: 'compress',
      name: 'Compress PDF',
      desc: 'Reduce PDF file size up to 85% with Low, Medium, High, and Extreme compression.',
      icon: FileArchive,
      path: '/compress',
      category: 'optimize',
      color: 'from-emerald-500 to-teal-600',
      badge: 'Save Space',
    },
    {
      id: 'convert',
      name: 'Convert PDF',
      desc: 'Convert PDF to Images (PNG/JPG) & Text, or compile Images & Text into PDF.',
      icon: RefreshCw,
      path: '/convert',
      category: 'convert',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      id: 'signatures',
      name: 'Sign PDF',
      desc: 'Draw digital signature, type cursive signatures, or upload stamp image.',
      icon: PenTool,
      path: '/signatures',
      category: 'edit',
      color: 'from-pink-500 to-rose-600',
      badge: 'Legal',
    },
    {
      id: 'watermark',
      name: 'Watermark PDF',
      desc: 'Stamp customizable text or corporate logos with custom rotation, opacity & tile.',
      icon: Stamp,
      path: '/watermark',
      category: 'edit',
      color: 'from-violet-500 to-purple-600',
    },
    {
      id: 'ocr',
      name: 'OCR PDF',
      desc: 'Extract machine-readable text from scanned PDFs using browser Tesseract.js engine.',
      icon: Sparkles,
      path: '/ocr',
      category: 'optimize',
      color: 'from-amber-400 to-yellow-600',
      badge: 'AI Engine',
    },
    {
      id: 'security-encrypt',
      name: 'Encrypt PDF',
      desc: 'Lock documents with robust password protection & restrict printing/copying.',
      icon: Lock,
      path: '/security?mode=encrypt',
      category: 'security',
      color: 'from-red-500 to-rose-700',
    },
    {
      id: 'security-unlock',
      name: 'Unlock PDF',
      desc: 'Remove password restrictions and decrypt password-protected PDF files.',
      icon: Unlock,
      path: '/security?mode=unlock',
      category: 'security',
      color: 'from-slate-600 to-surface-800',
    },
    {
      id: 'compare',
      name: 'Compare PDFs',
      desc: 'Side-by-side visual diff overlay and text comparison highlighting alterations.',
      icon: Search,
      path: '/compare',
      category: 'view',
      color: 'from-blue-600 to-cyan-700',
    },
    {
      id: 'scan',
      name: 'Scan to PDF',
      desc: 'Capture pages with your webcam or mobile camera with automatic B&W document filter.',
      icon: Camera,
      path: '/scan',
      category: 'convert',
      color: 'from-indigo-500 to-violet-600',
    },
    {
      id: 'batch',
      name: 'Batch Tools',
      desc: 'Process multiple documents in bulk: Batch Merge, Compress, Convert, & Watermark.',
      icon: Boxes,
      path: '/batch',
      category: 'optimize',
      color: 'from-fuchsia-500 to-pink-600',
      badge: 'Multi-Queue',
    },
    {
      id: 'extract-pages',
      name: 'Extract Pages',
      desc: 'Select individual pages to create a separate high-resolution document.',
      icon: Copy,
      path: '/split?mode=extract',
      category: 'organize',
      color: 'from-orange-500 to-amber-600',
    },
    {
      id: 'delete-pages',
      name: 'Delete Pages',
      desc: 'Select unwanted pages to cleanly strip them out of the PDF structure.',
      icon: Trash2,
      path: '/organize?mode=delete',
      category: 'organize',
      color: 'from-rose-600 to-red-700',
    },
    {
      id: 'rotate-pages',
      name: 'Rotate Pages',
      desc: 'Rotate portrait and landscape orientations in 90-degree increments.',
      icon: RotateCw,
      path: '/organize?mode=rotate',
      category: 'organize',
      color: 'from-sky-500 to-blue-600',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'view', label: 'View & Read' },
    { id: 'edit', label: 'Edit & Annotate' },
    { id: 'organize', label: 'Organize & Split' },
    { id: 'optimize', label: 'Compress & OCR' },
    { id: 'convert', label: 'Convert & Scan' },
    { id: 'security', label: 'Security & Lock' },
  ];

  const filteredTools = tools.filter((t) => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle Dropzone Upload from Dashboard
  const handleFileDrop = async (file) => {
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const saved = await storageService.saveRecentFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: buffer,
        pageCount: 1,
      });

      if (saved) {
        openInViewer(saved);
        loadRecentFiles();
        addToast({
          title: 'Document Loaded',
          message: `${file.name} saved locally. Opening in PDF Viewer.`,
          type: 'success',
        });
        navigate('/viewer');
      }
    } catch (err) {
      addToast({
        title: 'Upload Failed',
        message: err.message || 'Unable to read PDF file',
        type: 'error',
      });
    }
  };

  const handleOpenRecent = (file) => {
    openInViewer(file);
    navigate('/viewer');
  };

  const handleLoadSample = async () => {
    try {
      addToast({ title: 'Generating Sample PDF', message: 'Creating in-memory 2-page test document...' });
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
        loadRecentFiles();
        addToast({
          title: 'Sample PDF Loaded',
          message: 'Ready to view, edit, sign, or test any tool!',
          type: 'success',
        });
        navigate('/viewer');
      }
    } catch (err) {
      addToast({ title: 'Sample generation failed', message: err.message, type: 'error' });
    }
  };

  const handleDownloadFile = (file) => {
    if (file.data) {
      downloadBytes(file.data, file.name);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pdf-500/10 border border-pdf-500/20 text-pdf-600 dark:text-pdf-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero-Cloud Guaranteed • 100% Client-Side Privacy</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white leading-tight">
          Every PDF Tool You Need. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-pdf-600 via-rose-500 to-indigo-600 bg-clip-text text-transparent">
            Right Inside Your Browser.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-surface-600 dark:text-surface-300 leading-relaxed">
          No file limits. No server uploads. Edit, merge, split, compress, sign, and OCR documents locally with full offline PWA capabilities.
        </p>
      </div>

      {/* Main Upload Drop Zone */}
      <div className="max-w-3xl mx-auto space-y-3">
        <DropZone
          onFilesSelected={handleFileDrop}
          title="Drop any PDF here to open instantly"
          subtitle="or browse from your local disk for private processing"
        />
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className="text-surface-400">Don't have a PDF ready?</span>
          <button
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pdf-600 to-rose-600 hover:from-pdf-500 hover:to-rose-500 text-white font-bold shadow-sm hover:shadow transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try with Sample PDF (Instant Demo)</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-200 dark:border-surface-800">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === c.id
                  ? 'bg-pdf-600 text-white shadow-md shadow-pdf-500/20'
                  : 'bg-surface-100 dark:bg-surface-800/80 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 18+ tools..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 focus:outline-none focus:border-pdf-500 text-surface-900 dark:text-surface-100 placeholder-surface-400 transition-colors"
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => navigate(tool.path)}
              className="group relative cursor-pointer rounded-2xl p-5 bg-white dark:bg-surface-900/60 border border-surface-200 dark:border-surface-800/80 hover:border-pdf-500/50 dark:hover:border-pdf-500/50 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${tool.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {tool.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pdf-50 dark:bg-pdf-950/60 text-pdf-600 dark:text-pdf-400 border border-pdf-500/20">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 group-hover:text-pdf-600 dark:group-hover:text-pdf-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1.5 leading-relaxed line-clamp-2">
                  {tool.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-surface-100 dark:border-surface-800/60 flex items-center justify-between text-xs font-semibold text-pdf-600 dark:text-pdf-400 opacity-90 group-hover:opacity-100">
                <span>Launch Tool</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Starred / Favorites Section */}
      {starredFiles.length > 0 && (
        <section className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
              Starred Documents
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {starredFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-3 group"
              >
                <div
                  onClick={() => handleOpenRecent(file)}
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                >
                  <div className="w-9 h-9 rounded-lg bg-pdf-50 dark:bg-pdf-950/60 text-pdf-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate group-hover:text-pdf-500 transition-colors">
                      {file.name}
                    </h4>
                    <span className="text-[11px] text-surface-400">{formatBytes(file.size)}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleStar(file.id)}
                  className="text-amber-500 hover:scale-110 transition-transform p-1"
                >
                  <Star className="w-4 h-4 fill-amber-500" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Files Section */}
      <section className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-surface-500" />
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
              Recent Documents
            </h2>
          </div>
          {recentFiles.length > 0 && (
            <span className="text-xs text-surface-400 font-medium">
              Saved locally in IndexedDB
            </span>
          )}
        </div>

        {recentFiles.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-surface-200 dark:border-surface-800 bg-white/40 dark:bg-surface-900/30">
            <FileText className="w-10 h-10 mx-auto text-surface-300 dark:text-surface-600 mb-2" />
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
              No recent documents yet.
            </p>
            <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
              Any file you view, edit, or process will be cached locally for quick access.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-sm">
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors"
                >
                  <div
                    onClick={() => handleOpenRecent(file)}
                    className="flex items-center gap-3.5 cursor-pointer min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-pdf-500/10 text-pdf-600 dark:text-pdf-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate hover:text-pdf-500 transition-colors">
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{file.pageCount || 1} pages</span>
                        <span>•</span>
                        <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => toggleStar(file.id)}
                      title="Star document"
                      className="p-2 rounded-lg text-surface-400 hover:text-amber-500 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${file.isStarred ? 'text-amber-500 fill-amber-500' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      title="Download file"
                      className="p-2 rounded-lg text-surface-400 hover:text-brand-500 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFile(file.id)}
                      title="Remove from history"
                      className="p-2 rounded-lg text-surface-400 hover:text-pdf-500 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenRecent(file)}
                      className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pdf-50 dark:bg-pdf-950/60 text-pdf-600 dark:text-pdf-400 border border-pdf-500/20 hover:bg-pdf-500 hover:text-white transition-all ml-2"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
