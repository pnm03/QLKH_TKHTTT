# Hướng dẫn chi tiết triển khai ứng dụng lên Vercel

Tài liệu này cung cấp hướng dẫn chi tiết từng bước để triển khai ứng dụng QLBH System lên Vercel.

## Phần 1: Chuẩn bị

### 1.1. Đăng ký tài khoản Vercel

1. Truy cập [Vercel](https://vercel.com)
2. Nhấn vào "Sign Up" và chọn đăng ký bằng GitHub (khuyến nghị) hoặc email
3. Làm theo hướng dẫn để hoàn tất đăng ký

### 1.2. Chuẩn bị mã nguồn trên GitHub

1. Đăng nhập vào [GitHub](https://github.com)
2. Tạo repository mới (nếu chưa có)
3. Đẩy mã nguồn lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/repository-name.git
   git push -u origin main
   ```

### 1.3. Chuẩn bị biến môi trường

Chuẩn bị sẵn các giá trị sau từ Supabase Dashboard:
- Supabase URL
- Supabase Anon Key
- Supabase Service Role Key

## Phần 2: Triển khai lên Vercel

### 2.1. Import project từ GitHub

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Nhấn vào "Add New" > "Project"
3. Chọn "Import Git Repository" và chọn repository chứa mã nguồn ứng dụng
4. Nếu chưa kết nối GitHub với Vercel, nhấn "Import Git Repository" > "GitHub" và cấp quyền truy cập

### 2.2. Cấu hình project

1. Sau khi chọn repository, Vercel sẽ tự động phát hiện đây là ứng dụng Next.js
2. Trong phần "Configure Project", thiết lập như sau:
   - **Framework Preset**: Next.js (tự động phát hiện)
   - **Root Directory**: ./ (mặc định)
   - **Build Command**: npm run build (mặc định)
   - **Output Directory**: .next (mặc định)
   - **Install Command**: npm install (mặc định)

3. Trong phần "Environment Variables", thêm các biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase project
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key của Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key của Supabase
   - `NEXT_PUBLIC_SITE_URL`: Để trống (sẽ cập nhật sau)

4. Nhấn "Deploy"

### 2.3. Theo dõi quá trình triển khai

1. Vercel sẽ bắt đầu quá trình build và triển khai
2. Theo dõi logs để phát hiện lỗi nếu có
3. Sau khi triển khai thành công, Vercel sẽ hiển thị thông báo "Congratulations!" và URL của ứng dụng

## Phần 3: Cấu hình sau triển khai

### 3.1. Cập nhật biến môi trường

1. Sao chép URL của ứng dụng đã triển khai (ví dụ: https://your-app.vercel.app)
2. Vào Vercel Dashboard > Project > Settings > Environment Variables
3. Tìm biến `NEXT_PUBLIC_SITE_URL` và cập nhật giá trị với URL của ứng dụng
4. Nhấn "Save" và chọn "Redeploy" khi được hỏi

### 3.2. Cấu hình Supabase

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.io)
2. Chọn project của bạn
3. Vào phần "Authentication" > "URL Configuration"
4. Thêm URL của ứng dụng đã triển khai vào danh sách "Site URLs" (ví dụ: https://your-app.vercel.app)
5. Lưu cấu hình

### 3.3. Kiểm tra CORS (Cross-Origin Resource Sharing)

1. Trong Supabase Dashboard, vào phần "API" > "Settings"
2. Trong phần "API Settings", tìm mục "CORS (Cross-Origin Resource Sharing)"
3. Thêm URL của ứng dụng đã triển khai vào danh sách "Allowed Origins" (ví dụ: https://your-app.vercel.app)
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

1. Vào Vercel Dashboard > Project > Settings > Domains
2. Nhấn "Add" và nhập tên miền của bạn
3. Làm theo hướng dẫn để cấu hình DNS

### 5.2. Thiết lập tự động triển khai

Vercel tự động triển khai lại ứng dụng mỗi khi có thay đổi được đẩy lên GitHub. Để kiểm soát điều này:

1. Vào Vercel Dashboard > Project > Settings > Git
2. Cấu hình "Production Branch" (mặc định là "main")
3. Cấu hình "Preview Branches" nếu cần

### 5.3. Theo dõi hiệu suất

1. Vào Vercel Dashboard > Project > Analytics
2. Theo dõi các chỉ số như Web Vitals, lượt truy cập, v.v.
3. Sử dụng thông tin này để tối ưu hóa ứng dụng

## Xử lý sự cố phổ biến

### Lỗi build

**Vấn đề**: Build thất bại trên Vercel
**Giải pháp**:
1. Kiểm tra logs build trong Vercel Dashboard
2. Đảm bảo ứng dụng build thành công trên máy local
3. Kiểm tra các dependencies và phiên bản Node.js

### Lỗi kết nối Supabase

**Vấn đề**: Không thể kết nối đến Supabase
**Giải pháp**:
1. Kiểm tra các biến môi trường đã được cấu hình đúng
2. Đảm bảo URL ứng dụng đã được thêm vào CORS và Site URLs trong Supabase
3. Kiểm tra console trong trình duyệt để xem lỗi cụ thể

### Lỗi xác thực

**Vấn đề**: Không thể đăng nhập hoặc đăng ký
**Giải pháp**:
1. Kiểm tra cấu hình Auth trong Supabase
2. Đảm bảo URL redirect đã được cấu hình đúng
3. Kiểm tra logs trong Vercel và Supabase

## Tài nguyên bổ sung

- [Tài liệu Vercel](https://vercel.com/docs)
- [Tài liệu Next.js](https://nextjs.org/docs)
- [Tài liệu Supabase](https://supabase.io/docs)
- [Cấu hình tên miền tùy chỉnh trên Vercel](https://vercel.com/docs/concepts/projects/domains)
- [Tối ưu hóa hiệu suất Next.js](https://nextjs.org/docs/advanced-features/measuring-performance)
