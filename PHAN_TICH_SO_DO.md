# 📐 PHÂN TÍCH SƠ ĐỒ TRẠNG THÁI & GIAO TIẾP

> **Hệ thống QLBH - Phân tích các chức năng phù hợp cho sơ đồ**
> 
> **Cập nhật:** 24/10/2025

---

## 📊 MỤC LỤC

1. [Sơ đồ Trạng thái (State Diagram)](#sơ-đồ-trạng-thái)
2. [Sơ đồ Tuần tự (Sequence Diagram)](#sơ-đồ-tuần-tự)
3. [Sơ đồ đã có sẵn](#sơ-đồ-đã-có-sẵn)
4. [Đề xuất sơ đồ mới](#đề-xuất-sơ-đồ-mới)

---

## 🔄 SƠ ĐỒ TRẠNG THÁI (State Diagram)

> **Định nghĩa:** Sơ đồ trạng thái mô tả các trạng thái của một đối tượng và cách chuyển đổi giữa các trạng thái đó.

### **✅ ĐÃ CÓ SẴN (3 sơ đồ):**

#### **1. Đơn hàng (Orders)** ✅
**File:** `BTL/Trang_thai/so-do-trang-thai-3-don-hang.html`

**Các trạng thái:**
```
1. Đang tạo (Creating)
   ↓ [Submit order]
2. Chờ xác nhận (Pending)
   ↓ [Confirm] → 3. Đã xác nhận (Confirmed)
   ↓ [Reject]  → 8. Đã hủy (Cancelled)
3. Đã xác nhận (Confirmed)
   ↓ [Process payment]
4. Đang xử lý thanh toán (Processing Payment)
   ↓ [Payment success] → 5. Đã thanh toán (Paid)
   ↓ [Payment failed]  → 8. Đã hủy (Cancelled)
5. Đã thanh toán (Paid)
   ↓ [Start delivery]
6. Đang giao hàng (Delivering)
   ↓ [Delivery success] → 7. Hoàn thành (Completed)
   ↓ [Delivery failed]  → 9. Thất bại (Failed)
7. Hoàn thành (Completed) [Final State]
8. Đã hủy (Cancelled) [Final State]
9. Thất bại (Failed)
   ↓ [Retry] → 6. Đang giao hàng
   ↓ [Cancel] → 8. Đã hủy
```

**Triggers:**
- Submit order
- Confirm/Reject
- Process payment
- Payment success/failed
- Start delivery
- Delivery success/failed
- Retry/Cancel

---

#### **2. Vận chuyển (Shipping)** ✅
**File:** `BTL/Trang_thai/so-do-trang-thai-4-van-chuyen.html`

**Các trạng thái:**
```
1. Chờ lấy hàng (Pending Pickup)
   ↓ [Assign driver]
2. Đã phân công (Assigned)
   ↓ [Pickup completed]
3. Đã lấy hàng (Picked Up)
   ↓ [In transit]
4. Đang vận chuyển (In Transit)
   ↓ [Out for delivery]
5. Đang giao hàng (Out for Delivery)
   ↓ [Delivered] → 6. Đã giao (Delivered)
   ↓ [Failed]    → 7. Giao thất bại (Failed Delivery)
6. Đã giao (Delivered) [Final State]
7. Giao thất bại (Failed Delivery)
   ↓ [Retry]   → 4. Đang vận chuyển
   ↓ [Return]  → 8. Hoàn trả (Returned)
8. Hoàn trả (Returned) [Final State]
```

**Triggers:**
- Assign driver
- Pickup completed
- In transit
- Out for delivery
- Delivered/Failed
- Retry/Return

---

#### **3. Đổi trả (Returns)** ✅
**File:** `BTL/Trang_thai/so-do-trang-thai-5-doi-tra.html`

**Các trạng thái:**
```
1. Yêu cầu trả hàng (Return Requested)
   ↓ [Approve] → 2. Đã chấp nhận (Approved)
   ↓ [Reject]  → 8. Đã từ chối (Rejected)
2. Đã chấp nhận (Approved)
   ↓ [Customer ships]
3. Đang gửi trả (Returning)
   ↓ [Received]
4. Đã nhận hàng (Received)
   ↓ [Inspect]
5. Đang kiểm tra (Inspecting)
   ↓ [Accept]  → 6. Đã kiểm tra - Chấp nhận (Accepted)
   ↓ [Reject]  → 7. Đã kiểm tra - Từ chối (Rejected Inspection)
6. Đã kiểm tra - Chấp nhận (Accepted)
   ↓ [Process refund]
9. Đang hoàn tiền (Refunding)
   ↓ [Refund completed]
10. Đã hoàn tiền (Refunded) [Final State]
7. Đã kiểm tra - Từ chối (Rejected Inspection) [Final State]
8. Đã từ chối (Rejected) [Final State]
```

**Triggers:**
- Request return
- Approve/Reject
- Customer ships
- Received
- Inspect
- Accept/Reject inspection
- Process refund
- Refund completed

---

### **🆕 ĐỀ XUẤT SƠ ĐỒ TRẠNG THÁI MỚI:**

#### **4. Sản phẩm (Products)** 🆕
**Lý do:** Sản phẩm có nhiều trạng thái lifecycle

**Các trạng thái:**
```
1. Nháp (Draft)
   ↓ [Submit for review]
2. Chờ duyệt (Pending Approval)
   ↓ [Approve]  → 3. Đang hoạt động (Active)
   ↓ [Reject]   → 1. Nháp (Draft)
3. Đang hoạt động (Active)
   ↓ [Out of stock] → 4. Hết hàng (Out of Stock)
   ↓ [Deactivate]   → 5. Ngừng bán (Inactive)
4. Hết hàng (Out of Stock)
   ↓ [Restock] → 3. Đang hoạt động
   ↓ [Discontinue] → 6. Ngừng kinh doanh (Discontinued)
5. Ngừng bán (Inactive)
   ↓ [Reactivate] → 3. Đang hoạt động
   ↓ [Discontinue] → 6. Ngừng kinh doanh
6. Ngừng kinh doanh (Discontinued) [Final State]
```

---

#### **5. Người dùng (Users)** 🆕
**Lý do:** Lifecycle quản lý người dùng

**Các trạng thái:**
```
1. Đăng ký (Registered)
   ↓ [Verify email]
2. Chờ xác thực (Pending Verification)
   ↓ [Email verified] → 3. Hoạt động (Active)
   ↓ [Timeout]        → 7. Hết hạn (Expired)
3. Hoạt động (Active)
   ↓ [Suspend]     → 4. Bị khóa tạm (Suspended)
   ↓ [Deactivate]  → 5. Vô hiệu hóa (Inactive)
4. Bị khóa tạm (Suspended)
   ↓ [Appeal approved] → 3. Hoạt động
   ↓ [Ban]            → 6. Bị cấm (Banned)
5. Vô hiệu hóa (Inactive)
   ↓ [Reactivate] → 3. Hoạt động
6. Bị cấm (Banned) [Final State]
7. Hết hạn (Expired)
   ↓ [Resend verification] → 2. Chờ xác thực
```

---

#### **6. Thanh toán (Payment)** 🆕
**Lý do:** Quy trình thanh toán có nhiều bước

**Các trạng thái:**
```
1. Khởi tạo (Initialized)
   ↓ [Submit payment]
2. Đang xử lý (Processing)
   ↓ [Authorized] → 3. Đã ủy quyền (Authorized)
   ↓ [Failed]     → 7. Thất bại (Failed)
3. Đã ủy quyền (Authorized)
   ↓ [Capture]
4. Đang chuyển tiền (Capturing)
   ↓ [Success] → 5. Hoàn thành (Completed)
   ↓ [Failed]  → 7. Thất bại
5. Hoàn thành (Completed)
   ↓ [Refund requested] → 6. Đang hoàn tiền (Refunding)
6. Đang hoàn tiền (Refunding)
   ↓ [Refund completed] → 8. Đã hoàn tiền (Refunded)
7. Thất bại (Failed)
   ↓ [Retry] → 2. Đang xử lý
8. Đã hoàn tiền (Refunded) [Final State]
```

---

#### **7. Tồn kho (Inventory)** 🆕
**Lý do:** Quản lý trạng thái tồn kho

**Các trạng thái:**
```
1. Đủ hàng (In Stock) [stock > reorder_level]
   ↓ [Stock decreases]
2. Sắp hết (Low Stock) [stock <= reorder_level && stock > 0]
   ↓ [Stock out] → 3. Hết hàng (Out of Stock)
   ↓ [Restock]   → 1. Đủ hàng
3. Hết hàng (Out of Stock) [stock = 0]
   ↓ [Restock] → 1. Đủ hàng
   ↓ [Discontinued] → 4. Ngừng nhập (Discontinued)
4. Ngừng nhập (Discontinued) [Final State]
```

---

#### **8. Khách hàng (Customer)** 🆕
**Lý do:** Lifecycle và phân loại khách hàng

**Các trạng thái:**
```
1. Khách mới (New)
   ↓ [First purchase]
2. Khách đã mua (Active)
   ↓ [Multiple purchases + high value] → 3. Khách VIP (VIP)
   ↓ [No purchase in 6 months]        → 4. Không hoạt động (Inactive)
3. Khách VIP (VIP)
   ↓ [No purchase in 6 months] → 4. Không hoạt động
4. Không hoạt động (Inactive)
   ↓ [Purchase again]         → 2. Khách đã mua
   ↓ [Request deletion]       → 5. Đã xóa (Deleted)
5. Đã xóa (Deleted) [Final State]
```

---

## 🔀 SƠ ĐỒ TUẦN TỰ (Sequence Diagram)

> **Định nghĩa:** Sơ đồ tuần tự mô tả tương tác giữa các actors và hệ thống theo thời gian.

### **✅ ĐÃ CÓ SẴN (23 sơ đồ trong BTL/Tuan_tu):**

#### **Nhóm 1: Bán hàng (6 sơ đồ)**
1. ✅ **Chuẩn bị bán hàng** (`so-do-1-chuan-bi-ban-hang.html`)
2. ✅ **Bán hàng nhanh** (`so-do-2-ban-hang-nhanh.html`)
3. ✅ **Tạo đơn gửi đi** (`so-do-3-tao-don-gui-di.html`)
4. ✅ **Thêm phương thức thanh toán** (`so-do-4-them-phuong-thuc-thanh-toan.html`)
5. ✅ **Sửa phương thức thanh toán** (`so-do-4-sua-phuong-thuc-thanh-toan.html`)
6. ✅ **Thanh toán** (`so-do-19-thanh-toan.html`)

#### **Nhóm 2: Quản lý doanh nghiệp (3 sơ đồ)**
7. ✅ **Quản lý chi nhánh** (`so-do-5-quan-ly-chi-nhanh.html`)
8. ✅ **Quản lý nhân viên** (`so-do-6-quan-ly-nhan-vien.html`)
9. ✅ **Quản lý khách hàng** (`so-do-7-quan-ly-khach-hang.html`)

#### **Nhóm 3: Chăm sóc khách hàng (1 sơ đồ)**
10. ✅ **Chăm sóc khách hàng** (`so-do-8-cham-soc-khach-hang.html`)

#### **Nhóm 4: Quản lý người dùng (4 sơ đồ)**
11. ✅ **Hiển thị danh sách người dùng** (`so-do-9-hien-thi-danh-sach-nguoi-dung.html`)
12. ✅ **Thêm người dùng** (`so-do-10-them-nguoi-dung.html`)
13. ✅ **Tìm kiếm người dùng** (`so-do-11-tim-kiem-nguoi-dung.html`)
14. ✅ **Phân quyền người dùng** (`so-do-12-phan-quyen-nguoi-dung.html`)

#### **Nhóm 5: Quản lý sản phẩm (4 sơ đồ)**
15. ✅ **Hiển thị danh sách sản phẩm** (`so-do-13-hien-thi-danh-sach-san-pham.html`)
16. ✅ **Thêm sản phẩm** (`so-do-14-them-san-pham.html`)
17. ✅ **Tìm kiếm sản phẩm** (`so-do-15-tim-kiem-san-pham.html`)
18. ✅ **Quản lý danh mục sản phẩm** (`so-do-16-quan-ly-danh-muc-san-pham.html`)

#### **Nhóm 6: Đơn hàng & Vận chuyển (2 sơ đồ)**
19. ✅ **Tìm kiếm & xem đơn hàng** (`so-do-17-tim-kiem-xem-don-hang.html`)
20. ✅ **Đơn vận chuyển** (`so-do-18-don-van-chuyen.html`)

#### **Nhóm 7: Báo cáo (3 sơ đồ)**
21. ✅ **Báo cáo đơn hàng** (`so-do-20-bao-cao-don-hang.html`)
22. ✅ **Báo cáo tài chính** (`so-do-21-bao-cao-tai-chinh.html`)
23. ✅ **Báo cáo vận chuyển** (`so-do-22-bao-cao-van-chuyen.html`)

---

### **✅ SƠ ĐỒ TUẦN TỰ TRONG sequence-diagrams/ (6 sơ đồ):**

1. ✅ **Quy trình bán hàng tổng quát** (`0-general-sales-process-sequence-diagram.md`)
2. ✅ **Bán hàng nhanh** (`1-quick-sale-sequence-diagram.md`)
3. ✅ **Đơn gửi hàng** (`2-shipping-order-sequence-diagram.md`)
4. ✅ **Xử lý thanh toán** (`3-payment-processing-sequence-diagram.md`)
5. ✅ **Quản lý vận chuyển** (`4-shipping-management-sequence-diagram.md`)
6. ✅ **Quản lý tồn kho** (`5-inventory-stock-management-sequence-diagram.md`)

---

### **🆕 ĐỀ XUẤT SƠ ĐỒ TUẦN TỰ MỚI:**

#### **1. Đăng nhập & Xác thực** 🆕
**Actors:** User, Browser, Next.js App, Supabase Auth, Database

**Luồng:**
```
1. User nhập email + password
2. Browser → Next.js: POST /api/auth/signin
3. Next.js → Supabase Auth: signInWithPassword()
4. Supabase Auth → Database: Verify credentials
5. Database → Supabase Auth: User data + tokens
6. Supabase Auth → Next.js: Session + JWT
7. Next.js → Browser: Set cookies (access_token, refresh_token)
8. Browser → Next.js: Redirect to /dashboard
9. Next.js → Database: Fetch user profile
10. Database → Next.js: Profile data
11. Next.js → Browser: Render dashboard
```

---

#### **2. Đăng ký người dùng** 🆕
**Actors:** User, Browser, Next.js App, Supabase Auth, Database, Email Service

**Luồng:**
```
1. User điền form đăng ký
2. Browser → Next.js: POST /api/auth/signup
3. Next.js: Validate input (Zod schema)
4. Next.js → Supabase Auth: signUp()
5. Supabase Auth → Database: Create auth.users
6. Database → Trigger: on_auth_user_created
7. Trigger → Database: Insert into public.users
8. Trigger → Database: Insert into public.accounts
9. Database → Supabase Auth: Success
10. Supabase Auth → Email Service: Send verification email
11. Email Service → User: Verification email
12. Supabase Auth → Next.js: User created
13. Next.js → Browser: Redirect to /auth/verify
```

---

#### **3. Chỉnh sửa sản phẩm** 🆕
**Actors:** Admin, Browser, Next.js App, Database, Image Storage

**Luồng:**
```
1. Admin click "Edit" trên sản phẩm
2. Browser → Next.js: GET /dashboard/products/edit/[id]
3. Next.js → Database: SELECT product WHERE id = ?
4. Database → Next.js: Product data
5. Next.js → Browser: Render edit form với data
6. Admin sửa thông tin + upload ảnh mới
7. Browser → Image Storage: Upload new image
8. Image Storage → Browser: Image URL
9. Browser → Next.js: PUT /api/products/[id]
10. Next.js: Validate data
11. Next.js → Database: UPDATE products SET ...
12. Database → Next.js: Success
13. Next.js → Browser: Redirect to /dashboard/products
```

---

#### **4. Xóa người dùng** 🆕
**Actors:** Admin, Browser, Next.js App, Supabase Admin API, Database

**Luồng:**
```
1. Admin click "Delete" trên user
2. Browser → Admin: Confirm deletion
3. Admin confirms
4. Browser → Next.js: DELETE /api/admin/users/delete
5. Next.js: Check admin permission
6. Next.js → Database: BEGIN TRANSACTION
7. Next.js → Database: DELETE FROM accounts WHERE user_id = ?
8. Next.js → Database: DELETE FROM users WHERE user_id = ?
9. Next.js → Supabase Admin API: deleteUser(user_id)
10. Supabase Admin API → Database: DELETE FROM auth.users
11. Database → Next.js: COMMIT
12. Next.js → Browser: Success message
13. Browser: Refresh user list
```

---

#### **5. Tạo báo cáo tài chính** 🆕
**Actors:** Manager, Browser, Next.js App, Database, PDF Service

**Luồng:**
```
1. Manager chọn khoảng thời gian + filters
2. Browser → Next.js: GET /api/reports/financial?from=...&to=...
3. Next.js → Database: Complex query (JOIN orders, payments, returns)
4. Database → Next.js: Raw financial data
5. Next.js: Process & calculate metrics
6. Next.js → Browser: JSON report data
7. Browser: Render charts (Chart.js)
8. Manager click "Export PDF"
9. Browser → jsPDF: Generate PDF from charts
10. jsPDF → Browser: PDF blob
11. Browser: Download financial_report.pdf
```

---

#### **6. Real-time Chat** 🆕
**Actors:** Customer Support, Customer, Browser, Next.js App, Supabase Realtime, Database

**Luồng:**
```
1. Customer click "Chat with support"
2. Browser → Next.js: POST /api/chat/create-conversation
3. Next.js → Database: INSERT INTO chat_conversations
4. Database → Next.js: conversation_id
5. Next.js → Browser: Redirect to /chat/[conversation_id]
6. Browser → Supabase Realtime: Subscribe to channel
7. Customer nhập tin nhắn
8. Browser → Database: INSERT INTO chat_messages
9. Database → Supabase Realtime: Broadcast new message
10. Supabase Realtime → Support Browser: Receive message
11. Support nhập tin nhắn trả lời
12. Support Browser → Database: INSERT INTO chat_messages
13. Database → Supabase Realtime: Broadcast reply
14. Supabase Realtime → Customer Browser: Receive reply
```

---

#### **7. Kiểm tra tồn kho khi đặt hàng** 🆕
**Actors:** Sales Staff, Browser, Order System, Inventory System, Database

**Luồng:**
```
1. Staff thêm sản phẩm vào giỏ
2. Browser → Order System: Add product to cart
3. Order System → Inventory System: checkStock(product_id, quantity)
4. Inventory System → Database: SELECT stock_quantity FROM products
5. Database → Inventory System: current_stock
6. Inventory System: Validate (requested_qty <= current_stock)
7. If OK:
   - Inventory System → Order System: Stock available
   - Order System → Browser: Product added
8. If NOT OK:
   - Inventory System → Order System: Insufficient stock
   - Order System → Browser: Error message "Chỉ còn X sản phẩm"
9. Staff click "Checkout"
10. Order System → Database: BEGIN TRANSACTION
11. Order System → Database: INSERT INTO orders
12. Order System → Database: INSERT INTO orderdetails
13. Database → Trigger: update_product_stock
14. Trigger → Database: UPDATE products SET stock_quantity = stock_quantity - qty
15. Database → Order System: COMMIT
16. Order System → Browser: Order created successfully
```

---

#### **8. Hoàn trả đơn hàng** 🆕
**Actors:** Customer, Support, Browser, Return System, Payment Gateway, Database

**Luồng:**
```
1. Customer click "Yêu cầu trả hàng"
2. Browser → Return System: POST /api/returns/create
3. Return System → Database: INSERT INTO returns (status='requested')
4. Database → Return System: return_id
5. Return System → Support: Notification
6. Support review yêu cầu
7. Support → Browser: Approve return
8. Browser → Return System: PUT /api/returns/[id]/approve
9. Return System → Database: UPDATE returns SET status='approved'
10. Database → Return System: Success
11. Return System → Customer: Email "Đã chấp nhận yêu cầu"
12. Customer gửi hàng trả
13. Warehouse nhận hàng → Update status='received'
14. QC kiểm tra → Update status='inspected'
15. If accepted:
    - Return System → Payment Gateway: Process refund
    - Payment Gateway → Customer: Refund amount
    - Return System → Database: UPDATE returns SET status='refunded'
16. Return System → Customer: Email "Đã hoàn tiền"
```

---

## 📋 BẢNG TỔNG KẾT

### **Sơ đồ Trạng thái:**
| # | Chức năng | Đã có | Mức độ phức tạp | Ưu tiên |
|---|-----------|-------|-----------------|---------|
| 1 | Đơn hàng | ✅ | ⭐⭐⭐⭐⭐ | Cao |
| 2 | Vận chuyển | ✅ | ⭐⭐⭐⭐ | Cao |
| 3 | Đổi trả | ✅ | ⭐⭐⭐⭐ | Cao |
| 4 | Sản phẩm | 🆕 | ⭐⭐⭐ | Trung bình |
| 5 | Người dùng | 🆕 | ⭐⭐⭐ | Trung bình |
| 6 | Thanh toán | 🆕 | ⭐⭐⭐⭐ | Cao |
| 7 | Tồn kho | 🆕 | ⭐⭐ | Thấp |
| 8 | Khách hàng | 🆕 | ⭐⭐ | Thấp |

### **Sơ đồ Tuần tự:**
| # | Nhóm chức năng | Số sơ đồ đã có | Đề xuất thêm |
|---|----------------|----------------|--------------|
| 1 | Bán hàng | 6 ✅ | - |
| 2 | Quản lý doanh nghiệp | 3 ✅ | - |
| 3 | Quản lý người dùng | 4 ✅ | Xóa user 🆕 |
| 4 | Quản lý sản phẩm | 4 ✅ | Sửa product 🆕 |
| 5 | Đơn hàng & Vận chuyển | 2 ✅ | Kiểm tra tồn kho 🆕 |
| 6 | Báo cáo | 3 ✅ | - |
| 7 | Xác thực | 0 | Login 🆕, Register 🆕 |
| 8 | Trả hàng | 0 | Hoàn trả 🆕 |
| 9 | Chat | 0 | Real-time chat 🆕 |

---

## 🎯 KHUYẾN NGHỊ

### **Sơ đồ Trạng thái nên làm thêm:**
1. 🔥 **Thanh toán** - Rất quan trọng, nhiều trạng thái
2. 🔥 **Sản phẩm** - Lifecycle management
3. ⭐ **Người dùng** - User lifecycle

### **Sơ đồ Tuần tự nên làm thêm:**
1. 🔥 **Đăng nhập & Xác thực** - Core authentication flow
2. 🔥 **Đăng ký người dùng** - Với trigger và email
3. 🔥 **Kiểm tra tồn kho khi đặt hàng** - Business logic quan trọng
4. ⭐ **Hoàn trả đơn hàng** - End-to-end return process
5. ⭐ **Real-time Chat** - Tương tác phức tạp

---

## 💡 LƯU Ý

### **Sơ đồ Trạng thái phù hợp khi:**
- ✅ Đối tượng có **nhiều trạng thái rõ ràng**
- ✅ Có **chuyển đổi trạng thái** theo events
- ✅ Cần hiểu **lifecycle** của đối tượng
- ✅ Có **business rules** về trạng thái

### **Sơ đồ Tuần tự phù hợp khi:**
- ✅ Có **nhiều actors/systems tương tác**
- ✅ Cần hiểu **luồng xử lý theo thời gian**
- ✅ Có **API calls** giữa các hệ thống
- ✅ Có **conditional flows** (if/else)
- ✅ Có **async operations** (email, payment)

---

**🎉 Tổng kết:**
- **Đã có:** 3 State Diagrams + 29 Sequence Diagrams
- **Đề xuất thêm:** 5 State Diagrams + 8 Sequence Diagrams
- **Tổng:** 8 State Diagrams + 37 Sequence Diagrams (khi hoàn thành)

