# 📚 TÀI LIỆU SETUP DỰ ÁN QLBH

> **Cập nhật:** October 24, 2025

---

## 🎯 MỤC LỤC CÁC FILE HƯỚNG DẪN

| File | Mô tả |
|------|-------|
| **FULL_DATABASE_SETUP.sql** | 🗄️ File SQL hoàn chỉnh để setup toàn bộ database |
| **HUONG_DAN_SETUP_DATABASE.md** | 📖 Hướng dẫn chi tiết từng bước setup database |
| **SETUP_ENV.md** | ⚙️ Hướng dẫn cấu hình biến môi trường (.env.local) |
| **CHECK_SETUP.md** | ✅ Checklist kiểm tra setup và xử lý lỗi |
| **tao_sql.sql** | 📄 File SQL backup (phiên bản cũ) |
| **database.txt** | 📋 Tài liệu mô tả cấu trúc database |

---

## 🚀 QUICK START

### **Bước 1: Setup Database** (5 phút)

1. Tạo project mới trên [Supabase](https://app.supabase.com)
2. Vào **SQL Editor**
3. Copy toàn bộ nội dung file `FULL_DATABASE_SETUP.sql`
4. Paste và **Run**
5. Đợi 1-2 phút → ✅ Done!

### **Bước 2: Cấu hình .env.local** (2 phút)

File đã có sẵn: `E:\APP_KY2_NAM2\QLBH_TKHTTTQL\qlbh-system\.env.local`

Chỉ cần cập nhật **Service Role Key**:
```env
SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

Lấy key tại: Supabase Dashboard → Settings → API → service_role

### **Bước 3: Chạy dự án** (1 phút)

```bash
cd qlbh-system
npm run dev
```

Truy cập: http://localhost:3000

---

## ✅ ĐÃ SỬA TRONG PHIÊN NÀY

### **1. File `app/todo-example/page.tsx`**

**❌ Trước (Lỗi):**
```typescript
const cookieStore = cookies() // Thiếu await
const supabase = createClient(cookieStore) // Thiếu await
const { data: todos } = await supabase.from('todos').select() // Bảng không tồn tại!
```

**✅ Sau (Đúng):**
```typescript
const cookieStore = await cookies() // ✅ Thêm await
const supabase = await createClient(cookieStore) // ✅ Thêm await
const { data: categories, error } = await supabase
  .from('Category') // ✅ Đổi sang bảng thật
  .select('*')
  .limit(10)
```

### **2. File `utils/supabase/*`**

✅ **ĐÃ ĐÚNG** - Không cần sửa!
- `client.tsx` - OK (có auto-refresh, retry logic)
- `server.tsx` - OK (có createAdminClient)
- `middleware.tsx` - OK (return { response, supabase })

### **3. File `.env.local`**

✅ **ĐÃ CÓ** - User đã tự tạo

---

## 📦 CẤU TRÚC DATABASE

### **Bảng chính:**
- ✅ Branches - Chi nhánh
- ✅ Users - Người dùng
- ✅ Accounts - Tài khoản
- ✅ Customers - Khách hàng
- ✅ Staff - Nhân viên
- ✅ Category - Danh mục
- ✅ Products - Sản phẩm
- ✅ Payments - Thanh toán
- ✅ Orders - Đơn hàng
- ✅ Orderdetails - Chi tiết đơn
- ✅ Shippings - Vận chuyển
- ✅ Returns - Đổi/trả

### **Bảng chat:**
- ✅ chat_conversations
- ✅ chat_participants
- ✅ chat_messages
- ✅ chat_message_status

### **Triggers tự động:**
- ✅ Auto-calculate subtotal (Orderdetails)
- ✅ Auto-update stock (Products)
- ✅ Auto-update timestamps
- ✅ Auto-sync auth.users → Users + Accounts

### **Functions hữu ích:**
- ✅ `get_top_shipped_products_v2(limit)` - Top sản phẩm
- ✅ `admin_delete_user(uuid)` - Xóa user (admin only)
- ✅ `handle_new_user()` - Đồng bộ auth

---

## 🧪 TEST DỰ ÁN

### **Test 1: Kết nối Database**

Truy cập: http://localhost:3000/todo-example

**Kỳ vọng:**
- ✅ Hiển thị danh sách danh mục sản phẩm
- ✅ Không có lỗi

**Nếu lỗi:**
- Kiểm tra `.env.local` có đúng không
- Kiểm tra đã chạy SQL setup chưa

### **Test 2: Authentication**

Truy cập: http://localhost:3000/auth/signin

**Kỳ vọng:**
- ✅ Form đăng nhập hiển thị
- ✅ Có thể đăng ký tài khoản mới
- ✅ Sau đăng nhập redirect về dashboard

### **Test 3: Dashboard**

Truy cập: http://localhost:3000/dashboard

**Kỳ vọng:**
- ✅ Dashboard hiển thị
- ✅ Menu navigation hoạt động
- ✅ Có thể truy cập các trang con

---

## 🔧 XỬ LÝ LỖI THƯỜNG GẶP

### **Lỗi 1: "relation 'Category' does not exist"**

**Nguyên nhân:** Chưa chạy SQL setup

**Giải pháp:**
1. Vào Supabase SQL Editor
2. Chạy file `FULL_DATABASE_SETUP.sql`
3. Restart dev server

### **Lỗi 2: "Failed to connect to Supabase"**

**Nguyên nhân:** Thiếu hoặc sai `.env.local`

**Giải pháp:**
1. Kiểm tra file `.env.local` tồn tại
2. Kiểm tra URL và Keys đúng
3. Restart dev server

### **Lỗi 3: "SUPABASE_SERVICE_ROLE_KEY is not defined"**

**Nguyên nhân:** Chưa thêm Service Role Key

**Giải pháp:**
1. Lấy key từ Supabase Dashboard
2. Thêm vào `.env.local`
3. Restart dev server

### **Lỗi 4: "Unexpected token 'export'"**

**Nguyên nhân:** Node.js version quá cũ

**Giải pháp:**
```bash
node --version  # Cần >= 18.17.0
npm install     # Cài lại dependencies
```

---

## 📊 THỐNG KÊ DỰ ÁN

| Thành phần | Số lượng |
|-----------|----------|
| Bảng database | 16 bảng |
| API routes | 23+ routes |
| Pages | 51+ pages |
| Triggers | 5+ triggers |
| Functions | 3+ functions |
| Indexes | 15+ indexes |

---

## 🎓 TÀI LIỆU THAM KHẢO

### **Supabase:**
- [Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Auth](https://supabase.com/docs/guides/auth)
- [Database](https://supabase.com/docs/guides/database)

### **Next.js:**
- [Docs](https://nextjs.org/docs)
- [App Router](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

---

## 🔄 CẬP NHẬT

- **2025-10-24:** Tạo FULL_DATABASE_SETUP.sql
- **2025-10-24:** Sửa lỗi todo-example/page.tsx
- **2025-10-24:** Xác nhận utils/supabase/* đã đúng
- **2025-10-24:** Tạo tài liệu hướng dẫn đầy đủ

---

**🎉 Chúc bạn thành công với dự án QLBH!**

