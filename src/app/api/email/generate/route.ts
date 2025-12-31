import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { generateQuoteRequestEmail } from '@/lib/claude'

// POST - Generate a quote request email
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { categoryId, supplierId, deadline } = body

    if (!categoryId || !supplierId || !deadline) {
      return NextResponse.json(
        { error: 'categoryId, supplierId och deadline krävs' },
        { status: 400 }
      )
    }

    // Fetch category with project info
    const { data: category, error: categoryError } = await supabase
      .from('quote_categories')
      .select(`
        *,
        project:projects(*),
        specification:specifications(*)
      `)
      .eq('id', categoryId)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Kategorin hittades inte' }, { status: 404 })
    }

    // Fetch supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Leverantören hittades inte' }, { status: 404 })
    }

    // Get specification excerpt if available
    let specificationExcerpt: string | undefined
    if (category.source_specification_id) {
      const { data: spec } = await supabase
        .from('specifications')
        .select('extracted_text')
        .eq('id', category.source_specification_id)
        .single()

      if (spec?.extracted_text) {
        // Take first 2000 characters as excerpt
        specificationExcerpt = spec.extracted_text.substring(0, 2000)
        if (spec.extracted_text.length > 2000) {
          specificationExcerpt += '\n\n[...]'
        }
      }
    }

    // Generate the email using Claude
    const email = await generateQuoteRequestEmail({
      projectName: category.project?.name || 'Okänt projekt',
      projectAddress: category.project?.address,
      clientName: category.project?.client,
      categoryName: category.name,
      scopeDescription: category.scope_description || category.description || category.name,
      specificationExcerpt,
      supplierName: supplier.name,
      contactPerson: supplier.contact_person,
      deadline,
    })

    return NextResponse.json({
      subject: email.subject,
      body: email.body,
      recipient: {
        email: supplier.contact_email,
        name: supplier.contact_person,
        company: supplier.name,
      },
    })
  } catch (error) {
    console.error('Error generating email:', error)
    return NextResponse.json(
      { error: 'Kunde inte generera mail. Försök igen.' },
      { status: 500 }
    )
  }
}
