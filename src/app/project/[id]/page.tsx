'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Project, QuoteCategory } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Layers,
  FileText,
  Building2,
  MapPin,
  Calendar,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<QuoteCategory[]>([])
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchProject()
    fetchCategories()
  }, [id])

  const fetchProject = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const projects = await res.json()
        const found = projects.find((p: Project) => p.id === id)
        setProject(found || null)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories?projectId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data)

        // Fetch quote counts for each category
        const counts: Record<string, number> = {}
        for (const cat of data) {
          const quotesRes = await fetch(`/api/quotes?categoryId=${cat.id}`)
          if (quotesRes.ok) {
            const quotes = await quotesRes.json()
            counts[cat.id] = quotes.length
          }
        }
        setQuoteCounts(counts)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
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
        const category = await res.json()
        setCategories([category, ...categories])
        setQuoteCounts({ ...quoteCounts, [category.id]: 0 })
        setShowNewCategory(false)
        setNewCategory({ name: '', description: '' })
      }
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setCreating(false)
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

  return (
    <div className="min-h-screen bg-[#0a0f14]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0a0f14]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Categories Section */}
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
                Skapa kategorier för olika typer av offerter, t.ex. &quot;Radiatorer&quot;,
                &quot;Kylentreprenad&quot; eller &quot;Isolering&quot;
              </p>
              <Button onClick={() => setShowNewCategory(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Skapa kategori
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card
                key={category.id}
                hover
                className="cursor-pointer"
                onClick={() => router.push(`/project/${id}/category/${category.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <Badge variant={quoteCounts[category.id] > 0 ? 'info' : 'default'}>
                      {quoteCounts[category.id] || 0} offerter
                    </Badge>
                  </CardTitle>
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>Klicka för att hantera offerter</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
    </div>
  )
}
