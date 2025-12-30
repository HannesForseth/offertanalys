'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface QuoteUploaderProps {
  categoryId: string
  onUploadComplete: () => void
}

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'saving' | 'complete' | 'error'

export function QuoteUploader({ categoryId, onUploadComplete }: QuoteUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (selectedFile: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]

    if (!validTypes.includes(selectedFile.type)) {
      setError('Endast PDF och Excel-filer stöds')
      return
    }

    setFile(selectedFile)
    setError('')
  }

  const processFile = async () => {
    if (!file) return

    setStatus('uploading')
    setProgress('Laddar upp fil...')
    setError('')

    try {
      // Step 1: Upload and parse file
      setStatus('parsing')
      setProgress('Tolkar filinnehåll...')

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/quotes/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error || 'Kunde inte ladda upp filen')
      }

      const { extractedText } = await uploadRes.json()

      // Step 2: AI Analysis
      setStatus('analyzing')
      setProgress('AI analyserar offerten...')

      const analyzeRes = await fetch('/api/quotes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText }),
      })

      if (!analyzeRes.ok) {
        const data = await analyzeRes.json()
        throw new Error(data.error || 'Kunde inte analysera offerten')
      }

      const analysis = await analyzeRes.json()

      // Step 3: Save to database
      setStatus('saving')
      setProgress('Sparar offert...')

      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          supplier_name: analysis.supplier?.name || 'Okänd leverantör',
          quote_number: analysis.quote_info?.quote_number,
          quote_date: analysis.quote_info?.date,
          valid_until: analysis.quote_info?.valid_until,
          contact_person: analysis.supplier?.contact_person,
          contact_email: analysis.supplier?.email,
          contact_phone: analysis.supplier?.phone,
          total_amount: analysis.totals?.total,
          payment_terms: analysis.terms?.payment,
          delivery_terms: analysis.terms?.delivery,
          warranty_period: analysis.terms?.warranty,
          extracted_text: extractedText,
          ai_summary: `${analysis.supplier?.name || 'Offert'} - ${analysis.items?.length || 0} artiklar`,
          ai_analysis: analysis,
          items: analysis.items,
        }),
      })

      if (!quoteRes.ok) {
        const data = await quoteRes.json()
        throw new Error(data.error || 'Kunde inte spara offerten')
      }

      setStatus('complete')
      setProgress('Offert uppladdad!')

      setTimeout(() => {
        setFile(null)
        setStatus('idle')
        setProgress('')
        onUploadComplete()
      }, 1500)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Något gick fel')
    }
  }

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setProgress('')
    setError('')
  }

  return (
    <Card className={dragActive ? 'border-cyan-500 bg-cyan-500/5' : ''}>
      <CardContent className="p-6">
        {!file ? (
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${dragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-700 hover:border-slate-600'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.xlsx,.xls"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-200 mb-2">
              Dra och släpp offertfil här
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              eller klicka för att välja fil
            </p>
            <p className="text-xs text-slate-500">PDF eller Excel (max 10MB)</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center gap-4 p-4 bg-[#1e2a36] rounded-lg">
              <FileText className="w-10 h-10 text-cyan-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 truncate">{file.name}</p>
                <p className="text-sm text-slate-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {status === 'idle' && (
                <button
                  onClick={reset}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress/Status */}
            {status !== 'idle' && status !== 'complete' && status !== 'error' && (
              <div className="flex items-center gap-3 text-sm text-cyan-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{progress}</span>
              </div>
            )}

            {status === 'complete' && (
              <div className="flex items-center gap-3 text-sm text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>{progress}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 text-sm text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            {(status === 'idle' || status === 'error') && (
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={reset}>
                  Avbryt
                </Button>
                <Button className="flex-1" onClick={processFile}>
                  <Upload className="w-4 h-4 mr-2" />
                  Ladda upp & analysera
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
