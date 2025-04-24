# Hướng dẫn triển khai ứng dụng lên Vercel

## Bước 1: Đăng ký tài khoản Vercel

1. Truy cập [Vercel](https://vercel.com) và đăng ký tài khoản mới (có thể đăng nhập bằng GitHub)
2. Xác nhận email nếu cần

## Bước 2: Tạo dự án mới trên Vercel

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Nhấn "Add New" > "Project"
3. Chọn "Import Git Repository" và chọn repository GitHub chứa mã nguồn ứng dụng
4. Nếu chưa kết nối GitHub với Vercel, nhấn "Import Git Repository" > "GitHub" và cấp quyền truy cập

## Bước 3: Cấu hình dự án

1. Trong phần "Configure Project", thiết lập như sau:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: npm run build
   - **Output Directory**: .next
   - **Install Command**: npm install

2. Trong phần "Environment Variables", thêm các biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL`: https://aacmtacfsqbalzydqqmm.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY210YWNmc3FiYWx6eWRxcW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4Mjc5OTIsImV4cCI6MjA2MDQwMzk5Mn0.yoPgz58cDdpDltnjFUZiBlnAUsufoLQanCb-vLMjXOI
   - `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY210YWNmc3FiYWx6eWRxcW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDgyNzk5MiwiZXhwIjoyMDYwNDAzOTkyfQ.eI8h9j39JXveVtqo5gl66RLAn-tD5Oh0CyW-V-II4eo
   - `NEXT_PUBLIC_SITE_URL`: Để trống (sẽ tự động điền sau khi triển khai)
   - `NEXT_DISABLE_ESLINT`: 1
   - `DISABLE_ESLINT_PLUGIN`: true

3. Trong phần "Build & Development Settings", thiết lập như sau:
   - **Build Command**: npm run build
   - **Output Directory**: .next
   - **Install Command**: npm install
   - **Development Command**: npm run dev

4. Trong phần "Advanced", thiết lập như sau:
   - **Node.js Version**: 20.x

5. Nhấn "Deploy"

## Bước 4: Theo dõi quá trình triển khai

1. Vercel sẽ bắt đầu quá trình build và triển khai
2. Theo dõi logs để phát hiện lỗi nếu có
3. Sau khi triển khai thành công, Vercel sẽ hiển thị URL của ứng dụng

## Bước 5: Cấu hình Supabase

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.io)
2. Chọn project của bạn
3. Vào phần "Authentication" > "URL Configuration"
4. Thêm URL của ứng dụng đã triển khai vào danh sách "Site URLs"
5. Vào phần "API" > "Settings" > "CORS"
6. Thêm URL của ứng dụng vào danh sách "Allowed Origins"

## Bước 6: Kiểm tra ứng dụng

1. Truy cập URL của ứng dụng đã triển khai
2. Kiểm tra các chức năng chính:
   - Đăng nhập/Đăng ký
   - Truy cập dashboard
   - Các chức năng quản lý

## Xử lý sự cố

### Lỗi kết nối Supabase
- Kiểm tra các biến môi trường đã được cấu hình đúng
- Đảm bảo URL ứng dụng đã được thêm vào danh sách "Site URLs" trong Supabase

### Lỗi build
- Kiểm tra logs build trong Vercel Dashboard
- Sửa lỗi trong mã nguồn và đẩy lên GitHub, Vercel sẽ tự động triển khai lại

### Lỗi runtime
- Kiểm tra console trong trình duyệt
- Kiểm tra logs trong Vercel Dashboard > Project > Deployments > [Latest Deployment] > Functions
