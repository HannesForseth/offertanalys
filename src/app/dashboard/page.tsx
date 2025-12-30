'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Project } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import {
  FolderOpen,
  Plus,
  Search,
  LogOut,
  Building2,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    project_number: '',
    address: '',
    client: '',
    description: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchProjects()
  }, [])

  const checkAuth = async () => {
    const res = await fetch('/api/auth')
    if (!res.ok) {
      router.push('/')
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
  }

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })

      if (res.ok) {
        const project = await res.json()
        setProjects([project, ...projects])
        setShowNewProject(false)
        setNewProject({ name: '', project_number: '', address: '', client: '', description: '' })
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setCreating(false)
    }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0a0f14]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0a0f14]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono">Offertanalys</h1>
              <p className="text-xs text-slate-500">Installationsbolaget Stockholm AB</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logga ut
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Sök projekt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowNewProject(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nytt projekt
          </Button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-slate-700 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                {search ? 'Inga projekt hittades' : 'Inga projekt ännu'}
              </h3>
              <p className="text-slate-500 mb-6">
                {search
                  ? 'Försök med en annan sökning'
                  : 'Skapa ditt första projekt för att komma igång'}
              </p>
              {!search && (
                <Button onClick={() => setShowNewProject(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa projekt
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                hover
                className="cursor-pointer"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="truncate">{project.name}</span>
                    {project.project_number && (
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                        {project.project_number}
                      </span>
                    )}
                  </CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-slate-400">
                    {project.client && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{project.client}</span>
                      </div>
                    )}
                    {project.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateShort(project.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="Nytt projekt">
        <div className="space-y-4">
          <Input
            label="Projektnamn *"
            placeholder="T.ex. Kvarteret Kronan"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          />
          <Input
            label="Projektnummer"
            placeholder="T.ex. P2024-001"
            value={newProject.project_number}
            onChange={(e) => setNewProject({ ...newProject, project_number: e.target.value })}
          />
          <Input
            label="Kund/Beställare"
            placeholder="T.ex. Skanska AB"
            value={newProject.client}
            onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
          />
          <Input
            label="Adress"
            placeholder="T.ex. Storgatan 1, Stockholm"
            value={newProject.address}
            onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Beskrivning</label>
            <textarea
              className="w-full h-24 px-4 py-3 bg-[#1e2a36] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              placeholder="Kort beskrivning av projektet..."
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowNewProject(false)}>
              Avbryt
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateProject}
              loading={creating}
              disabled={!newProject.name.trim()}
            >
              Skapa projekt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
