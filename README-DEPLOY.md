# Hướng dẫn triển khai ứng dụng lên Vercel

## Phương pháp 1: Triển khai trực tiếp qua Vercel Dashboard

### Bước 1: Đăng ký tài khoản Vercel

1. Truy cập [Vercel](https://vercel.com) và đăng ký tài khoản mới (có thể đăng nhập bằng GitHub)
2. Xác nhận email nếu cần

### Bước 2: Tạo dự án mới trên Vercel

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Nhấn "Add New" > "Project"
3. Chọn "Import Git Repository" và chọn repository GitHub chứa mã nguồn ứng dụng
4. Nếu chưa kết nối GitHub với Vercel, nhấn "Import Git Repository" > "GitHub" và cấp quyền truy cập

### Bước 3: Cấu hình dự án

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

3. Trong phần "Git", thiết lập như sau:
   - **Production Branch**: main
   - **Include source files outside of the Root Directory in the Build Step**: Tắt
   - **Clone Submodules**: Tắt

4. Nhấn "Deploy"

## Phương pháp 2: Triển khai qua GitHub Actions

### Bước 1: Tạo dự án trên Vercel

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Nhấn "Add New" > "Project"
3. Chọn "Import Git Repository" và chọn repository GitHub chứa mã nguồn ứng dụng
4. Cấu hình dự án như trong Phương pháp 1
5. Sau khi triển khai thành công, vào "Settings" > "General" để lấy Project ID

### Bước 2: Lấy thông tin cần thiết từ Vercel

1. Lấy Vercel Token:
   - Vào "Settings" > "Tokens"
   - Tạo token mới với quyền "Full Access"
   - Sao chép token

2. Lấy Vercel Org ID:
   - Vào [Vercel API](https://vercel.com/account/tokens)
   - Sao chép giá trị "teamId" hoặc "userId" (nếu không có team)

3. Lấy Vercel Project ID:
   - Vào project của bạn > "Settings" > "General"
   - Sao chép giá trị "Project ID"

### Bước 3: Thêm Secrets vào GitHub repository

1. Vào repository trên GitHub > "Settings" > "Secrets and variables" > "Actions"
2. Thêm các secrets sau:
   - `VERCEL_TOKEN`: Token bạn đã tạo
   - `VERCEL_ORG_ID`: Org ID bạn đã lấy
   - `VERCEL_PROJECT_ID`: Project ID bạn đã lấy

### Bước 4: Chạy GitHub Actions Workflow

1. Vào repository trên GitHub > "Actions"
2. Chọn workflow "Deploy to Vercel"
3. Nhấn "Run workflow" > "Run workflow"

## Cấu hình Supabase sau khi triển khai

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.io)
2. Chọn project của bạn
3. Vào phần "Authentication" > "URL Configuration"
4. Thêm URL của ứng dụng đã triển khai vào danh sách "Site URLs"
5. Vào phần "API" > "Settings" > "CORS"
6. Thêm URL của ứng dụng vào danh sách "Allowed Origins"

## Kiểm tra ứng dụng

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
