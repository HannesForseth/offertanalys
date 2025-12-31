'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Table,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExcelViewerModalProps {
  open: boolean
  onClose: () => void
  filePath: string
  title?: string
}

interface SheetData {
  name: string
  data: (string | number | null)[][]
  columns: string[]
}

export function ExcelViewerModal({ open, onClose, filePath, title }: ExcelViewerModalProps) {
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullWidth, setIsFullWidth] = useState<boolean>(false)

  const fileUrl = `/api/files/view?path=${encodeURIComponent(filePath)}`

  const loadExcel = useCallback(async () => {
    if (!open) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error('Kunde inte hämta filen')
      }

      const arrayBuffer = await response.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })

      const sheetsData: SheetData[] = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
          header: 1,
          defval: null,
        })

        // Get column headers (first row or generate A, B, C...)
        const maxCols = Math.max(...jsonData.map(row => row.length), 0)
        const columns = Array.from({ length: maxCols }, (_, i) =>
          XLSX.utils.encode_col(i)
        )

        return {
          name: sheetName,
          data: jsonData,
          columns,
        }
      })

      setSheets(sheetsData)
      setActiveSheetIndex(0)
    } catch (err) {
      console.error('Error loading Excel:', err)
      setError('Kunde inte ladda Excel-filen. Kontrollera att filen finns.')
    } finally {
      setLoading(false)
    }
  }, [open, fileUrl])

  useEffect(() => {
    if (open) {
      loadExcel()
    }
  }, [open, loadExcel])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = filePath.split('/').pop() || 'document.xlsx'
    link.click()
  }

  const handleClose = () => {
    setSheets([])
    setActiveSheetIndex(0)
    setLoading(true)
    setError(null)
    onClose()
  }

  const activeSheet = sheets[activeSheetIndex]

  // Format cell value for display
  const formatCellValue = (value: string | number | null): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') {
      // Format numbers with Swedish locale
      return value.toLocaleString('sv-SE', {
        maximumFractionDigits: 2,
      })
    }
    return String(value)
  }

  // Check if a value looks like a number for alignment
  const isNumericValue = (value: string | number | null): boolean => {
    if (typeof value === 'number') return true
    if (typeof value === 'string') {
      const cleaned = value.replace(/\s/g, '').replace(',', '.')
      return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned))
    }
    return false
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title || 'Visa Excel'}
      size={isFullWidth ? 'full' : 'xl'}
    >
      <div className="flex flex-col h-[80vh]">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 p-3 bg-slate-800 border-b border-slate-700 rounded-t-lg">
          {/* Sheet navigation */}
          <div className="flex items-center gap-2">
            {sheets.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSheetIndex(prev => Math.max(prev - 1, 0))}
                  disabled={activeSheetIndex <= 0 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  <Table className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-300 min-w-[100px]">
                    {loading ? '...' : activeSheet?.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSheetIndex(prev => Math.min(prev + 1, sheets.length - 1))}
                  disabled={activeSheetIndex >= sheets.length - 1 || loading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            {sheets.length === 1 && (
              <div className="flex items-center gap-1">
                <Table className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-300">
                  {loading ? '...' : activeSheet?.name}
                </span>
              </div>
            )}
          </div>

          {/* Sheet tabs (if multiple sheets) */}
          {sheets.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto max-w-[400px]">
              {sheets.map((sheet, index) => (
                <button
                  key={sheet.name}
                  onClick={() => setActiveSheetIndex(index)}
                  className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    index === activeSheetIndex
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {!loading && activeSheet && `${activeSheet.data.length} rader`}
            </span>
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

        {/* Excel Display */}
        <div className="flex-1 overflow-auto bg-slate-900">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="secondary" onClick={loadExcel}>
                Försök igen
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : activeSheet ? (
            <div className="min-w-full">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-800">
                    {/* Row number header */}
                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-700 bg-slate-800 w-12">
                      #
                    </th>
                    {activeSheet.columns.map((col, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left text-xs font-medium text-slate-400 border-b border-r border-slate-700 bg-slate-800 min-w-[100px]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSheet.data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`${
                        rowIndex % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'
                      } hover:bg-slate-700/50 transition-colors`}
                    >
                      {/* Row number */}
                      <td className="px-2 py-1.5 text-xs text-slate-500 border-r border-slate-700/50 text-center">
                        {rowIndex + 1}
                      </td>
                      {activeSheet.columns.map((_, colIndex) => {
                        const cellValue = row[colIndex]
                        const isNumeric = isNumericValue(cellValue)
                        return (
                          <td
                            key={colIndex}
                            className={`px-3 py-1.5 text-slate-300 border-r border-slate-700/50 whitespace-nowrap ${
                              isNumeric ? 'text-right font-mono' : 'text-left'
                            }`}
                          >
                            {formatCellValue(cellValue)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {activeSheet.data.length === 0 && (
                <div className="flex items-center justify-center h-32 text-slate-500">
                  Arket är tomt
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer info */}
        {!loading && activeSheet && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 rounded-b-lg text-xs text-slate-500">
            <span>
              {sheets.length} ark • {activeSheet.data.length} rader • {activeSheet.columns.length} kolumner
            </span>
            <span>
              Ark {activeSheetIndex + 1} av {sheets.length}
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
