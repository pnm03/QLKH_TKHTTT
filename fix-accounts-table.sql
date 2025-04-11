-- Script sửa lỗi đồng bộ dữ liệu vào bảng accounts

-- 1. Kiểm tra cấu trúc bảng accounts hiện tại
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' AND table_schema = 'public';

-- 2. Đồng bộ lại dữ liệu từ auth.users sang accounts, không sử dụng cột email
INSERT INTO public.accounts (user_id, username, role, status, created_at)
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
    SELECT 1 FROM public.accounts WHERE accounts.user_id = auth.users.id
);

-- 3. Kiểm tra dữ liệu sau khi đồng bộ
SELECT 
    a.user_id, 
    a.username, -- username chính là email
    a.role, 
    a.status,
    u.email AS auth_email
FROM public.accounts a
JOIN auth.users u ON a.user_id = u.id; 