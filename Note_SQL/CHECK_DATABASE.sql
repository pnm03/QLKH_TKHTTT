-- ============================================================================
-- KIỂM TRA DATABASE VÀ DEBUG
-- ============================================================================
-- Chạy file này để xem database có gì
-- ============================================================================

-- 1. Kiểm tra số lượng users
SELECT 'Số lượng users:' as thong_tin, COUNT(*) as so_luong FROM users;
SELECT 'Số lượng accounts:' as thong_tin, COUNT(*) as so_luong FROM accounts;
SELECT 'Số lượng auth.users:' as thong_tin, COUNT(*) as so_luong FROM auth.users;

-- 2. Xem 5 users đầu tiên
SELECT 
    'Top 5 users' as title,
    user_id,
    email,
    full_name,
    created_at
FROM users
LIMIT 5;

-- 3. Xem 5 accounts đầu tiên
SELECT 
    'Top 5 accounts' as title,
    user_id,
    user_name,
    role,
    status
FROM accounts
LIMIT 5;

-- 4. Kiểm tra RLS policies
SELECT 
    'RLS Policies' as title,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'accounts')
ORDER BY tablename, policyname;

-- 5. Kiểm tra xem có trigger không
SELECT 
    'Triggers' as title,
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. Join users + accounts để xem đầy đủ
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    a.role,
    a.status,
    u.created_at
FROM users u
LEFT JOIN accounts a ON u.user_id = a.user_id
LIMIT 10;

-- ============================================================================
-- NẾU KHÔNG CÓ DỮ LIỆU → CHẠY CÁC LỆNH SAU
-- ============================================================================

-- Thêm user test (NẾU chưa có user nào)
-- Uncomment và chạy nếu cần:

-- INSERT INTO users (user_id, full_name, email, created_at, updated_at)
-- VALUES 
--   (gen_random_uuid(), 'Nguyễn Văn A', 'test1@example.com', NOW(), NOW()),
--   (gen_random_uuid(), 'Trần Thị B', 'test2@example.com', NOW(), NOW()),
--   (gen_random_uuid(), 'Lê Văn C', 'test3@example.com', NOW(), NOW());

-- Thêm accounts tương ứng (CHỈ chạy SAU KHI đã thêm users ở trên)
-- INSERT INTO accounts (id, user_id, user_name, password_hash, role, status, create_at, update_at)
-- SELECT 
--   gen_random_uuid(),
--   user_id,
--   email,
--   '',
--   'NVBH',
--   'active',
--   NOW(),
--   NOW()
-- FROM users
-- WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE accounts.user_id = users.user_id);

