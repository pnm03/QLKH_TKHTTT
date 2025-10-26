# Sơ đồ Tuần tự: Bán hàng có Vận chuyển (Shipping Order)

## Mô tả
Sơ đồ này mô tả quy trình bán hàng có vận chuyển (rút gọn), tập trung vào việc nhập thông tin vận chuyển và các điểm khác biệt so với bán hàng nhanh.

## Điều kiện tiên quyết
- Đã hoàn thành quy trình "Bán hàng tổng quát" (Sơ đồ 0)
- Đã có sản phẩm trong giỏ hàng và đã chọn khách hàng
- Nhân viên đã chọn "Bán hàng có Vận chuyển"

## Actors
- **Nhân viên bán hàng** (Sales Staff)
- **Giao diện Dashboard** (Dashboard UI) 
- **Hệ thống bán hàng** (Sales System)
- **Dịch vụ vận chuyển** (Shipping Service)
- **Cơ sở dữ liệu** (Database)

## Sequence Diagram (PlantUML)

```plantuml
@startuml
!theme plain
title Sequence Diagram - Bán hàng có Vận chuyển (Shipping Order)

participant Staff as "Nhân viên Bán hàng"
participant UI as "Dashboard UI"
participant System as "Sales System" 
participant Payment as "Payment Service"
participant Shipping as "Shipping Service"
participant DB as "Database"

note over Staff, DB
**Điều kiện tiên quyết:**
- Đã hoàn thành quy trình "Bán hàng tổng quát"
- Đã chọn sản phẩm và khách hàng  
- Đã chọn chức năng "Bán hàng có Vận chuyển"
end note

== Khởi động Bán hàng có Vận chuyển ==

Staff -> UI: Nhấn "Bán hàng có Vận chuyển"
UI -> System: setShippingMode(true)
System -> UI: Kích hoạt giao diện vận chuyển

note over Staff, System: Các bước thêm sản phẩm và chọn khách hàng giống "Bán hàng tổng quát"

== Chuẩn bị Form Thông tin Vận chuyển ==

Staff -> UI: Nhấn "Tạo đơn vận chuyển"
UI -> System: openShippingPopup()
System -> DB: fetchPaymentMethods()
DB --> System: paymentMethods[]
System -> UI: Hiển thị form vận chuyển

== Nhập Thông tin Vận chuyển ==

Staff -> UI: Nhập tên người nhận
Staff -> UI: Nhập số điện thoại người nhận  
Staff -> UI: Nhập địa chỉ giao hàng chi tiết
Staff -> UI: Chọn phường/xã, quận/huyện

Staff -> UI: Nhập thông tin gói hàng
note right of Staff
  Thông tin gói hàng:
  - Trọng lượng + đơn vị
  - Kích thước (dài x rộng x cao)
  - Đơn vị kích thước
end note

== Chọn Phương thức Thanh toán ==

alt Thanh toán trước
    Staff -> UI: Chọn phương thức thanh toán
    Staff -> UI: Nhập số tiền trả trước
    Staff -> UI: Bỏ tích "Thu hộ tiền (COD)"
    
    Staff -> UI: Nhấn "Gửi đơn hàng"
    UI -> System: handleShipOrderConfirmation()
    System -> UI: Hiển thị popup xác nhận thanh toán
    
    Staff -> UI: Xác nhận thanh toán
    UI -> Payment: processPayment()
    Payment -> System: paymentConfirmed()

else COD (Thu hộ khi giao)
    Staff -> UI: Tích chọn "Thu hộ tiền (COD)"
    Staff -> UI: KHÔNG chọn phương thức thanh toán
    
    Staff -> UI: Nhấn "Gửi đơn hàng"
    UI -> System: handleShipOrderConfirmation()
    System -> System: setCODMode(true)
end

== Tạo Đơn hàng Vận chuyển ==

System -> System: generateOrderId()
System -> System: generateShippingId()

=== Tạo Order Record ===
System -> DB: INSERT orders
note right of DB
  orderObject: {
    order_id: orderId,
    customer_id: customerId,
    is_shipping: true,
    status: paymentStatus,
    payment_method: method
  }
end note

=== Tạo Order Details ===
loop Cho mỗi sản phẩm
    System -> DB: INSERT orderdetails
end

=== Tạo Shipping Record ===
System -> Shipping: createShippingRecord()
Shipping -> DB: INSERT shippings
note right of DB
  shippingObject: {
    shipping_id: shippingId,
    order_id: orderId,
    shipping_address: fullAddress,
    name_customer: recipientName,
    phone_customer: recipientPhone,
    weight: shippingWeight,
    dimensions: packageSize,
    cod_shipping: codAmount,
    status: "Chưa giao hàng"
  }
end note

=== Cập nhật Tồn kho ===
note over DB
  Database trigger tự động:
  UPDATE products SET 
  stock_quantity = stock_quantity - quantity
end note

== Hoàn tất Đơn hàng ==

System -> UI: setSuccessMessage("Đơn hàng vận chuyển đã được tạo!")
System -> UI: closeShippingPopup()
System -> UI: showPrintInvoicePopup()

System -> System: createInvoiceData()
System -> UI: resetCurrentInvoice()
System -> DB: reloadProductList()

Staff -> UI: In hóa đơn vận chuyển (tùy chọn)
UI -> System: generateShippingInvoice()

@enduml
```

## Điểm khác biệt chính với Quick Sale:

### 1. **Thông tin bổ sung**
- **Địa chỉ giao hàng**: Tên người nhận, SĐT, địa chỉ chi tiết
- **Thông tin gói hàng**: Trọng lượng, kích thước, đơn vị đo

### 2. **Tùy chọn thanh toán linh hoạt**
- **Thanh toán trước**: Chọn PTTT + nhập số tiền trả trước
- **COD**: Thu hộ tiền khi giao hàng

### 3. **Database records**
- **orders**: `is_shipping: true`
- **shippings**: Bảng riêng chứa thông tin vận chuyển
- **Trạng thái**: "Đã thanh toán" hoặc "Chưa thanh toán"

### 4. **Quy trình xử lý**
| Bước | Quick Sale | Shipping Order |
|------|------------|----------------|
| Thanh toán | Bắt buộc ngay | Trả trước hoặc COD |
| Thông tin khách | Cơ bản | + Địa chỉ giao hàng |
| Database | 2 bảng | 3 bảng (thêm shippings) |
| Hóa đơn | In ngay | In + thông tin vận chuyển |

## Files liên quan:
- `/app/dashboard/sales/create/page.tsx` (dòng 1530-1802)
- Database: `orders`, `orderdetails`, `shippings`
- Trigger: `update_product_stock_on_order`
