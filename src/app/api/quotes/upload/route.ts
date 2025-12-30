import { NextRequest, NextResponse } from 'next/server'
import { parsePDF } from '@/lib/parsers/pdf'
import { parseExcel } from '@/lib/parsers/excel'
import { cookies } from 'next/headers'

// Note: This endpoint is kept for small files (<4.5MB)
// For larger files, use Supabase Storage upload + /api/files/process
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil uppladdad' }, { status: 400 })
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Filen är för stor. Max 10MB tillåtet.' },
        { status: 413 }
      )
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
