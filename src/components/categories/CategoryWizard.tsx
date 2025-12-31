'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Specification, Supplier } from '@/lib/supabase'
import {
  Sparkles,
  FileText,
  Check,
  Loader2,
  ChevronDown,
  Tag,
  Users,
  AlertCircle,
} from 'lucide-react'

interface GeneratedCategory {
  name: string
  scope_description: string
  suggested_tags: string[]
  estimated_value_range?: string
  matched_suppliers?: Array<{ id: string; name: string }>
  selected?: boolean
}

interface CategoryWizardProps {
  open: boolean
  onClose: () => void
  projectId: string
  specifications: Specification[]
  onCategoriesCreated: () => void
}

export function CategoryWizard({
  open,
  onClose,
  projectId,
  specifications,
  onCategoriesCreated,
}: CategoryWizardProps) {
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<GeneratedCategory[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (open) {
      setCategories([])
      setError(null)
      setSelectedSpec(null)
    }
  }, [open])

  const handleGenerate = async () => {
    if (!selectedSpec) return

    setGenerating(true)
    setError(null)
    setCategories([])

    try {
      const response = await fetch('/api/categories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specificationId: selectedSpec }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte generera kategorier')
      }

      const data = await response.json()
      setCategories(
        data.categories.map((cat: GeneratedCategory) => ({
          ...cat,
          selected: true,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setGenerating(false)
    }
  }

  const toggleCategory = (index: number) => {
    setCategories((prev) =>
      prev.map((cat, i) =>
        i === index ? { ...cat, selected: !cat.selected } : cat
      )
    )
  }

  const handleCreate = async () => {
    const selectedCategories = categories.filter((cat) => cat.selected)
    if (selectedCategories.length === 0) return

    setCreating(true)
    setError(null)

    try {
      // Create each category
      for (const category of selectedCategories) {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            name: category.name,
            description: category.scope_description,
            scope_description: category.scope_description,
            source_specification_id: selectedSpec,
            status: 'draft',
          }),
        })

        if (!response.ok) {
          throw new Error(`Kunde inte skapa kategori: ${category.name}`)
        }

        const createdCategory = await response.json()

        // Link matched suppliers to category
        if (category.matched_suppliers && category.matched_suppliers.length > 0) {
          for (const supplier of category.matched_suppliers) {
            await fetch('/api/category-suppliers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category_id: createdCategory.id,
                supplier_id: supplier.id,
              }),
            })
          }
        }
      }

      onCategoriesCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skapa kategorier')
    } finally {
      setCreating(false)
    }
  }

  const selectedCount = categories.filter((cat) => cat.selected).length
  const selectedSpecName = specifications.find(
    (s) => s.id === selectedSpec
  )?.name

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Skapa kategorier från TB"
      size="xl"
    >
      <div className="space-y-6">
        {/* Step 1: Select Specification */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Välj teknisk beskrivning
          </label>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-left text-slate-200 hover:border-slate-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                {selectedSpecName || 'Välj en specifikation...'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                {specifications.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    Inga specifikationer uppladdade
                  </div>
                ) : (
                  specifications.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() => {
                        setSelectedSpec(spec.id)
                        setShowDropdown(false)
                        setCategories([])
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                        selectedSpec === spec.id
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'text-slate-300'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      {spec.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        {selectedSpec && categories.length === 0 && !generating && (
          <Button onClick={handleGenerate} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Analysera och föreslå kategorier
          </Button>
        )}

        {/* Loading State */}
        {generating && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-4" />
            <p>Analyserar teknisk beskrivning...</p>
            <p className="text-sm text-slate-500 mt-1">
              Detta kan ta upp till 30 sekunder
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Generated Categories */}
        {categories.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">
                Föreslagna kategorier ({categories.length})
              </h3>
              <button
                onClick={() =>
                  setCategories((prev) =>
                    prev.map((cat) => ({ ...cat, selected: true }))
                  )
                }
                className="text-xs text-cyan-400 hover:underline"
              >
                Välj alla
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
              {categories.map((category, index) => (
                <div
                  key={index}
                  onClick={() => toggleCategory(index)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    category.selected
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-slate-800/50 border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        category.selected
                          ? 'bg-cyan-500 border-cyan-500'
                          : 'border-slate-600'
                      }`}
                    >
                      {category.selected && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-200">
                        {category.name}
                      </h4>
                      <p className="text-sm text-slate-400 mt-1">
                        {category.scope_description}
                      </p>

                      {/* Tags */}
                      {category.suggested_tags &&
                        category.suggested_tags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Tag className="w-3 h-3 text-slate-500" />
                            <div className="flex flex-wrap gap-1">
                              {category.suggested_tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="default"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Matched Suppliers */}
                      {category.matched_suppliers &&
                        category.matched_suppliers.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Users className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400">
                              {category.matched_suppliers
                                .map((s) => s.name)
                                .join(', ')}
                            </span>
                          </div>
                        )}

                      {category.matched_suppliers?.length === 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-500">
                            Inga matchande leverantörer
                          </span>
                        </div>
                      )}

                      {/* Estimated Value */}
                      {category.estimated_value_range && (
                        <p className="text-xs text-slate-500 mt-2">
                          Uppskattat värde: {category.estimated_value_range}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose}>
            Avbryt
          </Button>
          {categories.length > 0 && (
            <Button
              onClick={handleCreate}
              disabled={selectedCount === 0 || creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Skapar...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Skapa {selectedCount} kategori{selectedCount !== 1 ? 'er' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
