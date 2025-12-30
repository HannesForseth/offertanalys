import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    let query = supabase.from('quotes').select(`
      *,
      quote_items (*)
    `)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json({ error: 'Kunde inte hämta offerter' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        category_id: body.category_id,
        supplier_name: body.supplier_name,
        quote_number: body.quote_number,
        quote_date: body.quote_date,
        valid_until: body.valid_until,
        contact_person: body.contact_person,
        contact_email: body.contact_email,
        contact_phone: body.contact_phone,
        total_amount: body.total_amount,
        currency: body.currency || 'SEK',
        vat_included: body.vat_included || false,
        payment_terms: body.payment_terms,
        delivery_terms: body.delivery_terms,
        warranty_period: body.warranty_period,
        file_path: body.file_path,
        extracted_text: body.extracted_text,
        ai_summary: body.ai_summary,
        ai_analysis: body.ai_analysis,
        status: body.status || 'received',
        notes: body.notes,
      })
      .select()
      .single()

    if (error) throw error

    // Insert quote items if provided
    if (body.items && body.items.length > 0) {
      const itemsToInsert = body.items.map((item: Record<string, unknown>) => ({
        quote_id: data.id,
        position: item.position,
        article_number: item.article_number,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'ST',
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        net_price: item.net_price,
        total_amount: item.total,
        item_type: item.type,
        product_category: item.category,
        specifications: item.specifications,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error inserting quote items:', itemsError)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json({ error: 'Kunde inte skapa offert' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await supabase
      .from('quotes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json({ error: 'Kunde inte uppdatera offert' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID krävs' }, { status: 400 })
    }

    const { error } = await supabase.from('quotes').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json({ error: 'Kunde inte ta bort offert' }, { status: 500 })
  }
}
