-- Tạo bảng chat_conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  is_group BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo bảng chat_participants
CREATE TABLE IF NOT EXISTS chat_participants (
  participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Tạo bảng chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  reply_to UUID REFERENCES chat_messages(message_id) ON DELETE SET NULL
);

-- Tạo bảng chat_message_status
CREATE TABLE IF NOT EXISTS chat_message_status (
  status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(message_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(message_id, user_id)
);

-- Tạo index cho các bảng
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_default
ON chat_conversations(is_default);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id
ON chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation_id
ON chat_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
ON chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id
ON chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_status_message_id
ON chat_message_status(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_status_user_id
ON chat_message_status(user_id);

-- Thiết lập RLS (Row Level Security) cho các bảng
-- Bật RLS cho tất cả các bảng
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_status ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho bảng chat_conversations
CREATE POLICY "Users can view conversations they are part of" 
ON chat_conversations FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

-- Tạo policy cho bảng chat_participants
CREATE POLICY "Users can view participants of their conversations" 
ON chat_participants FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants to conversations they admin" 
ON chat_participants FOR INSERT 
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id FROM chat_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  ) OR user_id = auth.uid()
);

-- Tạo policy cho bảng chat_messages
CREATE POLICY "Users can view messages from their conversations" 
ON chat_messages FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations" 
ON chat_messages FOR INSERT 
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id FROM chat_participants 
    WHERE user_id = auth.uid()
  ) AND sender_id = auth.uid()
);

CREATE POLICY "Users can update their own messages" 
ON chat_messages FOR UPDATE 
USING (sender_id = auth.uid());

-- Tạo policy cho bảng chat_message_status
CREATE POLICY "Users can view message status from their conversations" 
ON chat_message_status FOR SELECT 
USING (
  message_id IN (
    SELECT message_id FROM chat_messages 
    WHERE conversation_id IN (
      SELECT conversation_id FROM chat_participants 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert their own message status" 
ON chat_message_status FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own message status" 
ON chat_message_status FOR UPDATE 
USING (user_id = auth.uid());