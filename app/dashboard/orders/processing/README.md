# Chức năng Ghi nhận Đơn hàng

## Mô tả
Chức năng "Ghi nhận đơn hàng" cho phép nhân viên bán hàng xem và xử lý các đơn hàng mới từ khách hàng đặt hàng online.

## Vị trí
- **URL**: `/dashboard/orders/processing`
- **File**: `app/dashboard/orders/processing/page.tsx`

## Tính năng chính

### 1. Hiển thị danh sách đơn hàng
- Hiển thị các đơn hàng với trạng thái:
  - Chờ xác nhận
  - Đã xác nhận
  - Đang chuẩn bị
  - Đang vận chuyển

### 2. Thống kê đơn hàng
- Số lượng đơn hàng theo từng trạng thái
- Hiển thị dưới dạng cards với icon và màu sắc phân biệt

### 3. Xem chi tiết đơn hàng
- Thông tin đơn hàng: Mã đơn, ngày đặt, trạng thái, tổng tiền
- Thông tin khách hàng: Tên, điện thoại, địa chỉ (nếu có vận chuyển)
- Chi tiết sản phẩm: Danh sách sản phẩm, số lượng, đơn giá, thành tiền
- Thông tin vận chuyển (nếu có): Địa chỉ, đơn vị vận chuyển, phí vận chuyển

### 4. Chấp nhận đơn hàng
- Nhân viên có thể chấp nhận đơn hàng
- Trạng thái đơn hàng sẽ chuyển từ "Chờ xác nhận" sang "Đã xác nhận"
- Hiển thị thông báo thành công

### 5. Từ chối đơn hàng
- Nhân viên có thể từ chối đơn hàng
- **BẮT BUỘC** phải nhập lý do từ chối
- Trạng thái đơn hàng sẽ chuyển sang "Đã hủy"
- Lý do từ chối sẽ được hiển thị trong thông báo

### 6. Cập nhật trạng thái đơn hàng
- **Đã xác nhận** → **Đang chuẩn bị**: Khi nhân viên bắt đầu chuẩn bị đơn hàng
- **Đang chuẩn bị** → **Đang vận chuyển**: Khi đơn hàng có vận chuyển và đã sẵn sàng giao

### 7. Phân biệt loại đơn hàng
- **Giao hàng**: Đơn hàng có vận chuyển (is_shipping = true)
- **Tại cửa hàng**: Đơn hàng không có vận chuyển (is_shipping = false)

## Quy trình xử lý đơn hàng

### Quy trình 1: Đơn hàng có vận chuyển
1. Khách hàng đặt hàng online → Trạng thái: **Chờ xác nhận**
2. Nhân viên xem chi tiết và kiểm tra đơn hàng
3. Nhân viên chấp nhận → Trạng thái: **Đã xác nhận**
4. Nhân viên chuẩn bị hàng → Trạng thái: **Đang chuẩn bị**
5. Nhân viên chuyển sang vận chuyển → Trạng thái: **Đang vận chuyển**
6. (Xử lý tiếp ở module vận chuyển)

### Quy trình 2: Đơn hàng không có vận chuyển
1. Khách hàng đặt hàng online → Trạng thái: **Chờ xác nhận**
2. Nhân viên xem chi tiết và kiểm tra đơn hàng
3. Nhân viên chấp nhận → Trạng thái: **Đã xác nhận**
4. Nhân viên chuẩn bị hàng → Trạng thái: **Đang chuẩn bị**
5. Khách hàng đến lấy hàng và thanh toán (nếu chưa thanh toán)
6. Hoàn thành đơn hàng

### Quy trình 3: Từ chối đơn hàng
1. Khách hàng đặt hàng online → Trạng thái: **Chờ xác nhận**
2. Nhân viên xem chi tiết và phát hiện vấn đề (hết hàng, địa chỉ không hợp lệ, v.v.)
3. Nhân viên nhấn "Từ chối"
4. Nhân viên **BẮT BUỘC** nhập lý do từ chối
5. Xác nhận từ chối → Trạng thái: **Đã hủy**

## Giao diện

### Màn hình chính
- Header với tiêu đề và nút "Làm mới"
- 4 cards thống kê theo trạng thái
- Bảng danh sách đơn hàng với các cột:
  - Mã đơn hàng
  - Khách hàng (tên + số điện thoại)
  - Ngày đặt
  - Tổng tiền
  - Trạng thái
  - Vận chuyển
  - Thao tác

### Modal chi tiết đơn hàng
- Thông tin đơn hàng (bên trái)
- Thông tin khách hàng (bên phải)
- Bảng chi tiết sản phẩm
- Các nút thao tác tùy theo trạng thái

### Modal từ chối đơn hàng
- Icon cảnh báo màu đỏ
- Textarea để nhập lý do từ chối
- Nút "Xác nhận từ chối" (disabled nếu chưa nhập lý do)
- Nút "Hủy"

## Tích hợp với Database

### Bảng sử dụng
- **orders**: Thông tin đơn hàng
- **orderdetails**: Chi tiết sản phẩm trong đơn hàng
- **customers**: Thông tin khách hàng
- **shippings**: Thông tin vận chuyển (nếu có)
- **payment_methods**: Phương thức thanh toán
- **users**: Thông tin người tạo đơn hàng

### Trạng thái đơn hàng
- `Chờ xác nhận`: Đơn hàng mới, chưa được xử lý
- `Đã xác nhận`: Đơn hàng đã được chấp nhận
- `Đang chuẩn bị`: Đang lấy hàng, kiểm tra, đóng gói
- `Đang vận chuyển`: Đơn hàng đang được giao (chỉ với is_shipping = true)
- `Đã hủy`: Đơn hàng bị từ chối

## Lưu ý kỹ thuật
- Sử dụng Supabase client-side để truy vấn dữ liệu
- Sử dụng React hooks (useState, useEffect) để quản lý state
- Sử dụng Tailwind CSS cho styling
- Sử dụng Heroicons cho icons
- Sử dụng react-toastify cho thông báo
- Responsive design cho mobile và desktop

## Tham khảo
- Sơ đồ tuần tự: `docs/sequence-diagram-order-processing.puml`
- Component liên quan: `components/payment/OrderDetailsPopup.tsx`

