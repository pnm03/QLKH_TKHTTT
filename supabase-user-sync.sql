-- Script tạo bảng và trigger để đồng bộ dữ liệu từ auth.users sang bảng tùy chỉnh

-- 1. Tạo bảng Users
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    hometown TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Lưu thông tin cá nhân của người dùng';

-- 2. Tạo bảng Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL, -- username chính là email của người dùng
    role TEXT NOT NULL DEFAULT 'customer',
    status TEXT NOT NULL DEFAULT 'pending',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE public.accounts IS 'Lưu thông tin tài khoản của người dùng';

-- 3. Bật Row Level Security (RLS) cho bảng Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Bật Row Level Security (RLS) cho bảng Accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 5. Tạo Policy để người dùng chỉ có thể xem thông tin của chính mình trong bảng Users
CREATE POLICY users_select_policy ON public.users
    FOR SELECT
    USING (auth.uid() = user_id);

-- 6. Tạo Policy để người dùng chỉ có thể cập nhật thông tin của chính mình trong bảng Users
CREATE POLICY users_update_policy ON public.users
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 7. Tạo Policy để người dùng chỉ có thể xem thông tin của chính mình trong bảng Accounts
CREATE POLICY accounts_select_policy ON public.accounts
    FOR SELECT
    USING (auth.uid() = user_id);

-- 8. Tạo hàm để tự động thêm người dùng vào bảng Users và Accounts khi đăng ký mới
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Lấy metadata từ auth.users
    INSERT INTO public.users (user_id, email, full_name, phone, hometown, birth_date, created_at)
    VALUES (
        NEW.id, 
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'hometown',
        (NEW.raw_user_meta_data->>'birth_date')::DATE,
        NEW.created_at
    );
    
    -- Thêm vào bảng Accounts, username chính là email
    INSERT INTO public.accounts (user_id, username, role, status, created_at)
    VALUES (
        NEW.id,
        NEW.email, -- Dùng email làm username mặc định
        'customer', -- Vai trò mặc định
        CASE 
            WHEN NEW.confirmed_at IS NOT NULL THEN 'active'
            ELSE 'pending'
        END,
        NEW.created_at
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Tạo trigger để tự động gọi hàm handle_new_user khi có người dùng mới
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Tạo hàm để tự động cập nhật trạng thái người dùng khi được xác nhận
CREATE OR REPLACE FUNCTION public.handle_user_confirmation() 
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật trạng thái tài khoản thành 'active' khi email được xác nhận
    IF NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL THEN
        UPDATE public.accounts
        SET status = 'active'
        WHERE user_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Tạo trigger để tự động gọi hàm handle_user_confirmation khi người dùng được xác nhận
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmation();

-- 12. Tạo hàm để tự động cập nhật thời gian đăng nhập gần nhất
CREATE OR REPLACE FUNCTION public.handle_user_login() 
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật thời gian đăng nhập gần nhất
    UPDATE public.accounts
    SET last_login = NEW.created_at
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Tạo trigger để tự động gọi hàm handle_user_login khi người dùng đăng nhập
DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;
CREATE TRIGGER on_auth_session_created
    AFTER INSERT ON auth.sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_login(); 