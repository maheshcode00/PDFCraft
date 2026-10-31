import JSZip from 'jszip';

/**
 * Format raw bytes into human readable format (KB, MB, GB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Read File object as ArrayBuffer
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read File object as Data URL
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Read File object as UTF-8 Text
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Trigger client-side browser download for a Blob
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Trigger client-side download for Uint8Array or ArrayBuffer
 */
export function downloadBytes(bytes, filename, mimeType = 'application/pdf') {
  const blob = new Blob([bytes], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Clean and format filename with appropriate extension
 */
export function sanitizeFileName(filename, extension = '.pdf') {
  if (!filename) return `document-${Date.now()}${extension}`;
  let clean = filename.replace(/[<>:"/\\|?*]+/g, '_');
  if (extension && !clean.toLowerCase().endsWith(extension.toLowerCase())) {
    clean += extension;
  }
  return clean;
}

/**
 * Create a ZIP bundle containing multiple files using JSZip
 * @param {Array<{ name: string, data: Blob | Uint8Array | string }>} files
 * @param {string} zipFilename
 */
export async function downloadAsZip(files, zipFilename = 'pdfcraft-export.zip') {
  const zip = new JSZip();
  files.forEach(({ name, data }) => {
    zip.file(name, data);
  });
  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, zipFilename);
}

/**
 * Convert Base64 / Data URL to Blob
 */
export function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
