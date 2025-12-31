'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Quote } from '@/lib/supabase'
import { formatPrice, formatDateShort, statusLabels, statusColors } from '@/lib/utils'
import { Building2, Calendar, Phone, Mail, FileText, Clock, RefreshCw, Trash2, Eye } from 'lucide-react'
import { PDFViewerModal } from '@/components/pdf/PDFViewerModal'

interface QuoteCardProps {
  quote: Quote
  selected?: boolean
  onSelect?: () => void
  onClick?: () => void
  isPending?: boolean
  onReanalyze?: () => void
  isReanalyzing?: boolean
  onDelete?: () => void
}

export function QuoteCard({ quote, selected, onSelect, onClick, isPending, onReanalyze, isReanalyzing, onDelete }: QuoteCardProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false)

  // Check if file is a PDF
  const isPdfFile = quote.file_path?.toLowerCase().endsWith('.pdf')

  const statusVariant = isPending
    ? 'warning'
    : ({
        pending: 'warning',
        analyzed: 'info',
        received: 'info',
        reviewing: 'warning',
        selected: 'success',
        rejected: 'danger',
      }[quote.status] as 'info' | 'warning' | 'success' | 'danger')

  const statusLabel = isPending ? 'Väntar på analys' : statusLabels[quote.status] || 'Analyserad'

  return (
    <Card
      hover
      className={`cursor-pointer transition-all ${
        selected ? 'ring-2 ring-cyan-500 border-cyan-500' : ''
      } ${isPending ? 'border-amber-500/30 bg-amber-500/5' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{quote.supplier_name}</CardTitle>
            {quote.quote_number && (
              <p className="text-xs text-slate-500 font-mono mt-1">#{quote.quote_number}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSelect && !isPending && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation()
                  onSelect()
                }}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
              />
            )}
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Price or Pending Message */}
        {isPending ? (
          <div className="mb-4 flex items-center gap-2 text-amber-400">
            <Clock className="w-5 h-5" />
            <span className="text-sm">Klicka "Analysera" för att extrahera data</span>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-cyan-400 font-mono">
                {formatPrice(quote.total_amount)}
              </p>
              {isPdfFile && quote.file_path && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPdfViewer(true)
                  }}
                  className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
                  title="Visa PDF"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              {onReanalyze && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReanalyze()
                  }}
                  disabled={isReanalyzing}
                  className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                  title="Analysera om"
                >
                  <RefreshCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Vill du ta bort denna offert?')) {
                      onDelete()
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  title="Ta bort"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {quote.vat_included && <p className="text-xs text-slate-500">inkl. moms</p>}
          </div>
        )}

        {/* Details */}
        {!isPending && (
          <div className="space-y-2 text-sm">
            {quote.contact_person && (
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{quote.contact_person}</span>
              </div>
            )}

            {quote.contact_email && (
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{quote.contact_email}</span>
              </div>
            )}

            {quote.contact_phone && (
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{quote.contact_phone}</span>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
              {quote.quote_date && (
                <div className="flex items-center gap-1 text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span className="text-xs">{formatDateShort(quote.quote_date)}</span>
                </div>
              )}

              {quote.valid_until && (
                <div className="flex items-center gap-1 text-slate-500">
                  <FileText className="w-3 h-3" />
                  <span className="text-xs">Giltig till {formatDateShort(quote.valid_until)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File info for pending */}
        {isPending && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              <FileText className="w-4 h-4 inline mr-2" />
              Fil uppladdad och tolkad
            </div>
            <div className="flex items-center gap-1">
              {isPdfFile && quote.file_path && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPdfViewer(true)
                  }}
                  className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
                  title="Visa PDF"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Vill du ta bort denna offert?')) {
                      onDelete()
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  title="Ta bort"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {!isPending && quote.ai_summary && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-400 line-clamp-2">{quote.ai_summary}</p>
          </div>
        )}
      </CardContent>

      {/* PDF Viewer Modal */}
      {isPdfFile && quote.file_path && (
        <PDFViewerModal
          open={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          filePath={quote.file_path}
          title={`${quote.supplier_name} - Offert`}
        />
      )}
    </Card>
  )
}
