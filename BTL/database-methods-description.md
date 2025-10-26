# Mô tả Chi tiết Các Phương thức trong Sơ đồ Lớp CSDL - Hệ thống Quản lý Bán hàng

## 1. Lớp UserEntity (Người dùng)

### getUserDetails()
- **Mục đích**: Lấy thông tin chi tiết của người dùng
- **Chức năng**: Truy vấn và trả về tất cả thông tin cá nhân của người dùng bao gồm họ tên, email, số điện thoại, ngày sinh, quê quán
- **Trả về**: Object chứa thông tin đầy đủ của người dùng
- **Sử dụng**: Hiển thị profile, form chỉnh sửa thông tin

### updateProfile()
- **Mục đích**: Cập nhật thông tin hồ sơ người dùng
- **Chức năng**: Cho phép người dùng thay đổi thông tin cá nhân như họ tên, số điện thoại, ngày sinh, quê quán
- **Tham số**: Object chứa các trường cần cập nhật
- **Validation**: Kiểm tra định dạng email, số điện thoại, độ dài tên
- **Sử dụng**: Trang cài đặt tài khoản, chỉnh sửa profile

## 2. Lớp Account (Tài khoản)

### login()
- **Mục đích**: Đăng nhập vào hệ thống
- **Chức năng**: Xác thực thông tin đăng nhập và tạo session
- **Tham số**: username, password
- **Xử lý**: 
  - Kiểm tra username/password
  - Verify password hash
  - Cập nhật last_login
  - Tạo JWT token hoặc session
- **Trả về**: Token hoặc session info

### logout()
- **Mục đích**: Đăng xuất khỏi hệ thống
- **Chức năng**: Hủy session hiện tại và xóa token
- **Xử lý**:
  - Invalidate current session
  - Clear authentication cookies/tokens
  - Log logout activity

### changePassword()
- **Mục đích**: Thay đổi mật khẩu tài khoản
- **Chức năng**: Cho phép người dùng đổi mật khẩu
- **Tham số**: currentPassword, newPassword
- **Validation**:
  - Xác thực mật khẩu hiện tại
  - Kiểm tra độ mạnh mật khẩu mới
  - Hash mật khẩu mới
- **Security**: Hash password với salt

### checkRoleAccess(requiredRole: Role) : boolean
- **Mục đích**: Kiểm tra quyền truy cập theo vai trò
- **Chức năng**: Xác định người dùng có quyền thực hiện action cụ thể không
- **Tham số**: requiredRole - vai trò cần thiết
- **Logic**:
  - So sánh role hiện tại với requiredRole
  - Kiểm tra account status (active/inactive/locked)
- **Trả về**: true nếu có quyền, false nếu không

## 3. Lớp OrderEntity (Đơn hàng)

### calculateTotalPrice()
- **Mục đích**: Tính tổng giá trị đơn hàng
- **Chức năng**: Tính toán tổng tiền từ tất cả OrderDetail
- **Logic**:
  - Lấy tất cả OrderDetail thuộc đơn hàng
  - Tính tổng: Σ(quantity × unit_price_at_order)
  - Cập nhật trường total_price
- **Trigger**: Tự động gọi khi thêm/sửa/xóa OrderDetail

### updateStatus(newStatus: OrderStatus)
- **Mục đích**: Cập nhật trạng thái đơn hàng
- **Chức năng**: Thay đổi trạng thái đơn hàng theo quy trình
- **Tham số**: newStatus - trạng thái mới
- **Validation**:
  - Kiểm tra logic chuyển trạng thái hợp lệ
  - PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED
- **Side effects**: Có thể trigger notification, email

### addOrderDetail(prod: Product, qty: int)
- **Mục đích**: Thêm sản phẩm vào đơn hàng
- **Chức năng**: Tạo OrderDetail mới cho đơn hàng
- **Tham số**: 
  - prod: Thông tin sản phẩm
  - qty: Số lượng
- **Xử lý**:
  - Kiểm tra tồn kho
  - Tạo OrderDetail với giá hiện tại
  - Cập nhật tổng tiền đơn hàng
  - Giảm số lượng tồn kho

### applyPayment(pm: PaymentMethod)
- **Mục đích**: Áp dụng phương thức thanh toán
- **Chức năng**: Gán phương thức thanh toán cho đơn hàng
- **Tham số**: pm - phương thức thanh toán
- **Xử lý**:
  - Cập nhật payment_method_id
  - Có thể thay đổi status thành PAID
  - Log payment information

## 4. Lớp OrderDetail (Chi tiết đơn hàng)

### calculateSubtotal()
- **Mục đích**: Tính thành tiền cho từng dòng sản phẩm
- **Chức năng**: Tính subtotal = quantity × unit_price_at_order
- **Trigger**: Tự động khi tạo hoặc cập nhật OrderDetail
- **Validation**: Đảm bảo quantity > 0 và unit_price ≥ 0

## 5. Lớp Product (Sản phẩm)

### updateStock(qty: int)
- **Mục đích**: Cập nhật số lượng tồn kho
- **Chức năng**: Thay đổi stock_quantity
- **Tham số**: qty - số lượng thay đổi (có thể âm khi bán)
- **Validation**:
  - Kiểm tra qty sau cập nhật ≥ 0
  - Prevent overselling
- **Side effects**: Có thể trigger low-stock alerts

### getProductDetails()
- **Mục đích**: Lấy thông tin chi tiết sản phẩm
- **Chức năng**: Truy vấn thông tin đầy đủ sản phẩm kèm category
- **Trả về**: Object chứa thông tin sản phẩm + category info
- **Includes**: Tên, mô tả, giá, tồn kho, hình ảnh, danh mục

## 6. Lớp Category (Danh mục)

### getProductsInCategory()
- **Mục đích**: Lấy danh sách sản phẩm trong danh mục
- **Chức năng**: Truy vấn tất cả sản phẩm thuộc danh mục này
- **Options**: Có thể hỗ trợ phân trang, sắp xếp, lọc
- **Trả về**: Array các Product objects

## 7. Lớp Shipping (Vận chuyển)

### updateShippingStatus(newStatus: ShippingStatus)
- **Mục đích**: Cập nhật trạng thái vận chuyển
- **Chức năng**: Thay đổi trạng thái giao hàng
- **Flow**: PENDING_PICKUP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
- **Side effects**:
  - Cập nhật actual_delivery_date khi DELIVERED
  - Có thể gửi notification cho khách hàng
  - Cập nhật trạng thái đơn hàng tương ứng

### getTrackingInfo()
- **Mục đích**: Lấy thông tin tracking vận đơn
- **Chức năng**: Trả về thông tin chi tiết về quá trình vận chuyển
- **Trả về**: Object chứa:
  - Tracking number
  - Current status
  - Estimated delivery date
  - Carrier information
  - Shipping history/timeline

## 8. Lớp ReturnEntity (Đổi trả)

### processReturn()
- **Mục đích**: Xử lý yêu cầu đổi trả
- **Chức năng**: Bắt đầu quy trình xử lý đổi trả
- **Xử lý**:
  - Validate return request
  - Check return policy (thời gian, điều kiện)
  - Cập nhật status thành PROCESSING
  - Create return workflow

### approveReturn()
- **Mục đích**: Phê duyệt yêu cầu đổi trả
- **Chức năng**: Chấp nhận yêu cầu đổi trả
- **Authority**: Chỉ manager/admin có quyền
- **Xử lý**:
  - Cập nhật status thành APPROVED
  - Initiate refund process
  - Update product stock if applicable
  - Create refund transaction

### rejectReturn()
- **Mục đích**: Từ chối yêu cầu đổi trả
- **Chức năng**: Không chấp nhận yêu cầu đổi trả
- **Xử lý**:
  - Cập nhật status thành REJECTED
  - Log rejection reason
  - Notify customer
  - Close return case

## 9. Quy trình Tích hợp (Integration Workflows)

### Quy trình Tạo Đơn hàng
1. Customer tạo đơn hàng
2. OrderEntity.addOrderDetail() cho từng sản phẩm
3. Product.updateStock() giảm tồn kho
4. OrderEntity.calculateTotalPrice()
5. OrderEntity.applyPayment() nếu thanh toán ngay

### Quy trình Vận chuyển
1. OrderEntity status → SHIPPED
2. Tạo Shipping record
3. Shipping.updateShippingStatus() theo tiến độ
4. Cập nhật OrderEntity status khi delivered

### Quy trình Đổi trả
1. Customer tạo ReturnEntity
2. ReturnEntity.processReturn()
3. Manager review và approveReturn()/rejectReturn()
4. Nếu approved: refund + update stock

## 10. Triggers và Constraints

### Database Triggers
- **Auto Subtotal**: OrderDetail.subtotal tự động = quantity × unit_price
- **Stock Update**: Product.stock_quantity tự động giảm khi tạo OrderDetail
- **Cascade Delete**: Xóa Order → tự động xóa OrderDetail

### Business Rules
- **Role Hierarchy**: ADMIN > NVQLDH > NVBH > NVK
- **Order Status Flow**: Tuần tự không được nhảy bước
- **Stock Validation**: Không bán quá tồn kho
- **Return Policy**: Chỉ đổi trả trong thời gian cho phép

## 11. Security Considerations

### Authentication & Authorization
- **Account.checkRoleAccess()**: Kiểm tra quyền trước mọi action
- **Password Security**: Hash with salt, enforce strong password
- **Session Management**: Secure session handling, timeout

### Data Protection
- **Input Validation**: Sanitize all user input
- **SQL Injection Prevention**: Use parameterized queries
- **Business Logic**: Validate business rules at application level

## 12. Performance Optimization

### Database Indexing
- **Foreign Keys**: Index trên tất cả foreign key columns
- **Search Fields**: Index trên email, phone, product_name
- **Order Queries**: Composite index trên (user_id, order_date)

### Caching Strategy
- **Product Info**: Cache product details, category info
- **User Sessions**: Cache user roles và permissions
- **Frequent Queries**: Cache category products, popular items
