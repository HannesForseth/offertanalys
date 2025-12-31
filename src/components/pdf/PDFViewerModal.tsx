'use client'

import { useState, useCallback, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react'

interface PDFViewerModalProps {
  open: boolean
  onClose: () => void
  filePath: string
  title?: string
}

export function PDFViewerModal({ open, onClose, filePath, title }: PDFViewerModalProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullWidth, setIsFullWidth] = useState<boolean>(false)
  const [pdfComponents, setPdfComponents] = useState<{
    Document: React.ComponentType<any>
    Page: React.ComponentType<any>
  } | null>(null)

  const pdfUrl = `/api/files/view?path=${encodeURIComponent(filePath)}`

  // Load react-pdf dynamically on client side
  useEffect(() => {
    if (open && !pdfComponents) {
      import('react-pdf').then((reactPdf) => {
        // Configure worker
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${reactPdf.pdfjs.version}/build/pdf.worker.min.mjs`

        setPdfComponents({
          Document: reactPdf.Document,
          Page: reactPdf.Page,
        })
      }).catch((err) => {
        console.error('Failed to load react-pdf:', err)
        setError('Kunde inte ladda PDF-komponenten')
        setLoading(false)
      })
    }
  }, [open, pdfComponents])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('Error loading PDF:', err)
    setError('Kunde inte ladda PDF-filen. Kontrollera att filen finns.')
    setLoading(false)
  }, [])

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = filePath.split('/').pop() || 'document.pdf'
    link.click()
  }

  const resetView = () => {
    setPageNumber(1)
    setScale(1.0)
    setRotation(0)
  }

  // Reset state when modal closes
  const handleClose = () => {
    resetView()
    setLoading(true)
    setError(null)
    onClose()
  }

  const { Document, Page } = pdfComponents || {}

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title || 'Visa PDF'}
      size={isFullWidth ? 'full' : 'xl'}
    >
      <div className="flex flex-col h-[80vh]">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 p-3 bg-slate-800 border-b border-slate-700 rounded-t-lg">
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-300 min-w-[80px] text-center">
              {loading ? '...' : `${pageNumber} / ${numPages}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || loading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom and rotation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.5 || loading}
              title="Zooma ut"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-300 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 3.0 || loading}
              title="Zooma in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-slate-600 mx-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={rotate}
              disabled={loading}
              title="Rotera"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullWidth(!isFullWidth)}
              title={isFullWidth ? 'Normal storlek' : 'Helskärm'}
            >
              {isFullWidth ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={loading}
              title="Ladda ner"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Display */}
        <div className="flex-1 overflow-auto bg-slate-900 flex items-start justify-center p-4">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="secondary" onClick={() => {
                setError(null)
                setLoading(true)
              }}>
                Försök igen
              </Button>
            </div>
          ) : !pdfComponents ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : Document && Page ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
              }
              className="pdf-document"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                loading={
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                  </div>
                }
                className="pdf-page shadow-2xl"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          ) : null}
        </div>

        {/* Page input for quick navigation */}
        {numPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-3 p-3 bg-slate-800 border-t border-slate-700 rounded-b-lg">
            <span className="text-sm text-slate-400">Gå till sida:</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value, 10)
                if (page >= 1 && page <= numPages) {
                  setPageNumber(page)
                }
              }}
              className="w-16 px-2 py-1 text-sm text-center bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-400">av {numPages}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
