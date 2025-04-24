-- Tạo hàm để tạo các bảng chat nếu chưa tồn tại
CREATE OR REPLACE FUNCTION create_chat_tables()
RETURNS void AS $$
BEGIN
  -- Tạo bảng chat_conversations nếu chưa tồn tại
  CREATE TABLE IF NOT EXISTS chat_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Tạo bảng chat_participants nếu chưa tồn tại
  CREATE TABLE IF NOT EXISTS chat_participants (
    participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
  );

  -- Tạo bảng chat_messages nếu chưa tồn tại
  CREATE TABLE IF NOT EXISTS chat_messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_to UUID REFERENCES chat_messages(message_id) ON DELETE SET NULL
  );

  -- Tạo bảng chat_attachments nếu chưa tồn tại
  CREATE TABLE IF NOT EXISTS chat_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Tạo bảng chat_message_status nếu chưa tồn tại
  CREATE TABLE IF NOT EXISTS chat_message_status (
    status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

  -- Tạo function để tự động cập nhật updated_at
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Tạo trigger để tự động cập nhật updated_at cho bảng chat_conversations
  DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
  CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

  -- Tạo trigger để tự động cập nhật updated_at cho bảng chat_messages
  DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
  CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

  -- Tạo function để tự động tạo chat_message_status khi có tin nhắn mới
  CREATE OR REPLACE FUNCTION create_message_status_records()
  RETURNS TRIGGER AS $$
  DECLARE
    msg_id UUID;
    conv_id UUID;
    send_id UUID;
  BEGIN
    msg_id := NEW.message_id;
    conv_id := NEW.conversation_id;
    send_id := NEW.sender_id;
    
    INSERT INTO chat_message_status (message_id, user_id, is_read)
    SELECT 
      msg_id,
      chat_participants.user_id,
      CASE WHEN chat_participants.user_id = send_id THEN TRUE ELSE FALSE END
    FROM 
      chat_participants
    WHERE 
      chat_participants.conversation_id = conv_id
      AND chat_participants.user_id != send_id;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Tạo trigger để tự động tạo chat_message_status khi có tin nhắn mới
  DROP TRIGGER IF EXISTS create_message_status_records_trigger ON chat_messages;
  CREATE TRIGGER create_message_status_records_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_status_records();

  -- Tạo function để tự động cập nhật updated_at của conversation khi có tin nhắn mới
  CREATE OR REPLACE FUNCTION update_conversation_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE chat_conversations
    SET updated_at = NOW()
    WHERE conversation_id = NEW.conversation_id;
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Tạo trigger để tự động cập nhật updated_at của conversation khi có tin nhắn mới
  DROP TRIGGER IF EXISTS update_conversation_updated_at_trigger ON chat_messages;
  CREATE TRIGGER update_conversation_updated_at_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

  -- Thiết lập RLS (Row Level Security) cho các bảng
  -- Bật RLS cho tất cả các bảng
  ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
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

  -- Tạo policy cho bảng chat_attachments
  CREATE POLICY "Users can view attachments from their conversations" 
  ON chat_attachments FOR SELECT 
  USING (
    message_id IN (
      SELECT message_id FROM chat_messages 
      WHERE conversation_id IN (
        SELECT conversation_id FROM chat_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

  CREATE POLICY "Users can add attachments to their messages" 
  ON chat_attachments FOR INSERT 
  WITH CHECK (
    message_id IN (
      SELECT message_id FROM chat_messages 
      WHERE sender_id = auth.uid()
    )
  );

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

END;
$$ LANGUAGE plpgsql;