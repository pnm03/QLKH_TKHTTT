-- 1. Kiểm tra cấu trúc bảng hiện tại
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'accounts');

-- 2. Kiểm tra function handle_new_user hiện tại
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- 3. Tạo lại bảng users với cấu trúc rõ ràng
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    birthdate DATE,
    hometown TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tạo lại bảng accounts với cấu trúc rõ ràng
DROP TABLE IF EXISTS public.accounts CASCADE;

CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'customer',
    status TEXT DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Cập nhật function handle_new_user hiện có
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    log_message TEXT;
BEGIN
    -- Ghi log để debug
    log_message := 'Bắt đầu đồng bộ dữ liệu cho: ' || NEW.email;
    RAISE NOTICE '%', log_message;
    
    -- Thêm vào bảng users
    BEGIN
        INSERT INTO public.users (user_id, full_name, email, phone, created_at, updated_at)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            NEW.created_at,
            NEW.updated_at
        );
        RAISE NOTICE 'Đã thêm người dùng thành công: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE WARNING 'Lỗi khi thêm vào users: % - %', SQLSTATE, SQLERRM;
    END;
    
    -- Thêm vào bảng accounts
    BEGIN
        INSERT INTO public.accounts (user_id, username, role, status, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            'customer',
            CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active' ELSE 'pending' END,
            NEW.created_at,
            NEW.updated_at
        );
        RAISE NOTICE 'Đã thêm tài khoản thành công: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE WARNING 'Lỗi khi thêm vào accounts: % - %', SQLSTATE, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Tạo function cập nhật update_at nếu chưa có
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Đồng bộ dữ liệu hiện có nếu thiếu
INSERT INTO public.users (user_id, full_name, email, created_at, updated_at)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', ''),
    email,
    created_at,
    updated_at
FROM auth.users a
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = a.id
);

INSERT INTO public.accounts (user_id, username, role, status, created_at, updated_at)
SELECT 
    id,
    email,
    'customer',
    CASE WHEN email_confirmed_at IS NOT NULL THEN 'active' ELSE 'pending' END,
    created_at,
    updated_at
FROM auth.users a
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts ac WHERE ac.user_id = a.id
);

-- 8. Kiểm tra dữ liệu
SELECT 
    a.id as auth_id, 
    a.email as auth_email, 
    a.created_at as auth_created_at,
    u.user_id, 
    u.full_name, 
    u.email as user_email,
    ac.id as account_id, 
    ac.username, 
    ac.role, 
    ac.status
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.user_id
LEFT JOIN public.accounts ac ON a.id = ac.user_id
ORDER BY a.created_at DESC
LIMIT 5;