import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    let query = supabase.from('quote_categories').select('*')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Kunde inte hämta kategorier' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('quote_categories')
      .insert({
        project_id: body.project_id,
        name: body.name,
        description: body.description,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Kunde inte skapa kategori' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, selected_quote_id } = body

    if (!id) {
      return NextResponse.json({ error: 'Kategori-ID krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('quote_categories')
      .update({ selected_quote_id })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Kunde inte uppdatera kategori' }, { status: 500 })
  }
}
