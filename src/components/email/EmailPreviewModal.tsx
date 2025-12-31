'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  Copy,
  Check,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Send,
} from 'lucide-react'
import { CategorySupplier } from '@/lib/supabase'

interface EmailPreviewModalProps {
  open: boolean
  onClose: () => void
  categoryId: string
  categorySuppliers: CategorySupplier[]
  deadline: string
  onMarkAsSent: (categorySupplierIds: string[]) => Promise<void>
}

interface GeneratedEmail {
  subject: string
  body: string
  recipient: {
    email: string
    name: string
    company: string
  }
}

export function EmailPreviewModal({
  open,
  onClose,
  categoryId,
  categorySuppliers,
  deadline,
  onMarkAsSent,
}: EmailPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [email, setEmail] = useState<GeneratedEmail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [markedAsSent, setMarkedAsSent] = useState<Set<string>>(new Set())
  const [markingSent, setMarkingSent] = useState(false)

  const pendingSuppliers = categorySuppliers.filter(
    (cs) => cs.status === 'pending' && cs.supplier
  )
  const currentSupplier = pendingSuppliers[currentIndex]

  useEffect(() => {
    if (open && currentSupplier) {
      generateEmail()
    }
  }, [open, currentIndex])

  useEffect(() => {
    if (open) {
      setCurrentIndex(0)
      setMarkedAsSent(new Set())
    }
  }, [open])

  const generateEmail = async () => {
    if (!currentSupplier?.supplier) return

    setLoading(true)
    setError(null)
    setEmail(null)

    try {
      const response = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          supplierId: currentSupplier.supplier_id,
          deadline,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte generera mail')
      }

      const data = await response.json()
      setEmail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  const handleMarkAsSent = async () => {
    if (!currentSupplier) return

    setMarkingSent(true)
    try {
      await onMarkAsSent([currentSupplier.id])
      setMarkedAsSent((prev) => new Set([...prev, currentSupplier.id]))

      // Move to next supplier if available
      if (currentIndex < pendingSuppliers.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      }
    } catch (err) {
      console.error('Error marking as sent:', err)
    } finally {
      setMarkingSent(false)
    }
  }

  const goToNext = () => {
    if (currentIndex < pendingSuppliers.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  if (pendingSuppliers.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Offertförfrågan">
        <div className="text-center py-8">
          <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            Alla leverantörer har redan fått förfrågan
          </p>
        </div>
      </Modal>
    )
  }

  const isMarkedSent = markedAsSent.has(currentSupplier?.id || '')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Offertförfrågan till ${currentSupplier?.supplier?.name || 'Leverantör'}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Navigation */}
        {pendingSuppliers.length > 1 && (
          <div className="flex items-center justify-between pb-4 border-b border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Föregående
            </Button>
            <span className="text-sm text-slate-400">
              {currentIndex + 1} av {pendingSuppliers.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === pendingSuppliers.length - 1}
            >
              Nästa
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-4" />
            <p className="text-slate-400">Genererar mail...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Email Content */}
        {email && !loading && (
          <div className="space-y-4">
            {/* Already sent indicator */}
            {isMarkedSent && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                <Check className="w-5 h-5" />
                <span>Markerad som skickad</span>
              </div>
            )}

            {/* Recipient */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Till:</p>
                  <p className="text-slate-200">{email.recipient.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(email.recipient.email || '', 'email')
                  }
                >
                  {copiedField === 'email' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Subject */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-1">Ämne:</p>
                  <p className="text-slate-200">{email.subject}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(email.subject, 'subject')}
                >
                  {copiedField === 'subject' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-slate-500">Meddelande:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(email.body, 'body')}
                >
                  {copiedField === 'body' ? (
                    <>
                      <Check className="w-4 h-4 text-green-400 mr-1" />
                      Kopierat!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Kopiera
                    </>
                  )}
                </Button>
              </div>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[300px] overflow-auto">
                {email.body}
              </pre>
            </div>

            {/* Copy All Button */}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                const fullEmail = `Till: ${email.recipient.email}\nÄmne: ${email.subject}\n\n${email.body}`
                copyToClipboard(fullEmail, 'all')
              }}
            >
              {copiedField === 'all' ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-400" />
                  Kopierat!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Kopiera allt
                </>
              )}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose}>
            Stäng
          </Button>
          {email && !isMarkedSent && (
            <Button onClick={handleMarkAsSent} disabled={markingSent}>
              {markingSent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Markerar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Markera som skickad
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
