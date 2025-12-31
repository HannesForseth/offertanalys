import { extractText } from 'unpdf'
import Anthropic from '@anthropic-ai/sdk'

// Dynamic import for pdf-parse (fallback)
async function parsePDFWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.text || ''
  } catch (error) {
    console.error('pdf-parse error:', error)
    return ''
  }
}

// OCR fallback using Claude Vision
async function parsePDFWithClaudeVision(buffer: Buffer): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set, cannot use Claude Vision OCR')
    return ''
  }

  try {
    console.log('Using Claude Vision for OCR...')
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const base64PDF = buffer.toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64PDF,
              },
            },
            {
              type: 'text',
              text: `Extrahera ALL text från detta PDF-dokument.

Detta är en VVS-offert eller teknisk beskrivning. Inkludera:
- Leverantörsnamn och kontaktuppgifter
- Offertnummer och datum
- Alla produktrader med artikelnummer, beskrivning, antal, pris
- Summor och totaler
- Villkor (betalning, leverans, garanti)

Återge texten så exakt som möjligt, behåll strukturen. Svara ENDAST med den extraherade texten, ingen annan kommentar.`
            }
          ],
        },
      ],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      console.log('Claude Vision OCR successful, extracted', content.text.length, 'characters')
      return content.text
    }
    return ''
  } catch (error) {
    console.error('Claude Vision OCR error:', error)
    return ''
  }
}

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Try unpdf first (serverless optimized, fastest)
    const uint8Array = new Uint8Array(buffer)
    const { text } = await extractText(uint8Array)
    const result = Array.isArray(text) ? text.join('\n\n') : text

    // If unpdf returned meaningful text (more than just whitespace), use it
    if (result && result.trim().length > 50) {
      console.log('unpdf extracted', result.length, 'characters')
      return result
    }

    console.log('unpdf returned empty/short text, trying pdf-parse fallback...')

    // Fallback to pdf-parse
    const fallbackText = await parsePDFWithPdfParse(buffer)
    if (fallbackText && fallbackText.trim().length > 50) {
      console.log('pdf-parse extracted', fallbackText.length, 'characters')
      return fallbackText
    }

    console.log('pdf-parse also failed, trying Claude Vision OCR...')

    // Last resort: Claude Vision OCR for scanned PDFs
    const ocrText = await parsePDFWithClaudeVision(buffer)
    if (ocrText && ocrText.trim().length > 50) {
      return ocrText
    }

    // If we got some text from any method, return the best one
    if (ocrText && ocrText.trim().length > 0) return ocrText
    if (fallbackText && fallbackText.trim().length > 0) return fallbackText
    if (result && result.trim().length > 0) return result

    // All methods failed
    throw new Error('Kunde inte extrahera text från PDF. Filen kan vara skadad eller tom.')
  } catch (error) {
    console.error('Error parsing PDF:', error)
    if (error instanceof Error && error.message.includes('extrahera')) {
      throw error
    }
    throw new Error('Kunde inte läsa PDF-filen. Kontrollera att filen är giltig.')
  }
}

export async function parsePDFFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return parsePDF(buffer)
}
