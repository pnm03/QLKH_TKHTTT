# Hướng dẫn triển khai ứng dụng lên Netlify

Tài liệu này hướng dẫn cách triển khai ứng dụng QLBH System lên Netlify - một nền tảng hosting miễn phí thay thế cho Vercel.

## Phần 1: Chuẩn bị

### 1.1. Đăng ký tài khoản Netlify

1. Truy cập [Netlify](https://netlify.com)
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

### 1.4. Tạo file cấu hình Netlify

Tạo file `netlify.toml` trong thư mục gốc của dự án với nội dung sau:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Phần 2: Triển khai lên Netlify

### 2.1. Import project từ GitHub

1. Đăng nhập vào [Netlify Dashboard](https://app.netlify.com)
2. Nhấn vào "Add new site" > "Import an existing project"
3. Chọn "GitHub" và cấp quyền truy cập nếu cần
4. Chọn repository chứa mã nguồn ứng dụng

### 2.2. Cấu hình build

1. Sau khi chọn repository, cấu hình như sau:
   - **Owner**: Tài khoản của bạn
   - **Branch to deploy**: main (hoặc branch bạn muốn triển khai)
   - **Build command**: `npm run build` (mặc định từ netlify.toml)
   - **Publish directory**: `.next` (mặc định từ netlify.toml)

2. Trong phần "Advanced build settings", thêm các biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase project
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key của Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key của Supabase
   - `NEXT_PUBLIC_SITE_URL`: Để trống (sẽ cập nhật sau)

3. Nhấn "Deploy site"

### 2.3. Theo dõi quá trình triển khai

1. Netlify sẽ bắt đầu quá trình build và triển khai
2. Theo dõi logs để phát hiện lỗi nếu có
3. Sau khi triển khai thành công, Netlify sẽ hiển thị URL của ứng dụng (ví dụ: https://your-app.netlify.app)

## Phần 3: Cấu hình sau triển khai

### 3.1. Cập nhật biến môi trường

1. Sao chép URL của ứng dụng đã triển khai (ví dụ: https://your-app.netlify.app)
2. Vào Netlify Dashboard > Site > Site settings > Environment variables
3. Tìm biến `NEXT_PUBLIC_SITE_URL` và cập nhật giá trị với URL của ứng dụng
4. Nhấn "Save" và triển khai lại ứng dụng

### 3.2. Cấu hình Supabase

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.io)
2. Chọn project của bạn
3. Vào phần "Authentication" > "URL Configuration"
4. Thêm URL của ứng dụng đã triển khai vào danh sách "Site URLs" (ví dụ: https://your-app.netlify.app)
5. Lưu cấu hình

### 3.3. Kiểm tra CORS (Cross-Origin Resource Sharing)

1. Trong Supabase Dashboard, vào phần "API" > "Settings"
2. Trong phần "API Settings", tìm mục "CORS (Cross-Origin Resource Sharing)"
3. Thêm URL của ứng dụng đã triển khai vào danh sách "Allowed Origins" (ví dụ: https://your-app.netlify.app)
4. Lưu cấu hình

### 3.4. Cấu hình Netlify Functions (nếu cần)

Nếu ứng dụng của bạn sử dụng API Routes của Next.js, bạn cần cấu hình Netlify Functions:

1. Vào Netlify Dashboard > Site > Functions
2. Kiểm tra xem các functions đã được tạo đúng chưa
3. Nếu cần, cấu hình thêm trong file `netlify.toml`

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

1. Vào Netlify Dashboard > Site > Domain settings
2. Nhấn "Add custom domain" và nhập tên miền của bạn
3. Làm theo hướng dẫn để cấu hình DNS

### 5.2. Thiết lập tự động triển khai

Netlify tự động triển khai lại ứng dụng mỗi khi có thay đổi được đẩy lên GitHub. Để kiểm soát điều này:

1. Vào Netlify Dashboard > Site > Deploys > Continuous Deployment
2. Cấu hình "Build hooks" nếu cần
3. Cấu hình "Stop builds" nếu cần tạm dừng tự động triển khai

### 5.3. Tối ưu hóa hiệu suất

1. Vào Netlify Dashboard > Site > Plugins
2. Thêm các plugins hữu ích như:
   - Netlify Plugin Inline Critical CSS
   - Netlify Plugin Cache
   - Netlify Plugin Subfont

## Xử lý sự cố phổ biến

### Lỗi build

**Vấn đề**: Build thất bại trên Netlify
**Giải pháp**:
1. Kiểm tra logs build trong Netlify Dashboard
2. Đảm bảo ứng dụng build thành công trên máy local
3. Kiểm tra các dependencies và phiên bản Node.js
4. Đảm bảo đã cài đặt plugin `@netlify/plugin-nextjs`

### Lỗi kết nối Supabase

**Vấn đề**: Không thể kết nối đến Supabase
**Giải pháp**:
1. Kiểm tra các biến môi trường đã được cấu hình đúng
2. Đảm bảo URL ứng dụng đã được thêm vào CORS và Site URLs trong Supabase
3. Kiểm tra console trong trình duyệt để xem lỗi cụ thể

### Lỗi API Routes

**Vấn đề**: API Routes không hoạt động
**Giải pháp**:
1. Đảm bảo đã cài đặt plugin `@netlify/plugin-nextjs`
2. Kiểm tra cấu hình trong file `netlify.toml`
3. Kiểm tra logs trong Netlify Functions

## Tài nguyên bổ sung

- [Tài liệu Netlify](https://docs.netlify.com)
- [Tài liệu Next.js trên Netlify](https://docs.netlify.com/integrations/frameworks/next-js)
- [Plugin Next.js cho Netlify](https://github.com/netlify/netlify-plugin-nextjs)
- [Tài liệu Supabase](https://supabase.io/docs)
- [Cấu hình tên miền tùy chỉnh trên Netlify](https://docs.netlify.com/domains-https/custom-domains)
