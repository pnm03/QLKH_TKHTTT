# Hướng dẫn sử dụng Fake Data - Chức năng Ghi nhận đơn hàng

## 📋 Tổng quan

Hiện tại chức năng **Ghi nhận đơn hàng** đang sử dụng **dữ liệu giả (fake data)** để bạn có thể test giao diện và thao tác mà không cần database.

Khi nào thiết kế xong database, chỉ cần uncomment các đoạn code Supabase và xóa phần fake data là có thể sử dụng database thật.

---

## ✅ Dữ liệu fake hiện có

### 📊 Thống kê
- **5 đơn hàng** "Chờ xác nhận"
- **3 đơn hàng** "Đã xác nhận"
- **2 đơn hàng** "Đã hủy"
- **Tổng: 10 đơn hàng**

### 📦 Chi tiết đơn hàng

#### Chờ xác nhận (5 đơn)
1. **ORD2024001** - 1,500,000 VNĐ
   - Khách hàng: Nguyễn Văn An (0901234567)
   - Sản phẩm: Laptop Dell XPS 13
   - Thanh toán: Chuyển khoản
   - Vận chuyển: ✅ Có (Giao Hàng Nhanh)

2. **ORD2024002** - 850,000 VNĐ
   - Khách hàng: Trần Thị Bình (0912345678)
   - Sản phẩm: Chuột Logitech MX Master
   - Thanh toán: Tiền mặt
   - Vận chuyển: ❌ Không (Tại cửa hàng)

3. **ORD2024003** - 2,300,000 VNĐ
   - Khách hàng: Lê Văn Cường (0923456789)
   - Sản phẩm: Bàn phím cơ Keychron K2 (x2)
   - Thanh toán: Ví điện tử
   - Vận chuyển: ✅ Có (Viettel Post)

4. **ORD2024004** - 650,000 VNĐ
   - Khách hàng: Phạm Thị Dung (0934567890)
   - Sản phẩm: Tai nghe Sony WH-1000XM4
   - Thanh toán: Tiền mặt
   - Vận chuyển: ❌ Không (Tại cửa hàng)

5. **ORD2024005** - 1,200,000 VNĐ
   - Khách hàng: Hoàng Văn Em (0945678901)
   - Sản phẩm: Webcam Logitech C920 (x2)
   - Thanh toán: Thẻ tín dụng
   - Vận chuyển: ✅ Có (J&T Express)

#### Đã xác nhận (3 đơn)
6. **ORD2024006** - 980,000 VNĐ
7. **ORD2024007** - 1,450,000 VNĐ
8. **ORD2024008** - 750,000 VNĐ

#### Đã hủy (2 đơn)
9. **ORD2024009** - 550,000 VNĐ
10. **ORD2024010** - 1,800,000 VNĐ

---

## 🎮 Cách test chức năng

### 1. Chạy ứng dụng
```bash
npm run dev
```

### 2. Truy cập trang
```
http://localhost:3000/dashboard/orders/processing
```

### 3. Test các chức năng

#### ✅ Xem danh sách đơn hàng
- Mặc định hiển thị **5 đơn "Chờ xác nhận"**
- Thống kê hiển thị: 5 Chờ xác nhận | 3 Đã xác nhận | 2 Đã hủy

#### ✅ Lọc theo trạng thái
- Chọn dropdown "Lọc theo trạng thái"
- Chọn "Đã xác nhận" → Hiển thị 3 đơn
- Chọn "Đã hủy" → Hiển thị 2 đơn
- Chọn "Tất cả" → Hiển thị 10 đơn

#### ✅ Xem chi tiết đơn hàng
- Nhấn nút "Xem" ở bất kỳ đơn hàng nào
- Modal hiển thị:
  - Thông tin đơn hàng
  - Thông tin khách hàng
  - Chi tiết sản phẩm
  - Thông tin vận chuyển (nếu có)

#### ✅ Chấp nhận đơn hàng
- Chọn đơn hàng "Chờ xác nhận"
- Nhấn nút "Chấp nhận"
- Xác nhận → Đơn chuyển sang "Đã xác nhận"
- Thống kê tự động cập nhật: 4 Chờ xác nhận | 4 Đã xác nhận

#### ✅ Từ chối đơn hàng
- Chọn đơn hàng "Chờ xác nhận"
- Nhấn nút "Từ chối"
- **BẮT BUỘC** nhập lý do từ chối
- Xác nhận → Đơn chuyển sang "Đã hủy"
- Thống kê tự động cập nhật: 4 Chờ xác nhận | 3 Đã hủy

#### ✅ Làm mới danh sách
- Nhấn nút "Làm mới" ở góc trên bên phải
- Danh sách được tải lại

---

## 🔄 Chuyển sang sử dụng Database thật

Khi bạn đã thiết kế xong database và muốn chuyển sang sử dụng database thật:

### Bước 1: Mở file
```
app/dashboard/orders/processing/page.tsx
```

### Bước 2: Uncomment dòng import Supabase
Tìm dòng 4:
```typescript
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
```

Uncomment thành:
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
```

### Bước 3: Uncomment khởi tạo Supabase
Tìm dòng 305:
```typescript
// const supabase = createClientComponentClient()
```

Uncomment thành:
```typescript
const supabase = createClientComponentClient()
```

### Bước 4: Trong mỗi function, làm theo hướng dẫn
Mỗi function đều có comment rõ ràng:
- **XÓA** phần code có comment `===== SỬ DỤNG FAKE DATA =====`
- **UNCOMMENT** phần code có comment `===== KHI CÓ DATABASE, UNCOMMENT ĐOẠN NÀY =====`

Các function cần sửa:
1. `loadOrders()` - Dòng 355
2. `updateStats()` - Dòng 417
3. `viewOrderDetails()` - Dòng 465
4. `acceptOrder()` - Dòng 525
5. `rejectOrder()` - Dòng 576

### Bước 5: Xóa fake data (tùy chọn)
Xóa toàn bộ phần fake data từ dòng 18 đến dòng 258 (hoặc giữ lại để tham khảo).

---

## 📝 Lưu ý quan trọng

### ⚠️ Dữ liệu fake được lưu trong bộ nhớ
- Dữ liệu fake chỉ tồn tại trong phiên làm việc hiện tại
- Khi refresh trang, dữ liệu sẽ reset về trạng thái ban đầu
- Các thay đổi (chấp nhận/từ chối) chỉ tồn tại trong bộ nhớ, không lưu vào database

### ✅ Ưu điểm của fake data
- Test giao diện ngay lập tức mà không cần database
- Không lo lỗi kết nối database
- Dễ dàng thay đổi dữ liệu test
- Phát triển frontend và backend độc lập

### 🔄 Khi nào nên chuyển sang database thật?
- Khi đã thiết kế xong schema database
- Khi cần lưu trữ dữ liệu thật
- Khi cần test tích hợp với backend
- Khi cần nhiều người cùng làm việc với dữ liệu chung

---

## 🎯 Kết luận

Hiện tại bạn có thể:
- ✅ Test toàn bộ giao diện
- ✅ Test toàn bộ chức năng
- ✅ Xem cách dữ liệu được hiển thị
- ✅ Thao tác với đơn hàng (chấp nhận/từ chối)
- ✅ Không cần lo về database

Khi nào cần database thật, chỉ cần làm theo **Bước 1-5** ở trên là xong! 🚀

