# PdfCraft Pro — Enterprise Client-Side Local PDF Workbench

[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-success.svg)](https://web.dev/progressive-web-apps/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side-red.svg)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**PdfCraft Pro** is an enterprise-grade Progressive Web Application (PWA) and self-hosted PDF workbench. It allows users to perform high-fidelity PDF manipulation, viewing, editing, OCR, conversion, and digital signing **100% locally in browser memory without sending a single byte to external servers**.

---

## 🚀 Key Modules & Capabilities

### 1. 📖 Multi-Tab PDF Viewer
- **Multi-Tab Architecture**: Open multiple documents simultaneously in independent tabs.
- **Viewing Modes**: Single Page, Dual Page Spread, Continuous Scroll.
- **Canvas Rendering**: High-DPI canvas rendering powered by `pdfjs-dist`.
- **Search & Highlighting**: Fast in-document text scanning with result snippets.
- **Thumbnails & Bookmarks**: Collapsible sidebar with instant thumbnail navigation and page bookmarking.
- **Night / Invert Mode**: Eye-friendly reading mode for night-time reviews.

### 2. ✍️ Interactive PDF Editor
- **Text Tools**: Add customizable text (font sizes, colors, bold, italic).
- **Freehand Drawing**: Smooth Bézier pencil and semi-transparent highlighters.
- **Shapes & Connectors**: Rectangles, circles, lines, and directional arrows.
- **Images & Stamps**: Place logos or pre-defined corporate stamps (`APPROVED`, `CONFIDENTIAL`, `DRAFT`, `REJECTED`, `PAID`).
- **Sticky Notes**: Add commentary and annotations.
- **Bake to PDF**: Bakes annotations and vector graphics directly into the final PDF with `pdf-lib`.

### 3. 📑 Merge PDF
- Combine multiple PDFs into a single unified document.
- Drag-and-drop file reordering with live first-page thumbnail previews.
- Page count calculation and instant local compilation.

### 4. ✂️ Split & Extract
- **Split by Ranges**: e.g., `1-3, 5, 7-10`.
- **Extract Pages**: Interactive visual thumbnail grid selection.
- **Split Every N Pages**: Chunk documents evenly.
- **Batch Export**: Download individual PDFs or a single compressed ZIP archive.

### 5. 🗂️ Organize Pages
- Reorder pages with visual movement controls.
- Rotate pages in 90° clockwise increments.
- Duplicate individual pages or insert blank sheets.
- Delete unwanted pages.

### 6. 🗜️ PDF Compression
- 4 Compression Tiers:
  - **Low**: Maximum visual fidelity (~25% reduction).
  - **Medium**: Balanced email & web standard (~50% reduction).
  - **High**: 120 DPI web optimization (~70% reduction).
  - **Extreme**: Grayscale monochrome conversion (~85% reduction).
- Live before vs. after comparison with size metrics and savings percentage.

### 7. 🔄 Universal Converter
- **From PDF**:
  - PDF to PNG / JPEG (individual images or zipped).
  - PDF to Plain Text (`.txt`).
- **To PDF**:
  - Images to PDF (multi-image drop, auto/portrait/landscape orientation, margins).
  - Plain Text / Markdown to PDF (paginated with header layout).

### 8. 🔍 Browser-Native OCR (Tesseract.js)
- Optical character recognition running entirely on browser Web Workers.
- Multi-language support (English, Spanish, French, German, Italian, Portuguese, Hindi, Japanese, Chinese, Arabic, Russian).
- Scans image PDFs and generates selectable text with confidence scoring.

### 9. 🔒 Document Security
- **Encrypt**: Protect PDFs with user passwords and permission flags (restrict printing, copying, or editing).
- **Unlock**: Verify passwords and remove restrictions for editing.

### 10. 🖋️ Digital Signature
- **Draw**: Smooth HTML5 canvas signature capture.
- **Type**: Cursive script typography.
- **Upload**: PNG/JPG signature image placement.
- **Visual Placement**: Drag-and-drop signature stamp onto the PDF page.

### 11. 🛡️ PDF Watermarking
- **Text Watermark**: Custom text, angle (-90° to 90°), opacity, color, and tile pattern.
- **Image Watermark**: Embed corporate logo or seal with custom positioning.
- Real-time live canvas preview.

### 12. ⚖️ PDF Comparison (Diff)
- Side-by-side visual difference engine highlighting pixel changes in red.
- Text difference generator highlighting additions (green) and deletions (red).

### 13. 📷 Scan to PDF
- WebRTC camera stream integration.
- Document filters: High Contrast B&W, Grayscale, Color.
- Multi-page capture tray with one-click PDF generation.

### 14. 📦 Batch Processing
- Bulk Compress and Bulk Watermark across multiple files.
- Queue manager with status indicators (Queued, Processing, Complete, Failed).
- Download all processed files in a single ZIP bundle.

### 15. 💾 Offline Storage & Session Recovery
- IndexedDB storage powered by `idb`.
- Recent Documents & Starred Favorites persistence.
- Storage quota calculation via `navigator.storage.estimate()`.

---

## 🏗️ Architecture & Technology Stack

```
PDFCraft/
├── public/                  # Static assets, Web App Manifest & SVG icons
├── src/
│   ├── assets/              # Branding graphics
│   ├── components/
│   │   ├── common/          # DropZone, ToastContainer, OfflineBadge, PwaBanner
│   │   ├── layout/          # Navbar, Footer
│   │   └── ui/              # Buttons, inputs, modals
│   ├── hooks/               # Custom hooks
│   ├── layouts/             # MainLayout with header, footer & offline banners
│   ├── modules/             # Feature modules (Viewer, Editor, Merge, Split, etc.)
│   ├── pages/               # DashboardPage
│   ├── routes/              # React Router lazy-loaded route definitions
│   ├── services/
│   │   ├── cameraService.js # WebRTC video capture & document filters
│   │   ├── ocrService.js    # Tesseract.js Web Worker integration
│   │   ├── pdfService.js    # Core pdf-lib & pdfjs-dist manipulation layer
│   │   └── storageService.js# IndexedDB persistent storage
│   ├── store/               # Zustand application store (theme, tabs, toasts)
│   ├── utils/               # File helpers, diff algorithms, worker loaders
│   ├── App.jsx              # App root
│   ├── index.css            # Tailwind base + custom scrollbars & fonts
│   └── main.jsx             # Entry point with PWA service worker registration
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🔒 100% Client-Side Privacy Guarantee

- **Zero Cloud Servers**: No document is uploaded to third-party servers.
- **HIPAA & GDPR Compliant**: Confidential contracts, medical forms, and financial statements remain exclusively within your device's memory.
- **Full Offline PWA**: Installable as a standalone desktop app that operates without an active internet connection.

---

## 🛠️ Development & Deployment

### Local Development
```bash
cd D:\project\ex\PDFCraft
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```
