# 🔧 SỬA LỖI ĐỒNG BỘ USER TỪ AUTH → USERS & ACCOUNTS

## 🐛 **Vấn đề**

Khi tạo tài khoản mới qua Authentication, user được lưu vào `auth.users` nhưng **KHÔNG** tự động đồng bộ vào bảng `Users` và `Accounts`.

## ✅ **Giải pháp**

Chạy file SQL fix để sửa trigger và đồng bộ lại dữ liệu.

---

## 📝 **CÁCH THỰC HIỆN**

### **Bước 1: Vào Supabase SQL Editor**

1. Đăng nhập [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor** (biểu tượng database bên trái)
4. Click **"+ New query"**

### **Bước 2: Chạy file FIX**

1. Mở file `FIX_USER_SYNC_TRIGGER.sql` trong thư mục này
2. **Copy toàn bộ** nội dung
3. **Paste** vào SQL Editor
4. Click nút **"Run"** (hoặc `Ctrl + Enter`)
5. Đợi khoảng **10-20 giây**

### **Bước 3: Kiểm tra kết quả**

Sau khi chạy xong, bạn sẽ thấy bảng kết quả:

```
table_name        | total_users
------------------|------------
auth.users        | X
public.Users      | X (phải bằng auth.users)
public.Accounts   | X (phải bằng auth.users)
```

✅ **Nếu số lượng bằng nhau** → Thành công!

❌ **Nếu không bằng** → Xem phần "Xử lý lỗi" bên dưới

---

## 🧪 **TEST**

### **Test 1: Tạo user mới**

```sql
-- Trong SQL Editor, chạy query này để xem trigger có hoạt động không
SELECT 
    au.email,
    u.user_id IS NOT NULL as co_trong_users,
    a.user_id IS NOT NULL as co_trong_accounts
FROM auth.users au
LEFT JOIN public.Users u ON au.id = u.user_id
LEFT JOIN public.Accounts a ON au.id = a.user_id
ORDER BY au.created_at DESC
LIMIT 5;
```

Kết quả mong đợi:
```
email              | co_trong_users | co_trong_accounts
-------------------|----------------|-------------------
user@example.com   | true           | true
```

### **Test 2: Tạo tài khoản mới qua UI**

1. Vào trang đăng ký: `http://localhost:3000/auth/signup`
2. Tạo tài khoản mới
3. Kiểm tra trong Supabase:
   - Tab **Authentication** → **Users** → Có user mới ✅
   - Tab **Table Editor** → **Users** → Có bản ghi mới ✅
   - Tab **Table Editor** → **Accounts** → Có bản ghi mới ✅

---

## 🔍 **XỬ LÝ LỖI**

### **Lỗi 1: "permission denied for schema auth"**

**Nguyên nhân:** Không có quyền truy cập schema `auth`

**Giải pháp:**
```sql
-- Chạy với quyền admin
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
```

### **Lỗi 2: "function handle_new_user() already exists"**

**Nguyên nhân:** Function cũ vẫn còn

**Giải pháp:** Đã có trong file FIX (DROP FUNCTION), chạy lại là được

### **Lỗi 3: "relation 'Users' does not exist"**

**Nguyên nhân:** Chưa chạy `FULL_DATABASE_SETUP.sql`

**Giải pháp:**
1. Chạy `FULL_DATABASE_SETUP.sql` trước
2. Sau đó chạy `FIX_USER_SYNC_TRIGGER.sql`

### **Lỗi 4: User cũ vẫn chưa được đồng bộ**

**Giải pháp:** File FIX đã có phần đồng bộ dữ liệu cũ. Nếu vẫn không được:

```sql
-- Đồng bộ thủ công
INSERT INTO public.Users (user_id, full_name, email, created_at, updated_at)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', email),
    email,
    created_at,
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.Users)
ON CONFLICT (user_id) DO NOTHING;

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
WHERE id NOT IN (SELECT user_id FROM public.Accounts)
ON CONFLICT (user_id) DO NOTHING;
```

---

## 📊 **KIỂM TRA TRIGGER**

Xem trigger có được tạo đúng không:

```sql
-- Xem danh sách triggers
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users';
```

Kết quả mong đợi:
```
trigger_name              | event_object_table | action_statement
--------------------------|--------------------|-----------------
on_auth_user_created      | users              | EXECUTE FUNCTION public.handle_new_user()
on_auth_user_email_confirmed | users           | EXECUTE FUNCTION public.handle_user_email_confirmed()
```

---

## 🎯 **TÓM TẮT**

1. ✅ Chạy file `FIX_USER_SYNC_TRIGGER.sql` trong Supabase SQL Editor
2. ✅ Kiểm tra số lượng users trong 3 bảng phải bằng nhau
3. ✅ Test tạo tài khoản mới
4. ✅ Xem logs trigger để debug (nếu cần)

---

## 📌 **LƯU Ý**

- ⚠️ Trigger chỉ hoạt động với **user mới** được tạo **SAU KHI** chạy fix
- ⚠️ User cũ được đồng bộ tự động bởi phần sync trong file FIX
- ⚠️ Nếu vẫn lỗi, check logs trong Supabase Dashboard → Logs → Postgres Logs

---

**✅ Sau khi chạy fix xong, vấn đề sẽ được giải quyết hoàn toàn!**

