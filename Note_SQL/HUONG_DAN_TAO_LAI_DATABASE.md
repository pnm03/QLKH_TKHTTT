# 🔄 HƯỚNG DẪN TẠO LẠI DATABASE THEO SCHEMA GỐC

> **Mục đích:** Xóa toàn bộ database hiện tại và tạo lại theo schema gốc (`database.txt`) đã hoạt động ổn định

---

## ⚠️ **CẢNH BÁO QUAN TRỌNG:**

- ❌ **TẤT CẢ DỮ LIỆU SẼ BỊ XÓA**
- ❌ Không thể hoàn tác sau khi chạy
- ✅ Chỉ dùng cho môi trường DEV/TEST
- ✅ Backup dữ liệu quan trọng trước khi chạy

---

## 📋 **BƯỚC 1: BACKUP DỮ LIỆU (NẾU CẦN)**

Nếu có dữ liệu quan trọng, backup trước:

```sql
-- Export toàn bộ database
-- Vào Supabase Dashboard → Database → Backups → Create backup
```

---

## 🚀 **BƯỚC 2: CHẠY FILE SQL**

### **2.1. Vào Supabase SQL Editor:**
1. Truy cập https://supabase.com
2. Chọn project của bạn
3. Vào **SQL Editor**
4. Click **"+ New query"**

### **2.2. Copy & Run:**
1. Mở file `RECREATE_DATABASE_FROM_ORIGINAL.sql`
2. Copy **TOÀN BỘ** nội dung
3. Paste vào SQL Editor
4. Click **"Run"** (hoặc `Ctrl + Enter`)
5. Đợi ~10-15 giây

### **2.3. Kiểm tra kết quả:**
Bạn sẽ thấy:
```
status: DATABASE RECREATED SUCCESSFULLY!
message: Schema đã được tạo lại theo database.txt gốc
```

Và danh sách tables:
- accounts
- branches
- category
- customers
- orderdetails
- orders
- payments
- products
- returns
- shippings
- staff
- users

---

## ✅ **BƯỚC 3: KIỂM TRA DATABASE**

Chạy các query sau để verify:

```sql
-- 1. Kiểm tra tất cả tables đã tạo
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Kiểm tra cấu trúc bảng shippings
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'shippings'
ORDER BY ordinal_position;

-- Kết quả phải có:
-- shipping_id, order_id, carrier, tracking_num, shipping_address
-- shipping_cost, actual_delivery_date, delivery_date, status
-- created_at, weight, unit_weight, long, wide, hight
-- ❌ KHÔNG có: name_customer, phone_customer, unit_size, cod_shipping

-- 3. Kiểm tra triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Phải có:
-- trigger_calculate_subtotal (orderdetails)
-- trigger_update_stock (orderdetails)
```

---

## 🧪 **BƯỚC 4: TEST ỨNG DỤNG**

### **4.1. Restart dev server:**
```bash
cd qlbh-system
# Ctrl+C để stop
npm run dev
```

### **4.2. Test chức năng tạo đơn:**

**Test 1: Bán hàng nhanh**
1. Vào `http://localhost:3000/dashboard/sales/create`
2. Thêm sản phẩm vào giỏ
3. Chọn phương thức thanh toán
4. Click "Thanh toán"
5. ✅ Check database:
   - `orders.is_shipping = false`
   - KHÔNG có bản ghi trong `shippings`

**Test 2: Tạo đơn gửi đi (COD)**
1. Thêm sản phẩm vào giỏ
2. Click "Gửi đi"
3. Điền thông tin nhận hàng
4. Tick "Thu hộ tiền (COD)"
5. Click "Tạo đơn"
6. ✅ Check database:
   - `orders.is_shipping = true`
   - `orders.payment_method = NULL`
   - CÓ bản ghi trong `shippings`

**Test 3: Tạo đơn gửi đi (Thanh toán trước)**
1. Thêm sản phẩm vào giỏ
2. Click "Gửi đi"
3. Điền thông tin nhận hàng
4. Chọn phương thức thanh toán (Tiền mặt/Chuyển khoản)
5. Click "Tạo đơn"
6. ✅ Check database:
   - `orders.is_shipping = true`
   - `orders.payment_method = (payment_id)`
   - CÓ bản ghi trong `shippings`

---

## 📊 **SCHEMA GỐC (database.txt)**

### **Bảng Shippings (GỐC):**
```sql
CREATE TABLE shippings (
    shipping_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    carrier VARCHAR(255),
    tracking_num VARCHAR(255) UNIQUE,
    shipping_address TEXT NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    delivery_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(10, 3),
    unit_weight VARCHAR(10),
    "long" DECIMAL(10, 2),
    wide DECIMAL(10, 2),
    hight DECIMAL(10, 2)  -- ⚠️ Chú ý: "hight" không phải "height"
);
```

### **Các Triggers (GỐC):**
1. **calculate_orderdetail_subtotal:** Tự động tính `subtotal = quantity * unit_price`
2. **update_product_stock:** Tự động trừ tồn kho khi thêm orderdetail
3. **CASCADE DELETE:** Tự động xóa orderdetails khi xóa order

---

## 🔧 **ĐÃ SỬA Ở CODE:**

File: `app/dashboard/sales/create/page.tsx`

**Trước (SAI - có các cột không tồn tại):**
```typescript
const shippingObject = {
  shipping_id, order_id, carrier, tracking_number,
  shipping_address, shipping_cost, ...
  name_customer,      // ❌ Không có trong schema gốc
  phone_customer,     // ❌ Không có trong schema gốc
  unit_size,          // ❌ Không có trong schema gốc
  cod_shipping        // ❌ Không có trong schema gốc
};
```

**Sau (ĐÚNG - chỉ có cột trong schema gốc):**
```typescript
const shippingObject = {
  shipping_id, order_id, carrier, tracking_num,
  shipping_address, shipping_cost, ...
  weight, unit_weight, long, wide, hight  // ✅ Đúng
};
```

---

## 💡 **GHI CHÚ:**

### **Tại sao không thêm các cột mới?**
- Schema gốc (`database.txt`) đã hoạt động ổn định
- Các thông tin bổ sung có thể lưu ở bảng khác hoặc trong JSON
- Đơn giản hóa database, dễ maintain

### **COD (Thu hộ) được lưu ở đâu?**
- `orders.payment_method = NULL` → COD
- `orders.payment_method = (payment_id)` → Đã thanh toán

### **Thông tin người nhận được lưu ở đâu?**
- `shippings.shipping_address` → Địa chỉ đầy đủ
- Nếu cần tách riêng, có thể parse từ `shipping_address`

---

## 🎯 **TÓM TẮT:**

✅ **Đã làm:**
1. Tạo file SQL xóa và tạo lại toàn bộ database
2. Schema theo ĐÚNG `database.txt` gốc
3. Sửa code để phù hợp với schema gốc
4. Giữ nguyên `hight` (không sửa thành `height`)
5. Xóa các cột không tồn tại (`name_customer`, `phone_customer`, `unit_size`, `cod_shipping`)

✅ **Cần làm:**
1. Chạy `RECREATE_DATABASE_FROM_ORIGINAL.sql`
2. Kiểm tra kết quả
3. Test ứng dụng

---

**🎉 Sau khi hoàn thành, hệ thống sẽ hoạt động như trước đây - ổn định và không có lỗi!**

