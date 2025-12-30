'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Quote } from '@/lib/supabase'
import { formatPrice, formatDateShort, statusLabels, statusColors } from '@/lib/utils'
import { Building2, Calendar, Phone, Mail, FileText } from 'lucide-react'

interface QuoteCardProps {
  quote: Quote
  selected?: boolean
  onSelect?: () => void
  onClick?: () => void
}

export function QuoteCard({ quote, selected, onSelect, onClick }: QuoteCardProps) {
  const statusVariant = {
    received: 'info',
    reviewing: 'warning',
    selected: 'success',
    rejected: 'danger',
  }[quote.status] as 'info' | 'warning' | 'success' | 'danger'

  return (
    <Card
      hover
      className={`cursor-pointer transition-all ${
        selected ? 'ring-2 ring-cyan-500 border-cyan-500' : ''
      }`}
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
            {onSelect && (
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
            <Badge variant={statusVariant}>{statusLabels[quote.status]}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-cyan-400 font-mono">
            {formatPrice(quote.total_amount)}
          </p>
          {quote.vat_included && <p className="text-xs text-slate-500">inkl. moms</p>}
        </div>

        {/* Details */}
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

        {/* AI Summary */}
        {quote.ai_summary && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-400 line-clamp-2">{quote.ai_summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
