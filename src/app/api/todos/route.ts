import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_todos')
      .select('*')
      .eq('project_id', projectId)
      .order('completed', { ascending: true })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json({ error: 'Kunde inte hämta todos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { project_id, title, description, priority, due_date, category_id } = body

    if (!project_id || !title) {
      return NextResponse.json({ error: 'project_id och title krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_todos')
      .insert({
        project_id,
        title,
        description: description || null,
        priority: priority || 'medium',
        due_date: due_date || null,
        category_id: category_id || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating todo:', error)
    return NextResponse.json({ error: 'Kunde inte skapa todo' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Todo-ID krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_todos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json({ error: 'Kunde inte uppdatera todo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Todo-ID krävs' }, { status: 400 })
    }

    const { error } = await supabase
      .from('project_todos')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json({ error: 'Kunde inte ta bort todo' }, { status: 500 })
  }
}
