'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Supplier } from '@/lib/supabase'
import { Building2, Mail, Phone, User, Star, Edit2, Trash2 } from 'lucide-react'

interface SupplierCardProps {
  supplier: Supplier
  onEdit?: () => void
  onDelete?: () => void
  onSelect?: () => void
  selected?: boolean
  selectable?: boolean
}

export function SupplierCard({
  supplier,
  onEdit,
  onDelete,
  onSelect,
  selected,
  selectable,
}: SupplierCardProps) {
  const renderStars = (rating: number | undefined) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-slate-600'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <Card
      hover={!!onSelect || !!onEdit}
      className={`transition-all ${
        selected
          ? 'ring-2 ring-cyan-500 border-cyan-500'
          : selectable
          ? 'cursor-pointer'
          : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header: Name and rating */}
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <h3 className="font-semibold text-slate-200 truncate">
                {supplier.name}
              </h3>
              {renderStars(supplier.rating)}
            </div>

            {/* Tags */}
            {supplier.category_tags && supplier.category_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {supplier.category_tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="default" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {supplier.category_tags.length > 5 && (
                  <Badge variant="default" className="text-xs">
                    +{supplier.category_tags.length - 5}
                  </Badge>
                )}
              </div>
            )}

            {/* Contact info */}
            <div className="space-y-1.5 text-sm">
              {supplier.contact_person && (
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{supplier.contact_person}</span>
                </div>
              )}
              {supplier.contact_email && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{supplier.contact_email}</span>
                </div>
              )}
              {supplier.contact_phone && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{supplier.contact_phone}</span>
                </div>
              )}
            </div>

            {/* Notes preview */}
            {supplier.notes && (
              <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                {supplier.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div className="flex flex-col gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
                  title="Redigera"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Vill du ta bort denna leverantör?')) {
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
          )}

          {/* Selection checkbox */}
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {}}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
