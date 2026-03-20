# Hướng dẫn tạo dữ liệu fake cho chức năng Ghi nhận đơn hàng

## 📋 Tổng quan

File `fake-data-order-processing.sql` chứa các câu lệnh SQL để tạo dữ liệu mẫu cho chức năng **Ghi nhận đơn hàng**.

## 📊 Dữ liệu sẽ được tạo

### 1. Khách hàng (5 khách hàng)
- CUST001: Nguyễn Văn An
- CUST002: Trần Thị Bình
- CUST003: Lê Văn Cường
- CUST004: Phạm Thị Dung
- CUST005: Hoàng Văn Em

### 2. Phương thức thanh toán (4 phương thức)
- PM001: Tiền mặt
- PM002: Chuyển khoản
- PM003: Ví điện tử
- PM004: Thẻ tín dụng

### 3. Đơn hàng (10 đơn hàng)

#### Chờ xác nhận (5 đơn)
- **ORD2024001**: 1,500,000 VNĐ - Có vận chuyển - Chuyển khoản
- **ORD2024002**: 850,000 VNĐ - Tại cửa hàng - Tiền mặt
- **ORD2024003**: 2,300,000 VNĐ - Có vận chuyển - Ví điện tử
- **ORD2024004**: 650,000 VNĐ - Tại cửa hàng - Tiền mặt
- **ORD2024005**: 1,200,000 VNĐ - Có vận chuyển - Thẻ tín dụng

#### Đã xác nhận (3 đơn)
- **ORD2024006**: 980,000 VNĐ - Có vận chuyển - Chuyển khoản
- **ORD2024007**: 1,450,000 VNĐ - Tại cửa hàng - Tiền mặt
- **ORD2024008**: 750,000 VNĐ - Có vận chuyển - Ví điện tử

#### Đã hủy (2 đơn)
- **ORD2024009**: 550,000 VNĐ - Tại cửa hàng - Tiền mặt
- **ORD2024010**: 1,800,000 VNĐ - Có vận chuyển - Chuyển khoản

### 4. Chi tiết đơn hàng
Mỗi đơn hàng có 1-2 sản phẩm với số lượng và đơn giá khác nhau.

### 5. Thông tin vận chuyển
6 đơn hàng có thông tin vận chuyển (các đơn có `is_shipping = true`).

## 🚀 Cách chạy script

### Phương pháp 1: Sử dụng Supabase Dashboard (Khuyến nghị)

1. **Đăng nhập vào Supabase Dashboard**
   - Truy cập: https://app.supabase.com
   - Chọn project của bạn

2. **Mở SQL Editor**
   - Trong menu bên trái, chọn **SQL Editor**
   - Hoặc truy cập: `https://app.supabase.com/project/YOUR_PROJECT_ID/sql`

3. **Tạo New Query**
   - Nhấn nút **"New query"**

4. **Copy và Paste Script**
   - Mở file `fake-data-order-processing.sql`
   - Copy toàn bộ nội dung
   - Paste vào SQL Editor

5. **Chạy Script**
   - Nhấn nút **"Run"** hoặc nhấn `Ctrl + Enter` (Windows) / `Cmd + Enter` (Mac)
   - Đợi script chạy xong

6. **Kiểm tra kết quả**
   - Xem thông báo thành công ở phía dưới
   - Kiểm tra số dòng đã được insert

### Phương pháp 2: Sử dụng Supabase CLI

```bash
# 1. Đảm bảo đã cài đặt Supabase CLI
npm install -g supabase

# 2. Đăng nhập
supabase login

# 3. Link project
supabase link --project-ref YOUR_PROJECT_ID

# 4. Chạy script
supabase db execute -f database/fake-data-order-processing.sql
```

### Phương pháp 3: Sử dụng psql (PostgreSQL CLI)

```bash
# Kết nối đến database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Chạy script
\i database/fake-data-order-processing.sql
```

## ⚠️ Lưu ý quan trọng

### 1. Kiểm tra dữ liệu hiện có
Script sử dụng `ON CONFLICT DO NOTHING` để tránh lỗi nếu dữ liệu đã tồn tại. Tuy nhiên, bạn nên kiểm tra trước:

```sql
-- Kiểm tra khách hàng
SELECT * FROM customers WHERE customer_id IN ('CUST001', 'CUST002', 'CUST003', 'CUST004', 'CUST005');

-- Kiểm tra đơn hàng
SELECT * FROM orders WHERE order_id LIKE 'ORD2024%';
```

### 2. Yêu cầu dữ liệu tiên quyết
Script yêu cầu:
- ✅ Bảng `users` phải có ít nhất 1 user (để làm người tạo đơn)
- ✅ Bảng `products` phải có ít nhất 5 sản phẩm (để tạo chi tiết đơn hàng)

Nếu chưa có, hãy tạo trước:

```sql
-- Kiểm tra users
SELECT COUNT(*) FROM users;

-- Kiểm tra products
SELECT COUNT(*) FROM products;
```

### 3. Xóa dữ liệu fake (nếu cần)
Nếu muốn xóa dữ liệu fake đã tạo:

```sql
-- Xóa theo thứ tự ngược lại để tránh lỗi foreign key
DELETE FROM shippings WHERE shipping_id IN ('SHIP001', 'SHIP002', 'SHIP003', 'SHIP004', 'SHIP005', 'SHIP006');
DELETE FROM orderdetails WHERE order_id LIKE 'ORD2024%';
DELETE FROM orders WHERE order_id LIKE 'ORD2024%';
DELETE FROM customers WHERE customer_id IN ('CUST001', 'CUST002', 'CUST003', 'CUST004', 'CUST005');
DELETE FROM payment_methods WHERE payment_method_id IN ('PM001', 'PM002', 'PM003', 'PM004');
```

## ✅ Kiểm tra sau khi chạy

### 1. Kiểm tra số lượng đơn hàng theo trạng thái

```sql
SELECT status, COUNT(*) as total
FROM orders
WHERE order_id LIKE 'ORD2024%'
GROUP BY status;
```

Kết quả mong đợi:
```
status          | total
----------------|------
Chờ xác nhận    | 5
Đã xác nhận     | 3
Đã hủy          | 2
```

### 2. Kiểm tra đơn hàng có vận chuyển

```sql
SELECT is_shipping, COUNT(*) as total
FROM orders
WHERE order_id LIKE 'ORD2024%'
GROUP BY is_shipping;
```

### 3. Xem chi tiết tất cả đơn hàng

```sql
SELECT 
  o.order_id,
  o.status,
  o.price,
  o.is_shipping,
  c.full_name as customer_name,
  pm.method_name as payment_method
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN payment_methods pm ON o.payment_method_id = pm.payment_method_id
WHERE o.order_id LIKE 'ORD2024%'
ORDER BY o.order_date DESC;
```

## 🎯 Test chức năng

Sau khi chạy script thành công, bạn có thể test chức năng:

1. **Truy cập trang Ghi nhận đơn hàng**
   - URL: `http://localhost:3000/dashboard/orders/processing`

2. **Kiểm tra thống kê**
   - Chờ xác nhận: 5 đơn
   - Đã xác nhận: 3 đơn
   - Đã hủy: 2 đơn

3. **Test bộ lọc**
   - Chọn "Chờ xác nhận" → Hiển thị 5 đơn
   - Chọn "Đã xác nhận" → Hiển thị 3 đơn
   - Chọn "Đã hủy" → Hiển thị 2 đơn
   - Chọn "Tất cả" → Hiển thị 10 đơn

4. **Test chức năng**
   - ✅ Xem chi tiết đơn hàng
   - ✅ Chấp nhận đơn hàng (chỉ với "Chờ xác nhận")
   - ✅ Từ chối đơn hàng (chỉ với "Chờ xác nhận", phải nhập lý do)
   - ✅ Làm mới danh sách

## 🆘 Troubleshooting

### Lỗi: "relation does not exist"
**Nguyên nhân**: Bảng chưa được tạo trong database.
**Giải pháp**: Chạy migration để tạo các bảng trước.

### Lỗi: "violates foreign key constraint"
**Nguyên nhân**: Thiếu dữ liệu trong bảng `users` hoặc `products`.
**Giải pháp**: Tạo ít nhất 1 user và 5 sản phẩm trước khi chạy script.

### Lỗi: "duplicate key value"
**Nguyên nhân**: Dữ liệu đã tồn tại.
**Giải pháp**: Script đã xử lý với `ON CONFLICT DO NOTHING`, bạn có thể bỏ qua lỗi này hoặc xóa dữ liệu cũ trước.

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Kết nối đến Supabase
2. Quyền truy cập database
3. Cấu trúc bảng (schema)
4. Dữ liệu tiên quyết (users, products)

