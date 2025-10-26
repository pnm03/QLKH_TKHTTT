# 🚀 HƯỚNG DẪN SETUP LẠI DATABASE CHO DỰ ÁN QLBH

> **Tài liệu này hướng dẫn bạn cách thiết lập lại database trên Supabase từ đầu**

---

## 📋 MỤC LỤC
1. [Yêu cầu](#yêu-cầu)
2. [Các bước thực hiện](#các-bước-thực-hiện)
3. [Kiểm tra kết quả](#kiểm-tra-kết-quả)
4. [Thêm dữ liệu mẫu](#thêm-dữ-liệu-mẫu)
5. [Cấu hình cho Next.js App](#cấu-hình-cho-nextjs-app)
6. [Xử lý sự cố](#xử-lý-sự-cố)

---

## ✅ Yêu cầu

- Tài khoản Supabase (miễn phí): https://supabase.com
- File `FULL_DATABASE_SETUP.sql` (đã tạo sẵn)
- Khoảng 5-10 phút để hoàn thành

---

## 🎯 Các bước thực hiện

### **Bước 1: Tạo dự án mới trên Supabase**

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Click nút **"New Project"**
3. Điền thông tin:
   - **Name**: `qlbh-system` (hoặc tên bạn muốn)
   - **Database Password**: Tạo mật khẩu mạnh và **LƯU LẠI**
   - **Region**: Chọn `Southeast Asia (Singapore)` để tốc độ nhanh nhất
4. Click **"Create new project"**
5. Đợi khoảng 2-3 phút để Supabase khởi tạo

### **Bước 2: Lấy thông tin kết nối**

1. Sau khi dự án được tạo, vào tab **"Settings"** (biểu tượng bánh răng)
2. Chọn **"API"** ở menu bên trái
3. **LƯU LẠI** các thông tin sau:
   - ✅ `Project URL` (ví dụ: `https://xxxxx.supabase.co`)
   - ✅ `anon public` key
   - ✅ `service_role` key (bí mật, chỉ dùng server-side)

### **Bước 3: Chạy script SQL để tạo database**

1. Vào tab **"SQL Editor"** ở menu bên trái
2. Click **"+ New query"**
3. Mở file `FULL_DATABASE_SETUP.sql` trong thư mục `qlbh-system/`
4. **Copy toàn bộ nội dung** file SQL
5. **Paste** vào SQL Editor của Supabase
6. Click nút **"Run"** (hoặc nhấn `Ctrl + Enter`)
7. Đợi khoảng **1-2 phút** để script chạy xong

### **Bước 4: Kiểm tra kết quả**

Sau khi chạy xong, bạn sẽ thấy thông báo thành công. Hãy kiểm tra:

1. Vào tab **"Table Editor"**
2. Bạn sẽ thấy các bảng sau đã được tạo:

#### **Bảng chính:**
- ✅ `Branches` - Chi nhánh
- ✅ `Users` - Người dùng
- ✅ `Accounts` - Tài khoản đăng nhập
- ✅ `Customers` - Khách hàng
- ✅ `Staff` - Nhân viên
- ✅ `Category` - Danh mục sản phẩm
- ✅ `Products` - Sản phẩm
- ✅ `Payments` - Phương thức thanh toán
- ✅ `Orders` - Đơn hàng
- ✅ `Orderdetails` - Chi tiết đơn hàng
- ✅ `Shippings` - Vận chuyển
- ✅ `Returns` - Đổi/trả hàng

#### **Bảng chat (tính năng nhắn tin):**
- ✅ `chat_conversations`
- ✅ `chat_participants`
- ✅ `chat_messages`
- ✅ `chat_message_status`

---

## 🧪 Kiểm tra kết quả

Chạy các query sau trong SQL Editor để kiểm tra:

```sql
-- Liệt kê tất cả các bảng
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Kiểm tra triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Kiểm tra functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

---

## 📝 Thêm dữ liệu mẫu

Sau khi tạo xong database, bạn có thể thêm dữ liệu mẫu để test:

### **1. Thêm Chi nhánh**

```sql
INSERT INTO public.Branches (branch_name, branch_address) VALUES
('Chi nhánh Hà Nội', '123 Đường Láng, Đống Đa, Hà Nội'),
('Chi nhánh TP.HCM', '456 Nguyễn Huệ, Q1, TP.HCM'),
('Chi nhánh Đà Nẵng', '789 Trần Phú, Hải Châu, Đà Nẵng');
```

### **2. Thêm Danh mục sản phẩm**

```sql
INSERT INTO public.Category (name_category, description_category) VALUES
('Điện thoại', 'Điện thoại thông minh các loại'),
('Laptop', 'Máy tính xách tay'),
('Phụ kiện', 'Phụ kiện điện thoại, laptop'),
('Tablet', 'Máy tính bảng');
```

### **3. Thêm Phương thức thanh toán**

```sql
INSERT INTO public.Payments (payment_method_name, description) VALUES
('Tiền mặt', 'Thanh toán bằng tiền mặt'),
('Chuyển khoản', 'Chuyển khoản ngân hàng'),
('Thẻ tín dụng', 'Thanh toán bằng thẻ tín dụng'),
('Ví điện tử', 'MoMo, ZaloPay, VNPay...');
```

### **4. Thêm Sản phẩm mẫu**

```sql
INSERT INTO public.Products (
    category_id, 
    product_name, 
    description, 
    color, 
    size, 
    price, 
    cost_price,
    stock_quantity, 
    image
) VALUES
(1, 'iPhone 15 Pro Max', 'Điện thoại cao cấp của Apple', 'Titan Tự nhiên', '256GB', 29990000, 25000000, 50, 'https://example.com/iphone15.jpg'),
(1, 'Samsung Galaxy S24 Ultra', 'Flagship của Samsung', 'Đen', '512GB', 27990000, 23000000, 30, 'https://example.com/s24.jpg'),
(2, 'MacBook Pro M3', 'Laptop cao cấp cho developer', 'Xám', '14 inch', 45990000, 40000000, 20, 'https://example.com/macbook.jpg'),
(3, 'AirPods Pro Gen 2', 'Tai nghe không dây', 'Trắng', 'One size', 5990000, 4500000, 100, 'https://example.com/airpods.jpg');
```

### **5. Thêm Khách hàng mẫu**

```sql
INSERT INTO public.Customers (full_name, phone, email, hometown) VALUES
('Nguyễn Văn A', '0912345678', 'nguyenvana@example.com', 'Hà Nội'),
('Trần Thị B', '0923456789', 'tranthib@example.com', 'TP.HCM'),
('Lê Văn C', '0934567890', 'levanc@example.com', 'Đà Nẵng');
```

---

## ⚙️ Cấu hình cho Next.js App

### **Bước 1: Tạo file `.env.local`**

Trong thư mục root của dự án Next.js, tạo file `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Email configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**⚠️ LƯU Ý:** 
- Thay `xxxxx.supabase.co` bằng Project URL của bạn
- Thay `your_anon_key_here` và `your_service_role_key_here` bằng keys từ Bước 2

### **Bước 2: Cài đặt Supabase Client**

```bash
npm install @supabase/supabase-js
```

### **Bước 3: Test kết nối**

Tạo file test trong `app/test-db/page.tsx`:

```typescript
import { createClient } from '@supabase/supabase-js';

export default async function TestDB() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: categories, error } = await supabase
    .from('Category')
    .select('*');

  if (error) {
    return <div>Lỗi: {error.message}</div>;
  }

  return (
    <div>
      <h1>Danh mục sản phẩm</h1>
      <pre>{JSON.stringify(categories, null, 2)}</pre>
    </div>
  );
}
```

Truy cập `http://localhost:3000/test-db` để kiểm tra.

---

## 🔧 Xử lý sự cố

### **Lỗi: "permission denied for schema public"**

**Giải pháp:** Chạy lệnh sau trong SQL Editor:

```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

### **Lỗi: "relation already exists"**

**Giải pháp:** Bạn đã chạy script rồi. Nếu muốn chạy lại:

1. Xóa tất cả bảng cũ:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

2. Chạy lại `FULL_DATABASE_SETUP.sql`

### **Lỗi: Không tạo được user mới**

**Giải pháp:** Kiểm tra Authentication:

1. Vào tab **"Authentication"** → **"Providers"**
2. Đảm bảo **Email** provider được bật
3. Vào **"Email Templates"** → Kiểm tra template "Confirm signup"

### **Lỗi: RLS (Row Level Security) chặn truy vấn**

**Giải pháp:** Tạm thời tắt RLS cho test:

```sql
ALTER TABLE public.Category DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.Products DISABLE ROW LEVEL SECURITY;
-- Làm tương tự cho các bảng khác nếu cần
```

**⚠️ Cảnh báo:** Chỉ tắt RLS trong môi trường development, không làm vậy ở production!

---

## 📊 Cấu trúc Database

### **Sơ đồ quan hệ chính:**

```
Branches (1) -----> (N) Users (1) -----> (1) Accounts
                     |
                     |----> (N) Staff
                     |
                     |----> (N) Orders

Customers (1) -----> (N) Orders (1) -----> (N) Orderdetails (N) <----- (1) Products
                                   |                                              |
                                   |                                              |
                                   |----> (1) Shippings                          (N)
                                   |                                              |
                                   |----> (N) Returns                    Category (1)

Orders (N) -----> (1) Payments
```

### **Các Triggers tự động:**

1. ✅ `trg_calculate_orderdetail_subtotal` - Tự động tính `subtotal = quantity × unit_price`
2. ✅ `trg_update_product_stock` - Tự động giảm số lượng tồn kho khi có đơn hàng
3. ✅ `trg_users_updated_at` - Tự động cập nhật `updated_at` khi sửa Users
4. ✅ `trg_products_updated_at` - Tự động cập nhật `updated_at` khi sửa Products
5. ✅ `on_auth_user_created` - Tự động tạo user trong bảng Users & Accounts khi đăng ký

### **Các Functions hữu ích:**

1. ✅ `get_top_shipped_products_v2(limit)` - Lấy top sản phẩm được vận chuyển nhiều nhất
2. ✅ `admin_delete_user(user_id)` - Xóa user (chỉ admin)
3. ✅ `handle_new_user()` - Đồng bộ auth.users → Users & Accounts

---

## 🎉 Hoàn tất!

Database của bạn đã sẵn sàng! Giờ bạn có thể:

- ✅ Tạo tài khoản người dùng qua Authentication
- ✅ Thêm/sửa/xóa dữ liệu qua API
- ✅ Sử dụng các tính năng trong Next.js app
- ✅ Test các chức năng bán hàng, vận chuyển, chat...

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra lại file `.env.local`
2. Xem logs trong Supabase Dashboard → Logs
3. Kiểm tra Network tab trong DevTools của trình duyệt
4. Đọc lại phần [Xử lý sự cố](#xử-lý-sự-cố)

---

**Chúc bạn thành công! 🚀**

