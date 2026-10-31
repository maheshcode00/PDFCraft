import { PDFDocument } from 'pdf-lib';
import * as pdfjsDist from 'pdfjs-dist';
import * as pdfWorkerModule from 'pdfjs-dist/build/pdf.worker.js';

// Setup worker
globalThis.pdfjsWorker = pdfWorkerModule.default || pdfWorkerModule;
const pdfjsLib = pdfjsDist.default || pdfjsDist;

function cloneData(data) {
  if (!data) return new Uint8Array(0);
  if (data instanceof Uint8Array) {
    return data.slice();
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data.slice(0));
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
  return new Uint8Array(data);
}

async function testDetachmentSafety() {
  console.log('1. Creating test document...');
  const doc = await PDFDocument.create();
  doc.addPage([400, 300]);
  const originalBytes = await doc.save();
  const originalBuffer = originalBytes.buffer;

  console.log('Original buffer byteLength before loading:', originalBuffer.byteLength);

  // Load 1: with cloning
  const task1 = pdfjsLib.getDocument({
    data: cloneData(originalBuffer),
    verbosity: 0,
  });
  const pdf1 = await task1.promise;
  console.log('Load 1 success, pages:', pdf1.numPages);
  console.log('Original buffer byteLength after Load 1:', originalBuffer.byteLength);

  // Load 2: using original buffer again!
  const task2 = pdfjsLib.getDocument({
    data: cloneData(originalBuffer),
    verbosity: 0,
  });
  const pdf2 = await task2.promise;
  console.log('Load 2 success, pages:', pdf2.numPages);
  console.log('Original buffer byteLength after Load 2:', originalBuffer.byteLength);

  // Load 3: with pdf-lib using original buffer again!
  const pdfLibDoc = await PDFDocument.load(cloneData(originalBuffer));
  console.log('Load 3 (pdf-lib) success, pages:', pdfLibDoc.getPageCount());

  if (originalBuffer.byteLength > 0) {
    console.log('🎉 SUCCESS: Buffer remained protected and never detached!');
  } else {
    console.error('❌ FAILURE: Buffer was detached!');
    process.exit(1);
  }
}

testDetachmentSafety().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
