-- Script đồng bộ thủ công từ auth.users sang bảng Users và Accounts
-- Chạy script này trong SQL Editor của Supabase nếu bạn muốn đồng bộ dữ liệu ngay lập tức

-- 1. Kiểm tra bảng auth.users
SELECT * FROM auth.users;

-- 2. Kiểm tra bảng Users
SELECT * FROM users;

-- 3. Kiểm tra bảng Accounts
SELECT * FROM accounts;

-- 4. Đồng bộ thủ công từ auth.users sang Users (nếu chưa có dữ liệu)
INSERT INTO users (user_id, email, full_name, phone, hometown, birth_date, created_at)
SELECT 
    id, 
    email,
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'phone',
    raw_user_meta_data->>'hometown',
    (raw_user_meta_data->>'birth_date')::DATE,
    created_at
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.user_id = auth.users.id
);

-- 5. Đồng bộ thủ công từ auth.users sang Accounts (nếu chưa có dữ liệu)
INSERT INTO accounts (user_id, username, role, status, created_at)
SELECT 
    id, 
    email, -- Sử dụng email làm username
    'customer', -- Vai trò mặc định 
    CASE 
        WHEN confirmed_at IS NOT NULL THEN 'active'
        ELSE 'pending'
    END, -- Trạng thái dựa vào việc xác nhận email
    created_at
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM accounts WHERE accounts.user_id = auth.users.id
);

-- 6. Cập nhật last_login cho bảng Accounts từ dữ liệu auth.sessions nếu có
UPDATE accounts
SET last_login = s.created_at
FROM (
    SELECT user_id, MAX(created_at) as created_at
    FROM auth.sessions
    GROUP BY user_id
) s
WHERE accounts.user_id = s.user_id;

-- 7. Kiểm tra lại dữ liệu sau khi đồng bộ
SELECT 
    u.user_id, 
    u.email as user_email, 
    u.full_name,
    u.phone,
    u.hometown,
    u.birth_date,
    a.username, 
    a.role, 
    a.status
FROM users u
JOIN accounts a ON u.user_id = a.user_id; 