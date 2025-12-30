import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { compareQuotes } from '@/lib/claude'

export async function POST(request: NextRequest) {
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

    // Save comparison to database
    const { data: savedComparison, error: saveError } = await supabase
      .from('comparisons')
      .insert({
        category_id: categoryId,
        quote_ids: quoteIds,
        comparison_summary: comparison.summary,
        price_analysis: comparison.price_comparison,
        specification_compliance: comparison.specification_compliance,
        pros_cons: comparison.pros_cons,
        recommendation: comparison.recommendation.recommended_supplier,
        recommendation_reasoning: comparison.recommendation.reasoning,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving comparison:', saveError)
    }

    return NextResponse.json({
      id: savedComparison?.id,
      ...comparison,
    })
  } catch (error) {
    console.error('Error comparing quotes:', error)
    return NextResponse.json(
      { error: 'Kunde inte jämföra offerter. Försök igen.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    let query = supabase.from('comparisons').select('*')

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching comparisons:', error)
    return NextResponse.json({ error: 'Kunde inte hämta jämförelser' }, { status: 500 })
  }
}
