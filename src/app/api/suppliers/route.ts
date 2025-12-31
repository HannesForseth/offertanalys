import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

// GET - List all suppliers or search by category tags
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const tags = searchParams.get('tags')?.split(',').filter(Boolean)
  const search = searchParams.get('search')

  let query = supabase
    .from('suppliers')
    .select('*')
    .order('name')

  if (tags && tags.length > 0) {
    // Filter by category tags (suppliers that have ANY of the specified tags)
    query = query.overlaps('category_tags', tags)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: 'Kunde inte hämta leverantörer' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Create a new supplier
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      name,
      org_number,
      category_tags,
      contact_email,
      contact_phone,
      contact_person,
      address,
      city,
      notes,
      rating,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name,
        org_number,
        category_tags: category_tags || [],
        contact_email,
        contact_phone,
        contact_person,
        address,
        city,
        notes,
        rating,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json({ error: 'Kunde inte skapa leverantör' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan' }, { status: 400 })
  }
}

// PUT - Update a supplier
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating supplier:', error)
      return NextResponse.json({ error: 'Kunde inte uppdatera leverantör' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan' }, { status: 400 })
  }
}

// DELETE - Delete a supplier
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID krävs' }, { status: 400 })
  }

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Kunde inte ta bort leverantör' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
