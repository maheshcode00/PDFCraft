import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from '../utils/pdfWorkerInit';

export const pdfService = {
  /**
   * Safely create an independent clone of buffer data to prevent ArrayBuffer detachment
   */
  cloneData(data) {
    if (!data) return new Uint8Array(0);
    if (data instanceof Uint8Array) {
      if (data.buffer && data.buffer.byteLength === 0) {
        console.warn('Attempted to clone a detached Uint8Array');
        return new Uint8Array(0);
      }
      return data.slice();
    }
    if (data instanceof ArrayBuffer) {
      if (data.byteLength === 0) {
        console.warn('Attempted to clone a detached ArrayBuffer');
        return new Uint8Array(0);
      }
      return new Uint8Array(data.slice(0));
    }
    if (ArrayBuffer.isView(data)) {
      if (data.buffer && data.buffer.byteLength === 0) {
        return new Uint8Array(0);
      }
      return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    }
    return new Uint8Array(data);
  },

  /**
   * Load PDF with PDF.js for rendering with buffer detachment protection
   */
  async loadPdfJsDoc(data, password = null) {
    const safeData = this.cloneData(data);
    const loadingTask = pdfjsLib.getDocument({
      data: safeData,
      password,
    });
    return await loadingTask.promise;
  },

  /**
   * Get page count of a PDF ArrayBuffer
   */
  async getPageCount(data) {
    try {
      const pdf = await this.loadPdfJsDoc(data);
      return pdf.numPages;
    } catch (e) {
      // Fallback with pdf-lib
      const safeData = this.cloneData(data);
      const pdfDoc = await PDFDocument.load(safeData, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    }
  },

  /**
   * Render a page directly onto an HTML canvas element with safe renderTask cancellation
   */
  async renderPageToCanvas(pdfJsDoc, pageNum, canvas, scale = 1.5, rotation = 0) {
    if (!pdfJsDoc || !canvas) return { width: 0, height: 0 };
    
    // Cancel any ongoing render task on this canvas
    if (canvas._renderTask) {
      try {
        canvas._renderTask.cancel();
      } catch (e) {}
      canvas._renderTask = null;
    }

    const page = await pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale, rotation });
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    const renderTask = page.render(renderContext);
    canvas._renderTask = renderTask;

    try {
      await renderTask.promise;
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') {
        console.warn('PDF.js render warning:', e);
      }
    } finally {
      if (canvas._renderTask === renderTask) {
        canvas._renderTask = null;
      }
    }

    return { width: viewport.width, height: viewport.height };
  },

  /**
   * Generate thumbnail dataUrl for a given page
   * Accepts either raw buffer data OR an already-loaded pdfJsDoc instance
   */
  async generateThumbnail(dataOrDoc, pageNum = 1, width = 180) {
    try {
      const pdf = dataOrDoc && dataOrDoc.getPage ? dataOrDoc : await this.loadPdfJsDoc(dataOrDoc);
      const page = await pdf.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scale = width / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('Failed to generate thumbnail', err);
      return null;
    }
  },

  /**
   * Extract full text from all pages
   */
  async extractText(dataOrDoc) {
    const pdf = dataOrDoc && dataOrDoc.getPage ? dataOrDoc : await this.loadPdfJsDoc(dataOrDoc);
    const pages = [];
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      pages.push({ pageNumber: i, text: pageText });
      fullText += `--- Page ${i} ---\n` + pageText + '\n\n';
    }

    return { fullText, pages, pageCount: pdf.numPages };
  },

  /**
   * Merge multiple PDF ArrayBuffers into one document
   */
  async mergePdfs(pdfBuffers) {
    const mergedDoc = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      const safeBuffer = this.cloneData(buffer);
      const srcDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    return await mergedDoc.save();
  },

  /**
   * Split PDF into individual pages or custom ranges
   * @param {ArrayBuffer} buffer
   * @param {Array<number[]>} ranges - Array of 0-based page index arrays
   */
  async splitPdf(buffer, ranges) {
    const safeBuffer = this.cloneData(buffer);
    const srcDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const results = [];

    for (let i = 0; i < ranges.length; i++) {
      const pageIndices = ranges[i];
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((page) => newDoc.addPage(page));
      const bytes = await newDoc.save();
      results.push({
        index: i + 1,
        pages: pageIndices.map((p) => p + 1),
        bytes,
      });
    }

    return results;
  },

  /**
   * Organize pages (reorder, rotate, delete, duplicate, add blank)
   * @param {ArrayBuffer} buffer
   * @param {Array<{ originalIndex: number, rotation: number, isBlank?: boolean }>} pagesConfig
   */
  async organizePages(buffer, pagesConfig) {
    const safeBuffer = this.cloneData(buffer);
    const srcDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    for (const item of pagesConfig) {
      if (item.isBlank) {
        // Standard US Letter size
        newDoc.addPage([612, 792]);
      } else {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
        if (item.rotation) {
          const currentRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
        }
        newDoc.addPage(copiedPage);
      }
    }

    return await newDoc.save();
  },

  /**
   * Rotate all or specific pages
   */
  async rotatePages(buffer, pageIndices, angle = 90) {
    const safeBuffer = this.cloneData(buffer);
    const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    pageIndices.forEach((index) => {
      if (pages[index]) {
        const current = pages[index].getRotation().angle;
        pages[index].setRotation(degrees((current + angle) % 360));
      }
    });

    return await pdfDoc.save();
  },

  /**
   * Delete specific pages from PDF
   */
  async deletePages(buffer, indicesToDelete) {
    const safeBuffer = this.cloneData(buffer);
    const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const total = pdfDoc.getPageCount();
    const sorted = [...new Set(indicesToDelete)].sort((a, b) => b - a);

    sorted.forEach((index) => {
      if (index >= 0 && index < total && pdfDoc.getPageCount() > 1) {
        pdfDoc.removePage(index);
      }
    });

    return await pdfDoc.save();
  },

  /**
   * Add text watermark to PDF
   */
  async addTextWatermark(buffer, options) {
    const {
      text = 'CONFIDENTIAL',
      fontSize = 48,
      opacity = 0.3,
      angle = 45,
      color = { r: 0.8, g: 0.1, b: 0.1 },
      tile = false,
      pageIndices = null,
    } = options;

    const safeBuffer = this.cloneData(buffer);
    const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const targetIndices = pageIndices || pages.map((_, i) => i);

    for (const idx of targetIndices) {
      const page = pages[idx];
      if (!page) continue;
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      if (tile) {
        const stepX = textWidth + 80;
        const stepY = textHeight + 120;
        for (let x = -50; x < width + 100; x += stepX) {
          for (let y = -50; y < height + 100; y += stepY) {
            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgb(color.r, color.g, color.b),
              opacity,
              rotate: degrees(angle),
            });
          }
        }
      } else {
        // Center of page
        page.drawText(text, {
          x: width / 2 - textWidth / 2,
          y: height / 2 - textHeight / 4,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(angle),
        });
      }
    }

    return await pdfDoc.save();
  },

  /**
   * Add image/logo watermark to PDF
   */
  async addImageWatermark(buffer, imageBuffer, options) {
    const {
      isPng = true,
      opacity = 0.5,
      scale = 0.4,
      position = 'center',
      pageIndices = null,
    } = options;

    const safeBuffer = this.cloneData(buffer);
    const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const image = isPng
      ? await pdfDoc.embedPng(imageBuffer)
      : await pdfDoc.embedJpg(imageBuffer);

    const imgDims = image.scale(scale);
    const pages = pdfDoc.getPages();
    const targetIndices = pageIndices || pages.map((_, i) => i);

    for (const idx of targetIndices) {
      const page = pages[idx];
      if (!page) continue;
      const { width, height } = page.getSize();
      let x = (width - imgDims.width) / 2;
      let y = (height - imgDims.height) / 2;

      if (position === 'top-left') {
        x = 40;
        y = height - imgDims.height - 40;
      } else if (position === 'top-right') {
        x = width - imgDims.width - 40;
        y = height - imgDims.height - 40;
      } else if (position === 'bottom-left') {
        x = 40;
        y = 40;
      } else if (position === 'bottom-right') {
        x = width - imgDims.width - 40;
        y = 40;
      }

      page.drawImage(image, {
        x,
        y,
        width: imgDims.width,
        height: imgDims.height,
        opacity,
      });
    }

    return await pdfDoc.save();
  },

  /**
   * Embed digital signature onto PDF page
   */
  async embedSignature(buffer, signaturePngDataUrl, placement) {
    const { pageIndex = 0, x, y, width, height } = placement;
    const safeBuffer = this.cloneData(buffer);
    const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const image = await pdfDoc.embedPng(signaturePngDataUrl);
    const pages = pdfDoc.getPages();
    const page = pages[pageIndex] || pages[0];

    page.drawImage(image, {
      x,
      y,
      width,
      height,
    });

    return await pdfDoc.save();
  },

  /**
   * Convert multiple images to a PDF
   */
  async imagesToPdf(images, options = {}) {
    const { orientation = 'portrait', margin = 20 } = options;
    const pdfDoc = await PDFDocument.create();

    for (const item of images) {
      const isPng = item.type === 'image/png' || (item.name && item.name.toLowerCase().endsWith('.png'));
      const image = isPng
        ? await pdfDoc.embedPng(item.data)
        : await pdfDoc.embedJpg(item.data);

      let pageWidth = 612;
      let pageHeight = 792;

      if (orientation === 'landscape') {
        pageWidth = 792;
        pageHeight = 612;
      } else if (orientation === 'auto') {
        if (image.width > image.height) {
          pageWidth = 792;
          pageHeight = 612;
        }
      }

      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const scaleFactor = Math.min(
        availableWidth / image.width,
        availableHeight / image.height,
        1
      );

      const drawWidth = image.width * scaleFactor;
      const drawHeight = image.height * scaleFactor;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }

    return await pdfDoc.save();
  },

  /**
   * Convert plain text to PDF
   */
  async textToPdf(text, title = 'Document') {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 11;
    const lineHeight = 16;
    const margin = 50;
    const pageWidth = 612;
    const pageHeight = 792;
    const maxWidth = pageWidth - margin * 2;

    const lines = text.split('\n');
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Header Title
    currentPage.drawText(title, {
      x: margin,
      y: currentY,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 30;

    for (const rawLine of lines) {
      const words = rawLine.split(' ');
      let lineBuf = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = lineBuf ? `${lineBuf} ${words[i]}` : words[i];
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > maxWidth && lineBuf) {
          if (currentY < margin + lineHeight) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }
          currentPage.drawText(lineBuf, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0.15, 0.15, 0.15),
          });
          currentY -= lineHeight;
          lineBuf = words[i];
        } else {
          lineBuf = testLine;
        }
      }

      if (lineBuf || rawLine === '') {
        if (currentY < margin + lineHeight) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }
        currentPage.drawText(lineBuf, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        currentY -= lineHeight;
      }
    }

    return await pdfDoc.save();
  },

  /**
   * Compress PDF with configurable levels
   */
  async compressPdf(buffer, level = 'medium') {
    const safeBuffer = this.cloneData(buffer);
    const pdfJs = await this.loadPdfJsDoc(safeBuffer);
    const numPages = pdfJs.numPages;

    let scale = 1.2;
    let quality = 0.8;
    let grayscale = false;

    if (level === 'low') {
      scale = 1.5;
      quality = 0.85;
    } else if (level === 'medium') {
      scale = 1.2;
      quality = 0.7;
    } else if (level === 'high') {
      scale = 1.0;
      quality = 0.55;
    } else if (level === 'extreme') {
      scale = 0.85;
      quality = 0.4;
      grayscale = true;
    }

    const compressedDoc = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfJs.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      if (grayscale) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let j = 0; j < d.length; j += 4) {
          const v = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
          d[j] = v;
          d[j + 1] = v;
          d[j + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const imgBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      const imgBuffer = await imgBlob.arrayBuffer();
      const embeddedImg = await compressedDoc.embedJpg(imgBuffer);

      const unscaled = page.getViewport({ scale: 1.0 });
      const newPage = compressedDoc.addPage([unscaled.width, unscaled.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: unscaled.width,
        height: unscaled.height,
      });
    }

    return await compressedDoc.save();
  },

  /**
   * Render all pages to image blobs for download
   */
  async renderPagesToImages(buffer, format = 'image/png', scale = 1.5) {
    const safeBuffer = this.cloneData(buffer);
    const pdfJs = await this.loadPdfJsDoc(safeBuffer);
    const images = [];

    for (let i = 1; i <= pdfJs.numPages; i++) {
      const page = await pdfJs.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, 0.95));
      images.push({
        pageNumber: i,
        blob,
        dataUrl: canvas.toDataURL(format, 0.95),
      });
    }

    return images;
  },

  /**
   * Bake editor annotations (drawings, texts, sticky notes, stamps) into PDF
   */
  async bakeEditorAnnotations(buffer, annotationsByPage) {
    const safeBuffer = this.cloneData(buffer);
    const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageAnnots = annotationsByPage[i] || [];
      const { height } = page.getSize();

      for (const annot of pageAnnots) {
        if (annot.type === 'text') {
          const font = annot.bold ? helveticaBold : helvetica;
          const color = annot.color || { r: 0, g: 0, b: 0 };
          page.drawText(annot.text, {
            x: annot.x,
            y: height - annot.y - (annot.fontSize || 16),
            size: annot.fontSize || 16,
            font,
            color: rgb(color.r, color.g, color.b),
          });
        } else if (annot.type === 'stamp') {
          const stampText = annot.text.toUpperCase();
          const stampColor = annot.color || { r: 0.9, g: 0.1, b: 0.1 };
          const stampWidth = 140;
          const stampHeight = 44;
          const y = height - annot.y - stampHeight;

          page.drawRectangle({
            x: annot.x,
            y,
            width: stampWidth,
            height: stampHeight,
            borderColor: rgb(stampColor.r, stampColor.g, stampColor.b),
            borderWidth: 3,
            opacity: 0.85,
          });

          page.drawText(stampText, {
            x: annot.x + 12,
            y: y + 14,
            size: 16,
            font: helveticaBold,
            color: rgb(stampColor.r, stampColor.g, stampColor.b),
          });
        } else if (annot.type === 'image' && annot.dataUrl) {
          const img = await pdfDoc.embedPng(annot.dataUrl);
          page.drawImage(img, {
            x: annot.x,
            y: height - annot.y - annot.height,
            width: annot.width,
            height: annot.height,
          });
        }
      }
    }

    return await pdfDoc.save();
  },

  /**
   * Encrypt PDF with standard AES-256 and granular permission controls
   * @param {ArrayBuffer | Uint8Array} buffer
   * @param {string} userPassword
   * @param {object} options
   */
  async encryptPdf(buffer, userPassword, options = {}) {
    const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
    const safeData = this.cloneData(buffer);
    return await encryptPDF(safeData, userPassword, {
      algorithm: 'AES-256',
      ownerPassword: options.ownerPassword || userPassword,
      allowPrinting: options.allowPrinting ?? true,
      allowCopying: options.allowCopying ?? true,
      allowModifying: options.allowModifying ?? false,
      allowAnnotating: options.allowAnnotating ?? false,
    });
  },

  /**
   * Decrypt / Unlock password-protected PDF
   * @param {ArrayBuffer | Uint8Array} buffer
   * @param {string} password
   */
  async decryptPdf(buffer, password) {
    const { decryptPDF } = await import('@pdfsmaller/pdf-decrypt');
    const safeData = this.cloneData(buffer);
    return await decryptPDF(safeData, password);
  },

  /**
   * Check if PDF is encrypted
   * @param {ArrayBuffer | Uint8Array} buffer
   */
  async isEncrypted(buffer) {
    const { isEncrypted } = await import('@pdfsmaller/pdf-decrypt');
    const safeData = this.cloneData(buffer);
    return await isEncrypted(safeData);
  },
};
