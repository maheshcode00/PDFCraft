import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, FileCheck } from 'lucide-react';

export default function DropZone({
  onFilesSelected,
  accept = {
    'application/pdf': ['.pdf'],
    'application/x-pdf': ['.pdf'],
    'application/acrobat': ['.pdf'],
    'applications/vnd.pdf': ['.pdf'],
    'text/pdf': ['.pdf'],
    'text/x-pdf': ['.pdf'],
  },
  multiple = false,
  title = 'Drag & drop PDF here',
  subtitle = 'or click to browse from your device',
  className = '',
  compact = false,
}) {
  const onDrop = useCallback(
    (acceptedFiles, fileRejections) => {
      // Collect accepted files
      let filesToProcess = [...acceptedFiles];

      // Fallback: Check rejected files for matching extension
      if (fileRejections && fileRejections.length > 0) {
        fileRejections.forEach(({ file }) => {
          if (file && file.name) {
            const ext = file.name.split('.').pop().toLowerCase();
            // If accept expects .pdf or image, check extension
            if (accept && Object.values(accept).flat().some((a) => a.includes(ext))) {
              filesToProcess.push(file);
            }
          }
        });
      }

      if (filesToProcess.length > 0) {
        onFilesSelected(multiple ? filesToProcess : filesToProcess[0]);
      }
    },
    [onFilesSelected, multiple, accept]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center select-none ${
        isDragReject
          ? 'border-pdf-500 bg-pdf-500/10'
          : isDragActive
          ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
          : 'border-surface-300 dark:border-surface-700 hover:border-pdf-500 dark:hover:border-pdf-500 bg-white/50 dark:bg-surface-900/50 hover:bg-surface-50 dark:hover:bg-surface-800/40'
      } ${compact ? 'p-6' : 'p-10'} ${className}`}
    >
      <input {...getInputProps()} />

      <div
        className={`rounded-2xl p-4 flex items-center justify-center mb-4 transition-transform ${
          isDragActive
            ? 'scale-110 bg-brand-500 text-white shadow-glow-brand'
            : 'bg-pdf-50 dark:bg-pdf-950/40 text-pdf-600 dark:text-pdf-400'
        }`}
      >
        {isDragActive ? <FileCheck className="w-8 h-8" /> : <FileUp className="w-8 h-8" />}
      </div>

      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
        {isDragActive ? 'Drop the file to load immediately' : title}
      </h3>
      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-sm">
        {subtitle}
      </p>

      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
        <span>🔒 100% Client-Side. Never uploaded to any server.</span>
      </div>
    </div>
  );
}
