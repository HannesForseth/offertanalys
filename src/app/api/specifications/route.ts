import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const projectId = searchParams.get('projectId')

    let query = supabase.from('specifications').select('*')

    if (projectId) {
      // When fetching by projectId, get project-level specs (no category)
      query = query.eq('project_id', projectId).is('category_id', null)
    } else if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching specifications:', error)
    return NextResponse.json({ error: 'Kunde inte hämta specifikationer' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { project_id, category_id, name, extracted_text, requirements } = body

    if (!project_id || !name) {
      return NextResponse.json(
        { error: 'Projekt-ID och namn krävs' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('specifications')
      .insert({
        project_id,
        category_id: category_id || null, // Allow null for project-level specs
        name,
        extracted_text,
        requirements,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating specification:', error)
    return NextResponse.json(
      { error: 'Kunde inte skapa specifikation' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID krävs' }, { status: 400 })
    }

    const { error } = await supabase
      .from('specifications')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting specification:', error)
    return NextResponse.json(
      { error: 'Kunde inte ta bort specifikation' },
      { status: 500 }
    )
  }
}
