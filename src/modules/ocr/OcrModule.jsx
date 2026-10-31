import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { ocrService } from '../../services/ocrService';
import { readFileAsArrayBuffer, downloadBlob, sanitizeFileName } from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  Sparkles,
  Copy,
  Download,
  Languages,
  CheckCircle,
  Clock,
  FileText,
  Search,
} from 'lucide-react';

export default function OcrModule() {
  const { addToast } = useAppStore();

  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [ocrScope, setOcrScope] = useState('current'); // 'current' | 'all'
  const [targetPage, setTargetPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ status: '', percent: 0 });
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState(null);

  const languages = ocrService.getSupportedLanguages();

  const handleFileLoaded = async (uploadedFile) => {
    try {
      const buffer = await readFileAsArrayBuffer(uploadedFile);
      const pageCount = await pdfService.getPageCount(buffer);
      setFile({
        name: uploadedFile.name,
        size: uploadedFile.size,
        data: buffer,
        pageCount,
      });
      setNumPages(pageCount);
      setTargetPage(1);
      setExtractedText('');
      setConfidence(null);
      addToast({ title: 'PDF Ready for OCR', message: `${uploadedFile.name} (${pageCount} pages)` });
    } catch (err) {
      addToast({ title: 'Failed to read PDF', message: err.message, type: 'error' });
    }
  };

  const handleStartOcr = async () => {
    if (!file || !file.data) return;
    setIsProcessing(true);
    setExtractedText('');
    setProgress({ status: 'Initializing OCR Engine...', percent: 5 });

    try {
      const pdfJs = await pdfService.loadPdfJsDoc(file.data);
      const pagesToScan =
        ocrScope === 'all'
          ? Array.from({ length: pdfJs.numPages }, (_, i) => i + 1)
          : [targetPage];

      let fullOcrResult = '';
      let totalConfidence = 0;

      for (let idx = 0; idx < pagesToScan.length; idx++) {
        const pageNum = pagesToScan[idx];
        setProgress({
          status: `Rendering page ${pageNum} for OCR...`,
          percent: Math.round((idx / pagesToScan.length) * 80) + 10,
        });

        const page = await pdfJs.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // High resolution for OCR precision
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Perform OCR with progress
        const ocrData = await ocrService.recognize(
          canvas,
          selectedLanguage,
          ({ status, progress: prg }) => {
            setProgress({
              status: `[Page ${pageNum}] ${status}`,
              percent: Math.min(95, Math.round(((idx + prg / 100) / pagesToScan.length) * 90)),
            });
          }
        );

        fullOcrResult += `=== Page ${pageNum} ===\n${ocrData.text}\n\n`;
        totalConfidence += ocrData.confidence || 85;
      }

      setExtractedText(fullOcrResult);
      setConfidence(Math.round(totalConfidence / pagesToScan.length));
      setProgress({ status: 'Complete!', percent: 100 });
      addToast({ title: 'OCR Complete!', message: 'Text recognized and extracted.', type: 'success' });
    } catch (err) {
      addToast({ title: 'OCR Notice', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractEmbedded = async () => {
    if (!file || !file.data) return;
    setIsProcessing(true);
    setExtractedText('');
    setProgress({ status: 'Reading Embedded PDF Text Layer...', percent: 20 });

    try {
      const pdfJs = await pdfService.loadPdfJsDoc(file.data);
      const pagesToScan =
        ocrScope === 'all'
          ? Array.from({ length: pdfJs.numPages }, (_, i) => i + 1)
          : [targetPage];

      let fullResult = '';
      for (let idx = 0; idx < pagesToScan.length; idx++) {
        const pageNum = pagesToScan[idx];
        const page = await pdfJs.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullResult += `=== Page ${pageNum} (Embedded Text Layer) ===\n${
          pageText.trim() || '[No digital text detected on this page - use Visual OCR for scanned documents]'
        }\n\n`;
        setProgress({
          status: `Extracting digital text from page ${pageNum}...`,
          percent: Math.round(((idx + 1) / pagesToScan.length) * 100),
        });
      }

      setExtractedText(fullResult);
      setConfidence(100);
      setProgress({ status: 'Complete!', percent: 100 });
      addToast({ title: 'Text Extracted', message: 'Extracted digital text layer instantly.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Extraction Failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    addToast({ title: 'Copied to Clipboard', type: 'success' });
  };

  const handleDownloadTxt = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, sanitizeFileName(`ocr-${file.name}.txt`));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Client-Side Optical Character Recognition (OCR)
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Extract text from scanned PDFs and photos directly in your browser without uploading to the cloud.
        </p>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileLoaded}
          title="Select Scanned PDF for OCR"
          subtitle="Drag and drop scanned documents"
        />
      ) : (
        <div className="space-y-6">
          {/* File Card */}
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
              onClick={() => {
                setFile(null);
                setExtractedText('');
              }}
              className="text-xs text-surface-500 hover:text-pdf-500 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700"
            >
              Change PDF
            </button>
          </div>

          {/* OCR Configuration */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Language Selector */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-amber-500" />
                  <span>Document Language</span>
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-semibold focus:outline-none"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pages to scan */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Pages to OCR
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={ocrScope}
                    onChange={(e) => setOcrScope(e.target.value)}
                    className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-semibold focus:outline-none"
                  >
                    <option value="current">Single Page</option>
                    <option value="all">Entire Document ({numPages} pages)</option>
                  </select>

                  {ocrScope === 'current' && (
                    <input
                      type="number"
                      min="1"
                      max={numPages}
                      value={targetPage}
                      onChange={(e) => setTargetPage(parseInt(e.target.value))}
                      className="w-20 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-bold text-center"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <span>{progress.status}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="w-full bg-surface-200 dark:bg-surface-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleStartOcr}
                disabled={isProcessing}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-glow disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isProcessing ? 'Processing in Browser...' : 'Visual OCR (Scanned / Images)'}</span>
              </button>

              <button
                onClick={handleExtractEmbedded}
                disabled={isProcessing}
                className="px-6 py-3 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-100 font-bold text-xs flex items-center gap-2 border border-surface-200 dark:border-surface-700 disabled:opacity-50 transition-all"
              >
                <FileText className="w-4 h-4 text-pdf-500" />
                <span>Instant Text Layer (Digital PDF)</span>
              </button>
            </div>
          </div>

          {/* Results Output */}
          {extractedText && (
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                    Extracted OCR Output
                  </h3>
                  {confidence && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                      {confidence}% Confidence
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 hover:text-white flex items-center gap-1 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="p-1.5 rounded-lg bg-amber-500 text-white flex items-center gap-1 text-xs font-bold shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download TXT</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={12}
                value={extractedText}
                className="w-full p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono leading-relaxed focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
