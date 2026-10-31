import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import OfflineBadge from '../common/OfflineBadge';
import {
  FileText,
  Sun,
  Moon,
  Layers,
  Scissors,
  FileArchive,
  RefreshCw,
  Eye,
  Edit3,
  PenTool,
  Stamp,
  Lock,
  Camera,
  Search,
  Grid,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const { theme, toggleTheme } = useAppStore();
  const [toolsOpen, setToolsOpen] = useState(false);
  const location = useLocation();

  const toolCategories = [
    {
      category: 'View & Edit',
      items: [
        { name: 'PDF Viewer', path: '/viewer', icon: Eye, desc: 'Multi-tab view, search, rotate' },
        { name: 'Edit PDF', path: '/editor', icon: Edit3, desc: 'Add text, drawings, shapes, images' },
        { name: 'Organize Pages', path: '/organize', icon: Grid, desc: 'Reorder, rotate, delete, duplicate' },
        { name: 'Sign PDF', path: '/signatures', icon: PenTool, desc: 'Draw, type, or upload digital signature' },
        { name: 'Watermark', path: '/watermark', icon: Stamp, desc: 'Apply custom text or logo watermark' },
      ],
    },
    {
      category: 'Merge & Split',
      items: [
        { name: 'Merge PDF', path: '/merge', icon: Layers, desc: 'Combine multiple PDFs into one' },
        { name: 'Split PDF', path: '/split', icon: Scissors, desc: 'Extract pages, split by range' },
        { name: 'Compress PDF', path: '/compress', icon: FileArchive, desc: 'Reduce file size with 4 presets' },
      ],
    },
    {
      category: 'Convert & Tools',
      items: [
        { name: 'Convert Tools', path: '/convert', icon: RefreshCw, desc: 'PDF to Images/TXT & Images to PDF' },
        { name: 'OCR Extract', path: '/ocr', icon: Sparkles, desc: 'Optical character recognition in browser' },
        { name: 'Security & Protect', path: '/security', icon: Lock, desc: 'Password encryption & unlock' },
        { name: 'Compare PDFs', path: '/compare', icon: Search, desc: 'Visual & text differences' },
        { name: 'Scan to PDF', path: '/scan', icon: Camera, desc: 'Capture with webcam/phone' },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-surface-900/90 backdrop-blur-md border-b border-surface-200 dark:border-surface-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pdf-600 to-rose-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-surface-900 dark:text-white">
                  PdfCraft<span className="text-pdf-500 ml-0.5">Pro</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-pdf-500/10 text-pdf-600 dark:text-pdf-400 border border-pdf-500/20">
                  Local
                </span>
              </div>
            </div>
          </Link>

          {/* Tools Mega-Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              onBlur={() => setTimeout(() => setToolsOpen(false), 250)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <span>All PDF Tools</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {toolsOpen && (
              <div className="absolute left-0 mt-2 w-[640px] bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 p-5 grid grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-150">
                {toolCategories.map((group) => (
                  <div key={group.category} className="space-y-3">
                    <h5 className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                      {group.category}
                    </h5>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${
                              isActive
                                ? 'bg-pdf-50 dark:bg-pdf-950/50 text-pdf-600 dark:text-pdf-400 font-medium'
                                : 'hover:bg-surface-100 dark:hover:bg-surface-800/70 text-surface-700 dark:text-surface-200'
                            }`}
                          >
                            <Icon className="w-4 h-4 mt-0.5 text-pdf-500 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-medium">{item.name}</div>
                              <div className="text-[11px] text-surface-400 dark:text-surface-500 line-clamp-1">
                                {item.desc}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Offline Ready Badge */}
          <OfflineBadge />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* New / Home Button */}
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pdf-600 hover:bg-pdf-500 text-white font-semibold text-xs shadow-md transition-all hover:shadow-glow"
          >
            <span>Workbench Home</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
