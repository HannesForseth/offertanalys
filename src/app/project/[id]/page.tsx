'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SpecificationUploader } from '@/components/specifications/SpecificationUploader'
import { SpecificationCard } from '@/components/specifications/SpecificationCard'
import { Project, QuoteCategory, Specification, Quote, ProjectTodo } from '@/lib/supabase'
import { formatDateShort, formatPrice } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Layers,
  FileText,
  Building2,
  MapPin,
  Calendar,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Trophy,
  CheckCircle2,
  Circle,
  Trash2,
  ListTodo,
  CheckCheck,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

interface CategoryWithQuote extends QuoteCategory {
  selectedQuote?: Quote
  quoteCount: number
}

export default function ProjectPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<CategoryWithQuote[]>([])
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [todos, setTodos] = useState<ProjectTodo[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [showSpecUploader, setShowSpecUploader] = useState(false)
  const [showSpecSection, setShowSpecSection] = useState(true)
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      // Fetch project
      const projectRes = await fetch('/api/projects')
      if (projectRes.ok) {
        const projects = await projectRes.json()
        const found = projects.find((p: Project) => p.id === id)
        setProject(found || null)
      }

      // Fetch categories with selected quotes
      const categoryRes = await fetch(`/api/categories?projectId=${id}`)
      if (categoryRes.ok) {
        const data: QuoteCategory[] = await categoryRes.json()

        // Fetch quotes for each category to get selected quote details and counts
        const categoriesWithQuotes: CategoryWithQuote[] = await Promise.all(
          data.map(async (cat) => {
            const quotesRes = await fetch(`/api/quotes?categoryId=${cat.id}`)
            let selectedQuote: Quote | undefined
            let quoteCount = 0

            if (quotesRes.ok) {
              const quotes: Quote[] = await quotesRes.json()
              quoteCount = quotes.length
              if (cat.selected_quote_id) {
                selectedQuote = quotes.find((q) => q.id === cat.selected_quote_id)
              }
            }

            return {
              ...cat,
              selectedQuote,
              quoteCount,
            }
          })
        )

        setCategories(categoriesWithQuotes)
      }

      // Fetch project-level specifications
      const specsRes = await fetch(`/api/specifications?projectId=${id}`)
      if (specsRes.ok) {
        setSpecifications(await specsRes.json())
      }

      // Fetch todos
      const todosRes = await fetch(`/api/todos?projectId=${id}`)
      if (todosRes.ok) {
        setTodos(await todosRes.json())
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: id,
          name: newCategory.name,
          description: newCategory.description,
        }),
      })

      if (res.ok) {
        setShowNewCategory(false)
        setNewCategory({ name: '', description: '' })
        fetchData()
      }
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return

    setAddingTodo(true)
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: id,
          title: newTodoTitle,
        }),
      })

      if (res.ok) {
        setNewTodoTitle('')
        fetchData()
      }
    } catch (error) {
      console.error('Error adding todo:', error)
    } finally {
      setAddingTodo(false)
    }
  }

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    try {
      await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: todoId, completed: !completed }),
      })
      fetchData()
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    try {
      await fetch(`/api/todos?id=${todoId}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center">
        <Card className="text-center py-16 px-8">
          <CardContent>
            <h3 className="text-lg font-medium text-slate-300 mb-4">Projekt hittades inte</h3>
            <Button onClick={() => router.push('/dashboard')}>Tillbaka till projekt</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Separate categories
  const completedCategories = categories.filter((c) => c.selected_quote_id)
  const pendingCategories = categories.filter((c) => !c.selected_quote_id)
  const pendingTodos = todos.filter((t) => !t.completed)
  const completedTodos = todos.filter((t) => t.completed)

  // Calculate total from selected quotes
  const totalSelected = completedCategories.reduce(
    (sum, cat) => sum + (cat.selectedQuote?.total_amount || 0),
    0
  )

  return (
    <div className="min-h-screen bg-[#0a0f14]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0a0f14]/95 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Alla projekt
          </Button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
                {project.project_number && (
                  <Badge variant="info">{project.project_number}</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                {project.client && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {project.client}
                  </span>
                )}
                {project.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {project.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Skapat {formatDateShort(project.created_at)}
                </span>
              </div>
            </div>

            {/* Summary stats */}
            {completedCategories.length > 0 && (
              <div className="flex items-center gap-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Trophy className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-xs text-green-400">Valda offerter</p>
                  <p className="text-xl font-bold text-green-400 font-mono">
                    {formatPrice(totalSelected)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Kategorier klara</p>
                  <p className="text-lg font-semibold text-slate-200">
                    {completedCategories.length} / {categories.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Todos and Categories */}
          <div className="lg:w-2/3 space-y-8">
            {/* Todos Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ListTodo className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-slate-100">Att göra</h2>
                  {pendingTodos.length > 0 && (
                    <Badge variant="warning">{pendingTodos.length}</Badge>
                  )}
                </div>
              </div>

              <Card className="bg-[#12181f]">
                <CardContent className="p-4">
                  {/* Add todo input */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Lägg till en uppgift..."
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddTodo}
                      loading={addingTodo}
                      disabled={!newTodoTitle.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Todo list */}
                  {todos.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Inga uppgifter ännu. Lägg till en ovan!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pendingTodos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg group"
                        >
                          <button
                            onClick={() => handleToggleTodo(todo.id, todo.completed)}
                            className="text-slate-400 hover:text-green-400 transition-colors"
                          >
                            <Circle className="w-5 h-5" />
                          </button>
                          <span className="flex-1 text-slate-200">{todo.title}</span>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {completedTodos.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                            <CheckCheck className="w-4 h-4" />
                            Klara ({completedTodos.length})
                          </p>
                          {completedTodos.map((todo) => (
                            <div
                              key={todo.id}
                              className="flex items-center gap-3 p-2 rounded-lg group opacity-60"
                            >
                              <button
                                onClick={() => handleToggleTodo(todo.id, todo.completed)}
                                className="text-green-400"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <span className="flex-1 text-slate-400 line-through">
                                {todo.title}
                              </span>
                              <button
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Specifications Section */}
            <div>
              <button
                onClick={() => setShowSpecSection(!showSpecSection)}
                className="flex items-center gap-2 text-slate-300 hover:text-slate-100 mb-4"
              >
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-semibold">Tekniska beskrivningar / Föreskrifter</span>
                <span className="text-xs text-slate-500">({specifications.length})</span>
                {showSpecSection ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </button>

              {showSpecSection && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 mb-4">
                    Ladda upp rambeskrivningar och tekniska föreskrifter som gäller för hela projektet.
                  </p>

                  {specifications.length === 0 ? (
                    <Card className="border-dashed border-emerald-500/30 bg-emerald-500/5">
                      <CardContent className="py-8 text-center">
                        <BookOpen className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-slate-300 mb-2">
                          Inga tekniska beskrivningar uppladdade
                        </h3>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {specifications.map((spec) => (
                        <SpecificationCard
                          key={spec.id}
                          specification={spec}
                          onDelete={fetchData}
                        />
                      ))}
                      <Card
                        hover
                        className="border-dashed border-emerald-500/30 cursor-pointer hover:bg-emerald-500/5"
                        onClick={() => setShowSpecUploader(true)}
                      >
                        <CardContent className="py-8 flex flex-col items-center justify-center text-emerald-400 h-full min-h-[100px]">
                          <Plus className="w-6 h-6 mb-2" />
                          <span className="text-sm">Lägg till</span>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Categories Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-slate-100">Offertkategorier</h2>
                </div>
                <Button onClick={() => setShowNewCategory(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ny kategori
                </Button>
              </div>

              {categories.length === 0 ? (
                <Card className="text-center py-16">
                  <CardContent>
                    <Layers className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">Inga kategorier ännu</h3>
                    <p className="text-slate-500 mb-6">
                      Skapa kategorier för olika typer av offerter
                    </p>
                    <Button onClick={() => setShowNewCategory(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa kategori
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingCategories.map((category) => (
                    <Card
                      key={category.id}
                      hover
                      className="cursor-pointer"
                      onClick={() => router.push(`/project/${id}/category/${category.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{category.name}</span>
                          <Badge variant={category.quoteCount > 0 ? 'info' : 'default'}>
                            {category.quoteCount} offerter
                          </Badge>
                        </CardTitle>
                        {category.description && (
                          <CardDescription className="text-sm">{category.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <FileText className="w-4 h-4" />
                          <span>Klicka för att hantera offerter</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Completed Categories */}
          <div className="lg:w-1/3">
            <div className="sticky top-24">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-slate-100">Valda leverantörer</h2>
                {completedCategories.length > 0 && (
                  <Badge variant="success">{completedCategories.length}</Badge>
                )}
              </div>

              {completedCategories.length === 0 ? (
                <Card className="bg-[#12181f] border-slate-700">
                  <CardContent className="py-12 text-center">
                    <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">
                      Inga leverantörer valda ännu
                    </p>
                    <p className="text-slate-500 text-xs mt-2">
                      Gå in i en kategori och välj en offert som vinnare
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {completedCategories.map((category) => (
                    <Card
                      key={category.id}
                      hover
                      className="bg-green-500/5 border-green-500/30 cursor-pointer"
                      onClick={() => router.push(`/project/${id}/category/${category.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                              <p className="text-sm font-medium text-slate-200 truncate">
                                {category.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-green-400">
                              <Trophy className="w-4 h-4 flex-shrink-0" />
                              <p className="text-sm font-medium truncate">
                                {category.selectedQuote?.supplier_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-400 font-mono">
                              {formatPrice(category.selectedQuote?.total_amount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Total */}
                  <Card className="bg-green-500/10 border-green-500/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-green-400">
                          Total valda offerter
                        </p>
                        <p className="text-xl font-bold text-green-400 font-mono">
                          {formatPrice(totalSelected)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* New Category Modal */}
      <Modal
        open={showNewCategory}
        onClose={() => setShowNewCategory(false)}
        title="Ny offertkategori"
      >
        <div className="space-y-4">
          <Input
            label="Kategorinamn *"
            placeholder="T.ex. Radiatorer, Kylentreprenad, Isolering"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Beskrivning</label>
            <textarea
              className="w-full h-24 px-4 py-3 bg-[#1e2a36] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              placeholder="Kort beskrivning av kategorin..."
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowNewCategory(false)}
            >
              Avbryt
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateCategory}
              loading={creating}
              disabled={!newCategory.name.trim()}
            >
              Skapa kategori
            </Button>
          </div>
        </div>
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
          categoryId=""
          onUploadComplete={() => {
            setShowSpecUploader(false)
            fetchData()
          }}
        />
      </Modal>
    </div>
  )
}
