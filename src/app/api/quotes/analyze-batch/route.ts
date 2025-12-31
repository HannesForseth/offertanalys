import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractQuoteData } from '@/lib/claude'
import { cookies } from 'next/headers'

// Helper to convert empty strings to null (PostgreSQL doesn't accept "" for dates/numbers)
function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export async function POST(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set')
    return NextResponse.json({ error: 'AI-tjänsten är inte konfigurerad' }, { status: 500 })
  }

  try {
    const { quoteIds } = await request.json()

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      return NextResponse.json({ error: 'Inga offerter valda' }, { status: 400 })
    }

    // Fetch quotes that need analysis
    const { data: quotes, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .in('id', quoteIds)
      .eq('status', 'pending')

    if (fetchError) {
      throw fetchError
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ error: 'Inga offerter att analysera' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Analyze each quote
    for (const quote of quotes) {
      try {
        if (!quote.extracted_text) {
          results.failed++
          results.errors.push(`${quote.supplier_name}: Ingen text extraherad`)
          continue
        }

        // AI Analysis
        const analysis = await extractQuoteData(quote.extracted_text)

        // Calculate total from items if totals.total is missing or 0
        let totalAmount = analysis.totals?.total
        if (!totalAmount && analysis.items && analysis.items.length > 0) {
          totalAmount = analysis.items.reduce((sum, item) => {
            const itemTotal = item.total || (item.quantity && item.unit_price ? item.quantity * item.unit_price : 0)
            return sum + (itemTotal || 0)
          }, 0)
        }

        // Update quote with analysis results
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            supplier_name: analysis.supplier?.name || quote.supplier_name,
            quote_number: emptyToNull(analysis.quote_info?.quote_number),
            quote_date: emptyToNull(analysis.quote_info?.date),
            valid_until: emptyToNull(analysis.quote_info?.valid_until),
            contact_person: emptyToNull(analysis.supplier?.contact_person),
            contact_email: emptyToNull(analysis.supplier?.email),
            contact_phone: emptyToNull(analysis.supplier?.phone),
            total_amount: emptyToNull(totalAmount),
            payment_terms: emptyToNull(analysis.terms?.payment),
            delivery_terms: emptyToNull(analysis.terms?.delivery),
            warranty_period: emptyToNull(analysis.terms?.warranty),
            ai_summary: `${analysis.supplier?.name || 'Offert'} - ${analysis.items?.length || 0} artiklar`,
            ai_analysis: analysis,
            status: 'analyzed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', quote.id)

        if (updateError) {
          throw updateError
        }

        // Save quote items if any
        if (analysis.items && analysis.items.length > 0) {
          const items = analysis.items.map((item: Record<string, unknown>, index: number) => ({
            quote_id: quote.id,
            description: item.description || '',
            quantity: item.quantity || null,
            unit: item.unit || null,
            unit_price: item.unit_price || null,
            total_price: item.total_price || null,
            sort_order: index,
          }))

          // Delete existing items first
          await supabase.from('quote_items').delete().eq('quote_id', quote.id)

          // Insert new items
          const { error: itemsError } = await supabase.from('quote_items').insert(items)

          if (itemsError) {
            console.error('Error saving quote items:', itemsError)
          }
        }

        results.success++
      } catch (err) {
        results.failed++
        let errorMessage = 'Okänt fel'
        if (err instanceof Error) {
          errorMessage = err.message
        } else if (typeof err === 'string') {
          errorMessage = err
        } else if (err && typeof err === 'object' && 'message' in err) {
          errorMessage = String((err as { message: unknown }).message)
        }
        console.error(`Analysis error for ${quote.supplier_name}:`, err)
        results.errors.push(`${quote.supplier_name}: ${errorMessage}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Batch analysis error:', error)
    return NextResponse.json(
      { error: 'Kunde inte analysera offerterna' },
      { status: 500 }
    )
  }
}
