import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  if (!authToken) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Filväg krävs' }, { status: 400 })
    }

    // Download file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (error) {
      console.error('Error downloading file:', error)
      return NextResponse.json({ error: 'Kunde inte hämta filen' }, { status: 404 })
    }

    // Determine content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === 'pdf') {
      contentType = 'application/pdf'
    } else if (ext === 'xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (ext === 'xls') {
      contentType = 'application/vnd.ms-excel'
    }

    // Convert blob to buffer
    const buffer = await data.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Kunde inte visa filen' }, { status: 500 })
  }
}
