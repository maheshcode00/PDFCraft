import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates an attractive multi-page sample PDF in memory
 * Allows immediate 1-click testing of all PDF features without needing an external file.
 */
export async function createSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // --- Page 1: Executive Overview ---
  const page1 = pdfDoc.addPage([612, 792]);
  
  // Top Header Banner
  page1.drawRectangle({
    x: 0,
    y: 720,
    width: 612,
    height: 72,
    color: rgb(0.93, 0.27, 0.27), // Crimson
  });

  page1.drawText('PdfCraft Pro — Sample Document', {
    x: 50,
    y: 746,
    size: 20,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Welcome to your 100% private, client-side PDF workbench.', {
    x: 50,
    y: 670,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const bodyParagraphs = [
    'This sample document was dynamically generated inside your browser memory using WebAssembly.',
    'You can use this document to immediately test every feature of PdfCraft Pro without uploading any confidential files.',
    '',
    'Features you can test right now:',
    '  • PDF Viewer: Zoom, night mode, page navigation, and text search.',
    '  • PDF Editor: Draw annotations, place sticky notes, and add stamps.',
    '  • Split & Extract: Extract this page or split into individual sheets.',
    '  • Watermark: Apply custom diagonal or tiled watermarks.',
    '  • Digital Signature: Draw or type your signature and position it anywhere.',
    '  • Compression: Downscale and optimize file size with one click.',
    '  • OCR: Extract machine-readable text directly from document pages.',
  ];

  let textY = 630;
  for (const line of bodyParagraphs) {
    page1.drawText(line, {
      x: 50,
      y: textY,
      size: 11,
      font: line.startsWith('  •') ? boldFont : font,
      color: rgb(0.2, 0.2, 0.2),
    });
    textY -= 20;
  }

  // Visual card box
  page1.drawRectangle({
    x: 50,
    y: 280,
    width: 512,
    height: 90,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 0.99),
  });

  page1.drawText('Security & Zero-Cloud Guarantee', {
    x: 70,
    y: 340,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.5, 0.3),
  });

  page1.drawText('All operations are executed strictly inside your local browser sandbox.', {
    x: 70,
    y: 318,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page1.drawText('No files, metadata, or signatures are ever sent to remote servers.', {
    x: 70,
    y: 300,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page1.drawText('Page 1 of 2', {
    x: 520,
    y: 40,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // --- Page 2: Sample Invoice & Data ---
  const page2 = pdfDoc.addPage([612, 792]);

  page2.drawText('SAMPLE FINANCIAL INVOICE', {
    x: 50,
    y: 720,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page2.drawText('Invoice Number: INV-2026-0042   •   Date: October 2026', {
    x: 50,
    y: 695,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Table header
  page2.drawRectangle({
    x: 50,
    y: 640,
    width: 512,
    height: 25,
    color: rgb(0.92, 0.94, 0.96),
  });

  page2.drawText('Item Description', { x: 60, y: 648, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
  page2.drawText('Qty', { x: 340, y: 648, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
  page2.drawText('Rate', { x: 420, y: 648, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
  page2.drawText('Total', { x: 500, y: 648, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });

  const invoiceItems = [
    { desc: 'PdfCraft Pro Enterprise License (Offline PWA)', qty: '1', rate: '$199.00', total: '$199.00' },
    { desc: 'Local WebAssembly PDF Rendering Engine', qty: '1', rate: '$0.00', total: '$0.00' },
    { desc: 'Tesseract.js In-Browser OCR Acceleration', qty: '1', rate: '$0.00', total: '$0.00' },
  ];

  let itemY = 615;
  for (const item of invoiceItems) {
    page2.drawText(item.desc, { x: 60, y: itemY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText(item.qty, { x: 340, y: itemY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText(item.rate, { x: 420, y: itemY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText(item.total, { x: 500, y: itemY, size: 9, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    itemY -= 25;
  }

  page2.drawLine({
    start: { x: 50, y: itemY + 15 },
    end: { x: 562, y: itemY + 15 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  page2.drawText('Grand Total: $199.00 USD', {
    x: 410,
    y: itemY - 10,
    size: 11,
    font: boldFont,
    color: rgb(0.9, 0.1, 0.1),
  });

  page2.drawText('Authorized Signature: _______________________', {
    x: 50,
    y: 350,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page2.drawText('Page 2 of 2', {
    x: 520,
    y: 40,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
