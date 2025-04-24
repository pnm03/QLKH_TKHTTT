# Hướng dẫn triển khai ứng dụng lên Render

Tài liệu này hướng dẫn cách triển khai ứng dụng QLBH System lên Render - một nền tảng hosting miễn phí thay thế cho Vercel.

## Phần 1: Chuẩn bị

### 1.1. Đăng ký tài khoản Render

1. Truy cập [Render](https://render.com)
2. Nhấn vào "Sign Up" và chọn đăng ký bằng GitHub hoặc email
3. Làm theo hướng dẫn để hoàn tất đăng ký

### 1.2. Chuẩn bị mã nguồn trên GitHub

1. Đảm bảo mã nguồn đã được đẩy lên GitHub
2. Nếu chưa có repository, hãy tạo một repository mới và đẩy mã nguồn lên

### 1.3. Chuẩn bị biến môi trường

Chuẩn bị sẵn các giá trị sau từ Supabase Dashboard:
- Supabase URL
- Supabase Anon Key
- Supabase Service Role Key

## Phần 2: Triển khai lên Render

### 2.1. Tạo Web Service mới

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com)
2. Nhấn vào "New" > "Web Service"
3. Kết nối với GitHub repository chứa mã nguồn ứng dụng
4. Nếu chưa kết nối GitHub với Render, nhấn "Connect" và cấp quyền truy cập

### 2.2. Cấu hình Web Service

1. Sau khi chọn repository, cấu hình như sau:
   - **Name**: Tên cho ứng dụng của bạn (ví dụ: qlbh-system)
   - **Region**: Chọn region gần với người dùng của bạn (ví dụ: Singapore)
   - **Branch**: main (hoặc branch bạn muốn triển khai)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

2. Trong phần "Environment Variables", thêm các biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase project
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key của Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key của Supabase
   - `NEXT_PUBLIC_SITE_URL`: Để trống (sẽ cập nhật sau)
   - `NODE_VERSION`: 20.x

3. Nhấn "Create Web Service"

### 2.3. Theo dõi quá trình triển khai

1. Render sẽ bắt đầu quá trình build và triển khai
2. Theo dõi logs để phát hiện lỗi nếu có
3. Sau khi triển khai thành công, Render sẽ hiển thị URL của ứng dụng (ví dụ: https://your-app.onrender.com)

## Phần 3: Cấu hình sau triển khai

### 3.1. Cập nhật biến môi trường

1. Sao chép URL của ứng dụng đã triển khai (ví dụ: https://your-app.onrender.com)
2. Vào Render Dashboard > Web Service > Environment
3. Tìm biến `NEXT_PUBLIC_SITE_URL` và cập nhật giá trị với URL của ứng dụng
4. Nhấn "Save Changes" và chọn "Apply Changes" khi được hỏi

### 3.2. Cấu hình Supabase

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.io)
2. Chọn project của bạn
3. Vào phần "Authentication" > "URL Configuration"
4. Thêm URL của ứng dụng đã triển khai vào danh sách "Site URLs" (ví dụ: https://your-app.onrender.com)
5. Lưu cấu hình

### 3.3. Kiểm tra CORS (Cross-Origin Resource Sharing)

1. Trong Supabase Dashboard, vào phần "API" > "Settings"
2. Trong phần "API Settings", tìm mục "CORS (Cross-Origin Resource Sharing)"
3. Thêm URL của ứng dụng đã triển khai vào danh sách "Allowed Origins" (ví dụ: https://your-app.onrender.com)
4. Lưu cấu hình

## Phần 4: Kiểm tra ứng dụng

### 4.1. Kiểm tra các chức năng cơ bản

1. Truy cập URL của ứng dụng đã triển khai
2. Kiểm tra trang chủ và giao diện người dùng
3. Thử đăng ký tài khoản mới
4. Thử đăng nhập với tài khoản đã tạo
5. Kiểm tra các chức năng trong dashboard

### 4.2. Kiểm tra kết nối Supabase

1. Thử các chức năng liên quan đến cơ sở dữ liệu
2. Kiểm tra xác thực và phân quyền
3. Kiểm tra các API calls đến Supabase

## Phần 5: Tối ưu hóa và bảo trì

### 5.1. Cấu hình tên miền tùy chỉnh (nếu có)

1. Vào Render Dashboard > Web Service > Settings > Custom Domains
2. Nhấn "Add Custom Domain" và nhập tên miền của bạn
3. Làm theo hướng dẫn để cấu hình DNS

### 5.2. Thiết lập tự động triển khai

Render tự động triển khai lại ứng dụng mỗi khi có thay đổi được đẩy lên GitHub. Để kiểm soát điều này:

1. Vào Render Dashboard > Web Service > Settings > Deploy Hooks
2. Cấu hình các hooks nếu cần

### 5.3. Lưu ý về giới hạn của Render Free Tier

Render Free Tier có một số giới hạn cần lưu ý:
- Ứng dụng sẽ tự động ngủ sau 15 phút không hoạt động
- Khi có request mới, ứng dụng sẽ mất khoảng 30 giây để khởi động lại
- Giới hạn 750 giờ sử dụng miễn phí mỗi tháng

## Xử lý sự cố phổ biến

### Lỗi build

**Vấn đề**: Build thất bại trên Render
**Giải pháp**:
1. Kiểm tra logs build trong Render Dashboard
2. Đảm bảo ứng dụng build thành công trên máy local
3. Kiểm tra các dependencies và phiên bản Node.js

### Lỗi kết nối Supabase

**Vấn đề**: Không thể kết nối đến Supabase
**Giải pháp**:
1. Kiểm tra các biến môi trường đã được cấu hình đúng
2. Đảm bảo URL ứng dụng đã được thêm vào CORS và Site URLs trong Supabase
3. Kiểm tra console trong trình duyệt để xem lỗi cụ thể

### Ứng dụng chậm khi khởi động

**Vấn đề**: Ứng dụng mất nhiều thời gian để phản hồi sau thời gian không hoạt động
**Giải pháp**:
1. Đây là hạn chế của Render Free Tier, ứng dụng sẽ ngủ sau 15 phút không hoạt động
2. Nâng cấp lên Render Paid Plan nếu cần ứng dụng luôn hoạt động
3. Sử dụng dịch vụ ping để giữ ứng dụng luôn hoạt động (lưu ý: điều này có thể vi phạm điều khoản dịch vụ của Render)

## Tài nguyên bổ sung

- [Tài liệu Render](https://render.com/docs)
- [Tài liệu Next.js](https://nextjs.org/docs)
- [Tài liệu Supabase](https://supabase.io/docs)
- [Cấu hình tên miền tùy chỉnh trên Render](https://render.com/docs/custom-domains)
- [Giới hạn của Render Free Tier](https://render.com/docs/free)
