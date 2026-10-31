import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { readFileAsArrayBuffer, downloadBytes, sanitizeFileName } from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  Grid,
  RotateCw,
  Copy,
  Trash2,
  Plus,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  FilePlus,
} from 'lucide-react';

export default function OrganizeModule() {
  const { addToast } = useAppStore();
  const location = useLocation();

  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // [{ id, originalIndex, rotation, thumbnail, isBlank }]
  const [isProcessing, setIsProcessing] = useState(false);

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

      const pagesList = [];
      for (let i = 1; i <= pageCount; i++) {
        const thumb = await pdfService.generateThumbnail(doc, i, 140);
        pagesList.push({
          id: `page_${i}_${Math.random().toString(36).substring(2, 6)}`,
          originalIndex: i - 1,
          pageNumber: i,
          rotation: 0,
          thumbnail: thumb,
          isBlank: false,
        });
      }
      setPages(pagesList);
      addToast({ title: 'Document Loaded', message: `${uploadedFile.name} (${pageCount} pages)` });
    } catch (err) {
      addToast({ title: 'Error loading file', message: err.message, type: 'error' });
    }
  };

  const rotatePage = (id) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const duplicatePage = (index) => {
    const target = pages[index];
    const duplicated = {
      ...target,
      id: `page_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...pages];
    updated.splice(index + 1, 0, duplicated);
    setPages(updated);
    addToast({ title: 'Page Duplicated', message: `Copied page ${index + 1}` });
  };

  const deletePage = (id) => {
    if (pages.length <= 1) {
      addToast({ title: 'Cannot Delete', message: 'PDF must have at least one page.', type: 'error' });
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const addBlankPage = (index = pages.length) => {
    const blank = {
      id: `blank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      originalIndex: 0,
      pageNumber: 'Blank',
      rotation: 0,
      thumbnail: null,
      isBlank: true,
    };
    const updated = [...pages];
    updated.splice(index, 0, blank);
    setPages(updated);
    addToast({ title: 'Blank Page Added', message: 'Inserted new blank sheet.' });
  };

  const movePage = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    setPages(updated);
  };

  const handleExport = async () => {
    if (!file || !file.data) return;
    setIsProcessing(true);

    try {
      addToast({ title: 'Reorganizing Pages', message: 'Building new PDF layout...' });
      const pagesConfig = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
        isBlank: p.isBlank,
      }));

      const newBytes = await pdfService.organizePages(file.data, pagesConfig);
      downloadBytes(newBytes, sanitizeFileName(`organized-${file.name}`));
      addToast({ title: 'Success', message: 'Organized PDF downloaded.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Failed to organize', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Grid className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Organize & Rearrange Pages
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Rotate, reorder, delete, duplicate, or insert blank pages anywhere in your document.
        </p>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileLoaded}
          title="Select PDF to Organize"
          subtitle="Drag and drop your document to view all pages"
        />
      ) : (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-surface-900 dark:text-white">
                {pages.length} Pages in Document
              </span>
              <button
                onClick={() => addBlankPage(pages.length)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 text-xs font-semibold text-surface-700 dark:text-surface-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Blank Page</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setFile(null)}
                className="text-xs text-surface-500 hover:text-pdf-500 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700"
              >
                Change PDF
              </button>
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-glow disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Save & Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* Grid of Pages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                className="bg-white dark:bg-surface-900 rounded-2xl p-3 border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col justify-between group hover:border-teal-500/50 transition-colors"
              >
                {/* Page Index & Move Buttons */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-surface-500">#{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePage(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded text-surface-400 hover:text-surface-900 dark:hover:text-white disabled:opacity-20"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePage(idx, 1)}
                      disabled={idx === pages.length - 1}
                      className="p-1 rounded text-surface-400 hover:text-surface-900 dark:hover:text-white disabled:opacity-20"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Page Preview */}
                <div className="relative aspect-[3/4] bg-surface-50 dark:bg-surface-800 rounded-xl overflow-hidden border border-surface-100 dark:border-surface-700/60 flex items-center justify-center p-2 mb-3">
                  {p.isBlank ? (
                    <div className="text-center p-4 text-xs text-surface-400 font-medium">
                      Blank Page
                    </div>
                  ) : p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt={`Page ${idx + 1}`}
                      className="max-h-full max-w-full object-contain transition-transform duration-200 rounded"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    />
                  ) : (
                    <div className="text-xs text-surface-400">Page {p.pageNumber}</div>
                  )}
                </div>

                {/* Action Buttons for this page */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-surface-100 dark:border-surface-800/60">
                  <button
                    onClick={() => rotatePage(p.id)}
                    className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 flex justify-center"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => duplicatePage(idx)}
                    className="p-1.5 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 flex justify-center"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deletePage(p.id)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-pdf-500 hover:bg-surface-100 dark:hover:bg-surface-800 flex justify-center"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
