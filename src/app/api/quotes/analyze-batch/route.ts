import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractQuoteData } from '@/lib/claude'
import { parsePDF } from '@/lib/parsers/pdf'
import { parseExcel } from '@/lib/parsers/excel'
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
    const { quoteIds, reanalyze } = await request.json()

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      return NextResponse.json({ error: 'Inga offerter valda' }, { status: 400 })
    }

    // Fetch quotes - if reanalyze is true, include already analyzed quotes
    let query = supabase
      .from('quotes')
      .select('*')
      .in('id', quoteIds)

    if (!reanalyze) {
      query = query.eq('status', 'pending')
    }

    const { data: quotes, error: fetchError } = await query

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
        let textToAnalyze = quote.extracted_text

        // If no extracted text but we have a file, try to re-extract
        if (!textToAnalyze && quote.file_path) {
          console.log(`Re-extracting text from file for ${quote.supplier_name}`)

          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(quote.file_path)

          if (downloadError) {
            results.failed++
            results.errors.push(`${quote.supplier_name}: Kunde inte hämta filen - ${downloadError.message}`)
            continue
          }

          const arrayBuffer = await fileData.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Parse based on file extension
          const fileName = quote.file_path.toLowerCase()
          if (fileName.endsWith('.pdf')) {
            textToAnalyze = await parsePDF(buffer)
          } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const result = parseExcel(buffer)
            textToAnalyze = result.text
          }

          // Update the quote with the extracted text
          if (textToAnalyze) {
            await supabase
              .from('quotes')
              .update({ extracted_text: textToAnalyze })
              .eq('id', quote.id)
          }
        }

        if (!textToAnalyze) {
          results.failed++
          results.errors.push(`${quote.supplier_name}: Ingen text kunde extraheras från filen`)
          continue
        }

        // AI Analysis
        const analysis = await extractQuoteData(textToAnalyze)

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

        // Auto-create or update supplier in suppliers table
        if (analysis.supplier?.name) {
          const supplierName = analysis.supplier.name.trim()

          // Check if supplier already exists (by name)
          const { data: existingSupplier } = await supabase
            .from('suppliers')
            .select('id, contact_email, contact_phone, contact_person')
            .ilike('name', supplierName)
            .single()

          if (existingSupplier) {
            // Update existing supplier with new contact info if we have better data
            const updates: Record<string, string> = {}
            if (analysis.supplier.email && !existingSupplier.contact_email) {
              updates.contact_email = analysis.supplier.email
            }
            if (analysis.supplier.phone && !existingSupplier.contact_phone) {
              updates.contact_phone = analysis.supplier.phone
            }
            if (analysis.supplier.contact_person && !existingSupplier.contact_person) {
              updates.contact_person = analysis.supplier.contact_person
            }

            if (Object.keys(updates).length > 0) {
              updates.updated_at = new Date().toISOString()
              await supabase
                .from('suppliers')
                .update(updates)
                .eq('id', existingSupplier.id)
            }
          } else {
            // Create new supplier
            await supabase.from('suppliers').insert({
              name: supplierName,
              org_number: emptyToNull(analysis.supplier.org_number) || null,
              contact_email: emptyToNull(analysis.supplier.email) || null,
              contact_phone: emptyToNull(analysis.supplier.phone) || null,
              contact_person: emptyToNull(analysis.supplier.contact_person) || null,
              category_tags: [], // Empty initially, user can add later
            })
          }
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
