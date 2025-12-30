'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { QuoteUploader } from '@/components/quotes/QuoteUploader'
import { QuoteCard } from '@/components/quotes/QuoteCard'
import { SpecificationUploader } from '@/components/specifications/SpecificationUploader'
import { SpecificationCard } from '@/components/specifications/SpecificationCard'
import { ComparisonView } from '@/components/analysis/ComparisonView'
import { Project, QuoteCategory, Quote, Specification } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  GitCompare,
  FileText,
  Loader2,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
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
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [activeSpecId, setActiveSpecId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [showSpecUploader, setShowSpecUploader] = useState(false)
  const [showSpecSection, setShowSpecSection] = useState(true)
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<Record<string, unknown> | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  // Batch analysis state
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

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

      // Fetch specifications
      const specsRes = await fetch(`/api/specifications?categoryId=${categoryId}`)
      if (specsRes.ok) {
        const specs = await specsRes.json()
        setSpecifications(specs)
        // Auto-select first specification if exists
        if (specs.length > 0 && !activeSpecId) {
          setActiveSpecId(specs[0].id)
        }
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
      // Get active specification text if any
      const activeSpec = specifications.find((s) => s.id === activeSpecId)

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          quoteIds: selectedQuotes,
          specificationText: activeSpec?.extracted_text || undefined,
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

  // Batch analyze pending quotes
  const handleAnalyzeAll = async () => {
    const pendingQuoteIds = quotes
      .filter((q) => q.status === 'pending')
      .map((q) => q.id)

    if (pendingQuoteIds.length === 0) return

    setAnalyzing(true)
    setAnalysisProgress(null)

    try {
      const res = await fetch('/api/quotes/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteIds: pendingQuoteIds }),
      })

      if (res.ok) {
        const result = await res.json()
        setAnalysisProgress(result)
        fetchData()
      } else {
        const error = await res.json()
        setAnalysisProgress({
          success: 0,
          failed: pendingQuoteIds.length,
          errors: [error.error || 'Kunde inte analysera offerterna'],
        })
      }
    } catch (error) {
      console.error('Error analyzing quotes:', error)
      setAnalysisProgress({
        success: 0,
        failed: pendingQuoteIds.length,
        errors: ['Nätverksfel - kontrollera din anslutning'],
      })
    } finally {
      setAnalyzing(false)
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

  // Separate quotes by status
  const pendingQuotes = quotes.filter((q) => q.status === 'pending')
  const analyzedQuotes = quotes.filter((q) => q.status !== 'pending')

  // Calculate totals (only for analyzed quotes)
  const quotesWithAmount = analyzedQuotes.filter((q) => q.total_amount)
  const avgValue = quotesWithAmount.length > 0
    ? quotesWithAmount.reduce((sum, q) => sum + (q.total_amount || 0), 0) / quotesWithAmount.length
    : 0

  // Get active specification
  const activeSpec = specifications.find((s) => s.id === activeSpecId)

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
              {/* Analyze button for pending quotes */}
              {pendingQuotes.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleAnalyzeAll}
                  loading={analyzing}
                  className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analysera ({pendingQuotes.length})
                </Button>
              )}

              {/* Compare button */}
              {selectedQuotes.length >= 2 && (
                <Button onClick={handleCompare} loading={comparing}>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Jämför ({selectedQuotes.length})
                  {activeSpec && (
                    <span className="ml-1 text-xs opacity-70">+ beskr.</span>
                  )}
                </Button>
              )}

              <Button onClick={() => setShowUploader(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ladda upp offerter
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Analysis Progress Banner */}
      {analysisProgress && (
        <div className={`border-b ${
          analysisProgress.failed > 0 && analysisProgress.success === 0
            ? 'bg-red-500/10 border-red-500/30'
            : analysisProgress.failed > 0
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-start gap-3">
              {analysisProgress.failed > 0 && analysisProgress.success === 0 ? (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              ) : analysisProgress.failed > 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  analysisProgress.failed > 0 && analysisProgress.success === 0
                    ? 'text-red-400'
                    : analysisProgress.failed > 0
                    ? 'text-amber-400'
                    : 'text-green-400'
                }`}>
                  {analysisProgress.success > 0 && `${analysisProgress.success} offert${analysisProgress.success > 1 ? 'er' : ''} analyserade`}
                  {analysisProgress.success > 0 && analysisProgress.failed > 0 && ', '}
                  {analysisProgress.failed > 0 && `${analysisProgress.failed} misslyckade`}
                </p>
                {analysisProgress.errors.length > 0 && (
                  <ul className="text-xs text-slate-400 mt-1">
                    {analysisProgress.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setAnalysisProgress(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {quotesWithAmount.length > 0 && (
        <div className="border-b border-slate-800 bg-[#12181f]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Analyserade</p>
                <p className="text-xl font-bold text-slate-100">{analyzedQuotes.length}</p>
              </div>
              {pendingQuotes.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Väntar</p>
                  <p className="text-xl font-bold text-amber-400">{pendingQuotes.length}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Lägsta pris</p>
                <p className="text-xl font-bold text-green-400 font-mono">
                  {formatPrice(Math.min(...quotesWithAmount.map((q) => q.total_amount!)))}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Högsta pris</p>
                <p className="text-xl font-bold text-red-400 font-mono">
                  {formatPrice(Math.max(...quotesWithAmount.map((q) => q.total_amount!)))}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Snittpris</p>
                <p className="text-xl font-bold text-slate-300 font-mono">{formatPrice(avgValue)}</p>
              </div>
              {activeSpec && (
                <div className="ml-auto flex items-center gap-2 text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">{activeSpec.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Specifications Section */}
        <div className="mb-8">
          <button
            onClick={() => setShowSpecSection(!showSpecSection)}
            className="flex items-center gap-2 text-slate-300 hover:text-slate-100 mb-4"
          >
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">Tekniska beskrivningar / Föreskrifter</span>
            <span className="text-xs text-slate-500">({specifications.length})</span>
            {showSpecSection ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </button>

          {showSpecSection && (
            <div className="space-y-4">
              {specifications.length === 0 ? (
                <Card className="border-dashed border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="py-8 text-center">
                    <BookOpen className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-slate-300 mb-2">
                      Ingen teknisk beskrivning uppladdad
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Ladda upp en rambeskrivning för att jämföra offerter mot föreskrivet material
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30"
                      onClick={() => setShowSpecUploader(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ladda upp beskrivning
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {specifications.map((spec) => (
                    <SpecificationCard
                      key={spec.id}
                      specification={spec}
                      isActive={spec.id === activeSpecId}
                      onToggleActive={() =>
                        setActiveSpecId(spec.id === activeSpecId ? null : spec.id)
                      }
                      onDelete={fetchData}
                    />
                  ))}
                  <Card
                    hover
                    className="border-dashed border-emerald-500/30 cursor-pointer hover:bg-emerald-500/5"
                    onClick={() => setShowSpecUploader(true)}
                  >
                    <CardContent className="py-8 flex flex-col items-center justify-center text-emerald-400">
                      <Plus className="w-8 h-8 mb-2" />
                      <span className="text-sm">Lägg till beskrivning</span>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSpec && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm text-emerald-400">
                    <strong>{activeSpec.name}</strong> används vid jämförelse - offerter kontrolleras mot föreskrifter
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected quotes banner */}
        {selectedQuotes.length > 0 && (
          <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-between">
            <p className="text-sm text-cyan-400">
              {selectedQuotes.length} offert{selectedQuotes.length > 1 ? 'er' : ''} vald
              {selectedQuotes.length > 1 ? 'a' : ''}
              {activeSpec && (
                <span className="ml-2 text-emerald-400">
                  (jämförs mot {activeSpec.name})
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSelectedQuotes([])}>
              <X className="w-4 h-4 mr-1" />
              Rensa urval
            </Button>
          </div>
        )}

        {/* Quotes */}
        {quotes.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">Inga offerter ännu</h3>
              <p className="text-slate-500 mb-6">
                Ladda upp PDF eller Excel-filer med offerter
              </p>
              <Button onClick={() => setShowUploader(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ladda upp offerter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Quotes Section */}
            {pendingQuotes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Väntar på analys ({pendingQuotes.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      selected={selectedQuotes.includes(quote.id)}
                      onSelect={() => handleQuoteSelect(quote.id)}
                      isPending
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Analyzed Quotes Section */}
            {analyzedQuotes.length > 0 && (
              <div>
                {pendingQuotes.length > 0 && (
                  <h2 className="text-lg font-semibold text-slate-300 mb-4">
                    Analyserade offerter ({analyzedQuotes.length})
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {analyzedQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      selected={selectedQuotes.includes(quote.id)}
                      onSelect={() => handleQuoteSelect(quote.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <Modal
        open={showUploader}
        onClose={() => setShowUploader(false)}
        title="Ladda upp offerter"
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

      {/* Specification Upload Modal */}
      <Modal
        open={showSpecUploader}
        onClose={() => setShowSpecUploader(false)}
        title="Ladda upp teknisk beskrivning"
        size="lg"
      >
        <SpecificationUploader
          projectId={id}
          categoryId={categoryId}
          onUploadComplete={() => {
            setShowSpecUploader(false)
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
