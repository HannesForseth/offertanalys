import { extractText } from 'unpdf'

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

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Try unpdf first (serverless optimized)
    const uint8Array = new Uint8Array(buffer)
    const { text } = await extractText(uint8Array)
    const result = Array.isArray(text) ? text.join('\n\n') : text

    // If unpdf returned meaningful text (more than just whitespace), use it
    if (result && result.trim().length > 50) {
      return result
    }

    console.log('unpdf returned empty/short text, trying pdf-parse fallback...')

    // Fallback to pdf-parse
    const fallbackText = await parsePDFWithPdfParse(buffer)
    if (fallbackText && fallbackText.trim().length > 50) {
      return fallbackText
    }

    // If both failed but we got some text, return what we have
    if (result && result.trim().length > 0) {
      return result
    }
    if (fallbackText && fallbackText.trim().length > 0) {
      return fallbackText
    }

    // Both parsers failed to extract meaningful text
    throw new Error('PDF verkar vara en skannad bild utan textlager. Prova en PDF med sökbar text.')
  } catch (error) {
    console.error('Error parsing PDF:', error)
    if (error instanceof Error && error.message.includes('skannad')) {
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
