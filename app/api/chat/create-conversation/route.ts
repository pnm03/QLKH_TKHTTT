import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Kiểm tra xác thực
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const currentUserId = session.user.id
    
    // Lấy dữ liệu từ request
    const { users, name, isGroup } = await request.json()
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid users array' },
        { status: 400 }
      )
    }
    
    // Tạo cuộc trò chuyện
    const { data: conversationData, error: conversationError } = await supabase
      .from('chat_conversations')
      .insert({
        name: isGroup ? name : null,
        is_group: isGroup
      })
      .select()
      .single()
    
    if (conversationError) {
      console.error('Error creating conversation:', conversationError)
      return NextResponse.json(
        { error: 'Failed to create conversation', details: conversationError },
        { status: 500 }
      )
    }
    
    // Thêm người dùng hiện tại vào cuộc trò chuyện
    const { error: currentUserError } = await supabase
      .from('chat_participants')
      .insert({
        conversation_id: conversationData.conversation_id,
        user_id: currentUserId,
        is_admin: true
      })
    
    if (currentUserError) {
      console.error('Error adding current user to conversation:', currentUserError)
      return NextResponse.json(
        { error: 'Failed to add current user to conversation', details: currentUserError },
        { status: 500 }
      )
    }
    
    // Thêm các người dùng khác vào cuộc trò chuyện
    const otherParticipants = users.filter(userId => userId !== currentUserId)
    
    if (otherParticipants.length > 0) {
      const participantsToInsert = otherParticipants.map(userId => ({
        conversation_id: conversationData.conversation_id,
        user_id: userId,
        is_admin: false
      }))
      
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantsToInsert)
      
      if (participantsError) {
        console.error('Error adding other participants:', participantsError)
        // Không trả về lỗi, vẫn tiếp tục
      }
    }
    
    return NextResponse.json({
      success: true,
      conversation: conversationData
    })
    
  } catch (error) {
    console.error('Error in create-conversation API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}