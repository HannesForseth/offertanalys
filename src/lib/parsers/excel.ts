import * as XLSX from 'xlsx'

export interface ExcelParseResult {
  text: string
  sheets: Array<{
    name: string
    data: unknown[][]
  }>
}

export function parseExcel(buffer: Buffer): ExcelParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheets: Array<{ name: string; data: unknown[][] }> = []
    let fullText = ''

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

      sheets.push({
        name: sheetName,
        data: jsonData,
      })

      // Convert to text for AI processing
      fullText += `\n=== ${sheetName} ===\n`
      for (const row of jsonData) {
        if (Array.isArray(row) && row.length > 0) {
          fullText += row.map(cell => cell ?? '').join('\t') + '\n'
        }
      }
    }

    return {
      text: fullText.trim(),
      sheets,
    }
  } catch (error) {
    console.error('Error parsing Excel:', error)
    throw new Error('Kunde inte läsa Excel-filen. Kontrollera att filen är giltig.')
  }
}

export async function parseExcelFromFile(file: File): Promise<ExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return parseExcel(buffer)
}
