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
    const categoryId = searchParams.get('categoryId')

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId krävs' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('comparisons')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('Error fetching comparison:', error)
    return NextResponse.json({ error: 'Kunde inte hämta jämförelse' }, { status: 500 })
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
    const { category_id, specification_id, quote_ids, result } = body

    if (!category_id || !quote_ids || !result) {
      return NextResponse.json(
        { error: 'category_id, quote_ids och result krävs' },
        { status: 400 }
      )
    }

    // Upsert - replace existing comparison for this category
    const { data, error } = await supabase
      .from('comparisons')
      .upsert(
        {
          category_id,
          specification_id: specification_id || null,
          quote_ids,
          result,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'category_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error saving comparison:', error)
    return NextResponse.json({ error: 'Kunde inte spara jämförelse' }, { status: 500 })
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
    const categoryId = searchParams.get('categoryId')

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId krävs' }, { status: 400 })
    }

    const { error } = await supabase
      .from('comparisons')
      .delete()
      .eq('category_id', categoryId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comparison:', error)
    return NextResponse.json({ error: 'Kunde inte ta bort jämförelse' }, { status: 500 })
  }
}
