-- Kích hoạt extension pgcrypto nếu chưa được kích hoạt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bảng user_profiles để lưu thông tin người dùng
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tạo RLS policy để chỉ cho phép người dùng xem và chỉnh sửa profile của họ
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy cho SELECT
CREATE POLICY "Users can view own profiles" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy cho INSERT
CREATE POLICY "Users can insert own profiles" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy cho UPDATE
CREATE POLICY "Users can update own profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Tạo function để tự động tạo profile khi người dùng đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo trigger để gọi function khi có người dùng mới
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 