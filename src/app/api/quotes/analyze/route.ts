import { NextRequest, NextResponse } from 'next/server'
import { extractQuoteData } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text krävs för analys' }, { status: 400 })
    }

    const analysis = await extractQuoteData(text)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error analyzing quote:', error)
    return NextResponse.json(
      { error: 'Kunde inte analysera offerten. Försök igen.' },
      { status: 500 }
    )
  }
}
