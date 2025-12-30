import { NextRequest, NextResponse } from 'next/server'
import { parsePDF } from '@/lib/parsers/pdf'
import { parseExcel } from '@/lib/parsers/excel'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Allow longer processing time for large files
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { filePath, fileName } = body

    if (!filePath || !fileName) {
      return NextResponse.json(
        { error: 'Filsökväg och filnamn krävs' },
        { status: 400 }
      )
    }

    // Create Supabase client for server-side
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError) {
      console.error('Storage download error:', downloadError)
      return NextResponse.json(
        { error: 'Kunde inte hämta filen från lagring' },
        { status: 500 }
      )
    }

    // Convert to Buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse based on file type
    let extractedText = ''
    const lowerFileName = fileName.toLowerCase()

    if (lowerFileName.endsWith('.pdf')) {
      extractedText = await parsePDF(buffer)
    } else if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls')) {
      const result = parseExcel(buffer)
      extractedText = result.text
    } else {
      return NextResponse.json(
        { error: 'Filtypen stöds inte. Ladda upp PDF eller Excel.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      fileName,
      filePath,
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
