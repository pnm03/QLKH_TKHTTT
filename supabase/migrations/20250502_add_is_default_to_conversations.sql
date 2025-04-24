-- Add is_default column to chat_conversations table
ALTER TABLE IF EXISTS chat_conversations
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create index on is_default column
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_default
ON chat_conversations(is_default);