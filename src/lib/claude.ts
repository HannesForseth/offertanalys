import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ExtractedQuoteData {
  supplier: {
    name: string
    org_number?: string
    contact_person?: string
    email?: string
    phone?: string
  }
  quote_info: {
    quote_number?: string
    date?: string
    valid_until?: string
    reference?: string
    project_name?: string
  }
  terms: {
    payment?: string
    delivery?: string
    warranty?: string
    other_conditions?: string[]
  }
  items: Array<{
    position?: string
    article_number?: string
    description: string
    quantity?: number
    unit?: string
    unit_price?: number
    discount_percent?: number
    total?: number
    type?: 'product' | 'accessory' | 'service' | 'option'
    category?: string
    specifications?: {
      type?: string
      dimensions?: string
      color?: string
      pressure_class?: string
      other?: Record<string, unknown>
    }
  }>
  totals: {
    subtotal?: number
    vat?: number
    total?: number
  }
  included?: string[]
  not_included?: string[]
  options?: string[]
  notes?: string[]
}

export async function extractQuoteData(quoteText: string): Promise<ExtractedQuoteData> {
  const extractionPrompt = `
Du är en expert på att analysera VVS-offerter för byggprojekt i Sverige.

Analysera denna offert och extrahera följande i JSON-format:
{
  "supplier": {
    "name": "",
    "org_number": "",
    "contact_person": "",
    "email": "",
    "phone": ""
  },
  "quote_info": {
    "quote_number": "",
    "date": "",
    "valid_until": "",
    "reference": "",
    "project_name": ""
  },
  "terms": {
    "payment": "",
    "delivery": "",
    "warranty": "",
    "other_conditions": []
  },
  "items": [
    {
      "position": "",
      "article_number": "",
      "description": "",
      "quantity": 0,
      "unit": "",
      "unit_price": 0,
      "discount_percent": 0,
      "total": 0,
      "type": "product|accessory|service|option",
      "category": "",
      "specifications": {
        "type": "",
        "dimensions": "",
        "color": "",
        "pressure_class": "",
        "other": {}
      }
    }
  ],
  "totals": {
    "subtotal": 0,
    "vat": 0,
    "total": 0
  },
  "included": [],
  "not_included": [],
  "options": [],
  "notes": []
}

VIKTIGT:
- Extrahera alla produktrader/artiklar du hittar
- Priser ska vara i numeriskt format (utan valutasymboler)
- ALLTID använda pris EXKLUSIVE MOMS (ex. moms, netto). Om offerten visar både med och utan moms, välj ALLTID priset utan moms
- Totalsumman i "totals.total" ska vara EXKLUSIVE MOMS
- Datum ska vara i formatet YYYY-MM-DD
- Om något saknas, lämna det tomt eller null
- Var noggrann med att identifiera vad som ingår vs inte ingår

Offerttext:
${quoteText}

Svara ENDAST med valid JSON, inget annat.`

  // Use streaming for long requests (required for Opus with high token limits)
  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 32000,
    messages: [
      {
        role: 'user',
        content: extractionPrompt,
      },
    ],
  })

  const response = await stream.finalMessage()
  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  try {
    // First, try to parse directly
    return JSON.parse(content.text) as ExtractedQuoteData
  } catch {
    // Try to extract JSON from markdown code blocks
    let jsonText = content.text

    // Remove markdown code block markers
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    try {
      return JSON.parse(jsonText) as ExtractedQuoteData
    } catch {
      // Last resort: try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as ExtractedQuoteData
        } catch {
          // Log the problematic response for debugging
          console.error('Failed to parse Claude response:', content.text.substring(0, 500))
          throw new Error('Failed to parse Claude response as JSON')
        }
      }
      console.error('No JSON found in Claude response:', content.text.substring(0, 500))
      throw new Error('Failed to parse Claude response as JSON')
    }
  }
}

export interface ComparisonResult {
  summary: string
  scope_analysis?: {
    categories_found: string[]
    common_categories: string[]
    scope_differences: Array<{
      supplier: string
      extra_categories: string[]
      extra_value: number
      missing_categories: string[]
    }>
    warning: string
  }
  price_comparison: {
    ranking: Array<{
      supplier: string
      total?: number
      raw_total?: number
      adjusted_total?: number
      adjustment_details?: string
      difference_from_lowest: number
      percent_difference: number
    }>
    price_notes: string
    comparison_basis?: string
  }
  specification_compliance: {
    per_supplier: Array<{
      supplier: string
      compliance_score: number
      meets_requirements: string[]
      missing_or_deviating: string[]
      extras_included: string[]
    }>
  }
  detailed_comparison?: {
    products: {
      summary: string
      differences: string[]
    }
    accessories: {
      summary: string
      differences: string[]
    }
    terms: {
      payment: { comparison: string }
      delivery: { comparison: string }
      warranty: { comparison: string }
    }
  }
  pros_cons: Array<{
    supplier: string
    pros: string[]
    cons: string[]
  }>
  recommendation: {
    recommended_supplier: string
    reasoning: string
    caveats: string[]
    negotiation_points: string[]
  }
  questions_to_clarify: Array<{
    supplier: string
    question: string
  }>
}

export async function compareQuotes(
  projectName: string,
  categoryName: string,
  quotes: Array<{ supplier_name: string; ai_analysis: Record<string, unknown> }>,
  specificationText?: string
): Promise<ComparisonResult> {
  const comparisonPrompt = `
Du är en expert VVS-kalkylator som hjälper Installationsbolaget Stockholm att jämföra offerter.

KONTEXT:
- Projekt: ${projectName}
- Kategori: ${categoryName}
- Antal offerter att jämföra: ${quotes.length}

${specificationText ? `TEKNISK BESKRIVNING/FÖRESKRIFTER:\n${specificationText}\n` : ''}

OFFERTER:
${JSON.stringify(quotes, null, 2)}

KRITISKT - JÄMFÖRELSE AV LIKVÄRDIGT INNEHÅLL:
Innan du jämför priser MÅSTE du:
1. Identifiera ALLA produktkategorier/produkttyper i varje offert (kan vara radiatorer, konvektorer, expansionskärl, shuntar, värmeväxlare, pumpar, ventiler, termostater, tillbehör, montage, frakt, eller VILKEN ANNAN typ av VVS-produkt som helst)
2. Beräkna ett JUSTERAT JÄMFÖRELSEPRIS som ENDAST inkluderar produktkategorier som finns i ALLA offerter
3. Om en offert innehåller extra kategorier som andra saknar, räkna ut deras värde och dra av det från totalen för rättvis jämförelse
4. Prisjämförelsen ska visa BÅDE råtotal OCH justerat pris

Exempel 1: Om offert A innehåller radiatorer (800k) + konvektorer (200k) = 1000k,
och offert B endast innehåller radiatorer (850k),
då ska justerat pris för A vara 800k (endast radiatorer) för rättvis jämförelse.

Exempel 2: Om offert A innehåller shuntar (50k) + värmeväxlare (300k) = 350k,
och offert B innehåller shuntar (45k) + värmeväxlare (280k) + pumpar (80k) = 405k,
då ska justerat pris för B vara 325k (exkl. pumpar) för rättvis jämförelse mot A.

VAR INTELLIGENT: Analysera produktbeskrivningar noggrant för att identifiera produkttyper även om de inte är explicit kategoriserade.

UPPGIFT:
Gör en djupgående jämförelse av offerterna och returnera JSON:

{
  "summary": "Kort sammanfattning inkl. varning om olika omfattning",

  "scope_analysis": {
    "categories_found": ["lista alla produktkategorier som hittades i någon offert"],
    "common_categories": ["kategorier som finns i ALLA offerter"],
    "scope_differences": [
      {"supplier": "", "extra_categories": [], "extra_value": 0, "missing_categories": []}
    ],
    "warning": "Tydlig varning om offerterna har olika omfattning"
  },

  "price_comparison": {
    "ranking": [
      {
        "supplier": "",
        "raw_total": 0,
        "adjusted_total": 0,
        "adjustment_details": "Vad som dragits av/lagts till för rättvis jämförelse",
        "difference_from_lowest": 0,
        "percent_difference": 0
      }
    ],
    "price_notes": "Viktiga prisrelaterade observationer",
    "comparison_basis": "Förklaring av vad som jämförs i adjusted_total"
  },

  "specification_compliance": {
    "per_supplier": [
      {
        "supplier": "",
        "compliance_score": 0,
        "meets_requirements": ["lista på uppfyllda krav"],
        "missing_or_deviating": ["lista på saknade/avvikande"],
        "extras_included": ["extra saker som ingår utöver föreskrift"]
      }
    ]
  },

  "detailed_comparison": {
    "products": {
      "summary": "",
      "differences": []
    },
    "accessories": {
      "summary": "",
      "differences": []
    },
    "terms": {
      "payment": {"comparison": ""},
      "delivery": {"comparison": ""},
      "warranty": {"comparison": ""}
    }
  },

  "pros_cons": [
    {
      "supplier": "",
      "pros": [],
      "cons": []
    }
  ],

  "recommendation": {
    "recommended_supplier": "",
    "reasoning": "",
    "caveats": [],
    "negotiation_points": []
  },

  "questions_to_clarify": [
    {"supplier": "", "question": ""}
  ]
}

Var noggrann med att:
1. ALLTID identifiera omfattningsskillnader först - detta är kritiskt!
2. Beräkna justerade priser för rättvis äpplen-mot-äpplen jämförelse
3. Tydligt flagga när offerter innehåller olika produktkategorier
4. Notera skillnader i vad som ingår (termostater, konsoler, montage etc.)
5. Flagga om något saknas enligt teknisk beskrivning
6. Beakta leveransvillkor och garantier

Svara ENDAST med valid JSON, inget annat.`

  // Use streaming for long requests (required for Opus with high token limits)
  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 32000,
    messages: [
      {
        role: 'user',
        content: comparisonPrompt,
      },
    ],
  })

  const response = await stream.finalMessage()
  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  try {
    return JSON.parse(content.text) as ComparisonResult
  } catch {
    // Try to extract JSON from markdown code blocks
    let jsonText = content.text
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    try {
      return JSON.parse(jsonText) as ComparisonResult
    } catch {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as ComparisonResult
        } catch {
          console.error('Failed to parse comparison response:', content.text.substring(0, 500))
          throw new Error('Failed to parse Claude comparison response as JSON')
        }
      }
      throw new Error('Failed to parse Claude comparison response as JSON')
    }
  }
}
