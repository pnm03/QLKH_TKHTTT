-- ============================================================================
-- ĐỒNG BỘ NGƯỜI DÙNG TỪ AUTH.USERS VÀO USERS & ACCOUNTS
-- ============================================================================
-- Mục đích: Đồng bộ các user đã tồn tại trong auth.users vào bảng users và accounts
-- Sử dụng: Chạy file này khi cần đồng bộ lại dữ liệu user
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: ĐỒNG BỘ VÀO BẢNG USERS
-- ============================================================================

INSERT INTO public.users (
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
SELECT 
    au.id,
    NULL, -- branch_id để NULL, có thể cập nhật sau
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    au.email,
    au.raw_user_meta_data->>'phone' as phone,
    (au.raw_user_meta_data->>'birth_date')::DATE as birth_date,
    au.raw_user_meta_data->>'hometown' as hometown,
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- BƯỚC 2: ĐỒNG BỘ VÀO BẢNG ACCOUNTS
-- ============================================================================

INSERT INTO public.accounts (
    id,
    user_id,
    user_name,
    password_hash,
    role,
    status,
    last_login,
    create_at,
    update_at
)
SELECT 
    gen_random_uuid() as id,
    au.id as user_id,
    au.email as user_name,
    '' as password_hash, -- Password đã được quản lý bởi Supabase Auth
    COALESCE(au.raw_user_meta_data->>'role', 'NVBH') as role,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
        ELSE 'inactive'
    END as status,
    au.last_sign_in_at as last_login,
    au.created_at as create_at,
    NOW() as update_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE a.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- BƯỚC 3: KIỂM TRA KẾT QUẢ
-- ============================================================================

-- So sánh số lượng users
SELECT 
    'auth.users' as bang, 
    COUNT(*) as so_luong 
FROM auth.users

UNION ALL

SELECT 
    'public.users' as bang, 
    COUNT(*) as so_luong 
FROM public.users

UNION ALL

SELECT 
    'public.accounts' as bang, 
    COUNT(*) as so_luong 
FROM public.accounts;

-- Xem chi tiết users đã đồng bộ
SELECT 
    au.email,
    au.created_at as "Ngày tạo",
    au.email_confirmed_at as "Đã xác nhận email",
    CASE WHEN u.user_id IS NOT NULL THEN '✅' ELSE '❌' END as "Có trong users",
    CASE WHEN a.user_id IS NOT NULL THEN '✅' ELSE '❌' END as "Có trong accounts",
    a.role as "Vai trò",
    a.status as "Trạng thái"
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.user_id
LEFT JOIN public.accounts a ON au.id = a.user_id
ORDER BY au.created_at DESC;

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ User từ auth.users đã được đồng bộ vào users và accounts
-- ✅ Số lượng trong 3 bảng phải bằng nhau
-- ============================================================================

SELECT 'ĐỒNG BỘ HOÀN TẤT!' as status;

