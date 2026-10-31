import * as pdfjsDist from 'pdfjs-dist';
import * as pdfWorkerModule from 'pdfjs-dist/build/pdf.worker.js';

// Bind worker message handler to global environment
const workerObj = pdfWorkerModule.default || pdfWorkerModule;
if (typeof window !== 'undefined') {
  window.pdfjsWorker = workerObj;
} else if (typeof globalThis !== 'undefined') {
  globalThis.pdfjsWorker = workerObj;
}

const pdfjsLib = pdfjsDist.default || pdfjsDist;

export { pdfjsLib };
