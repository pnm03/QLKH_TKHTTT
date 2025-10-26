-- ============================================================================
-- KIỂM TRA TRIGGER ĐỒNG BỘ USER HIỆN TẠI
-- ============================================================================
-- Chạy file này để xem trigger có đang hoạt động không
-- ============================================================================

-- 1. Kiểm tra trigger có tồn tại không
SELECT 
    trigger_name,
    event_object_schema,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' OR trigger_schema = 'auth'
ORDER BY event_object_table, trigger_name;

-- 2. Kiểm tra function handle_new_user có tồn tại không
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- 3. So sánh số lượng users trong các bảng
SELECT 'auth.users' as bang, COUNT(*) as so_luong FROM auth.users
UNION ALL
SELECT 'public.Users' as bang, COUNT(*) as so_luong FROM public.Users
UNION ALL
SELECT 'public.Accounts' as bang, COUNT(*) as so_luong FROM public.Accounts;

-- 4. Xem chi tiết users nào chưa được đồng bộ
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    CASE WHEN u.user_id IS NOT NULL THEN '✅' ELSE '❌' END as co_trong_Users,
    CASE WHEN a.user_id IS NOT NULL THEN '✅' ELSE '❌' END as co_trong_Accounts,
    a.role,
    a.status
FROM auth.users au
LEFT JOIN public.Users u ON au.id = u.user_id
LEFT JOIN public.Accounts a ON au.id = a.user_id
ORDER BY au.created_at DESC;

-- 5. Nếu có user chưa được đồng bộ, hiển thị danh sách
SELECT 
    au.id,
    au.email,
    'Thiếu trong Users' as van_de
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.Users u WHERE u.user_id = au.id)

UNION ALL

SELECT 
    au.id,
    au.email,
    'Thiếu trong Accounts' as van_de
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.Accounts a WHERE a.user_id = au.id);

-- ============================================================================
-- KẾT QUẢ:
-- - Nếu trigger tồn tại → Trigger vẫn hoạt động
-- - Nếu số lượng BẰNG NHAU → Không có vấn đề gì
-- - Nếu số lượng KHÁC NHAU → Cần đồng bộ lại
-- ============================================================================

