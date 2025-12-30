import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Kunde inte hämta projekt' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: body.name,
        project_number: body.project_number,
        address: body.address,
        client: body.client,
        description: body.description,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Kunde inte skapa projekt' }, { status: 500 })
  }
}
