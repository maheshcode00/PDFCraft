import { openDB } from 'idb';

const DB_NAME = 'pdfcraft_pro_db';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('recent_files')) {
          const fileStore = db.createObjectStore('recent_files', { keyPath: 'id' });
          fileStore.createIndex('updatedAt', 'updatedAt');
          fileStore.createIndex('isStarred', 'isStarred');
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export const storageService = {
  /**
   * Save or update a recent file in IndexedDB
   */
  async saveRecentFile(fileData) {
    try {
      const db = await getDB();
      const id = fileData.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Safely clone buffer for IndexedDB structured clone
      let safeData = null;
      if (fileData.data) {
        if (fileData.data instanceof Uint8Array) {
          safeData = fileData.data.slice().buffer;
        } else if (fileData.data instanceof ArrayBuffer && fileData.data.byteLength > 0) {
          safeData = fileData.data.slice(0);
        } else if (ArrayBuffer.isView(fileData.data) && fileData.data.buffer && fileData.data.buffer.byteLength > 0) {
          safeData = fileData.data.buffer.slice(fileData.data.byteOffset, fileData.data.byteOffset + fileData.data.byteLength);
        }
      }

      const entry = {
        id,
        name: fileData.name || 'Untitled.pdf',
        size: fileData.size || (safeData ? safeData.byteLength : 0),
        type: fileData.type || 'application/pdf',
        pageCount: fileData.pageCount || 1,
        thumbnail: fileData.thumbnail || null,
        isStarred: fileData.isStarred || false,
        data: safeData,
        updatedAt: Date.now(),
      };
      await db.put('recent_files', entry);
      return entry;
    } catch (err) {
      console.warn('StorageService: Failed to save file to IndexedDB', err);
      return null;
    }
  },

  /**
   * Get all recent files ordered by updatedAt descending
   */
  async getRecentFiles(limit = 30) {
    try {
      const db = await getDB();
      const all = await db.getAllFromIndex('recent_files', 'updatedAt');
      return all.reverse().slice(0, limit);
    } catch (err) {
      console.error('StorageService: Failed to fetch recent files', err);
      return [];
    }
  },

  /**
   * Get all starred files
   */
  async getStarredFiles() {
    try {
      const db = await getDB();
      const all = await db.getAll('recent_files');
      return all.filter((item) => item.isStarred).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.error('StorageService: Failed to fetch starred files', err);
      return [];
    }
  },

  /**
   * Retrieve a single file with ArrayBuffer data
   */
  async getFileById(id) {
    try {
      const db = await getDB();
      return await db.get('recent_files', id);
    } catch (err) {
      console.error(`StorageService: Failed to fetch file ${id}`, err);
      return null;
    }
  },

  /**
   * Toggle starred status for a document
   */
  async toggleStar(id) {
    try {
      const db = await getDB();
      const item = await db.get('recent_files', id);
      if (item) {
        item.isStarred = !item.isStarred;
        await db.put('recent_files', item);
        return item.isStarred;
      }
      return false;
    } catch (err) {
      console.error('StorageService: Failed to toggle star', err);
      return false;
    }
  },

  /**
   * Delete a file entry from IndexedDB
   */
  async deleteFile(id) {
    try {
      const db = await getDB();
      await db.delete('recent_files', id);
      return true;
    } catch (err) {
      console.error('StorageService: Failed to delete file', err);
      return false;
    }
  },

  /**
   * Clear all recent files
   */
  async clearAllFiles() {
    try {
      const db = await getDB();
      await db.clear('recent_files');
      return true;
    } catch (err) {
      console.error('StorageService: Failed to clear storage', err);
      return false;
    }
  },

  /**
   * Save active session state (open tabs, current tool)
   */
  async saveSession(sessionData) {
    try {
      const db = await getDB();
      await db.put('sessions', { id: 'active_session', ...sessionData, savedAt: Date.now() });
    } catch (err) {
      console.warn('StorageService: Failed to save session', err);
    }
  },

  /**
   * Retrieve saved session
   */
  async getSession() {
    try {
      const db = await getDB();
      return await db.get('sessions', 'active_session');
    } catch (err) {
      return null;
    }
  },

  /**
   * Query device storage quota & usage
   */
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const { quota, usage } = await navigator.storage.estimate();
        return {
          quota: quota || 0,
          usage: usage || 0,
          percentage: quota ? Math.min(100, Math.round((usage / quota) * 100)) : 0,
        };
      } catch (e) {
        return { quota: 0, usage: 0, percentage: 0 };
      }
    }
    return { quota: 0, usage: 0, percentage: 0 };
  },
};
