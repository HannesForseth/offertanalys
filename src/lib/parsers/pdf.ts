// Use legacy build for Node.js environments
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer)
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    })

    const pdf = await loadingTask.promise
    const textParts: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      textParts.push(pageText)
    }

    return textParts.join('\n\n')
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
