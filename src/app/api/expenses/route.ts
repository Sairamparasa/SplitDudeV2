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

    const { group_id, title, amount, paid_by, split_mode, splits } = await req.json()

    // 1. Insert expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id,
        title,
        amount,
        paid_by,
        split_mode,
      })
      .select()
      .single()

    if (expenseError) throw expenseError

    // 2. Insert splits if provided
    if (splits && splits.length > 0) {
      const splitsToInsert = splits.map((s: any) => ({
        expense_id: expense.id,
        user_id: s.user_id,
        amount: s.amount,
        share_value: s.share_value,
      }))
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitsToInsert)

      if (splitsError) throw splitsError
    }

    // 3. Get profile details of the creator/payer for the SNS message
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', paid_by)
      .single()

    // 4. Publish SNS Event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'EXPENSE_CREATED',
      userId: user.id,
      groupId: group_id,
      expenseId: expense.id,
      message: `${profile?.full_name || 'Someone'} added ₹${amount} for "${title}".`,
    })

    return NextResponse.json({ success: true, data: expense })
  } catch (error: any) {
    console.error('Create expense route error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create expense' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, title, amount, paid_by, split_mode, splits } = await req.json()

    // 1. Update expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .update({
        title,
        amount,
        paid_by,
        split_mode,
      })
      .eq('id', id)
      .select()
      .single()

    if (expenseError) throw expenseError

    // 2. Update splits (delete old ones and insert new ones)
    if (splits) {
      await supabase.from('expense_splits').delete().eq('expense_id', id)
      const splitsToInsert = splits.map((s: any) => ({
        expense_id: id,
        user_id: s.user_id,
        amount: s.amount,
        share_value: s.share_value,
      }))
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitsToInsert)

      if (splitsError) throw splitsError
    }

    // 3. Get profile details
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', paid_by)
      .single()

    // 4. Publish SNS Event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'EXPENSE_UPDATED',
      userId: user.id,
      groupId: expense.group_id,
      expenseId: id,
      message: `${profile?.full_name || 'Someone'} updated the expense "${title}" to ₹${amount}.`,
    })

    return NextResponse.json({ success: true, data: expense })
  } catch (error: any) {
    console.error('Update expense route error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 })
    }

    // Get expense details before deleting it for the SNS event
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single()

    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 })
    }

    // Delete the expense
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Publish SNS Event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'EXPENSE_DELETED',
      userId: user.id,
      groupId: expense.group_id,
      expenseId: id,
      message: `Expense "${expense.title}" was deleted.`,
    })

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' })
  } catch (error: any) {
    console.error('Delete expense route error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete expense' }, { status: 500 })
  }
}
