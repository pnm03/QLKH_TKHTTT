-- ============================================================================
-- FIX: TRIGGER ĐỒNG BỘ TỪ AUTH.USERS SANG USERS & ACCOUNTS
-- ============================================================================
-- Vấn đề: Khi tạo tài khoản mới, user không tự động được thêm vào bảng Users và Accounts
-- Nguyên nhân: Function handle_new_user() có lỗi logic và không khớp với cấu trúc bảng
-- ============================================================================

-- BƯỚC 1: Xóa trigger và function cũ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- BƯỚC 2: Tạo lại function với logic đúng
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    new_branch_id INT;
BEGIN
    -- Log để debug
    RAISE NOTICE '🔔 Trigger fired: Tạo user mới với email: %', NEW.email;
    
    -- Lấy branch_id mặc định (branch đầu tiên, hoặc NULL nếu chưa có branch)
    SELECT branch_id INTO new_branch_id 
    FROM public.Branches 
    LIMIT 1;
    
    -- BƯỚC 1: Thêm vào bảng Users
    BEGIN
        INSERT INTO public.Users (
            user_id,
            branch_id,
            full_name,
            email,
            phone,
            birth_date,
            hometown,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            new_branch_id, -- NULL nếu chưa có branch
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Fallback to email
            NEW.email,
            NEW.raw_user_meta_data->>'phone',
            (NEW.raw_user_meta_data->>'birth_date')::DATE,
            NEW.raw_user_meta_data->>'hometown',
            NEW.created_at,
            NOW()
        );
        
        RAISE NOTICE '✅ Đã thêm vào bảng Users: %', NEW.email;
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE WARNING '⚠️ User đã tồn tại trong bảng Users: %', NEW.email;
            RETURN NEW; -- Không throw error, vẫn tiếp tục
        WHEN foreign_key_violation THEN
            -- Nếu lỗi foreign key (branch_id), thử lại với NULL
            RAISE WARNING '⚠️ Branch không tồn tại, thử lại với branch_id = NULL';
            INSERT INTO public.Users (
                user_id, full_name, email, phone, birth_date, hometown, created_at, updated_at
            )
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                NEW.email,
                NEW.raw_user_meta_data->>'phone',
                (NEW.raw_user_meta_data->>'birth_date')::DATE,
                NEW.raw_user_meta_data->>'hometown',
                NEW.created_at,
                NOW()
            )
            ON CONFLICT (user_id) DO NOTHING;
        WHEN OTHERS THEN 
            RAISE WARNING '❌ Lỗi khi thêm vào Users: % - %', SQLSTATE, SQLERRM;
            RETURN NEW; -- Không throw error
    END;
    
    -- BƯỚC 2: Thêm vào bảng Accounts
    BEGIN
        INSERT INTO public.Accounts (
            id,
            user_id,
            user_name,
            password_hash,
            role,
            status,
            create_at,
            update_at
        )
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.email, -- Sử dụng email làm username
            '', -- Password đã được hash bởi Supabase Auth
            COALESCE(NEW.raw_user_meta_data->>'role', 'NVBH'), -- Default: NVBH (Nhân viên bán hàng)
            CASE 
                WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active'
                ELSE 'inactive'
            END,
            NEW.created_at,
            NOW()
        );
        
        RAISE NOTICE '✅ Đã thêm vào bảng Accounts: %', NEW.email;
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE WARNING '⚠️ Account đã tồn tại: %', NEW.email;
        WHEN foreign_key_violation THEN
            RAISE WARNING '⚠️ Lỗi foreign key khi thêm Account: %', NEW.email;
        WHEN OTHERS THEN 
            RAISE WARNING '❌ Lỗi khi thêm vào Accounts: % - %', SQLSTATE, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BƯỚC 3: Tạo trigger mới
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- BƯỚC 4: Tạo function để cập nhật status khi email được confirm
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ cập nhật khi email mới được confirm
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        UPDATE public.Accounts
        SET status = 'active', update_at = NOW()
        WHERE user_id = NEW.id;
        
        RAISE NOTICE '✅ Đã kích hoạt tài khoản: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BƯỚC 5: Tạo trigger cho email confirmation
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_email_confirmed();

-- ============================================================================
-- BƯỚC 6: ĐỒNG BỘ DỮ LIỆU CŨ (Nếu có user trong auth.users nhưng chưa có trong Users/Accounts)
-- ============================================================================

-- Đồng bộ vào bảng Users
INSERT INTO public.Users (
    user_id,
    full_name,
    email,
    phone,
    birth_date,
    hometown,
    created_at,
    updated_at
)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    au.email,
    au.raw_user_meta_data->>'phone',
    (au.raw_user_meta_data->>'birth_date')::DATE,
    au.raw_user_meta_data->>'hometown',
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.Users u WHERE u.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Đồng bộ vào bảng Accounts
INSERT INTO public.Accounts (
    id,
    user_id,
    user_name,
    password_hash,
    role,
    status,
    create_at,
    update_at
)
SELECT 
    gen_random_uuid(),
    au.id,
    au.email,
    '',
    COALESCE(au.raw_user_meta_data->>'role', 'NVBH'),
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
        ELSE 'inactive'
    END,
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.Accounts a WHERE a.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================================

-- Kiểm tra số lượng users trong từng bảng
SELECT 
    'auth.users' as table_name, 
    COUNT(*) as total_users 
FROM auth.users
UNION ALL
SELECT 
    'public.Users' as table_name, 
    COUNT(*) as total_users 
FROM public.Users
UNION ALL
SELECT 
    'public.Accounts' as table_name, 
    COUNT(*) as total_users 
FROM public.Accounts;

-- Hiển thị thông tin chi tiết
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    u.user_id IS NOT NULL as in_users_table,
    a.user_id IS NOT NULL as in_accounts_table,
    a.role,
    a.status
FROM auth.users au
LEFT JOIN public.Users u ON au.id = u.user_id
LEFT JOIN public.Accounts a ON au.id = a.user_id
ORDER BY au.created_at DESC;

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ Trigger đã được sửa và kích hoạt
-- ✅ Dữ liệu cũ đã được đồng bộ
-- ✅ User mới sẽ tự động được thêm vào Users & Accounts khi đăng ký
-- ============================================================================

