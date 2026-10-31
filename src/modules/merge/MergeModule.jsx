import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { readFileAsArrayBuffer, formatBytes, downloadBytes, sanitizeFileName } from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  FileText,
  Plus,
  CheckCircle,
  FileCheck,
} from 'lucide-react';

export default function MergeModule() {
  const { addToast } = useAppStore();
  const [files, setFiles] = useState([]);
  const [mergedFileName, setMergedFileName] = useState('merged-document.pdf');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesAdded = async (newFiles) => {
    const list = Array.isArray(newFiles) ? newFiles : [newFiles];
    const loadedList = [];

    for (const f of list) {
      try {
        const buffer = await readFileAsArrayBuffer(f);
        const doc = await pdfService.loadPdfJsDoc(buffer);
        const pageCount = doc.numPages;
        const thumb = await pdfService.generateThumbnail(doc, 1, 100);
        loadedList.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: f.name,
          size: f.size,
          data: buffer,
          pageCount,
          thumbnail: thumb,
        });
      } catch (err) {
        addToast({ title: 'Failed to read file', message: f.name, type: 'error' });
      }
    }

    setFiles((prev) => [...prev, ...loadedList]);
    addToast({ title: 'Files Added', message: `${loadedList.length} files added to merge queue.` });
  };

  const moveFile = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setFiles(updated);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      addToast({ title: 'Add More Files', message: 'Please select at least 2 PDFs to merge.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      addToast({ title: 'Merging Documents', message: 'Combining pages into a single PDF...' });
      const buffers = files.map((f) => f.data);
      const mergedBytes = await pdfService.mergePdfs(buffers);
      downloadBytes(mergedBytes, sanitizeFileName(mergedFileName, '.pdf'));
      addToast({ title: 'Success!', message: 'Merged PDF downloaded successfully.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Merge Failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = files.reduce((acc, f) => acc + (f.pageCount || 0), 0);
  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Module Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Layers className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Merge PDF Documents
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Combine multiple PDFs into a single, seamless document in the exact order you want.
        </p>
      </div>

      {/* Drop Zone */}
      <DropZone
        onFilesSelected={handleFilesAdded}
        multiple={true}
        title="Add PDF files to merge"
        subtitle="Select or drop 2 or more PDF documents"
      />

      {files.length > 0 && (
        <div className="space-y-6">
          {/* Queue Summary Bar */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-surface-900 dark:text-white font-bold">{files.length} Files</span>
              <span>•</span>
              <span className="text-surface-600 dark:text-surface-300">{totalPages} Total Pages</span>
              <span>•</span>
              <span className="text-surface-600 dark:text-surface-300">{formatBytes(totalSize)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiles([])}
                className="text-xs text-surface-500 hover:text-pdf-500 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 transition-colors"
              >
                Clear Queue
              </button>
            </div>
          </div>

          {/* Files Reorder List */}
          <div className="space-y-3">
            {files.map((file, idx) => (
              <div
                key={file.id}
                className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4 shadow-sm hover:border-pdf-500/40 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="w-6 text-center font-bold text-xs text-surface-400">
                    {idx + 1}
                  </span>

                  {file.thumbnail ? (
                    <img
                      src={file.thumbnail}
                      alt="Thumbnail"
                      className="w-12 h-16 object-cover rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-surface-100 dark:bg-surface-800 rounded-lg flex items-center justify-center text-surface-400 flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                      {file.name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                      <span>{file.pageCount} pages</span>
                      <span>•</span>
                      <span>{formatBytes(file.size)}</span>
                    </div>
                  </div>
                </div>

                {/* Move & Remove Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => moveFile(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-500 hover:text-surface-900 dark:hover:text-white disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveFile(idx, 1)}
                    disabled={idx === files.length - 1}
                    className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-500 hover:text-surface-900 dark:hover:text-white disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-400 hover:text-pdf-500 transition-colors ml-2"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Output File Name
              </label>
              <input
                type="text"
                value={mergedFileName}
                onChange={(e) => setMergedFileName(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-medium focus:outline-none focus:border-pdf-500"
              />
            </div>

            <button
              onClick={handleMerge}
              disabled={isProcessing || files.length < 2}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-glow disabled:opacity-50 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isProcessing ? 'Merging Documents...' : 'Merge & Download PDF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
