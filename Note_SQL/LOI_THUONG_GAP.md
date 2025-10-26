# 🐛 LỖI THƯỜNG GẶP KHI SETUP DATABASE

## ❌ Lỗi: "must be owner of relation users"

### **Nguyên nhân:**
Khi chạy `ALL_TRIGGERS_COMPLETE.sql`, cố tạo trigger trên bảng `auth.users` (bảng hệ thống của Supabase) nhưng không có quyền superuser.

### **Giải pháp:**

✅ **BỎ QUA LỖI NÀY!** File đã được sửa để tự động xử lý.

**Trigger đã được tạo trong `FULL_DATABASE_SETUP.sql` rồi**, nên lỗi này không ảnh hưởng gì cả.

### **Cách xử lý:**

**Cách 1: Chạy lại file đã sửa** (Khuyến nghị)
1. Copy lại file `ALL_TRIGGERS_COMPLETE.sql` (đã sửa)
2. Paste vào SQL Editor
3. Run → Sẽ hiển thị:
   ```
   ⚠️ Trigger on_auth_user_created đã tồn tại - Bỏ qua
   ⚠️ Không có quyền tạo trigger trên auth.users - Bỏ qua
   ```
4. ✅ Các trigger khác vẫn được tạo thành công!

**Cách 2: Kiểm tra trigger đã tồn tại**
```sql
-- Chạy query này để kiểm tra
SELECT 
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
    'on_auth_user_created',
    'on_auth_user_email_confirmed',
    'on_auth_session_created'
);
```

Nếu có kết quả → ✅ Trigger đã tồn tại, không cần lo!

---

## ❌ Lỗi: "relation does not exist" hoặc Không hiển thị users

### **Nguyên nhân 1:** Chưa chạy `FULL_DATABASE_SETUP.sql`

**Giải pháp:**
1. Chạy `FULL_DATABASE_SETUP.sql` TRƯỚC
2. Sau đó chạy các file khác

### **Nguyên nhân 2:** Tên bảng không khớp (Users vs users) ⭐ **PHỔ BIẾN!**

Code query `from('users')` (chữ thường) nhưng bảng tên `Users` (chữ U hoa) → PostgreSQL phân biệt chữ hoa/thường!

**Giải pháp:**
1. Chạy file `FIX_TABLE_NAMES_LOWERCASE.sql`
2. File này sẽ đổi tất cả bảng về chữ thường
3. Code sẽ query được ngay!

**Kiểm tra:**
```sql
-- Xem tên bảng hiện tại
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Nếu thấy "Users", "Accounts" (chữ hoa) → Cần chạy FIX
-- Nếu thấy "users", "accounts" (chữ thường) → OK!
```

---

## ❌ Lỗi: User không tự động vào Users/Accounts

### **Nguyên nhân:**
Trigger `on_auth_user_created` chưa được tạo hoặc bị lỗi

### **Giải pháp:**

**Bước 1: Kiểm tra trigger có tồn tại không**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

**Bước 2: Nếu KHÔNG có → Chạy file này**
```sql
-- File: FIX_USER_SYNC_TRIGGER.sql
-- Copy và chạy trong SQL Editor
```

**Bước 3: Đồng bộ user cũ thủ công**
```sql
-- Đồng bộ vào Users
INSERT INTO public.Users (user_id, full_name, email, created_at, updated_at)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', email),
    email,
    created_at,
    NOW()
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.Users WHERE user_id = auth.users.id)
ON CONFLICT (user_id) DO NOTHING;

-- Đồng bộ vào Accounts
INSERT INTO public.Accounts (id, user_id, user_name, password_hash, role, status, create_at, update_at)
SELECT 
    gen_random_uuid(),
    id,
    email,
    '',
    'NVBH',
    CASE WHEN email_confirmed_at IS NOT NULL THEN 'active' ELSE 'inactive' END,
    created_at,
    NOW()
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.Accounts WHERE user_id = auth.users.id)
ON CONFLICT (user_id) DO NOTHING;
```

---

## ❌ Lỗi: Tồn kho bị âm

### **Nguyên nhân:**
Trigger `trg_update_product_stock` đang giảm tồn kho nhưng số lượng không đủ

### **Giải pháp:**
```sql
-- Kiểm tra sản phẩm có tồn kho âm
SELECT product_id, product_name, stock_quantity
FROM Products
WHERE stock_quantity < 0;

-- Cập nhật lại tồn kho
UPDATE Products
SET stock_quantity = 0
WHERE stock_quantity < 0;
```

---

## ❌ Lỗi: "permission denied for schema auth"

### **Nguyên nhân:**
Không có quyền truy cập schema `auth`

### **Giải pháp:**
```sql
-- Cấp quyền (chạy với quyền admin)
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
```

---

## ❌ Lỗi: "function already exists"

### **Nguyên nhân:**
Function đã được tạo trước đó

### **Giải pháp:**
✅ **BỎ QUA!** File SQL đã có `CREATE OR REPLACE FUNCTION`, sẽ tự động thay thế function cũ.

---

## 🔍 KIỂM TRA TỔNG QUAN

Chạy query này để kiểm tra toàn bộ:

```sql
-- 1. Kiểm tra số lượng bảng
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';
-- Kết quả mong đợi: 16 bảng

-- 2. Kiểm tra số lượng triggers
SELECT COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public' OR event_object_schema = 'auth';
-- Kết quả mong đợi: >= 10 triggers

-- 3. Kiểm tra functions
SELECT COUNT(*) as total_functions
FROM information_schema.routines
WHERE routine_schema = 'public';
-- Kết quả mong đợi: >= 10 functions

-- 4. Kiểm tra users đã đồng bộ
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.Users) as public_users,
    (SELECT COUNT(*) FROM public.Accounts) as public_accounts;
-- Kết quả mong đợi: 3 số bằng nhau
```

---

## 📞 VẪN GẶP LỖI?

1. **Đọc lại START_HERE.md** - Đảm bảo làm đúng thứ tự
2. **Chạy CHECK_TRIGGER_HIEN_TAI.sql** - Xem trigger nào thiếu
3. **Check logs** trong Supabase Dashboard → Logs → Postgres Logs
4. **Xóa database và tạo lại** - Đôi khi cách nhanh nhất

---

**✅ Hầu hết lỗi đều có thể bỏ qua hoặc tự động fix!**

