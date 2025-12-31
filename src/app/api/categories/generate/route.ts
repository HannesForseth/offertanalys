import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { generateCategoriesFromSpec } from '@/lib/claude'

// POST - Generate category suggestions from a specification (TB)
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { specificationId } = body

    if (!specificationId) {
      return NextResponse.json({ error: 'specificationId krävs' }, { status: 400 })
    }

    // Fetch the specification
    const { data: spec, error: specError } = await supabase
      .from('specifications')
      .select('*')
      .eq('id', specificationId)
      .single()

    if (specError || !spec) {
      return NextResponse.json({ error: 'Specifikationen hittades inte' }, { status: 404 })
    }

    if (!spec.extracted_text) {
      return NextResponse.json({ error: 'Specifikationen har ingen extraherad text' }, { status: 400 })
    }

    // Fetch existing suppliers to match tags
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, category_tags')

    // Generate categories using Claude
    const categories = await generateCategoriesFromSpec(spec.extracted_text)

    // Match suppliers based on tags
    const categoriesWithSuppliers = categories.map(category => {
      const matchingSuppliers = suppliers?.filter(supplier =>
        supplier.category_tags?.some((tag: string) =>
          category.suggested_tags.some(suggestedTag =>
            tag.toLowerCase().includes(suggestedTag.toLowerCase()) ||
            suggestedTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      ) || []

      return {
        ...category,
        matched_suppliers: matchingSuppliers.map(s => ({
          id: s.id,
          name: s.name,
        })),
      }
    })

    return NextResponse.json({
      specification: {
        id: spec.id,
        name: spec.name,
      },
      categories: categoriesWithSuppliers,
    })
  } catch (error) {
    console.error('Error generating categories:', error)
    return NextResponse.json(
      { error: 'Kunde inte generera kategorier. Försök igen.' },
      { status: 500 }
    )
  }
}
