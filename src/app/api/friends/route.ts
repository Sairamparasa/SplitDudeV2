import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishSnsEvent } from '@/lib/aws/sns-helper'

// POST /api/friends - Send a friend request by SplitDude ID
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { uniqueCode } = await req.json()
    if (!uniqueCode) {
      return NextResponse.json({ success: false, error: 'SplitDude ID is required' }, { status: 400 })
    }

    // 1. Find profile by unique code
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('unique_code', uniqueCode.trim().toUpperCase())
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json({ success: false, error: 'User with this SplitDude ID not found' }, { status: 404 })
    }

    if (targetProfile.id === user.id) {
      return NextResponse.json({ success: false, error: 'You cannot add yourself' }, { status: 400 })
    }

    // 2. Check if already friends
    const { data: existingFriendship } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${targetProfile.id}),and(user_id_1.eq.${targetProfile.id},user_id_2.eq.${user.id})`)

    if (existingFriendship && existingFriendship.length > 0) {
      return NextResponse.json({ success: false, error: 'You are already friends with this user' }, { status: 400 })
    }

    // 3. Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetProfile.id}),and(sender_id.eq.${targetProfile.id},receiver_id.eq.${user.id})`)
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        if (existingRequest.sender_id === user.id) {
          return NextResponse.json({ success: false, error: 'Friend request already sent and pending' }, { status: 400 })
        } else {
          return NextResponse.json({ success: false, error: 'This user has already sent you a friend request. Accept it in your pending tab!' }, { status: 400 })
        }
      } else if (existingRequest.status === 'rejected') {
        // If rejected, let's allow sending again
        const { error: deleteError } = await supabase
          .from('friend_requests')
          .delete()
          .eq('id', existingRequest.id)
        if (deleteError) throw deleteError
      }
    }

    // 4. Create friend request
    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: targetProfile.id,
        status: 'pending',
      })

    if (insertError) throw insertError

    // 5. Create Notification for the receiver
    await supabase.from('notifications').insert({
      user_id: targetProfile.id,
      title: 'New Friend Request',
      content: `You received a friend request from SplitDude ID ${uniqueCode}.`,
      type: 'friend_request',
    })

    // Publish SNS event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'FRIEND_REQUEST_SENT',
      userId: user.id,
      message: `Friend request sent to SplitDude ID ${uniqueCode}.`,
    })

    return NextResponse.json({ success: true, message: 'Friend request sent successfully!' })
  } catch (error: any) {
    console.error('Friend request error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to send friend request' }, { status: 500 })
  }
}

// PUT /api/friends - Accept or reject friend request
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId, action } = await req.json() // action: 'accept' | 'reject'
    if (!requestId || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 })
    }

    // Find the request
    const { data: friendRequest, error: findError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('receiver_id', user.id)
      .single()

    if (findError || !friendRequest) {
      return NextResponse.json({ success: false, error: 'Friend request not found or unauthorized' }, { status: 404 })
    }

    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
      if (updateError) throw updateError

      return NextResponse.json({ success: true, message: 'Request rejected' })
    }

    // Action is accept - Create mutual friendship
    const user1 = user.id < friendRequest.sender_id ? user.id : friendRequest.sender_id
    const user2 = user.id < friendRequest.sender_id ? friendRequest.sender_id : user.id

    // Check if friendship already exists (sanity check)
    const { data: existingFriend } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id_1', user1)
      .eq('user_id_2', user2)
      .single()

    if (!existingFriend) {
      const { error: insertFriendError } = await supabase
        .from('friends')
        .insert({
          user_id_1: user1,
          user_id_2: user2,
        })
      if (insertFriendError) throw insertFriendError
    }

    // Update status to accepted
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
    if (updateError) throw updateError

    // Create Notification for sender
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await supabase.from('notifications').insert({
      user_id: friendRequest.sender_id,
      title: 'Friend Request Accepted',
      content: `${myProfile?.full_name || 'Someone'} accepted your friend request.`,
      type: 'friend_request',
    })

    // Publish SNS event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'FRIEND_REQUEST_ACCEPTED',
      userId: user.id,
      message: `${myProfile?.full_name || 'Someone'} accepted friend request from sender ID ${friendRequest.sender_id}.`,
    })

    return NextResponse.json({ success: true, message: 'Friend request accepted!' })
  } catch (error: any) {
    console.error('Accept friend error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to update friend request' }, { status: 500 })
  }
}
