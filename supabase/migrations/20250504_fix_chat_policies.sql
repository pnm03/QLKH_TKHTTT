-- Xóa các policy cũ có thể gây ra đệ quy vô hạn
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON chat_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they admin" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can view message status from their conversations" ON chat_message_status;

-- Tạo lại các policy đơn giản hơn
-- Policy cho bảng chat_participants
CREATE POLICY "Users can view all participants" 
ON chat_participants FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can add themselves as participants" 
ON chat_participants FOR INSERT 
TO authenticated
WITH CHECK (user_id::text = auth.uid()::text);

-- Policy cho bảng chat_messages
CREATE POLICY "Users can view all messages" 
ON chat_messages FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can send messages" 
ON chat_messages FOR INSERT 
TO authenticated
WITH CHECK (sender_id::text = auth.uid()::text);

-- Policy cho bảng chat_message_status
CREATE POLICY "Users can view all message status" 
ON chat_message_status FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own message status" 
ON chat_message_status FOR INSERT 
TO authenticated
WITH CHECK (user_id::text = auth.uid()::text);

-- Policy cho bảng chat_conversations
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON chat_conversations;

CREATE POLICY "Users can view all conversations" 
ON chat_conversations FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create conversations" 
ON chat_conversations FOR INSERT 
TO authenticated
WITH CHECK (true);