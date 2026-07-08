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

    const { name, description, icon, memberIds } = await req.json()

    // 1. Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        icon: icon || '✈️',
        created_by: user.id,
      })
      .select()
      .single()

    if (groupError) throw groupError

    // 2. Add members (including creator)
    const membersToInsert = [
      { group_id: group.id, user_id: user.id, role: 'admin' },
      ...(memberIds || [])
        .filter((id: string) => id !== user.id)
        .map((id: string) => ({ group_id: group.id, user_id: id, role: 'member' })),
    ]

    const { error: membersError } = await supabase
      .from('group_members')
      .upsert(membersToInsert, { onConflict: 'group_id,user_id' })

    if (membersError) throw membersError

    // 3. Get creator full name for SNS
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // 4. Publish SNS Event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'GROUP_CREATED',
      userId: user.id,
      groupId: group.id,
      message: `${profile?.full_name || 'Someone'} created group "${name}".`,
    })

    return NextResponse.json({ success: true, data: group })
  } catch (error: any) {
    console.error('Create group route error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create group' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId, userIdToAdd } = await req.json()
    if (!groupId || !userIdToAdd) {
      return NextResponse.json({ success: false, error: 'groupId and userIdToAdd are required' }, { status: 400 })
    }

    // 1. Check if user is already in group
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userIdToAdd)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({ success: false, error: 'User is already a member of this group' }, { status: 400 })
    }

    // 2. Add user to group
    const { error: insertError } = await supabase
      .from('group_members')
      .upsert(
        {
          group_id: groupId,
          user_id: userIdToAdd,
          role: 'member',
        },
        { onConflict: 'group_id,user_id' }
      )

    if (insertError) throw insertError

    // 3. Get group and profiles information for the SNS message
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single()

    const { data: addedProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userIdToAdd)
      .single()

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // 4. Publish SNS Event asynchronously (non-blocking)
    publishSnsEvent({
      eventType: 'USER_ADDED_TO_GROUP',
      userId: user.id,
      groupId: groupId,
      message: `${currentProfile?.full_name || 'Someone'} added ${addedProfile?.full_name || 'user'} to group "${group?.name || 'Group'}".`,
    })

    return NextResponse.json({ success: true, message: 'User added to group successfully' })
  } catch (error: any) {
    console.error('Add group member route error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to add group member' }, { status: 500 })
  }
}
