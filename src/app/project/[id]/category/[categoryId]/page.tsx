'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { QuoteUploader } from '@/components/quotes/QuoteUploader'
import { QuoteCard } from '@/components/quotes/QuoteCard'
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
  Trash2,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string; categoryId: string }>
}

interface SavedComparison {
  id: string
  category_id: string
  specification_id: string | null
  quote_ids: string[]
  result: Record<string, unknown>
  created_at: string
  updated_at: string
}

export default function CategoryPage({ params }: PageProps) {
  const { id, categoryId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [category, setCategory] = useState<QuoteCategory | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [activeSpecId, setActiveSpecId] = useState<string | null>(null)
  const [showSpecSelector, setShowSpecSelector] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<Record<string, unknown> | null>(null)
  const [savedComparison, setSavedComparison] = useState<SavedComparison | null>(null)
  const [deletingComparison, setDeletingComparison] = useState(false)

  // Batch analysis state
  const [analyzing, setAnalyzing] = useState(false)
  const [reanalyzingQuoteId, setReanalyzingQuoteId] = useState<string | null>(null)
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

      // Fetch project-level specifications
      const specsRes = await fetch(`/api/specifications?projectId=${id}`)
      if (specsRes.ok) {
        const specs = await specsRes.json()
        setSpecifications(specs)
        // Auto-select first specification if exists and none selected
        if (specs.length > 0 && !activeSpecId) {
          setActiveSpecId(specs[0].id)
        }
      }

      // Fetch saved comparison for this category
      const comparisonRes = await fetch(`/api/comparisons?categoryId=${categoryId}`)
      if (comparisonRes.ok) {
        const comparison = await comparisonRes.json()
        if (comparison) {
          setSavedComparison(comparison)
          setComparisonResult(comparison.result)
          // Pre-select the quotes that were used in the comparison
          if (comparison.quote_ids) {
            setSelectedQuotes(comparison.quote_ids)
          }
          // Set the specification that was used
          if (comparison.specification_id) {
            setActiveSpecId(comparison.specification_id)
          }
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

        // Save comparison to database
        const saveRes = await fetch('/api/comparisons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: categoryId,
            specification_id: activeSpecId || null,
            quote_ids: selectedQuotes,
            result,
          }),
        })

        if (saveRes.ok) {
          const savedData = await saveRes.json()
          setSavedComparison(savedData)
        }
      }
    } catch (error) {
      console.error('Error comparing quotes:', error)
    } finally {
      setComparing(false)
    }
  }

  const handleDeleteComparison = async () => {
    if (!confirm('Vill du ta bort jämförelsen?')) return

    setDeletingComparison(true)
    try {
      const res = await fetch(`/api/comparisons?categoryId=${categoryId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSavedComparison(null)
        setComparisonResult(null)
      }
    } catch (error) {
      console.error('Error deleting comparison:', error)
    } finally {
      setDeletingComparison(false)
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

  // Delete a quote
  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotes?id=${quoteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Remove from selected if it was selected
        setSelectedQuotes((prev) => prev.filter((id) => id !== quoteId))
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Kunde inte ta bort offerten')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Nätverksfel - kunde inte ta bort offerten')
    }
  }

  // Select a quote as winner
  const handleSelectWinner = async (quoteId: string) => {
    try {
      // Toggle: if already selected, deselect
      const newSelectedId = category?.selected_quote_id === quoteId ? null : quoteId

      const res = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: categoryId,
          selected_quote_id: newSelectedId,
        }),
      })

      if (res.ok) {
        const updatedCategory = await res.json()
        setCategory(updatedCategory)
      } else {
        const error = await res.json()
        alert(error.error || 'Kunde inte välja offert')
      }
    } catch (error) {
      console.error('Error selecting winner:', error)
      alert('Nätverksfel - kunde inte välja offert')
    }
  }

  // Re-analyze a single quote
  const handleReanalyze = async (quoteId: string) => {
    setReanalyzingQuoteId(quoteId)
    setAnalysisProgress(null)

    try {
      const res = await fetch('/api/quotes/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteIds: [quoteId], reanalyze: true }),
      })

      if (res.ok) {
        const result = await res.json()
        setAnalysisProgress(result)
        fetchData()
      } else {
        const error = await res.json()
        setAnalysisProgress({
          success: 0,
          failed: 1,
          errors: [error.error || 'Kunde inte analysera offerten'],
        })
      }
    } catch (error) {
      console.error('Error reanalyzing quote:', error)
      setAnalysisProgress({
        success: 0,
        failed: 1,
        errors: ['Nätverksfel - kontrollera din anslutning'],
      })
    } finally {
      setReanalyzingQuoteId(null)
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
        <div className="max-w-[1600px] mx-auto px-6 py-4">
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
                  {comparisonResult ? 'Jämför igen' : 'Jämför'} ({selectedQuotes.length})
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
          <div className="max-w-[1600px] mx-auto px-6 py-4">
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
          <div className="max-w-[1600px] mx-auto px-6 py-4">
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
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Quotes */}
          <div className={`${comparisonResult ? 'lg:w-1/2' : 'w-full'} transition-all duration-300`}>
            {/* Specification selector (if specs exist at project level) */}
            {specifications.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowSpecSelector(!showSpecSelector)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>
                    {activeSpec
                      ? `Jämför mot: ${activeSpec.name}`
                      : 'Välj teknisk beskrivning för jämförelse'
                    }
                  </span>
                  {showSpecSelector ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showSpecSelector && (
                  <div className="mt-3 p-4 bg-[#12181f] border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-500 mb-3">
                      Välj vilken teknisk beskrivning som ska användas vid offertjämförelse:
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setActiveSpecId(null)
                          setShowSpecSelector(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          !activeSpecId
                            ? 'bg-slate-700 text-slate-100'
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Ingen beskrivning (jämför endast offerter)
                      </button>
                      {specifications.map((spec) => (
                        <button
                          key={spec.id}
                          onClick={() => {
                            setActiveSpecId(spec.id)
                            setShowSpecSelector(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                            activeSpecId === spec.id
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          {spec.name}
                          {activeSpecId === spec.id && (
                            <CheckCircle className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      <a
                        href={`/project/${id}`}
                        className="text-emerald-400 hover:underline"
                      >
                        Hantera beskrivningar på projektnivå →
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Active spec indicator */}
            {activeSpec && !showSpecSelector && (
              <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <p className="text-sm text-emerald-400">
                  Offerter jämförs mot <strong>{activeSpec.name}</strong>
                </p>
                <button
                  onClick={() => setShowSpecSelector(true)}
                  className="ml-auto text-xs text-emerald-400 hover:underline"
                >
                  Ändra
                </button>
              </div>
            )}

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
                    <div className={`grid gap-4 ${comparisonResult ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                      {pendingQuotes.map((quote) => (
                        <QuoteCard
                          key={quote.id}
                          quote={quote}
                          selected={selectedQuotes.includes(quote.id)}
                          onSelect={() => handleQuoteSelect(quote.id)}
                          isPending
                          onDelete={() => handleDeleteQuote(quote.id)}
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
                    <div className={`grid gap-4 ${comparisonResult ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                      {analyzedQuotes.map((quote) => (
                        <QuoteCard
                          key={quote.id}
                          quote={quote}
                          selected={selectedQuotes.includes(quote.id)}
                          onSelect={() => handleQuoteSelect(quote.id)}
                          onReanalyze={() => handleReanalyze(quote.id)}
                          isReanalyzing={reanalyzingQuoteId === quote.id}
                          onDelete={() => handleDeleteQuote(quote.id)}
                          isWinner={category?.selected_quote_id === quote.id}
                          onSelectWinner={() => handleSelectWinner(quote.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Comparison */}
          {comparisonResult && (
            <div className="lg:w-1/2">
              <div className="sticky top-24">
                <Card className="bg-[#12181f] border-slate-700">
                  <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GitCompare className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-lg font-semibold text-slate-100">Offertjämförelse</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {savedComparison && (
                        <span className="text-xs text-slate-500">
                          Sparad {new Date(savedComparison.updated_at).toLocaleDateString('sv-SE')}
                        </span>
                      )}
                      <button
                        onClick={handleDeleteComparison}
                        disabled={deletingComparison}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                        title="Ta bort jämförelse"
                      >
                        {deletingComparison ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4">
                    <ComparisonView comparison={comparisonResult as never} />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Show prompt to create comparison if quotes exist but no comparison yet */}
        {!comparisonResult && analyzedQuotes.length >= 2 && selectedQuotes.length < 2 && (
          <div className="mt-8 p-6 bg-[#12181f] border border-slate-700 rounded-lg text-center">
            <GitCompare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">Jämför offerter</h3>
            <p className="text-slate-500 mb-4">
              Välj minst 2 offerter för att skapa en AI-driven jämförelseanalys
            </p>
            <p className="text-sm text-slate-400">
              Markera offerter genom att klicka på kryssrutorna ovan
            </p>
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
    </div>
  )
}
