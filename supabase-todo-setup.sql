-- Tạo bảng todos
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Kích hoạt Row Level Security
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho SELECT (chỉ xem được todo của mình)
CREATE POLICY "Users can view own todos" 
ON public.todos 
FOR SELECT 
USING (auth.uid() = user_id);

-- Tạo policy cho INSERT
CREATE POLICY "Users can insert own todos" 
ON public.todos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Tạo policy cho UPDATE
CREATE POLICY "Users can update own todos" 
ON public.todos 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Tạo policy cho DELETE
CREATE POLICY "Users can delete own todos" 
ON public.todos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Thêm một vài dữ liệu mẫu (bỏ comment khi muốn sử dụng)
-- INSERT INTO public.todos (title, completed) VALUES
--   ('Hoàn thành dự án QLBH', false),
--   ('Học React và Next.js', true),
--   ('Tìm hiểu về Supabase', false); 