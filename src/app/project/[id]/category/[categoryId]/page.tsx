'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { QuoteUploader } from '@/components/quotes/QuoteUploader'
import { QuoteCard } from '@/components/quotes/QuoteCard'
import { ComparisonView } from '@/components/analysis/ComparisonView'
import { Project, QuoteCategory, Quote } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  GitCompare,
  FileText,
  Loader2,
  X,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string; categoryId: string }>
}

export default function CategoryPage({ params }: PageProps) {
  const { id, categoryId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [category, setCategory] = useState<QuoteCategory | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<Record<string, unknown> | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id, categoryId])

  const fetchData = async () => {
    try {
      // Fetch project
      const projectRes = await fetch('/api/projects')
      if (projectRes.ok) {
        const projects = await projectRes.json()
        setProject(projects.find((p: Project) => p.id === id) || null)
      }

      // Fetch category
      const categoryRes = await fetch(`/api/categories?projectId=${id}`)
      if (categoryRes.ok) {
        const categories = await categoryRes.json()
        setCategory(categories.find((c: QuoteCategory) => c.id === categoryId) || null)
      }

      // Fetch quotes
      const quotesRes = await fetch(`/api/quotes?categoryId=${categoryId}`)
      if (quotesRes.ok) {
        setQuotes(await quotesRes.json())
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuoteSelect = (quoteId: string) => {
    setSelectedQuotes((prev) =>
      prev.includes(quoteId) ? prev.filter((id) => id !== quoteId) : [...prev, quoteId]
    )
  }

  const handleCompare = async () => {
    if (selectedQuotes.length < 2) return

    setComparing(true)
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          quoteIds: selectedQuotes,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setComparisonResult(result)
        setShowComparison(true)
      }
    } catch (error) {
      console.error('Error comparing quotes:', error)
    } finally {
      setComparing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!project || !category) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center">
        <Card className="text-center py-16 px-8">
          <CardContent>
            <h3 className="text-lg font-medium text-slate-300 mb-4">
              Kategori hittades inte
            </h3>
            <Button onClick={() => router.push('/dashboard')}>Tillbaka till projekt</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate totals
  const totalValue = quotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)
  const avgValue = quotes.length > 0 ? totalValue / quotes.length : 0

  return (
    <div className="min-h-screen bg-[#0a0f14]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0a0f14]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/project/${id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {project.name}
          </Button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{category.name}</h1>
              {category.description && (
                <p className="text-sm text-slate-400 mt-1">{category.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {selectedQuotes.length >= 2 && (
                <Button onClick={handleCompare} loading={comparing}>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Jämför ({selectedQuotes.length})
                </Button>
              )}
              <Button onClick={() => setShowUploader(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ladda upp offert
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {quotes.length > 0 && (
        <div className="border-b border-slate-800 bg-[#12181f]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Antal offerter</p>
                <p className="text-xl font-bold text-slate-100">{quotes.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Lägsta pris</p>
                <p className="text-xl font-bold text-green-400 font-mono">
                  {formatPrice(Math.min(...quotes.filter((q) => q.total_amount).map((q) => q.total_amount!)))}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Högsta pris</p>
                <p className="text-xl font-bold text-red-400 font-mono">
                  {formatPrice(Math.max(...quotes.filter((q) => q.total_amount).map((q) => q.total_amount!)))}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Snittpris</p>
                <p className="text-xl font-bold text-slate-300 font-mono">{formatPrice(avgValue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {selectedQuotes.length > 0 && (
          <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-between">
            <p className="text-sm text-cyan-400">
              {selectedQuotes.length} offert{selectedQuotes.length > 1 ? 'er' : ''} vald
              {selectedQuotes.length > 1 ? 'a' : ''}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSelectedQuotes([])}>
              <X className="w-4 h-4 mr-1" />
              Rensa urval
            </Button>
          </div>
        )}

        {quotes.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">Inga offerter ännu</h3>
              <p className="text-slate-500 mb-6">
                Ladda upp PDF eller Excel-filer med offerter för AI-analys
              </p>
              <Button onClick={() => setShowUploader(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ladda upp offert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                selected={selectedQuotes.includes(quote.id)}
                onSelect={() => handleQuoteSelect(quote.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <Modal
        open={showUploader}
        onClose={() => setShowUploader(false)}
        title="Ladda upp offert"
        size="lg"
      >
        <QuoteUploader
          categoryId={categoryId}
          onUploadComplete={() => {
            setShowUploader(false)
            fetchData()
          }}
        />
      </Modal>

      {/* Comparison Modal */}
      <Modal
        open={showComparison}
        onClose={() => setShowComparison(false)}
        title="Offertjämförelse"
        size="xl"
      >
        {comparisonResult ? (
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <ComparisonView comparison={comparisonResult as never} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        )}
      </Modal>
    </div>
  )
}
