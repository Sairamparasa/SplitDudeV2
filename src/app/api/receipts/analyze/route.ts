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

    // 3. Prepare payload for AWS API Gateway / Lambda
    const apiGatewayUrl = process.env.AWS_API_GATEWAY_URL || 'https://y6kkpw389a.execute-api.us-east-1.amazonaws.com/dev'
    const fileName = `${user.id}-${Date.now()}-${file.name}`
    const payload = {
      fileContent: base64Content,
      fileName: fileName,
      contentType: file.type,
    }

    console.log(`Forwarding receipt to API Gateway: ${apiGatewayUrl}/receipts/analyze`)

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
      throw new Error(`Receipt scanner is currently offline (unreachable). Please enter the details manually below.`)
    }

    const result = await response.json()
    console.log('API Gateway success response:', result)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Receipt analysis proxy error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to analyze receipt',
    }, { status: 500 })
  }
}
