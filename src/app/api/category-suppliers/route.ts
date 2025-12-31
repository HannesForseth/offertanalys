import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

// GET - List suppliers for a category with their status
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const categoryId = searchParams.get('categoryId')

  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId krävs' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('category_suppliers')
    .select(`
      *,
      supplier:suppliers(*)
    `)
    .eq('category_id', categoryId)
    .order('created_at')

  if (error) {
    console.error('Error fetching category suppliers:', error)
    return NextResponse.json({ error: 'Kunde inte hämta leverantörer' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Add a supplier to a category
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { category_id, supplier_id, response_deadline, notes } = body

    if (!category_id || !supplier_id) {
      return NextResponse.json({ error: 'category_id och supplier_id krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('category_suppliers')
      .insert({
        category_id,
        supplier_id,
        status: 'pending',
        response_deadline,
        notes,
      })
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Leverantören finns redan i kategorin' }, { status: 409 })
      }
      console.error('Error adding supplier to category:', error)
      return NextResponse.json({ error: 'Kunde inte lägga till leverantör' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan' }, { status: 400 })
  }
}

// PATCH - Update status (sent, received, etc.)
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, status, response_deadline, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'ID krävs' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      updates.status = status
      // Set sent_at when marking as sent
      if (status === 'sent') {
        updates.sent_at = new Date().toISOString()
      }
    }
    if (response_deadline !== undefined) updates.response_deadline = response_deadline
    if (notes !== undefined) updates.notes = notes

    const { data, error } = await supabase
      .from('category_suppliers')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .single()

    if (error) {
      console.error('Error updating category supplier:', error)
      return NextResponse.json({ error: 'Kunde inte uppdatera' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan' }, { status: 400 })
  }
}

// DELETE - Remove a supplier from a category
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
    .from('category_suppliers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error removing supplier from category:', error)
    return NextResponse.json({ error: 'Kunde inte ta bort' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// POST to mark reminder sent
export async function markReminderSent(id: string) {
  const { error } = await supabase
    .from('category_suppliers')
    .update({
      reminder_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return !error
}
