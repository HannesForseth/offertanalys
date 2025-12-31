'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { CategorySupplier, Supplier } from '@/lib/supabase'
import {
  Mail,
  Plus,
  Check,
  Clock,
  Send,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import { EmailPreviewModal } from './EmailPreviewModal'
import { AddSupplierToCategory } from './AddSupplierToCategory'
import { formatDateShort } from '@/lib/utils'

interface SupplierRequestPanelProps {
  categoryId: string
  categorySuppliers: CategorySupplier[]
  onAddSupplier: (supplierId: string) => Promise<void>
  onRemoveSupplier: (categorySupplier: CategorySupplier) => Promise<void>
  onUpdateStatus: (id: string, status: string) => Promise<void>
  onRefresh: () => void
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode; variant: 'info' | 'warning' | 'success' | 'danger' }
> = {
  pending: {
    label: 'Ej skickad',
    color: 'text-slate-400',
    icon: <Clock className="w-3 h-3" />,
    variant: 'default' as 'info',
  },
  sent: {
    label: 'Skickad',
    color: 'text-blue-400',
    icon: <Send className="w-3 h-3" />,
    variant: 'info',
  },
  received: {
    label: 'Offert mottagen',
    color: 'text-green-400',
    icon: <Check className="w-3 h-3" />,
    variant: 'success',
  },
  declined: {
    label: 'Avböjt',
    color: 'text-red-400',
    icon: <X className="w-3 h-3" />,
    variant: 'danger',
  },
  selected: {
    label: 'Vald',
    color: 'text-green-400',
    icon: <Check className="w-3 h-3" />,
    variant: 'success',
  },
}

export function SupplierRequestPanel({
  categoryId,
  categorySuppliers,
  onAddSupplier,
  onRemoveSupplier,
  onUpdateStatus,
  onRefresh,
}: SupplierRequestPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [deadline, setDeadline] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 14) // Default: 2 weeks from now
    return date.toISOString().split('T')[0]
  })

  const pendingCount = categorySuppliers.filter((cs) => cs.status === 'pending').length
  const sentCount = categorySuppliers.filter((cs) => cs.status === 'sent').length
  const receivedCount = categorySuppliers.filter((cs) => cs.status === 'received').length

  const handleMarkAsSent = async (categorySupplierIds: string[]) => {
    for (const id of categorySupplierIds) {
      await onUpdateStatus(id, 'sent')
    }
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-200 flex items-center gap-2">
          <Mail className="w-4 h-4 text-cyan-400" />
          Offertförfrågan
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Lägg till
        </Button>
      </div>

      {/* Stats */}
      {categorySuppliers.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">
            <span className="text-slate-200 font-medium">{categorySuppliers.length}</span> leverantörer
          </span>
          {sentCount > 0 && (
            <span className="text-blue-400">
              {sentCount} skickade
            </span>
          )}
          {receivedCount > 0 && (
            <span className="text-green-400">
              {receivedCount} mottagna
            </span>
          )}
        </div>
      )}

      {/* Deadline */}
      {categorySuppliers.length > 0 && (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-400">Svarsdatum:</span>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-auto py-1 px-2 text-sm"
          />
        </div>
      )}

      {/* Supplier List */}
      {categorySuppliers.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-700 rounded-lg">
          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-3">
            Inga leverantörer tillagda
          </p>
          <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Lägg till leverantör
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {categorySuppliers.map((cs) => {
            const supplier = cs.supplier
            if (!supplier) return null

            const status = statusConfig[cs.status] || statusConfig.pending

            return (
              <div
                key={cs.id}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200 truncate">
                      {supplier.name}
                    </span>
                    <Badge variant={status.variant} className="text-xs">
                      {status.icon}
                      <span className="ml-1">{status.label}</span>
                    </Badge>
                  </div>
                  {supplier.contact_email && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {supplier.contact_person && `${supplier.contact_person} • `}
                      {supplier.contact_email}
                    </p>
                  )}
                  {cs.sent_at && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Skickad: {formatDateShort(cs.sent_at)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveSupplier(cs)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  title="Ta bort"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Buttons */}
      {pendingCount > 0 && (
        <Button
          onClick={() => setShowEmailModal(true)}
          className="w-full"
        >
          <Mail className="w-4 h-4 mr-2" />
          Förhandsgranska mail ({pendingCount})
        </Button>
      )}

      {/* Modals */}
      <AddSupplierToCategory
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={async (supplierId) => {
          await onAddSupplier(supplierId)
          onRefresh()
        }}
        existingSupplierIds={categorySuppliers.map((cs) => cs.supplier_id)}
      />

      <EmailPreviewModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        categoryId={categoryId}
        categorySuppliers={categorySuppliers}
        deadline={deadline}
        onMarkAsSent={handleMarkAsSent}
      />
    </div>
  )
}
