import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import {
  readFileAsArrayBuffer,
  downloadAsZip,
  formatBytes,
  sanitizeFileName,
} from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  Boxes,
  Play,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileArchive,
  RefreshCw,
  Stamp,
  Layers,
  FileText,
} from 'lucide-react';

export default function BatchModule() {
  const { addToast } = useAppStore();

  const [operation, setOperation] = useState('compress'); // 'compress' | 'watermark' | 'convert_images'
  const [queue, setQueue] = useState([]); // [{ id, name, size, data, status: 'queued'|'processing'|'done'|'failed', resultBytes }]
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleFilesAdded = async (files) => {
    const list = Array.isArray(files) ? files : [files];
    const newItems = [];
    for (const f of list) {
      const buffer = await readFileAsArrayBuffer(f);
      newItems.push({
        id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: f.name,
        size: f.size,
        data: buffer,
        status: 'queued',
        resultBytes: null,
      });
    }
    setQueue((prev) => [...prev, ...newItems]);
    addToast({ title: 'Batch Queue Updated', message: `Added ${newItems.length} file(s).` });
  };

  const removeQueueItem = (id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Run Batch Processing
  const handleStartBatch = async () => {
    if (queue.length === 0) return;
    setIsProcessing(true);
    setOverallProgress(0);

    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      item.status = 'processing';
      setQueue([...updatedQueue]);

      try {
        let resultBytes;
        if (operation === 'compress') {
          resultBytes = await pdfService.compressPdf(item.data, 'medium');
        } else if (operation === 'watermark') {
          resultBytes = await pdfService.addTextWatermark(item.data, {
            text: 'CONFIDENTIAL',
            fontSize: 48,
            opacity: 0.25,
            angle: 45,
            color: { r: 0.9, g: 0.1, b: 0.1 },
            tile: true,
          });
        }

        item.status = 'done';
        item.resultBytes = resultBytes;
      } catch (err) {
        item.status = 'failed';
      }

      setOverallProgress(Math.round(((i + 1) / updatedQueue.length) * 100));
      setQueue([...updatedQueue]);
    }

    setIsProcessing(false);
    addToast({ title: 'Batch Processing Finished', message: 'All files processed.', type: 'success' });
  };

  // Download All as ZIP
  const handleDownloadZip = async () => {
    const doneItems = queue.filter((item) => item.status === 'done' && item.resultBytes);
    if (doneItems.length === 0) {
      addToast({ title: 'No Completed Files', message: 'No finished results to download.', type: 'error' });
      return;
    }

    const zipEntries = doneItems.map((item) => ({
      name: sanitizeFileName(`processed-${item.name}`),
      data: item.resultBytes,
    }));

    await downloadAsZip(zipEntries, sanitizeFileName(`batch-${operation}-results.zip`));
    addToast({ title: 'ZIP Downloaded', message: `Archived ${doneItems.length} documents.`, type: 'success' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-pink-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Boxes className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Batch PDF Processor
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Automate bulk operations across dozens of documents simultaneously with offline worker threads.
        </p>
      </div>

      {/* Operation Tabs */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <button
          onClick={() => setOperation('compress')}
          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
            operation === 'compress'
              ? 'border-fuchsia-500 bg-fuchsia-50/40 dark:bg-fuchsia-950/20 text-fuchsia-600 font-bold'
              : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600'
          }`}
        >
          <FileArchive className="w-5 h-5" />
          <span className="text-xs">Batch Compress</span>
        </button>
        <button
          onClick={() => setOperation('watermark')}
          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
            operation === 'watermark'
              ? 'border-fuchsia-500 bg-fuchsia-50/40 dark:bg-fuchsia-950/20 text-fuchsia-600 font-bold'
              : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600'
          }`}
        >
          <Stamp className="w-5 h-5" />
          <span className="text-xs">Batch Watermark</span>
        </button>
      </div>

      {/* Drop Zone */}
      <DropZone
        onFilesSelected={handleFilesAdded}
        multiple={true}
        title="Add multiple PDF files to queue"
        subtitle="Select 2 or more files for batch processing"
      />

      {queue.length > 0 && (
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-6 shadow-sm">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                Processing Queue ({queue.length} items)
              </h3>
              <p className="text-xs text-surface-400">Target Operation: {operation.toUpperCase()}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueue([])}
                className="text-xs text-surface-500 hover:text-pdf-500 px-3 py-1.5"
              >
                Clear Queue
              </button>
              <button
                onClick={handleStartBatch}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isProcessing ? 'Processing...' : 'Start Batch'}</span>
              </button>
              <button
                onClick={handleDownloadZip}
                disabled={isProcessing || !queue.some((q) => q.status === 'done')}
                className="px-5 py-2 rounded-xl bg-surface-800 text-white font-bold text-xs flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All (ZIP)</span>
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-fuchsia-600">
                <span>Batch Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-fuchsia-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Queue List */}
          <div className="divide-y divide-surface-100 dark:divide-surface-800 max-h-80 overflow-y-auto">
            {queue.map((item, idx) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-surface-400 font-bold w-5">{idx + 1}</span>
                  <FileText className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  <span className="font-semibold text-surface-800 dark:text-surface-200 truncate">
                    {item.name}
                  </span>
                  <span className="text-surface-400">{formatBytes(item.size)}</span>
                </div>

                <div className="flex items-center gap-3">
                  {item.status === 'queued' && (
                    <span className="flex items-center gap-1 text-surface-400 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Queued
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="flex items-center gap-1 text-fuchsia-600 font-bold animate-pulse">
                      Processing...
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="flex items-center gap-1 text-emerald-500 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> Complete
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="flex items-center gap-1 text-pdf-500 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}

                  <button
                    onClick={() => removeQueueItem(item.id)}
                    className="text-surface-400 hover:text-pdf-500 p-1"
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
