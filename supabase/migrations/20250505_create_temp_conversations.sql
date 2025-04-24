-- Tạo bảng tạm thời để lưu trữ cuộc trò chuyện
CREATE TABLE IF NOT EXISTS temp_conversations (
  id SERIAL PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  participants TEXT[] NOT NULL
);

-- Tạo chính sách cho bảng tạm thời
ALTER TABLE temp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own temp conversations"
ON temp_conversations FOR INSERT
TO authenticated
WITH CHECK (created_by::text = auth.uid()::text);

CREATE POLICY "Users can view their own temp conversations"
ON temp_conversations FOR SELECT
TO authenticated
USING (created_by::text = auth.uid()::text);

-- Tạo function để lấy cuộc trò chuyện tạm thời
CREATE OR REPLACE FUNCTION get_temp_conversations(user_id TEXT)
RETURNS SETOF temp_conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM temp_conversations
  WHERE created_by::text = user_id::text
  ORDER BY created_at DESC;
$$;