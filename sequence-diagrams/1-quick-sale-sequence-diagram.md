# Sơ đồ Tuần tự: Bán hàng Nhanh (Quick Sale)

## Mô tả
Sơ đồ này mô tả quy trình bán hàng nhanh (rút gọn), bắt đầu từ khi đã có sản phẩm và khách hàng, tập trung vào việc xử lý thanh toán và hoàn tất đơn hàng.

## Điều kiện tiên quyết
- Đã hoàn thành quy trình "Bán hàng Tổng quát" (Sơ đồ 0)
- Đã có sản phẩm trong giỏ hàng và đã kiểm tra tồn kho
- Thông tin khách hàng đã được xác định
- Nhân viên đã chọn "Bán hàng nhanh"

## Actors
- **Nhân viên bán hàng** (Sales Staff)
- **Hệ thống bán hàng** (Sales System)
- **Cơ sở dữ liệu** (Database)
- **Hệ thống tồn kho** (Inventory System)

## Sequence Diagram (PlantUML)

```plantuml
@startuml Quick_Sale_Sequence_Diagram
!theme aws-orange
title Sơ đồ Tuần tự: Bán hàng Nhanh (Quick Sale) - Rút gọn

actor "Nhân viên\nBán hàng" as Staff
participant "Giao diện\nTạo đơn hàng" as UI
participant "Sales System" as System
participant "Inventory\nSystem" as Inventory
database "Database" as DB

note over Staff, DB
  Điều kiện đầu vào:
  - Giỏ hàng đã có sản phẩm (qua sơ đồ Tổng quát)
  - Thông tin khách hàng đã xác định
  - Đã kiểm tra tồn kho sơ bộ
end note

== Khởi động Bán hàng Nhanh ==
Staff -> UI: Nhấn "Bán hàng nhanh"
UI -> System: openQuickSalePopup()
System -> Inventory: validateStockBeforeCheckout() - Kiểm tra lần cuối

note right of Inventory
  Kiểm tra tồn kho lần cuối:
  - Tính tổng số lượng cần bán
  - Xác minh tất cả sản phẩm vẫn đủ hàng
  - Cập nhật trạng thái real-time
end note

Inventory --> System: Xác nhận đủ tồn kho
System --> UI: Hiển thị popup thanh toán

== Chọn Phương thức Thanh toán ==
UI -> DB: fetchPaymentMethods() - Lấy danh sách thanh toán
DB --> UI: Trả về payment methods (Tiền mặt, Thẻ, Chuyển khoản...)
UI --> Staff: Hiển thị các tùy chọn thanh toán

Staff -> UI: Chọn phương thức thanh toán
Staff -> UI: Nhập số tiền khách trả
UI -> System: validatePaymentAmount(amountReceived)
System -> System: calculateChange() - Tính tiền thừa

alt Số tiền đủ
    System --> UI: Hiển thị số tiền thừa
else Số tiền không đủ
    System --> UI: Thông báo "Số tiền không đủ"
    UI --> Staff: Yêu cầu nhập lại số tiền
end

Staff -> UI: Nhấn "Thanh toán"
UI -> System: handleQuickSale()
System --> UI: Hiển thị popup xác nhận thanh toán

== Xác nhận và Hoàn tất Thanh toán ==
Staff -> UI: Nhấn "Xác nhận thanh toán"
UI -> System: confirmPayment()

== Tạo Đơn hàng ==
System -> System: fetchCurrentUser() - Lấy ID nhân viên
System -> System: generateOrderId() - Tạo mã đơn hàng unique
System -> DB: INSERT Order vào database
note right of DB
  orderData: {
    order_id: "ORD-YYYYMMDD-XXXXX",
    customer_id: customer?.customer_id,
    user_id: creatorUserId,
    order_date: ISO timestamp,
    price: totalOrderAmount,
    status: "Đã thanh toán",
    is_shipping: false,
    payment_method: selectedPaymentMethod
  }
end note
DB --> System: Xác nhận tạo đơn hàng

== Tạo Chi tiết Đơn hàng ==
System -> System: processOrderDetails("orderdetails")
loop Cho mỗi sản phẩm trong hóa đơn hiện tại
    System -> System: generateOrderDetailId()
    System -> DB: INSERT vào bảng orderdetails
    note right of DB
      orderDetail: {
        orderdetail_id: UUID,
        order_id: orderId,
        product_id: product.product_id,
        name_product: product.product_name,
        name_check: invoice.name,
        quantity: quantity,
        unit_price: price,
        subtotal: quantity * price
      }
    end note
    DB --> System: Xác nhận thêm chi tiết
end

== Cập nhật Tồn kho (Database Trigger) ==
note over DB
  Database trigger tự động cập nhật
  tồn kho khi INSERT orderdetails
  
  TRIGGER: update_product_stock_on_order
  - Giảm stock_quantity theo quantity
  - Đảm bảo stock_quantity >= 0
end note

== Hoàn tất và Reset ==
System -> UI: setSuccessMessage("Đơn hàng đã được tạo thành công!")
System -> UI: setShowPrintInvoicePopup(true)
System -> UI: Reset hóa đơn hiện tại
note right of UI
  Reset invoice:
  - products: []
  - totalAmount: 0
  - amountToPay: 0
  - customer: null
end note

System -> DB: fetchDefaultProducts() - Tải lại sản phẩm
DB --> System: Cập nhật thông tin tồn kho mới

Staff -> UI: In hóa đơn (tuỳ chọn)
UI -> System: Tạo HTML hóa đơn
System --> Staff: Mở cửa sổ in

@enduml
```

## Các bước chính trong quy trình:

### 1. Khởi tạo và Thêm sản phẩm
- Nhân viên truy cập trang tạo đơn hàng
- Hệ thống lấy danh sách sản phẩm mặc định
- Nhân viên tìm kiếm và thêm sản phẩm vào hóa đơn
- Hệ thống kiểm tra tồn kho và tính tổng tiền

### 2. Xử lý Thanh toán
- Nhân viên nhấn "Bán hàng nhanh"
- Hệ thống kiểm tra tồn kho toàn bộ
- Hiển thị popup chọn phương thức thanh toán
- Nhân viên nhập số tiền và xác nhận

### 3. Tạo Đơn hàng
- Tạo record trong bảng `orders`
- Tạo các record trong bảng `orderdetails`
- Database trigger tự động cập nhật tồn kho
- Reset giao diện và hiển thị thông báo thành công

## Đặc điểm của Quick Sale:
- `is_shipping: false` - Không có vận chuyển
- `status: "Đã thanh toán"` - Thanh toán ngay lập tức
- Sử dụng database trigger để cập nhật tồn kho tự động
- Chỉ xử lý hóa đơn hiện tại (activeInvoiceIndex)

## Files liên quan:
- `/app/dashboard/sales/create/page.tsx` (dòng 999-1426)
- Database: bảng `orders`, `orderdetails`, `products`
- Trigger: `update_product_stock_on_order`
