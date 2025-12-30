import { NextRequest, NextResponse } from 'next/server'
import { parsePDF } from '@/lib/parsers/pdf'
import { parseExcel } from '@/lib/parsers/excel'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil uppladdad' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ''
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.pdf')) {
      extractedText = await parsePDF(buffer)
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const result = parseExcel(buffer)
      extractedText = result.text
    } else {
      return NextResponse.json(
        { error: 'Filtypen stöds inte. Ladda upp PDF eller Excel.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      extractedText,
    })
  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json(
      { error: 'Kunde inte bearbeta filen. Kontrollera att filen är giltig.' },
      { status: 500 }
    )
  }
}
