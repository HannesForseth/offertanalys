'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Supplier } from '@/lib/supabase'
import { Star, X, Plus } from 'lucide-react'

interface SupplierFormProps {
  open: boolean
  onClose: () => void
  onSave: (supplier: Partial<Supplier>) => Promise<void>
  supplier?: Supplier | null
}

export function SupplierForm({ open, onClose, onSave, supplier }: SupplierFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    org_number: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    notes: '',
    rating: 0,
    category_tags: [] as string[],
  })
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        org_number: supplier.org_number || '',
        contact_person: supplier.contact_person || '',
        contact_email: supplier.contact_email || '',
        contact_phone: supplier.contact_phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        notes: supplier.notes || '',
        rating: supplier.rating || 0,
        category_tags: supplier.category_tags || [],
      })
    } else {
      setFormData({
        name: '',
        org_number: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        city: '',
        notes: '',
        rating: 0,
        category_tags: [],
      })
    }
    setError(null)
  }, [supplier, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Namn krävs')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave({
        ...formData,
        rating: formData.rating || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara')
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !formData.category_tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        category_tags: [...prev.category_tags, tag],
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      category_tags: prev.category_tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? 'Redigera leverantör' : 'Lägg till leverantör'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Name and Org Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Företagsnamn *"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="AB Leverantör"
          />
          <Input
            label="Org.nummer"
            value={formData.org_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, org_number: e.target.value }))}
            placeholder="556123-4567"
          />
        </div>

        {/* Contact Person */}
        <Input
          label="Kontaktperson"
          value={formData.contact_person}
          onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
          placeholder="Anna Andersson"
        />

        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="E-post"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
            placeholder="offert@leverantor.se"
          />
          <Input
            label="Telefon"
            value={formData.contact_phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))}
            placeholder="08-123 456 78"
          />
        </div>

        {/* Address and City */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Adress"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Industrigatan 1"
          />
          <Input
            label="Ort"
            value={formData.city}
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="Stockholm"
          />
        </div>

        {/* Category Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Kategorier / Taggar
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.category_tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-slate-400 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Lägg till tagg (t.ex. radiatorer, pumpar)"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={addTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Tryck Enter eller klicka + för att lägga till
          </p>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Betyg
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    rating: prev.rating === star ? 0 : star,
                  }))
                }
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= formData.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-600 hover:text-yellow-400'
                  }`}
                />
              </button>
            ))}
            {formData.rating > 0 && (
              <span className="ml-2 text-sm text-slate-400">
                {formData.rating} av 5
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Anteckningar
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Egna anteckningar om leverantören..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button type="button" variant="ghost" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Sparar...' : supplier ? 'Spara ändringar' : 'Lägg till'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
