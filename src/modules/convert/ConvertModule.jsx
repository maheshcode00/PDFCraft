import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import {
  readFileAsArrayBuffer,
  readFileAsText,
  downloadBytes,
  downloadBlob,
  downloadAsZip,
  formatBytes,
  sanitizeFileName,
} from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Code,
  Download,
  Archive,
  ArrowRightLeft,
  CheckCircle,
} from 'lucide-react';

export default function ConvertModule() {
  const { addToast } = useAppStore();

  const [activeTab, setActiveTab] = useState('from_pdf'); // 'from_pdf' | 'to_pdf'
  const [conversionType, setConversionType] = useState('pdf_to_images'); // 'pdf_to_images' | 'pdf_to_txt' | 'images_to_pdf' | 'text_to_pdf'
  const [pdfFile, setPdfFile] = useState(null);
  const [imagesList, setImagesList] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [imageOrientation, setImageOrientation] = useState('auto'); // 'portrait' | 'landscape' | 'auto'
  const [imageMargin, setImageMargin] = useState(20);
  const [imageFormat, setImageFormat] = useState('image/png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');

  // Handle PDF upload for "From PDF"
  const handlePdfLoaded = async (file) => {
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const count = await pdfService.getPageCount(buffer);
      setPdfFile({ name: file.name, size: file.size, data: buffer, pageCount: count });
      setExtractedText('');
      addToast({ title: 'PDF Loaded', message: `${file.name} (${count} pages)` });
    } catch (err) {
      addToast({ title: 'Failed to read PDF', message: err.message, type: 'error' });
    }
  };

  // Handle Images upload for "Images to PDF"
  const handleImagesAdded = async (files) => {
    const list = Array.isArray(files) ? files : [files];
    const loaded = [];
    for (const f of list) {
      const buffer = await readFileAsArrayBuffer(f);
      loaded.push({ name: f.name, size: f.size, type: f.type, data: buffer });
    }
    setImagesList((prev) => [...prev, ...loaded]);
    addToast({ title: 'Images Added', message: `${loaded.length} image(s) queued.` });
  };

  // Convert PDF to Images
  const handlePdfToImages = async () => {
    if (!pdfFile || !pdfFile.data) return;
    setIsProcessing(true);
    try {
      addToast({ title: 'Rendering Pages', message: 'Converting PDF pages to images...' });
      const images = await pdfService.renderPagesToImages(pdfFile.data, imageFormat, 1.5);
      const ext = imageFormat === 'image/png' ? 'png' : 'jpg';

      if (images.length === 1) {
        downloadBlob(images[0].blob, sanitizeFileName(`page-1.${ext}`));
      } else {
        const zipEntries = images.map((img) => ({
          name: sanitizeFileName(`page-${img.pageNumber}.${ext}`),
          data: img.blob,
        }));
        await downloadAsZip(zipEntries, sanitizeFileName(`images-${pdfFile.name}.zip`));
      }

      addToast({ title: 'Conversion Complete', message: `Exported ${images.length} pages as images.`, type: 'success' });
    } catch (err) {
      addToast({ title: 'Conversion Failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert PDF to Plain Text
  const handlePdfToText = async () => {
    if (!pdfFile || !pdfFile.data) return;
    setIsProcessing(true);
    try {
      addToast({ title: 'Extracting Text', message: 'Reading document text content...' });
      const { fullText } = await pdfService.extractText(pdfFile.data);
      setExtractedText(fullText);
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, sanitizeFileName(`extracted-${pdfFile.name}.txt`));
      addToast({ title: 'Text Extracted', message: 'Downloaded TXT file.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Extraction Failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert Images to PDF
  const handleImagesToPdf = async () => {
    if (imagesList.length === 0) {
      addToast({ title: 'No Images', message: 'Please add at least one image.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    try {
      addToast({ title: 'Generating PDF', message: 'Compiling images into PDF document...' });
      const bytes = await pdfService.imagesToPdf(imagesList, {
        orientation: imageOrientation,
        margin: imageMargin,
      });
      downloadBytes(bytes, sanitizeFileName('converted-images.pdf'));
      addToast({ title: 'Success', message: 'Images compiled into PDF.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Failed to create PDF', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert Text to PDF
  const handleTextToPdf = async () => {
    if (!textInput.trim()) {
      addToast({ title: 'Empty Content', message: 'Please enter or paste text to convert.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    try {
      addToast({ title: 'Typesetting Document', message: 'Generating formatted PDF pages...' });
      const bytes = await pdfService.textToPdf(textInput, 'PdfCraft Export');
      downloadBytes(bytes, sanitizeFileName('text-document.pdf'));
      addToast({ title: 'Success', message: 'Text converted to PDF.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Failed to convert', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-md">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Universal PDF Converter
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Convert PDF to Images & Text, or generate polished PDFs from Images & Plain Text locally.
        </p>
      </div>

      {/* Main Direction Tabs */}
      <div className="flex justify-center">
        <div className="bg-surface-100 dark:bg-surface-900 p-1 rounded-2xl border border-surface-200 dark:border-surface-800 flex gap-1">
          <button
            onClick={() => {
              setActiveTab('from_pdf');
              setConversionType('pdf_to_images');
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'from_pdf'
                ? 'bg-white dark:bg-surface-800 text-pdf-600 dark:text-pdf-400 shadow'
                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            Convert From PDF
          </button>
          <button
            onClick={() => {
              setActiveTab('to_pdf');
              setConversionType('images_to_pdf');
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'to_pdf'
                ? 'bg-white dark:bg-surface-800 text-pdf-600 dark:text-pdf-400 shadow'
                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            Convert To PDF
          </button>
        </div>
      </div>

      {/* SUB-SECTION 1: FROM PDF */}
      {activeTab === 'from_pdf' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={() => setConversionType('pdf_to_images')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                conversionType === 'pdf_to_images'
                  ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 text-cyan-600 font-bold'
                  : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600'
              }`}
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-xs">PDF to Images (PNG/JPG)</span>
            </button>
            <button
              onClick={() => setConversionType('pdf_to_txt')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                conversionType === 'pdf_to_txt'
                  ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 text-cyan-600 font-bold'
                  : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs">PDF to Text (.TXT)</span>
            </button>
          </div>

          {!pdfFile ? (
            <DropZone
              onFilesSelected={handlePdfLoaded}
              title="Select PDF Document to Convert"
              subtitle="Drop file here"
            />
          ) : (
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-surface-900 dark:text-white">{pdfFile.name}</h4>
                  <p className="text-xs text-surface-400">
                    {pdfFile.pageCount} Pages • {formatBytes(pdfFile.size)}
                  </p>
                </div>
                <button
                  onClick={() => setPdfFile(null)}
                  className="text-xs text-surface-400 hover:text-pdf-500"
                >
                  Change File
                </button>
              </div>

              {conversionType === 'pdf_to_images' && (
                <div className="space-y-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <div className="flex items-center gap-4 text-xs">
                    <label className="font-semibold text-surface-700 dark:text-surface-300">Format:</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="imgfmt"
                          checked={imageFormat === 'image/png'}
                          onChange={() => setImageFormat('image/png')}
                        />
                        <span>PNG (Lossless)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="imgfmt"
                          checked={imageFormat === 'image/jpeg'}
                          onChange={() => setImageFormat('image/jpeg')}
                        />
                        <span>JPEG (Compact)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handlePdfToImages}
                    disabled={isProcessing}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isProcessing ? 'Converting Pages...' : 'Convert & Download Images (ZIP)'}</span>
                  </button>
                </div>
              )}

              {conversionType === 'pdf_to_txt' && (
                <div className="space-y-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <button
                    onClick={handlePdfToText}
                    disabled={isProcessing}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isProcessing ? 'Extracting Text...' : 'Extract & Download Text File'}</span>
                  </button>

                  {extractedText && (
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                        Preview Extracted Text:
                      </label>
                      <textarea
                        readOnly
                        rows={8}
                        value={extractedText}
                        className="w-full p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono leading-relaxed focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-SECTION 2: TO PDF */}
      {activeTab === 'to_pdf' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={() => setConversionType('images_to_pdf')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                conversionType === 'images_to_pdf'
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 font-bold'
                  : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600'
              }`}
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-xs">Images to PDF (JPG, PNG)</span>
            </button>
            <button
              onClick={() => setConversionType('text_to_pdf')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                conversionType === 'text_to_pdf'
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 font-bold'
                  : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs">Text to PDF</span>
            </button>
          </div>

          {conversionType === 'images_to_pdf' && (
            <div className="space-y-4">
              <DropZone
                onFilesSelected={handleImagesAdded}
                multiple={true}
                accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                title="Select Images to Compile into PDF"
                subtitle="Accepts PNG, JPG, and WebP"
              />

              {imagesList.length > 0 && (
                <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-900 dark:text-white">
                      {imagesList.length} Images Selected
                    </span>
                    <button
                      onClick={() => setImagesList([])}
                      className="text-xs text-pdf-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-surface-700 dark:text-surface-300 mr-2">
                        Orientation:
                      </label>
                      <select
                        value={imageOrientation}
                        onChange={(e) => setImageOrientation(e.target.value)}
                        className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-semibold"
                      >
                        <option value="auto">Auto-detect per image</option>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-surface-700 dark:text-surface-300 mr-2">
                        Margin:
                      </label>
                      <select
                        value={imageMargin}
                        onChange={(e) => setImageMargin(parseInt(e.target.value))}
                        className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-semibold"
                      >
                        <option value={0}>No Margin (0px)</option>
                        <option value={20}>Standard (20px)</option>
                        <option value={40}>Wide (40px)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleImagesToPdf}
                    disabled={isProcessing}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isProcessing ? 'Compiling PDF...' : 'Generate & Download PDF'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {conversionType === 'text_to_pdf' && (
            <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-4">
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300">
                Enter or Paste Text / Notes / Document Body:
              </label>
              <textarea
                rows={12}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or paste your text here to convert into a paginated, formatted PDF document..."
                className="w-full p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-500"
              />

              <button
                onClick={handleTextToPdf}
                disabled={isProcessing || !textInput.trim()}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Generating PDF...' : 'Convert to PDF & Download'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
