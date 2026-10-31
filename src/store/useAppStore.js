import { create } from 'zustand';
import { storageService } from '../services/storageService';

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pdfcraft_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const useAppStore = create((set, get) => ({
  // Theme
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('pdfcraft_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },
  initTheme: () => {
    const theme = get().theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Recent & Starred Files
  recentFiles: [],
  starredFiles: [],
  isLoadingFiles: false,
  loadRecentFiles: async () => {
    set({ isLoadingFiles: true });
    try {
      const recents = await storageService.getRecentFiles();
      const starred = await storageService.getStarredFiles();
      set({ recentFiles: recents, starredFiles: starred });
    } finally {
      set({ isLoadingFiles: false });
    }
  },
  toggleStar: async (id) => {
    await storageService.toggleStar(id);
    await get().loadRecentFiles();
  },
  deleteFile: async (id) => {
    await storageService.deleteFile(id);
    await get().loadRecentFiles();
  },
  clearAllFiles: async () => {
    await storageService.clearAllFiles();
    set({ recentFiles: [], starredFiles: [] });
  },

  // Storage Quota
  storageQuota: { usage: 0, quota: 0, percentage: 0 },
  updateStorageQuota: async () => {
    const quota = await storageService.getStorageEstimate();
    set({ storageQuota: quota });
  },

  // Multi-tab Viewer
  openTabs: [],
  activeTabId: null,
  openInViewer: (file) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.id === file.id);
    if (existing) {
      set({ activeTabId: file.id });
    } else {
      set({
        openTabs: [...openTabs, file],
        activeTabId: file.id,
      });
    }
  },
  closeTab: (id) => {
    const { openTabs, activeTabId } = get();
    const filtered = openTabs.filter((t) => t.id !== id);
    let nextActive = activeTabId;
    if (activeTabId === id) {
      nextActive = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
    }
    set({ openTabs: filtered, activeTabId: nextActive });
  },
  setActiveTabId: (id) => set({ activeTabId: id }),

  // Toasts
  toasts: [],
  addToast: ({ title, message, type = 'info', duration = 4000 }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts, { id, title, message, type }] }));
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  // Offline & PWA
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setIsOnline: (status) => set({ isOnline: status }),
  installPrompt: null,
  setInstallPrompt: (prompt) => set({ installPrompt: prompt }),
}));
