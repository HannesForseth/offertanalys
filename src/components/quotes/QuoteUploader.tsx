'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface QuoteUploaderProps {
  categoryId: string
  onUploadComplete: () => void
}

interface FileWithStatus {
  file: File
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

export function QuoteUploader({ categoryId, onUploadComplete }: QuoteUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)

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

    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (selectedFiles: File[]) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]

    const validFiles = selectedFiles.filter((file) => validTypes.includes(file.type))
    const invalidCount = selectedFiles.length - validFiles.length

    if (invalidCount > 0) {
      console.warn(`${invalidCount} fil(er) ignorerades - endast PDF och Excel stöds`)
    }

    const newFiles: FileWithStatus[] = validFiles.map((file) => ({
      file,
      status: 'pending',
    }))

    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAllFiles = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    let successCount = 0

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i]
      if (fileItem.status === 'complete') continue

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      )

      try {
        // Step 1: Upload and parse file
        const formData = new FormData()
        formData.append('file', fileItem.file)

        const uploadRes = await fetch('/api/quotes/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const data = await uploadRes.json()
          throw new Error(data.error || 'Kunde inte ladda upp filen')
        }

        const { extractedText } = await uploadRes.json()

        // Step 2: Save to database WITHOUT AI analysis (status: pending)
        const quoteRes = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: categoryId,
            supplier_name: fileItem.file.name.replace(/\.[^/.]+$/, ''), // Filename without extension
            extracted_text: extractedText,
            status: 'pending', // Mark as pending for later analysis
          }),
        })

        if (!quoteRes.ok) {
          const data = await quoteRes.json()
          throw new Error(data.error || 'Kunde inte spara offerten')
        }

        // Update status to complete
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'complete' } : f))
        )
        successCount++
      } catch (err) {
        // Update status to error
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Något gick fel' }
              : f
          )
        )
      }
    }

    setIsUploading(false)

    // If all files uploaded successfully, close after delay
    if (successCount === files.length) {
      setTimeout(() => {
        setFiles([])
        onUploadComplete()
      }, 1000)
    }
  }

  const completedCount = files.filter((f) => f.status === 'complete').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const pendingCount = files.filter((f) => f.status === 'pending').length

  return (
    <Card className={dragActive ? 'border-cyan-500 bg-cyan-500/5' : ''}>
      <CardContent className="p-6">
        {/* Drop Zone - Always visible when not uploading */}
        {!isUploading && (
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-6 text-center transition-colors mb-4
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
              multiple
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-medium text-slate-200 mb-1">
              Dra och släpp offertfiler här
            </h3>
            <p className="text-sm text-slate-400 mb-2">
              eller klicka för att välja filer
            </p>
            <p className="text-xs text-slate-500">PDF eller Excel (flera filer stöds)</p>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">
                {files.length} fil{files.length > 1 ? 'er' : ''} valda
              </p>
              {completedCount > 0 && (
                <p className="text-sm text-green-400">
                  {completedCount} uppladdade
                </p>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((fileItem, index) => (
                <div
                  key={`${fileItem.file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-[#1e2a36] rounded-lg"
                >
                  <FileText className={`w-8 h-8 ${
                    fileItem.status === 'complete' ? 'text-green-400' :
                    fileItem.status === 'error' ? 'text-red-400' :
                    fileItem.status === 'uploading' ? 'text-cyan-400' :
                    'text-slate-400'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {fileItem.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {fileItem.error && (
                      <p className="text-xs text-red-400 mt-1">{fileItem.error}</p>
                    )}
                  </div>

                  {fileItem.status === 'pending' && !isUploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {fileItem.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  )}

                  {fileItem.status === 'complete' && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}

                  {fileItem.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            {!isUploading && pendingCount > 0 && (
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setFiles([])}
                >
                  Rensa alla
                </Button>
                <Button className="flex-1" onClick={uploadAllFiles}>
                  <Upload className="w-4 h-4 mr-2" />
                  Ladda upp {pendingCount} fil{pendingCount > 1 ? 'er' : ''}
                </Button>
              </div>
            )}

            {isUploading && (
              <div className="flex items-center justify-center gap-3 py-3 text-cyan-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Laddar upp filer...</span>
              </div>
            )}

            {!isUploading && completedCount > 0 && pendingCount === 0 && errorCount === 0 && (
              <div className="flex items-center justify-center gap-2 py-3 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Alla filer uppladdade!</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
