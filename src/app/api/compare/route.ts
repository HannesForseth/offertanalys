import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { compareQuotes } from '@/lib/claude'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const { categoryId, quoteIds, specificationText } = await request.json()

    if (!categoryId || !quoteIds || quoteIds.length < 2) {
      return NextResponse.json(
        { error: 'Minst två offerter krävs för jämförelse' },
        { status: 400 }
      )
    }

    // Fetch category with project info
    const { data: category, error: categoryError } = await supabase
      .from('quote_categories')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('id', categoryId)
      .single()

    if (categoryError) throw categoryError

    // Fetch quotes with items
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items(*)
      `)
      .in('id', quoteIds)

    if (quotesError) throw quotesError

    // Prepare quotes for comparison
    const quotesForComparison = quotes.map((q) => ({
      supplier_name: q.supplier_name,
      ai_analysis: q.ai_analysis || {
        total: q.total_amount,
        items: q.quote_items,
        terms: {
          payment: q.payment_terms,
          delivery: q.delivery_terms,
          warranty: q.warranty_period,
        },
      },
    }))

    // Perform AI comparison
    const comparison = await compareQuotes(
      category.project?.name || 'Okänt projekt',
      category.name,
      quotesForComparison,
      specificationText
    )

    // Return comparison result - saving is handled by /api/comparisons
    return NextResponse.json(comparison)
  } catch (error) {
    console.error('Error comparing quotes:', error)
    return NextResponse.json(
      { error: 'Kunde inte jämföra offerter. Försök igen.' },
      { status: 500 }
    )
  }
}
