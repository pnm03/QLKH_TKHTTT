# Payment Processing Sequence Diagram

## Mô tả
Sơ đồ tuần tự mô tả quy trình xử lý thanh toán trong hệ thống QLBH, từ việc tìm kiếm đơn hàng đến xác nhận thanh toán thành công.

## Actors
- **Nhân viên bán hàng**: Thực hiện quá trình thanh toán
- **Hệ thống QLBH**: Xử lý logic nghiệp vụ
- **Hệ thống thanh toán**: Xử lý giao dịch tài chính
- **Database**: Lưu trữ thông tin thanh toán

## PlantUML Code

```plantuml
@startuml Payment Processing Sequence Diagram
!theme aws-orange
skinparam participant {
    BackgroundColor lightblue
    BorderColor darkblue
}
skinparam sequence {
    ArrowColor darkblue
    LifeLineBorderColor darkblue
}

actor "Nhân viên bán hàng" as Staff
participant "Hệ thống QLBH" as System
participant "Hệ thống thanh toán" as PaymentGateway
database "Database" as DB

== Tìm kiếm đơn hàng ==
Staff -> System: Tìm kiếm đơn hàng theo mã/SĐT
System -> DB: Query đơn hàng
DB -> System: Trả về thông tin đơn hàng
System -> Staff: Hiển thị danh sách đơn hàng

== Chọn đơn hàng và phương thức thanh toán ==
Staff -> System: Chọn đơn hàng cần thanh toán
System -> DB: Lấy chi tiết đơn hàng
DB -> System: Trả về chi tiết (products, amount, status)
System -> Staff: Hiển thị form thanh toán

Staff -> System: Chọn phương thức thanh toán\n(Cash/Card/Transfer)
System -> System: Validate phương thức thanh toán

== Xử lý thanh toán ==
alt Thanh toán tiền mặt (Cash)
    Staff -> System: Nhập số tiền khách đưa
    System -> System: Tính tiền thừa
    System -> Staff: Hiển thị tiền thừa
    Staff -> System: Xác nhận thanh toán
    System -> DB: Cập nhật trạng thái thanh toán
    DB -> System: Xác nhận cập nhật
    
else Thanh toán thẻ/chuyển khoản
    Staff -> System: Nhập thông tin thanh toán
    System -> PaymentGateway: Gửi yêu cầu thanh toán
    PaymentGateway -> PaymentGateway: Xử lý giao dịch
    
    alt Thanh toán thành công
        PaymentGateway -> System: Trả về kết quả thành công
        System -> DB: Lưu thông tin giao dịch
        DB -> System: Xác nhận lưu
        System -> Staff: Hiển thị thông báo thành công
        
    else Thanh toán thất bại
        PaymentGateway -> System: Trả về lỗi
        System -> Staff: Hiển thị thông báo lỗi
        Staff -> System: Thử lại hoặc chọn phương thức khác
    end
end

== Hoàn tất thanh toán ==
System -> DB: Cập nhật trạng thái đơn hàng
DB -> System: Xác nhận cập nhật
System -> DB: Lưu lịch sử thanh toán
DB -> System: Xác nhận lưu
System -> Staff: Tạo hóa đơn/biên lai
Staff -> System: In hóa đơn (nếu cần)

@enduml
```

## Use Cases
1. **Thanh toán tiền mặt**: Xử lý thanh toán trực tiếp, tính tiền thừa
2. **Thanh toán thẻ**: Tích hợp với cổng thanh toán bên ngoài
3. **Thanh toán chuyển khoản**: Xác thực giao dịch ngân hàng
4. **Xử lý lỗi**: Retry mechanism khi thanh toán thất bại

## Business Rules
- Đơn hàng phải ở trạng thái "Pending" mới có thể thanh toán
- Số tiền thanh toán phải khớp với tổng giá trị đơn hàng
- Mỗi giao dịch phải được ghi log để audit
- Hỗ trợ thanh toán một phần (partial payment)
