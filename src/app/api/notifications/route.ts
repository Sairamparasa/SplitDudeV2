import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notifications - Get current user notifications
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: notifications })
  } catch (error: any) {
    console.error('Fetch notifications error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch notifications' }, { status: 500 })
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, all } = await req.json()

    if (all) {
      // Mark all read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
      if (error) throw error
    } else if (notificationId) {
      // Mark specific read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
      if (error) throw error
    } else {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Notifications updated' })
  } catch (error: any) {
    console.error('Update notifications error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to update notifications' }, { status: 500 })
  }
}
