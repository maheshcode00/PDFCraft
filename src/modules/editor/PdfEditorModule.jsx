import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { readFileAsArrayBuffer, readFileAsDataURL, downloadBytes } from '../../utils/fileUtils';
import { createSamplePdf } from '../../utils/samplePdf';
import DropZone from '../../components/common/DropZone';
import {
  Type,
  PenTool,
  Highlighter,
  Square,
  Circle,
  Minus,
  MoveRight,
  Image as ImageIcon,
  Stamp,
  MessageSquare,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Palette,
  Sparkles,
} from 'lucide-react';

export default function PdfEditorModule() {
  const { openTabs, activeTabId, addToast } = useAppStore();
  const activeTab = openTabs.find((t) => t.id === activeTabId) || openTabs[0];

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  // Active Tool & Properties
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'text' | 'pencil' | 'highlighter' | 'rect' | 'circle' | 'line' | 'arrow' | 'stamp' | 'note'
  const [color, setColor] = useState('#ef4444');
  const [fontSize, setFontSize] = useState(18);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [activeStamp, setActiveStamp] = useState('APPROVED');

  // Annotation items per page: { [pageIndex: number]: Array<AnnotItem> }
  const [annotations, setAnnotations] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [dragStart, setDragStart] = useState(null);

  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    if (!activeTab || !activeTab.data) return;
    let isCancelled = false;

    async function loadDoc() {
      try {
        const doc = await pdfService.loadPdfJsDoc(activeTab.data);
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        addToast({ title: 'Failed to load PDF in editor', message: err.message, type: 'error' });
      }
    }

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, addToast]);

  // Render PDF background to canvasRef
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    async function renderPage() {
      const dimensions = await pdfService.renderPageToCanvas(
        pdfDoc,
        currentPage,
        canvasRef.current,
        1.5
      );
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = dimensions.width;
        overlayCanvasRef.current.height = dimensions.height;
        drawAnnotations();
      }
    }
    renderPage();
  }, [pdfDoc, currentPage]);

  // Redraw annotations on overlay canvas
  const drawAnnotations = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnnots = annotations[currentPage - 1] || [];
    pageAnnots.forEach((item) => {
      ctx.save();
      if (item.type === 'pencil' || item.type === 'highlighter') {
        ctx.beginPath();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (item.type === 'highlighter') {
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 16;
        }
        item.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (item.type === 'text') {
        ctx.font = `${item.italic ? 'italic ' : ''}${item.bold ? 'bold ' : ''}${item.fontSize}px sans-serif`;
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
      } else if (item.type === 'rect') {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width;
        ctx.strokeRect(item.x, item.y, item.widthBox, item.heightBox);
      } else if (item.type === 'circle') {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width;
        ctx.beginPath();
        const rx = Math.abs(item.widthBox) / 2;
        const ry = Math.abs(item.heightBox) / 2;
        const cx = item.x + item.widthBox / 2;
        const cy = item.y + item.heightBox / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (item.type === 'line' || item.type === 'arrow') {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(item.endX, item.endY);
        ctx.stroke();

        if (item.type === 'arrow') {
          // Draw arrowhead
          const angle = Math.atan2(item.endY - item.y, item.endX - item.x);
          const headlen = 14;
          ctx.beginPath();
          ctx.moveTo(item.endX, item.endY);
          ctx.lineTo(
            item.endX - headlen * Math.cos(angle - Math.PI / 6),
            item.endY - headlen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(item.endX, item.endY);
          ctx.lineTo(
            item.endX - headlen * Math.cos(angle + Math.PI / 6),
            item.endY - headlen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      } else if (item.type === 'stamp') {
        ctx.strokeStyle = item.color || '#dc2626';
        ctx.lineWidth = 3;
        ctx.strokeRect(item.x, item.y, 140, 44);
        ctx.fillStyle = item.color || '#dc2626';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(item.text, item.x + 12, item.y + 28);
      } else if (item.type === 'note') {
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.fillRect(item.x, item.y, 160, 90);
        ctx.strokeRect(item.x, item.y, 160, 90);
        ctx.fillStyle = '#713f12';
        ctx.font = '12px sans-serif';
        ctx.fillText(item.text || 'Sticky Note', item.x + 10, item.y + 25);
      } else if (item.type === 'image' && item.imgElement) {
        ctx.drawImage(item.imgElement, item.x, item.y, item.width, item.height);
      }
      ctx.restore();
    });
  };

  useEffect(() => {
    drawAnnotations();
  }, [annotations, currentPage]);

  // Mouse Coordinate Helper
  const getCanvasCoords = (e) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setDragStart(coords);

    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      setCurrentPath([coords]);
    } else if (activeTool === 'text') {
      const userText = prompt('Enter text to place:');
      if (userText) {
        const hexToRgb = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          return { r, g, b };
        };
        saveAnnotation({
          type: 'text',
          text: userText,
          x: coords.x,
          y: coords.y,
          fontSize,
          color,
          rgbColor: hexToRgb(color),
          bold: isBold,
          italic: isItalic,
        });
      }
      setIsDrawing(false);
    } else if (activeTool === 'stamp') {
      saveAnnotation({
        type: 'stamp',
        text: activeStamp,
        x: coords.x,
        y: coords.y,
        color: '#dc2626',
      });
      setIsDrawing(false);
    } else if (activeTool === 'note') {
      const noteText = prompt('Enter note comment:');
      if (noteText) {
        saveAnnotation({
          type: 'note',
          text: noteText,
          x: coords.x,
          y: coords.y,
        });
      }
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      setCurrentPath((prev) => [...prev, coords]);

      // Draw immediate live stroke on canvas
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = activeTool === 'highlighter' ? 16 : strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (activeTool === 'highlighter') ctx.globalAlpha = 0.4;
      ctx.beginPath();
      if (currentPath.length > 0) {
        const last = currentPath[currentPath.length - 1];
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = getCanvasCoords(e);

    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      if (currentPath.length > 1) {
        saveAnnotation({
          type: activeTool,
          points: [...currentPath, coords],
          color,
          width: activeTool === 'highlighter' ? 16 : strokeWidth,
        });
      }
      setCurrentPath([]);
    } else if (activeTool === 'rect' && dragStart) {
      saveAnnotation({
        type: 'rect',
        x: dragStart.x,
        y: dragStart.y,
        widthBox: coords.x - dragStart.x,
        heightBox: coords.y - dragStart.y,
        color,
        width: strokeWidth,
      });
    } else if (activeTool === 'circle' && dragStart) {
      saveAnnotation({
        type: 'circle',
        x: dragStart.x,
        y: dragStart.y,
        widthBox: coords.x - dragStart.x,
        heightBox: coords.y - dragStart.y,
        color,
        width: strokeWidth,
      });
    } else if ((activeTool === 'line' || activeTool === 'arrow') && dragStart) {
      saveAnnotation({
        type: activeTool,
        x: dragStart.x,
        y: dragStart.y,
        endX: coords.x,
        endY: coords.y,
        color,
        width: strokeWidth,
      });
    }

    setDragStart(null);
  };

  const saveAnnotation = (item) => {
    const pageIndex = currentPage - 1;
    const currentList = annotations[pageIndex] || [];
    const updatedList = [...currentList, item];
    const newAnnotations = { ...annotations, [pageIndex]: updatedList };
    setAnnotations(newAnnotations);

    // Save to history for undo/redo
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newAnnotations]);
    setHistoryIndex(newHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setAnnotations({});
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  const handleClearPage = () => {
    const pageIndex = currentPage - 1;
    const newAnnotations = { ...annotations, [pageIndex]: [] };
    setAnnotations(newAnnotations);
  };

  // Add Image to PDF page
  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataURL(file);
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const width = 180;
        const height = width / aspect;
        saveAnnotation({
          type: 'image',
          dataUrl,
          imgElement: img,
          x: 60,
          y: 60,
          width,
          height,
        });
      };
      img.src = dataUrl;
    } catch (err) {
      addToast({ title: 'Image load failed', message: err.message, type: 'error' });
    }
  };

  // Export / Bake Annotations into PDF
  const handleSaveAndExport = async () => {
    if (!activeTab || !activeTab.data) return;

    try {
      addToast({ title: 'Baking Annotations', message: 'Merging annotations into PDF...' });
      const bakedBytes = await pdfService.bakeEditorAnnotations(activeTab.data, annotations);
      downloadBytes(bakedBytes, `edited-${activeTab.name || 'document.pdf'}`);
      addToast({ title: 'Saved Successfully', message: 'Edited PDF downloaded.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Export failed', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-100 dark:bg-surface-950 min-h-[calc(100vh-4rem)]">
      {/* Editor Sub-Header Toolbar */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20 shadow-sm">
        {/* Drawing & Text Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-xl flex items-center gap-1.5 transition-colors ${
              activeTool === 'text'
                ? 'bg-pdf-600 text-white shadow-md'
                : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Add Text"
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Text</span>
          </button>

          <button
            onClick={() => setActiveTool('pencil')}
            className={`p-2 rounded-xl flex items-center gap-1.5 transition-colors ${
              activeTool === 'pencil'
                ? 'bg-pdf-600 text-white shadow-md'
                : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Freehand Pencil"
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Draw</span>
          </button>

          <button
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 rounded-xl flex items-center gap-1.5 transition-colors ${
              activeTool === 'highlighter'
                ? 'bg-pdf-600 text-white shadow-md'
                : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Highlight</span>
          </button>

          <div className="h-4 w-[1px] bg-surface-200 dark:bg-surface-800 mx-1" />

          {/* Shapes */}
          <button
            onClick={() => setActiveTool('rect')}
            className={`p-2 rounded-lg ${
              activeTool === 'rect' ? 'bg-pdf-600 text-white' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded-lg ${
              activeTool === 'circle' ? 'bg-pdf-600 text-white' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('line')}
            className={`p-2 rounded-lg ${
              activeTool === 'line' ? 'bg-pdf-600 text-white' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Line"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('arrow')}
            className={`p-2 rounded-lg ${
              activeTool === 'arrow' ? 'bg-pdf-600 text-white' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Arrow"
          >
            <MoveRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-surface-200 dark:bg-surface-800 mx-1" />

          {/* Image & Stamps */}
          <label className="p-2 rounded-lg text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer" title="Add Image">
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/png,image/jpeg" onChange={handleAddImage} className="hidden" />
          </label>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTool('stamp')}
              className={`p-2 rounded-lg flex items-center gap-1 ${
                activeTool === 'stamp' ? 'bg-pdf-600 text-white' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
              title="Stamp"
            >
              <Stamp className="w-4 h-4" />
            </button>
            {activeTool === 'stamp' && (
              <select
                value={activeStamp}
                onChange={(e) => setActiveStamp(e.target.value)}
                className="py-1 px-1.5 rounded bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-bold text-pdf-600"
              >
                <option value="APPROVED">APPROVED</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="DRAFT">DRAFT</option>
                <option value="REJECTED">REJECTED</option>
                <option value="PAID">PAID</option>
              </select>
            )}
          </div>

          <button
            onClick={() => setActiveTool('note')}
            className={`p-2 rounded-lg ${
              activeTool === 'note' ? 'bg-pdf-600 text-white' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
            title="Sticky Note"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Tool Styling Controls */}
        <div className="flex items-center gap-2">
          {/* Color Picker */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-surface-400" />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              title="Color"
            />
          </div>

          {activeTool === 'text' && (
            <div className="flex items-center gap-1">
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="py-1 px-1.5 rounded bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-medium"
              >
                <option value={12}>12 px</option>
                <option value={14}>14 px</option>
                <option value={18}>18 px</option>
                <option value={24}>24 px</option>
                <option value={32}>32 px</option>
                <option value={48}>48 px</option>
              </select>

              <button
                onClick={() => setIsBold(!isBold)}
                className={`p-1.5 rounded ${isBold ? 'bg-pdf-100 dark:bg-pdf-950 text-pdf-600' : 'text-surface-600'}`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`p-1.5 rounded ${isItalic ? 'bg-pdf-100 dark:bg-pdf-950 text-pdf-600' : 'text-surface-600'}`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="h-4 w-[1px] bg-surface-200 dark:bg-surface-800 mx-1" />

          {/* Undo / Redo / Clear */}
          <button
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className="p-1.5 rounded text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearPage}
            className="p-1.5 rounded text-surface-600 hover:text-pdf-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            title="Clear Annotations on this Page"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Page Stepper */}
          <div className="flex items-center gap-1 font-semibold ml-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded text-surface-600 hover:bg-surface-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{currentPage} / {numPages || 1}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1 rounded text-surface-600 hover:bg-surface-100 disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleSaveAndExport}
            className="ml-2 px-3 py-1.5 rounded-xl bg-pdf-600 hover:bg-pdf-500 text-white font-bold flex items-center gap-1.5 shadow-md hover:shadow-glow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Edited PDF</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
        {!activeTab ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="max-w-md w-full">
              <DropZone
                onFilesSelected={async (file) => {
                  const buf = await readFileAsArrayBuffer(file);
                  useAppStore.getState().openInViewer({
                    name: file.name,
                    size: file.size,
                    data: buf,
                    pageCount: 1,
                  });
                }}
                title="Select PDF to Edit"
                subtitle="Add text, drawings, arrows, shapes, or images directly to your PDF"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-surface-400">Want to test right now?</span>
              <button
                onClick={async () => {
                  try {
                    addToast({ title: 'Generating Sample PDF', message: 'Creating in-memory test document...' });
                    const sampleBytes = await createSamplePdf();
                    useAppStore.getState().openInViewer({
                      id: `sample_${Date.now()}`,
                      name: 'Sample-Executive-Report.pdf',
                      size: sampleBytes.byteLength,
                      data: sampleBytes.slice().buffer,
                      pageCount: 2,
                    });
                    addToast({ title: 'Sample PDF Loaded', message: 'Ready to edit!', type: 'success' });
                  } catch (e) {
                    addToast({ title: 'Failed to generate', message: e.message, type: 'error' });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pdf-600 to-rose-600 text-white font-bold shadow hover:shadow-glow transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample PDF (Instant Demo)</span>
              </button>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="relative bg-white rounded-lg pdf-canvas-shadow overflow-hidden select-none">
            {/* Background PDF render */}
            <canvas ref={canvasRef} className="block" />

            {/* Interactive Drawing & Annotation Layer */}
            <canvas
              ref={overlayCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`absolute inset-0 z-10 ${
                activeTool === 'pencil' || activeTool === 'highlighter'
                  ? 'cursor-crosshair'
                  : activeTool === 'text'
                  ? 'cursor-text'
                  : 'cursor-default'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
