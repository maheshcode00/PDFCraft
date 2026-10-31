import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { pdfService } from '../../services/pdfService';
import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer, downloadBytes, sanitizeFileName } from '../../utils/fileUtils';
import DropZone from '../../components/common/DropZone';
import {
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  Printer,
  Copy,
  Edit,
  Download,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SecurityModule() {
  const { addToast } = useAppStore();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('encrypt'); // 'encrypt' | 'unlock'
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowModifying, setAllowModifying] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'unlock') {
      setActiveTab('unlock');
    } else if (params.get('mode') === 'encrypt') {
      setActiveTab('encrypt');
    }
  }, [location]);

  const handleFileLoaded = async (uploadedFile) => {
    try {
      const buffer = await readFileAsArrayBuffer(uploadedFile);
      setFile({
        name: uploadedFile.name,
        size: uploadedFile.size,
        data: buffer,
      });
      addToast({ title: 'File Ready', message: uploadedFile.name });
    } catch (err) {
      addToast({ title: 'Error reading file', message: err.message, type: 'error' });
    }
  };

  const handleEncrypt = async () => {
    if (!password) {
      addToast({ title: 'Missing Password', message: 'Please enter a password to encrypt.', type: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      addToast({ title: 'Mismatch', message: 'Passwords do not match.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      addToast({ title: 'Encrypting Document', message: 'Applying AES-256 protection...' });
      const encryptedBytes = await pdfService.encryptPdf(file.data, password, {
        allowPrinting,
        allowCopying,
        allowModifying,
      });

      downloadBytes(encryptedBytes, sanitizeFileName(`protected-${file.name}`));
      addToast({ title: 'Protection Applied', message: 'AES-256 Encrypted PDF downloaded.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Encryption failed', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!file || !file.data) return;
    if (!unlockPassword) {
      addToast({ title: 'Password Required', message: 'Please enter the password to unlock.', type: 'error' });
      return;
    }
    setIsProcessing(true);

    try {
      addToast({ title: 'Unlocking PDF', message: 'Verifying password and decrypting...' });
      const decryptedBytes = await pdfService.decryptPdf(file.data, unlockPassword);
      downloadBytes(decryptedBytes, sanitizeFileName(`unlocked-${file.name}`));
      addToast({ title: 'Document Unlocked', message: 'Decrypted PDF downloaded.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Unlock failed', message: err.message || 'Incorrect password or corrupted file.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-700 flex items-center justify-center text-white mx-auto shadow-md">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          PDF Security & Permissions
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Encrypt your documents with password protection or unlock restricted PDFs locally.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="bg-surface-100 dark:bg-surface-900 p-1 rounded-2xl border border-surface-200 dark:border-surface-800 flex gap-1">
          <button
            onClick={() => setActiveTab('encrypt')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'encrypt'
                ? 'bg-white dark:bg-surface-800 text-pdf-600 dark:text-pdf-400 shadow'
                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Encrypt & Protect</span>
          </button>
          <button
            onClick={() => setActiveTab('unlock')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'unlock'
                ? 'bg-white dark:bg-surface-800 text-pdf-600 dark:text-pdf-400 shadow'
                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock & Decrypt</span>
          </button>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileLoaded}
          title={activeTab === 'encrypt' ? 'Select PDF to Encrypt' : 'Select Locked PDF to Decrypt'}
          subtitle="Drag & drop your document here"
        />
      ) : (
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-6 shadow-sm">
          {/* File Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pdf-500/10 text-pdf-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-surface-900 dark:text-white">{file.name}</h4>
                <p className="text-xs text-surface-400">Ready for {activeTab}</p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-surface-400 hover:text-pdf-500"
            >
              Change File
            </button>
          </div>

          {activeTab === 'encrypt' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password Input */}
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Set User Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono focus:outline-none focus:border-pdf-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono focus:outline-none focus:border-pdf-500"
                  />
                </div>
              </div>

              {/* Permissions Options */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                  Security Permissions
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPrinting}
                      onChange={(e) => setAllowPrinting(e.target.checked)}
                      className="rounded text-pdf-600 focus:ring-0"
                    />
                    <Printer className="w-4 h-4 text-surface-500" />
                    <span className="text-xs font-medium">Allow Printing</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCopying}
                      onChange={(e) => setAllowCopying(e.target.checked)}
                      className="rounded text-pdf-600 focus:ring-0"
                    />
                    <Copy className="w-4 h-4 text-surface-500" />
                    <span className="text-xs font-medium">Allow Copying</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowModifying}
                      onChange={(e) => setAllowModifying(e.target.checked)}
                      className="rounded text-pdf-600 focus:ring-0"
                    />
                    <Edit className="w-4 h-4 text-surface-500" />
                    <span className="text-xs font-medium">Allow Editing</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleEncrypt}
                disabled={isProcessing || !password}
                className="px-8 py-3 rounded-xl bg-pdf-600 hover:bg-pdf-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-glow disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isProcessing ? 'Securing PDF...' : 'Encrypt & Protect PDF'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Enter Password to Unlock
                </label>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter current password..."
                  className="w-full sm:w-96 px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-mono focus:outline-none focus:border-pdf-500"
                />
              </div>

              <button
                onClick={handleUnlock}
                disabled={isProcessing}
                className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                <span>{isProcessing ? 'Decrypting...' : 'Remove Password Restrictions'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
