# Shipping Management Sequence Diagram

## Mô tả
Sơ đồ tuần tự mô tả quy trình quản lý vận chuyển trong hệ thống QLBH, từ tạo phiếu gửi hàng đến theo dõi và cập nhật trạng thái giao hàng.

## Actors
- **Nhân viên kho**: Chuẩn bị và gửi hàng
- **Nhân viên bán hàng**: Theo dõi đơn hàng
- **Hệ thống QLBH**: Xử lý logic nghiệp vụ
- **Hệ thống vận chuyển**: Đối tác giao hàng (GHN, GHTK, v.v.)
- **Database**: Lưu trữ thông tin vận chuyển

## PlantUML Code

```plantuml
@startuml Shipping Management Sequence Diagram
!theme aws-orange
skinparam participant {
    BackgroundColor lightgreen
    BorderColor darkgreen
}
skinparam sequence {
    ArrowColor darkgreen
    LifeLineBorderColor darkgreen
}

actor "Nhân viên kho" as WarehouseStaff
actor "Nhân viên bán hàng" as SalesStaff
participant "Hệ thống QLBH" as System
participant "Hệ thống vận chuyển" as ShippingProvider
database "Database" as DB

== Tạo phiếu gửi hàng ==
WarehouseStaff -> System: Truy cập danh sách đơn hàng cần gửi
System -> DB: Query đơn hàng có trạng thái "Đã thanh toán"
DB -> System: Trả về danh sách đơn hàng
System -> WarehouseStaff: Hiển thị danh sách đơn hàng

WarehouseStaff -> System: Chọn đơn hàng để tạo phiếu gửi
System -> DB: Lấy thông tin chi tiết đơn hàng
DB -> System: Trả về thông tin (địa chỉ, sản phẩm, khối lượng)
System -> WarehouseStaff: Hiển thị form tạo phiếu gửi

WarehouseStaff -> System: Chọn đơn vị vận chuyển\nNhập thông tin gói hàng
System -> System: Validate thông tin gửi hàng
System -> ShippingProvider: Tạo đơn vận chuyển
ShippingProvider -> ShippingProvider: Tạo mã vận đơn

alt Tạo vận đơn thành công
    ShippingProvider -> System: Trả về mã vận đơn và phí ship
    System -> DB: Lưu thông tin vận chuyển
    DB -> System: Xác nhận lưu
    System -> DB: Cập nhật trạng thái đơn hàng = "Đang giao"
    DB -> System: Xác nhận cập nhật
    System -> WarehouseStaff: Hiển thị mã vận đơn và in phiếu gửi
    
else Tạo vận đơn thất bại
    ShippingProvider -> System: Trả về lỗi
    System -> WarehouseStaff: Hiển thị thông báo lỗi
    WarehouseStaff -> System: Thử lại hoặc chọn đơn vị khác
end

== Theo dõi vận chuyển ==
SalesStaff -> System: Truy cập trang theo dõi đơn hàng
System -> DB: Query đơn hàng và thông tin vận chuyển
DB -> System: Trả về danh sách đơn hàng đang giao

loop Cập nhật trạng thái định kỳ
    System -> ShippingProvider: Kiểm tra trạng thái vận đơn
    ShippingProvider -> System: Trả về trạng thái hiện tại
    
    alt Trạng thái thay đổi
        System -> DB: Cập nhật trạng thái mới
        DB -> System: Xác nhận cập nhật
        System -> System: Gửi thông báo cho khách hàng (SMS/Email)
    end
end

System -> SalesStaff: Hiển thị danh sách với trạng thái cập nhật

== Xác nhận giao hàng ==
alt Giao hàng thành công
    ShippingProvider -> System: Webhook thông báo giao thành công
    System -> DB: Cập nhật trạng thái = "Đã giao hàng"
    System -> DB: Cập nhật thời gian giao hàng
    DB -> System: Xác nhận cập nhật
    System -> System: Tính toán doanh thu và commission
    System -> DB: Cập nhật báo cáo doanh thu
    System -> System: Gửi thông báo giao hàng thành công
    
else Giao hàng thất bại
    ShippingProvider -> System: Webhook thông báo giao thất bại
    System -> DB: Cập nhật trạng thái = "Giao hàng thất bại"
    System -> DB: Ghi log lý do thất bại
    DB -> System: Xác nhận cập nhật
    System -> SalesStaff: Thông báo cần xử lý đơn hàng
    
    SalesStaff -> System: Quyết định giao lại hoặc hoàn hàng
    alt Giao lại
        System -> ShippingProvider: Tạo đơn vận chuyển mới
    else Hoàn hàng
        System -> DB: Cập nhật trạng thái = "Đã hủy"
        System -> System: Xử lý hoàn tiền (nếu có)
    end
end

@enduml
```

## Use Cases
1. **Tạo phiếu gửi hàng**: Tích hợp với nhà cung cấp vận chuyển
2. **Theo dõi real-time**: Cập nhật trạng thái tự động qua webhook
3. **Xử lý giao hàng thất bại**: Workflow retry và hoàn hàng
4. **Báo cáo vận chuyển**: Tracking performance và chi phí

## Business Rules
- Chỉ đơn hàng đã thanh toán mới được tạo phiếu gửi
- Mỗi đơn hàng chỉ có một mã vận đơn active
- Tự động cập nhật trạng thái qua API/webhook
- Lưu lịch sử tất cả trạng thái để audit
