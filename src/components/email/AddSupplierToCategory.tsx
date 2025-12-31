'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Supplier } from '@/lib/supabase'
import { Search, Building2, Check, Loader2 } from 'lucide-react'

interface AddSupplierToCategoryProps {
  open: boolean
  onClose: () => void
  onAdd: (supplierId: string) => Promise<void>
  existingSupplierIds: string[]
}

export function AddSupplierToCategory({
  open,
  onClose,
  onAdd,
  existingSupplierIds,
}: AddSupplierToCategoryProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchSuppliers()
    }
  }, [open])

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (supplierId: string) => {
    setAdding(supplierId)
    try {
      await onAdd(supplierId)
    } finally {
      setAdding(null)
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    // Exclude already added suppliers
    if (existingSupplierIds.includes(supplier.id)) return false

    // Filter by search
    if (!search) return true
    const query = search.toLowerCase()
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.contact_person?.toLowerCase().includes(query) ||
      supplier.category_tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  })

  return (
    <Modal open={open} onClose={onClose} title="Lägg till leverantör" size="md">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök leverantör..."
            className="pl-10"
          />
        </div>

        {/* Supplier List */}
        <div className="max-h-[400px] overflow-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {suppliers.length === 0
                ? 'Inga leverantörer registrerade'
                : search
                ? 'Inga leverantörer matchar sökningen'
                : 'Alla leverantörer är redan tillagda'}
            </div>
          ) : (
            filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="font-medium text-slate-200 truncate">
                      {supplier.name}
                    </span>
                  </div>
                  {supplier.contact_email && (
                    <p className="text-xs text-slate-500 ml-6 truncate">
                      {supplier.contact_person && `${supplier.contact_person} • `}
                      {supplier.contact_email}
                    </p>
                  )}
                  {supplier.category_tags && supplier.category_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
                      {supplier.category_tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="default" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {supplier.category_tags.length > 3 && (
                        <Badge variant="default" className="text-xs">
                          +{supplier.category_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAdd(supplier.id)}
                  disabled={adding === supplier.id}
                >
                  {adding === supplier.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Lägg till
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose}>
            Stäng
          </Button>
        </div>
      </div>
    </Modal>
  )
}
