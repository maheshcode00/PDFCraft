import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsDist from 'pdfjs-dist';

const pdfjsLib = pdfjsDist.default || pdfjsDist;

async function runAllTests() {
  console.log('--- TEST 1: PDF Creation & Annotation (pdf-lib) ---');
  const doc = await PDFDocument.create();
  const page1 = doc.addPage([612, 792]);
  page1.drawText('PdfCraft Pro - Automated Verification Page 1', { x: 50, y: 700, size: 18 });
  const page2 = doc.addPage([612, 792]);
  page2.drawText('PdfCraft Pro - Automated Verification Page 2', { x: 50, y: 700, size: 18 });
  const samplePdfBytes = await doc.save();
  console.log('✓ Successfully created sample 2-page PDF. Size:', samplePdfBytes.byteLength, 'bytes');

  console.log('\n--- TEST 2: PDF Parsing & Text Extraction (pdfjs-dist) ---');
  console.log('pdfjsLib.getDocument is:', typeof pdfjsLib.getDocument);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(samplePdfBytes),
    verbosity: 0,
  });
  const pdfJsDoc = await loadingTask.promise;
  console.log('✓ PDF.js successfully parsed document! Total pages:', pdfJsDoc.numPages);
  const p1 = await pdfJsDoc.getPage(1);
  const textContent = await p1.getTextContent();
  const extractedStr = textContent.items.map((i) => i.str).join(' ');
  console.log('✓ Extracted text from page 1:', JSON.stringify(extractedStr));

  console.log('\n--- TEST 3: PDF Merging ---');
  const mergedDoc = await PDFDocument.create();
  const docA = await PDFDocument.load(samplePdfBytes);
  const docB = await PDFDocument.load(samplePdfBytes);
  const pagesA = await mergedDoc.copyPages(docA, docA.getPageIndices());
  const pagesB = await mergedDoc.copyPages(docB, docB.getPageIndices());
  pagesA.forEach((p) => mergedDoc.addPage(p));
  pagesB.forEach((p) => mergedDoc.addPage(p));
  const mergedBytes = await mergedDoc.save();
  console.log('✓ Merged 2 PDFs into 1. Total pages:', mergedDoc.getPageCount(), 'Bytes:', mergedBytes.byteLength);

  console.log('\n--- TEST 4: PDF Splitting ---');
  const splitDoc = await PDFDocument.create();
  const srcDoc = await PDFDocument.load(samplePdfBytes);
  const [extractedPage] = await splitDoc.copyPages(srcDoc, [1]);
  splitDoc.addPage(extractedPage);
  const splitBytes = await splitDoc.save();
  console.log('✓ Extracted page 2 into isolated PDF. Bytes:', splitBytes.byteLength);

  console.log('\n--- TEST 5: PDF Watermarking ---');
  const watermarkDoc = await PDFDocument.load(samplePdfBytes);
  const wmPages = watermarkDoc.getPages();
  wmPages[0].drawText('CONFIDENTIAL', {
    x: 100,
    y: 400,
    size: 40,
    color: rgb(0.9, 0.1, 0.1),
    opacity: 0.3,
  });
  const watermarkedBytes = await watermarkDoc.save();
  console.log('✓ Watermarked document successfully. Bytes:', watermarkedBytes.byteLength);

  console.log('\n--- TEST 6: AES-256 PDF Encryption & Decryption ---');
  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const { decryptPDF, isEncrypted } = await import('@pdfsmaller/pdf-decrypt');
  const encryptedBytes = await encryptPDF(samplePdfBytes, 'SecretPass123', {
    ownerPassword: 'AdminMaster456',
    algorithm: 'AES-256',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });
  const encStatus = await isEncrypted(encryptedBytes);
  console.log('✓ Encrypted with AES-256 successfully:', encStatus);
  if (!encStatus.encrypted) throw new Error('Document reported not encrypted!');
  const decryptedBytes = await decryptPDF(encryptedBytes, 'SecretPass123');
  const decStatus = await isEncrypted(decryptedBytes);
  console.log('✓ Decrypted with password successfully:', decStatus);
  if (decStatus.encrypted) throw new Error('Document still encrypted after decryption!');

  console.log('\n--- TEST 7: Page Organization & Blank Page Insertion ---');
  const orgDoc = await PDFDocument.load(samplePdfBytes);
  orgDoc.addPage([612, 792]); // Blank page
  const orgPages = orgDoc.getPages();
  orgPages[0].setRotation({ angle: 90, type: 'degrees' });
  const orgBytes = await orgDoc.save();
  console.log('✓ Page organized: 90 deg rotation and blank page added. Total pages:', orgPages.length, 'Bytes:', orgBytes.byteLength);

  console.log('\n--- TEST 8: Offline Tesseract Asset Verification ---');
  const fs = await import('fs');
  const path = await import('path');
  const tessDir = path.resolve('public/tesseract');
  const workerFile = path.join(tessDir, 'worker.min.js');
  const coreFile = path.join(tessDir, 'tesseract-core.wasm.js');
  const langFile = path.join(tessDir, 'lang-data/eng.traineddata.gz');
  if (!fs.existsSync(workerFile)) throw new Error('Missing worker.min.js in public/tesseract');
  if (!fs.existsSync(coreFile)) throw new Error('Missing tesseract-core.wasm.js in public/tesseract');
  if (!fs.existsSync(langFile)) throw new Error('Missing eng.traineddata.gz in public/tesseract/lang-data');
  console.log('✓ Offline Tesseract worker (', fs.statSync(workerFile).size, 'bytes)');
  console.log('✓ Offline Tesseract core (', fs.statSync(coreFile).size, 'bytes)');
  console.log('✓ Offline Tesseract langdata (', fs.statSync(langFile).size, 'bytes)');

  console.log('\n=========================================');
  console.log('🎉 ALL 8 PDF & CRYPTO TEST SUITES PASSED 100%!');
  console.log('=========================================');
}

runAllTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
