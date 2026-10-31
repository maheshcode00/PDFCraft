import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';

// Lazy loading for peak performance and minimal initial bundle size
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const PdfViewerModule = lazy(() => import('../modules/viewer/PdfViewerModule'));
const PdfEditorModule = lazy(() => import('../modules/editor/PdfEditorModule'));
const MergeModule = lazy(() => import('../modules/merge/MergeModule'));
const SplitModule = lazy(() => import('../modules/split/SplitModule'));
const OrganizeModule = lazy(() => import('../modules/organize/OrganizeModule'));
const CompressModule = lazy(() => import('../modules/compress/CompressModule'));
const ConvertModule = lazy(() => import('../modules/convert/ConvertModule'));
const OcrModule = lazy(() => import('../modules/ocr/OcrModule'));
const SecurityModule = lazy(() => import('../modules/security/SecurityModule'));
const SignatureModule = lazy(() => import('../modules/signatures/SignatureModule'));
const WatermarkModule = lazy(() => import('../modules/watermark/WatermarkModule'));
const CompareModule = lazy(() => import('../modules/compare/CompareModule'));
const ScanModule = lazy(() => import('../modules/scan/ScanModule'));
const BatchModule = lazy(() => import('../modules/batch/BatchModule'));

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
    <div className="w-10 h-10 border-4 border-pdf-500/20 border-t-pdf-500 rounded-full animate-spin" />
    <span className="text-xs font-semibold text-surface-400 animate-pulse">
      Loading PdfCraft Pro Module...
    </span>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'viewer',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <PdfViewerModule />
          </Suspense>
        ),
      },
      {
        path: 'editor',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <PdfEditorModule />
          </Suspense>
        ),
      },
      {
        path: 'merge',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <MergeModule />
          </Suspense>
        ),
      },
      {
        path: 'split',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SplitModule />
          </Suspense>
        ),
      },
      {
        path: 'organize',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <OrganizeModule />
          </Suspense>
        ),
      },
      {
        path: 'compress',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <CompressModule />
          </Suspense>
        ),
      },
      {
        path: 'convert',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ConvertModule />
          </Suspense>
        ),
      },
      {
        path: 'ocr',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <OcrModule />
          </Suspense>
        ),
      },
      {
        path: 'security',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SecurityModule />
          </Suspense>
        ),
      },
      {
        path: 'signatures',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SignatureModule />
          </Suspense>
        ),
      },
      {
        path: 'watermark',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <WatermarkModule />
          </Suspense>
        ),
      },
      {
        path: 'compare',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <CompareModule />
          </Suspense>
        ),
      },
      {
        path: 'scan',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ScanModule />
          </Suspense>
        ),
      },
      {
        path: 'batch',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <BatchModule />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
