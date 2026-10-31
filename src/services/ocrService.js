import { createWorker } from 'tesseract.js';

export const ocrService = {
  /**
   * Run OCR on a canvas, image URL, or image element
   * @param {HTMLCanvasElement | string | Blob} imageSource
   * @param {string} lang - Language code (e.g. 'eng', 'spa', 'fra', 'deu')
   * @param {Function} onProgress - Progress callback ({ status, progress })
   */
  async recognize(imageSource, lang = 'eng', onProgress = null) {
    let worker = null;
    try {
      const isBrowser = typeof window !== 'undefined';
      
      const options = {
        logger: (m) => {
          if (onProgress && m.status) {
            onProgress({
              status: m.status,
              progress: Math.round((m.progress || 0) * 100),
            });
          }
        },
      };

      if (isBrowser) {
        const origin = window.location.origin;
        const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
        const tessBase = `${origin}${base}/tesseract`;

        // Direct local worker script (same-origin, avoid remote CDN importScripts failures)
        options.workerPath = `${tessBase}/worker.min.js`;
        options.corePath = tessBase;
        options.workerBlobURL = false;

        // Use local offline traineddata for English
        if (lang === 'eng') {
          options.langPath = `${tessBase}/lang-data`;
          options.gzip = true;
        }
      }

      worker = await createWorker(lang, 1, options);
      const ret = await worker.recognize(imageSource);

      return {
        text: ret.data.text || '',
        confidence: ret.data.confidence ?? 0,
        lines: ret.data.lines ? ret.data.lines.map((l) => l.text) : [],
        words: ret.data.words ? ret.data.words.map((w) => ({ text: w.text, bbox: w.bbox })) : [],
      };
    } catch (err) {
      console.error('Tesseract OCR error:', err);
      throw new Error(`OCR Engine notice: ${err.message || err}. (English trained data is bundled locally for 100% offline use. Other languages require internet connectivity on initial run)`);
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
    }
  },

  /**
   * Supported languages catalog
   */
  getSupportedLanguages() {
    return [
      { code: 'eng', name: 'English (Offline Bundled)' },
      { code: 'spa', name: 'Spanish (Español)' },
      { code: 'fra', name: 'French (Français)' },
      { code: 'deu', name: 'German (Deutsch)' },
      { code: 'ita', name: 'Italian (Italiano)' },
      { code: 'por', name: 'Portuguese (Português)' },
      { code: 'hin', name: 'Hindi (हिंदी)' },
      { code: 'chi_sim', name: 'Chinese Simplified (简体中文)' },
      { code: 'jpn', name: 'Japanese (日本語)' },
      { code: 'ara', name: 'Arabic (العربية)' },
      { code: 'rus', name: 'Russian (Русский)' },
    ];
  },
};

