'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Specification } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { BookOpen, Trash2, Eye, CheckCircle } from 'lucide-react'

interface SpecificationCardProps {
  specification: Specification
  isActive?: boolean
  onToggleActive?: () => void
  onDelete?: () => void
}

export function SpecificationCard({
  specification,
  isActive,
  onToggleActive,
  onDelete,
}: SpecificationCardProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await fetch(`/api/specifications?id=${specification.id}`, {
        method: 'DELETE',
      })
      onDelete()
    } catch (error) {
      console.error('Error deleting specification:', error)
    } finally {
      setDeleting(false)
    }
  }

  // Get preview of the text (first 200 chars)
  const textPreview = specification.extracted_text
    ? specification.extracted_text.substring(0, 200) + '...'
    : 'Ingen textförhandsvisning tillgänglig'

  return (
    <>
      <Card
        className={`transition-all ${
          isActive
            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5'
            : ''
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                <BookOpen className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <CardTitle className="text-base">{specification.name}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Uppladdad {formatDate(specification.created_at)}
                </p>
              </div>
            </div>
            {isActive && (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <p className="text-xs text-slate-400 line-clamp-2 mb-4">{textPreview}</p>

          <div className="flex items-center gap-2">
            {onToggleActive && (
              <Button
                size="sm"
                variant={isActive ? 'primary' : 'secondary'}
                className={`flex-1 ${isActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={onToggleActive}
              >
                {isActive ? 'Aktiv för jämförelse' : 'Använd vid jämförelse'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              loading={deleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={specification.name}
        size="xl"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-[#1e2a36] p-4 rounded-lg">
            {specification.extracted_text || 'Ingen text tillgänglig'}
          </pre>
        </div>
      </Modal>
    </>
  )
}
