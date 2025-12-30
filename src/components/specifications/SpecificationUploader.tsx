'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, BookOpen } from 'lucide-react'
import { uploadToStorage } from '@/lib/storage'

interface SpecificationUploaderProps {
  projectId: string
  categoryId: string
  onUploadComplete: () => void
}

export function SpecificationUploader({ projectId, categoryId, onUploadComplete }: SpecificationUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle')
  const [error, setError] = useState('')

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
    // Set default name from filename
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''))
    }
    setError('')
  }

  const uploadSpecification = async () => {
    if (!file || !name.trim()) {
      setError('Namn och fil krävs')
      return
    }

    setStatus('uploading')
    setError('')

    try {
      // Step 1: Upload file to Supabase Storage (bypasses Vercel's 4.5MB limit)
      const { path: filePath, error: uploadError } = await uploadToStorage(file)

      if (uploadError || !filePath) {
        throw new Error(uploadError || 'Kunde inte ladda upp filen')
      }

      // Step 2: Process the file from storage
      const processRes = await fetch('/api/files/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filePath,
          fileName: file.name,
        }),
      })

      if (!processRes.ok) {
        const data = await processRes.json()
        throw new Error(data.error || 'Kunde inte tolka filen')
      }

      const { extractedText } = await processRes.json()

      // Step 3: Save specification
      const specRes = await fetch('/api/specifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          category_id: categoryId,
          name: name.trim(),
          extracted_text: extractedText,
          file_path: filePath,
        }),
      })

      if (!specRes.ok) {
        const data = await specRes.json()
        throw new Error(data.error || 'Kunde inte spara specifikation')
      }

      setStatus('complete')
      setTimeout(() => {
        setFile(null)
        setName('')
        setStatus('idle')
        onUploadComplete()
      }, 1000)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Något gick fel')
    }
  }

  const reset = () => {
    setFile(null)
    setName('')
    setStatus('idle')
    setError('')
  }

  return (
    <Card>
      <CardContent className="p-6">
        {!file ? (
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
              ${dragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-600'}
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

            <BookOpen className="w-10 h-10 text-emerald-500/70 mx-auto mb-3" />
            <h3 className="text-base font-medium text-slate-200 mb-1">
              Ladda upp teknisk beskrivning
            </h3>
            <p className="text-sm text-slate-400 mb-2">
              Rambeskrivning, föreskrift eller specifikation
            </p>
            <p className="text-xs text-slate-500">PDF eller Excel</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <FileText className="w-10 h-10 text-emerald-400" />
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

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Namn på beskrivning
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="T.ex. Rambeskrivning VVS, Kylbeskrivning..."
                disabled={status !== 'idle'}
              />
            </div>

            {/* Status */}
            {status === 'uploading' && (
              <div className="flex items-center gap-3 text-sm text-emerald-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Laddar upp och tolkar...</span>
              </div>
            )}

            {status === 'complete' && (
              <div className="flex items-center gap-3 text-sm text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Beskrivning sparad!</span>
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
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={uploadSpecification}
                  disabled={!name.trim()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Spara beskrivning
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
