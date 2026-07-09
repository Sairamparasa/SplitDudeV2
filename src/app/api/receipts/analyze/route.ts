import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse file from form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Content = buffer.toString('base64')

    // 3. Prepare payload for AWS API Gateway / Lambda (deployed stage dev)
    const apiGatewayUrl = 'https://y6kkpw389a.execute-api.us-east-1.amazonaws.com/dev'
    const fileName = `${user.id}-${Date.now()}-${file.name}`
    const payload = {
      fileContent: base64Content,
      fileName: fileName,
      contentType: file.type,
    }



    const response = await fetch(`${apiGatewayUrl}/receipts/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Gateway failed:', errorText)
      throw new Error(`API Gateway failed with status ${response.status} (${response.statusText}): ${errorText}`)
    }

    const result = await response.json()


    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Receipt analysis proxy error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to analyze receipt',
    }, { status: 500 })
  }
}
