'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SupplierCard } from '@/components/suppliers/SupplierCard'
import { SupplierForm } from '@/components/suppliers/SupplierForm'
import { Supplier } from '@/lib/supabase'
import { Plus, Search, ArrowLeft, Users, Tag } from 'lucide-react'

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  // Get all unique tags
  const allTags = Array.from(
    new Set(suppliers.flatMap((s) => s.category_tags || []))
  ).sort()

  const fetchSuppliers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (selectedTag) params.set('tags', selectedTag)

      const response = await fetch(`/api/suppliers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedTag])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleSave = async (supplierData: Partial<Supplier>) => {
    const method = editingSupplier ? 'PUT' : 'POST'
    const body = editingSupplier
      ? { id: editingSupplier.id, ...supplierData }
      : supplierData

    const response = await fetch('/api/suppliers', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Kunde inte spara')
    }

    await fetchSuppliers()
    setEditingSupplier(null)
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/suppliers?id=${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingSupplier(null)
  }

  // Filter suppliers by search query (client-side for immediate feedback)
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.contact_person?.toLowerCase().includes(query) ||
      supplier.contact_email?.toLowerCase().includes(query) ||
      supplier.category_tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  })

  return (
    <div className="min-h-screen bg-[#0a0f14]">
      {/* Header */}
      <header className="bg-[#12181f] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-cyan-400" />
                  Leverantörer
                </h1>
                <p className="text-sm text-slate-400">
                  {suppliers.length} leverantörer registrerade
                </p>
              </div>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Lägg till leverantör
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search and filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök leverantör, kontaktperson, e-post..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-slate-500" />
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  !selectedTag
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                Alla
              </button>
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTag === tag
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {allTags.length > 10 && (
                <span className="text-sm text-slate-500">
                  +{allTags.length - 10} till
                </span>
              )}
            </div>
          )}
        </div>

        {/* Suppliers grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {searchQuery || selectedTag
                ? 'Inga leverantörer hittades'
                : 'Inga leverantörer än'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || selectedTag
                ? 'Försök med en annan sökning eller filter'
                : 'Börja med att lägga till din första leverantör'}
            </p>
            {!searchQuery && !selectedTag && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Lägg till leverantör
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onEdit={() => handleEdit(supplier)}
                onDelete={() => handleDelete(supplier.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Supplier Form Modal */}
      <SupplierForm
        open={showForm}
        onClose={handleCloseForm}
        onSave={handleSave}
        supplier={editingSupplier}
      />
    </div>
  )
}
