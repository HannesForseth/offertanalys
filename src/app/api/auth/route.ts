import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const PIN_CODE = process.env.APP_PIN_CODE || '1234'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (pin === PIN_CODE) {
      // Set auth cookie
      const cookieStore = await cookies()
      cookieStore.set('auth_token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Felaktig PIN-kod' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Något gick fel' }, { status: 500 })
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')

  if (authToken?.value === 'authenticated') {
    return NextResponse.json({ authenticated: true })
  }

  return NextResponse.json({ authenticated: false }, { status: 401 })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  return NextResponse.json({ success: true })
}
