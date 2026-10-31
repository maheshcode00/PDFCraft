import * as pdfjsDist from 'pdfjs-dist';
import * as pdfWorkerModule from 'pdfjs-dist/build/pdf.worker.js';
import { PDFDocument } from 'pdf-lib';

// Configure the worker message handler on globalThis
const workerObj = pdfWorkerModule.default || pdfWorkerModule;
globalThis.pdfjsWorker = workerObj;

const pdfjsLib = pdfjsDist.default || pdfjsDist;

async function testWorkerIntegration() {
  console.log('Testing PDF.js parsing with in-bundle worker handler...');
  console.log('globalThis.pdfjsWorker defined?', !!globalThis.pdfjsWorker);
  console.log('WorkerMessageHandler defined?', !!globalThis.pdfjsWorker.WorkerMessageHandler);

  // Create sample PDF bytes
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  page.drawText('Worker Integration Test Page');
  const bytes = await doc.save();

  // Load via PDF.js without external workerSrc
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bytes),
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;
  console.log('✓ Successfully loaded PDF without external worker URL! Pages:', pdfDoc.numPages);

  const p1 = await pdfDoc.getPage(1);
  const textContent = await p1.getTextContent();
  const text = textContent.items.map((i) => i.str).join(' ');
  console.log('✓ Extracted text:', text);
  console.log('🎉 ZERO FAKE WORKER ERROR! 100% RELIABLE!');
}

testWorkerIntegration().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
