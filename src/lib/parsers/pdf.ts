import { extractText } from 'unpdf'

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer)
    const { text } = await extractText(uint8Array)
    // text is an array of strings (one per page), join them
    return Array.isArray(text) ? text.join('\n\n') : text
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Kunde inte läsa PDF-filen. Kontrollera att filen är giltig.')
  }
}

export async function parsePDFFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return parsePDF(buffer)
}
