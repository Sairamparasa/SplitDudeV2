import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishSnsEvent } from '@/lib/aws/sns-helper'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { group_id, payer_id, payee_id, amount } = await req.json()

    // 1. Insert settlement
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .insert({
        group_id,
        payer_id,
        payee_id,
        amount,
      })
      .select()
      .single()

    if (settlementError) throw settlementError

    // 2. Add Activity Log
    const { data: payerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payer_id)
      .single()

    const { data: payeeProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payee_id)
      .single()

    await supabase.from('activity_logs').insert({
      group_id,
      user_id: user.id,
      action: 'settlement',
      details: `${payerProfile?.full_name || 'Someone'} paid ₹${Number(amount).toFixed(2)} to ${payeeProfile?.full_name || 'someone'}.`,
    })

    // 3. Publish SNS Event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'SETTLEMENT_COMPLETED',
      userId: user.id,
      groupId: group_id,
      message: `${payerProfile?.full_name || 'Someone'} settled ₹${Number(amount).toFixed(2)} with ${payeeProfile?.full_name || 'someone'}.`,
    })

    return NextResponse.json({ success: true, data: settlement })
  } catch (error: any) {
    console.error('Create settlement route error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to record settlement' }, { status: 500 })
  }
}
