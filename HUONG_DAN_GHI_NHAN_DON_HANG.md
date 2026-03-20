# Hướng dẫn sử dụng chức năng Ghi nhận Đơn hàng

## 📋 Tổng quan

Chức năng **Ghi nhận đơn hàng** được thêm vào hệ thống QLBH để xử lý các đơn hàng mới từ khách hàng đặt hàng online. Chức năng này nằm ngay dưới chức năng "Tìm & xem đơn hàng" trong module Quản lý đơn hàng.

## 🎯 Mục đích

- Cho phép nhân viên bán hàng xem danh sách đơn hàng mới
- Chấp nhận hoặc từ chối đơn hàng
- Cập nhật trạng thái đơn hàng theo quy trình
- Xử lý cả đơn hàng có vận chuyển và không có vận chuyển

## 📍 Vị trí trong hệ thống

### Cách truy cập:
1. Đăng nhập vào hệ thống
2. Vào menu **Dashboard** → **Quản lý đơn hàng**
3. Nhấn vào nút **"Ghi nhận đơn hàng"** (màu xanh lá)

### URL:
```
/dashboard/orders/processing
```

## 🖥️ Giao diện

### 1. Màn hình chính
- **Header**: Tiêu đề "Ghi nhận đơn hàng" và nút "Làm mới"
- **Thống kê**: 4 cards hiển thị số lượng đơn hàng theo trạng thái
  - 🕐 Chờ xác nhận (màu vàng)
  - ✅ Đã xác nhận (màu xanh lá)
  - 💳 Đang chuẩn bị (màu xanh dương)
  - 🚚 Đang vận chuyển (màu tím)
- **Bảng danh sách**: Hiển thị tất cả đơn hàng cần xử lý

### 2. Bảng danh sách đơn hàng
Các cột hiển thị:
- **Mã đơn hàng**: Mã định danh duy nhất
- **Khách hàng**: Tên và số điện thoại
- **Ngày đặt**: Thời gian đặt hàng
- **Tổng tiền**: Giá trị đơn hàng (VNĐ)
- **Trạng thái**: Badge màu sắc theo trạng thái
- **Vận chuyển**: Icon phân biệt giao hàng/tại cửa hàng
- **Thao tác**: Các nút hành động

## 🔄 Quy trình xử lý

### A. Đơn hàng CÓ vận chuyển (🚚 Giao hàng)

```
1. Chờ xác nhận
   ↓ [Nhân viên xem chi tiết và chấp nhận]
2. Đã xác nhận
   ↓ [Nhân viên chuẩn bị hàng: lấy hàng, kiểm tra, đóng gói]
3. Đang chuẩn bị
   ↓ [Nhân viên chuyển sang vận chuyển]
4. Đang vận chuyển
   ↓ [Xử lý tiếp ở module Vận chuyển]
5. Hoàn thành
```

### B. Đơn hàng KHÔNG có vận chuyển (🏪 Tại cửa hàng)

```
1. Chờ xác nhận
   ↓ [Nhân viên xem chi tiết và chấp nhận]
2. Đã xác nhận
   ↓ [Nhân viên chuẩn bị hàng]
3. Đang chuẩn bị
   ↓ [Khách hàng đến lấy hàng]
4. Hoàn thành
```

### C. Từ chối đơn hàng

```
1. Chờ xác nhận
   ↓ [Nhân viên phát hiện vấn đề]
2. Nhấn "Từ chối"
   ↓ [BẮT BUỘC nhập lý do]
3. Xác nhận từ chối
   ↓
4. Đã hủy
```

## 📝 Hướng dẫn chi tiết

### 1. Xem danh sách đơn hàng

1. Truy cập trang "Ghi nhận đơn hàng"
2. Hệ thống tự động tải danh sách đơn hàng
3. Xem thống kê ở phía trên
4. Cuộn xuống xem bảng danh sách chi tiết

### 2. Xem chi tiết đơn hàng

1. Tìm đơn hàng cần xem trong bảng
2. Nhấn nút **"Xem"** (màu xanh dương)
3. Popup hiển thị:
   - **Thông tin đơn hàng**: Mã đơn, ngày đặt, trạng thái, tổng tiền, phương thức thanh toán, người tạo
   - **Thông tin khách hàng**: Tên, điện thoại, địa chỉ (nếu có vận chuyển)
   - **Chi tiết sản phẩm**: Bảng danh sách sản phẩm với số lượng, đơn giá, thành tiền
4. Nhấn **"Đóng"** để thoát

### 3. Chấp nhận đơn hàng

**Cách 1: Từ bảng danh sách**
1. Tìm đơn hàng có trạng thái "Chờ xác nhận"
2. Nhấn nút **"Chấp nhận"** (màu xanh lá)
3. Xác nhận trong hộp thoại
4. Đơn hàng chuyển sang trạng thái "Đã xác nhận"

**Cách 2: Từ popup chi tiết**
1. Nhấn **"Xem"** để mở chi tiết đơn hàng
2. Kiểm tra kỹ thông tin
3. Nhấn nút **"Chấp nhận"** ở cuối popup
4. Xác nhận trong hộp thoại

### 4. Từ chối đơn hàng ⚠️

**Lưu ý**: BẮT BUỘC phải nhập lý do từ chối!

**Cách 1: Từ bảng danh sách**
1. Tìm đơn hàng có trạng thái "Chờ xác nhận"
2. Nhấn nút **"Từ chối"** (màu đỏ)
3. Popup hiển thị yêu cầu nhập lý do
4. Nhập lý do từ chối (ví dụ: "Hết hàng", "Địa chỉ không hợp lệ", "Khách hàng yêu cầu hủy")
5. Nhấn **"Xác nhận từ chối"**
6. Đơn hàng chuyển sang trạng thái "Đã hủy"

**Cách 2: Từ popup chi tiết**
1. Nhấn **"Xem"** để mở chi tiết đơn hàng
2. Kiểm tra và phát hiện vấn đề
3. Nhấn nút **"Từ chối"** ở cuối popup
4. Nhập lý do từ chối
5. Xác nhận

### 5. Cập nhật trạng thái đơn hàng

**Từ "Đã xác nhận" → "Đang chuẩn bị"**
1. Tìm đơn hàng có trạng thái "Đã xác nhận"
2. Nhấn nút **"Chuẩn bị"** (màu xanh dương)
3. Xác nhận trong hộp thoại
4. Bắt đầu lấy hàng, kiểm tra, đóng gói

**Từ "Đang chuẩn bị" → "Đang vận chuyển"** (chỉ với đơn có vận chuyển)
1. Tìm đơn hàng có trạng thái "Đang chuẩn bị" và có icon 🚚
2. Nhấn nút **"Vận chuyển"** (màu tím)
3. Xác nhận trong hộp thoại
4. Đơn hàng sẵn sàng để giao

### 6. Làm mới danh sách

1. Nhấn nút **"Làm mới"** ở góc trên bên phải
2. Hệ thống tải lại dữ liệu mới nhất
3. Icon quay trong khi đang tải
4. Thông báo "Đã cập nhật" khi hoàn thành

## ⚠️ Lưu ý quan trọng

1. **Kiểm tra kỹ trước khi chấp nhận**:
   - Đủ hàng trong kho
   - Địa chỉ giao hàng hợp lý (nếu có vận chuyển)
   - Thông tin khách hàng đầy đủ

2. **Khi từ chối đơn hàng**:
   - BẮT BUỘC phải nhập lý do rõ ràng
   - Lý do sẽ được gửi đến khách hàng
   - Không thể hoàn tác sau khi từ chối

3. **Phân biệt loại đơn hàng**:
   - 🚚 **Giao hàng**: Cần xử lý vận chuyển
   - 🏪 **Tại cửa hàng**: Khách đến lấy trực tiếp

4. **Trạng thái thanh toán**:
   - Đơn hàng có thể đã thanh toán hoặc chưa thanh toán
   - Kiểm tra trường "Phương thức thanh toán" trong chi tiết

## 🎨 Demo

Có thể xem demo giao diện tại:
- `demo-order-processing/index-full-layout.html` (Full layout với sidebar)
- `demo-order-processing/index.html` (Giao diện đơn giản)

## 📚 Tài liệu kỹ thuật

- **File chính**: `app/dashboard/orders/processing/page.tsx`
- **README kỹ thuật**: `app/dashboard/orders/processing/README.md`
- **Sơ đồ tuần tự**: `docs/sequence-diagram-order-processing.puml`

## 🆘 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra kết nối internet
2. Làm mới trang (F5)
3. Kiểm tra quyền truy cập
4. Liên hệ bộ phận IT nếu vấn đề vẫn tiếp diễn

