# 🚀 SETUP LẠI DATABASE TỪ ĐẦU

> **Tình huống:** Database cũ đã mất, cần tạo lại từ đầu

---

## ⚡ QUICK START (5 phút)

### **Bước 1: Tạo Project Supabase mới** (1 phút)

1. Vào https://app.supabase.com
2. Click **"New Project"**
3. Điền:
   - Name: `qlbh-system`
   - Database Password: (tạo password mạnh và **LƯU LẠI**)
   - Region: **Southeast Asia (Singapore)**
4. Click **"Create new project"**
5. Đợi 2-3 phút

### **Bước 2: Lấy thông tin kết nối** (30 giây)

1. Sau khi project được tạo, vào **Settings** → **API**
2. Copy các giá trị:
   - ✅ `Project URL`
   - ✅ `anon public` key
   - ✅ `service_role` key

3. Cập nhật file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### **Bước 3: Chạy SQL Setup** (3 phút)

**3.1. Tạo cấu trúc database:**

1. Vào **SQL Editor** trong Supabase
2. Click **"+ New query"**
3. Mở file `FULL_DATABASE_SETUP.sql`
4. **Copy TOÀN BỘ** nội dung
5. **Paste** vào SQL Editor
6. Click **"Run"** (hoặc `Ctrl + Enter`)
7. Đợi 1-2 phút → ✅ **Xong bước 1!**

**3.2. Đổi tên bảng về chữ thường:** 🔧 **QUAN TRỌNG!**

1. Click **"+ New query"** (query mới)
2. Mở file `FIX_TABLE_NAMES_LOWERCASE.sql`
3. **Copy TOÀN BỘ** nội dung
4. **Paste** vào SQL Editor
5. Click **"Run"**
6. Đợi ~10 giây → ✅ **Hoàn tất bước 2!**

**3.3. Thêm tất cả triggers:** ⚡ **QUAN TRỌNG!**

1. Click **"+ New query"** (query mới lần nữa)
2. Mở file `ALL_TRIGGERS_COMPLETE.sql`
3. **Copy TOÀN BỘ** nội dung
4. **Paste** vào SQL Editor
5. Click **"Run"**
6. Đợi ~30 giây → ✅ **Hoàn tất!**

### **Bước 4: Kiểm tra** (30 giây)

Vào **Table Editor**, bạn sẽ thấy:

✅ 16 bảng được tạo:
- Branches, Users, Accounts, Customers, Staff
- Category, Products, Payments
- Orders, Orderdetails, Shippings, Returns
- chat_conversations, chat_participants, chat_messages, chat_message_status

✅ **12 Triggers tự động:**
1. `trg_calculate_orderdetail_subtotal` - Tính subtotal tự động
2. `trg_update_product_stock` - Giảm tồn kho khi bán
3. `trg_users_updated_at` - Cập nhật updated_at (Users)
4. `trg_products_updated_at` - Cập nhật updated_at (Products)
5. `trg_customers_updated_at` - Cập nhật updated_at (Customers)
6. `trg_payments_updated_at` - Cập nhật updated_at (Payments)
7. `trg_accounts_update_at` - Cập nhật update_at (Accounts)
8. `on_auth_user_created` - Đồng bộ user mới từ auth ⭐
9. `on_auth_user_email_confirmed` - Kích hoạt khi confirm email
10. `on_auth_session_created` - Cập nhật last_login
11. `trg_calculate_order_total_price` - Tính tổng đơn hàng
12. `trg_save_cost_price_at_sale` - Lưu giá nhập khi bán

---

## 🧪 TEST NGAY

### **Test 1: Tạo tài khoản**

1. Vào **Authentication** → **Users**
2. Click **"Add user"** → **Create new user**
3. Điền email và password
4. Click **"Create user"**

**Kiểm tra:**
- Vào **Table Editor** → **Users** → Phải có user mới ✅
- Vào **Table Editor** → **Accounts** → Phải có account mới ✅

**Nếu KHÔNG có** → Chạy `FIX_USER_SYNC_TRIGGER.sql`

### **Test 2: Thêm dữ liệu mẫu**

Chạy SQL sau để thêm data test:

```sql
-- Thêm chi nhánh
INSERT INTO Branches (branch_name, branch_address) VALUES
('Chi nhánh Hà Nội', '123 Đường Láng, Đống Đa, Hà Nội'),
('Chi nhánh TP.HCM', '456 Nguyễn Huệ, Q1, TP.HCM');

-- Thêm danh mục
INSERT INTO Category (name_category, description_category) VALUES
('Điện thoại', 'Điện thoại thông minh các loại'),
('Laptop', 'Máy tính xách tay'),
('Phụ kiện', 'Phụ kiện điện thoại, laptop');

-- Thêm phương thức thanh toán
INSERT INTO Payments (payment_method_name, description) VALUES
('Tiền mặt', 'Thanh toán bằng tiền mặt'),
('Chuyển khoản', 'Chuyển khoản ngân hàng'),
('Ví điện tử', 'MoMo, ZaloPay, VNPay');

-- Kiểm tra
SELECT * FROM Category;
```

### **Test 3: Chạy dự án**

```bash
cd E:\APP_KY2_NAM2\QLBH_TKHTTTQL\qlbh-system
npm run dev
```

Truy cập:
- http://localhost:3000 → Trang chủ
- http://localhost:3000/todo-example → Test kết nối DB
- http://localhost:3000/auth/signin → Đăng nhập

---

## 🔧 NẾU GẶP VẤN ĐỀ

### **Vấn đề 1: Tạo user nhưng không tự động vào Users/Accounts**

**Cách 1: Kiểm tra trigger**
```sql
-- Chạy file này
-- File: CHECK_TRIGGER_HIEN_TAI.sql
```

**Cách 2: Fix trigger** (nếu cần)
```sql
-- Chạy file này
-- File: FIX_USER_SYNC_TRIGGER.sql
```

### **Vấn đề 2: Lỗi "relation does not exist"**

→ Chưa chạy `FULL_DATABASE_SETUP.sql`, quay lại Bước 3

### **Vấn đề 3: Lỗi kết nối Supabase**

→ Kiểm tra lại `.env.local`, đảm bảo URL và keys đúng

---

## 📂 CÁC FILE QUAN TRỌNG

| File | Khi nào dùng |
|------|--------------|
| **FULL_DATABASE_SETUP.sql** | ✅ **CHẠY ĐẦU TIÊN** - Tạo toàn bộ database |
| **CHECK_TRIGGER_HIEN_TAI.sql** | Kiểm tra trigger có hoạt động không |
| **FIX_USER_SYNC_TRIGGER.sql** | Chỉ chạy nếu user không tự động đồng bộ |
| **HUONG_DAN_SETUP_DATABASE.md** | Hướng dẫn chi tiết đầy đủ |
| **00_README_SETUP.md** | Tổng quan toàn bộ tài liệu |

---

## ✅ CHECKLIST

- [ ] Tạo project Supabase mới
- [ ] Copy URL và keys vào `.env.local`
- [ ] Chạy `FULL_DATABASE_SETUP.sql`
- [ ] Kiểm tra 16 bảng đã được tạo
- [ ] Test tạo user → Tự động vào Users/Accounts
- [ ] Thêm dữ liệu mẫu
- [ ] Chạy `npm run dev` và test

---

## 🎯 TÓM TẮT

```
1. Tạo project Supabase
2. Copy keys vào .env.local
3. Chạy FULL_DATABASE_SETUP.sql
4. Test tạo user
5. Done! 🎉
```

**Thời gian tổng:** ~5 phút

---

**🚀 Bắt đầu từ Bước 1 ngay bây giờ!**

