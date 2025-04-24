# Hướng dẫn triển khai ứng dụng lên server miễn phí

Tài liệu này hướng dẫn cách triển khai ứng dụng QLBH System lên Vercel - một nền tảng hosting miễn phí phù hợp với ứng dụng Next.js.

## Bước 1: Đăng ký tài khoản Vercel

1. Truy cập [Vercel](https://vercel.com) và đăng ký tài khoản mới (có thể đăng nhập bằng GitHub)
2. Xác nhận email nếu cần

## Bước 2: Chuẩn bị mã nguồn

1. Đảm bảo mã nguồn đã được đẩy lên GitHub
2. Nếu chưa có tài khoản GitHub, hãy tạo một tài khoản và tạo repository mới
3. Đẩy mã nguồn lên repository GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/repository-name.git
   git push -u origin main
   ```

## Bước 3: Triển khai lên Vercel

### Cách 1: Triển khai qua giao diện web Vercel

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Nhấn "Add New" > "Project"
3. Chọn repository GitHub chứa mã nguồn ứng dụng
4. Cấu hình các biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase project
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key của Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key của Supabase
   - `NEXT_PUBLIC_SITE_URL`: URL của ứng dụng sau khi triển khai (để trống, sẽ điền sau)
5. Nhấn "Deploy"

### Cách 2: Triển khai qua Vercel CLI

1. Cài đặt Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Đăng nhập vào Vercel từ terminal:
   ```bash
   vercel login
   ```

3. Triển khai ứng dụng:
   ```bash
   vercel
   ```

4. Làm theo hướng dẫn để cấu hình và triển khai

## Bước 4: Cấu hình Supabase

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.io)
2. Chọn project của bạn
3. Vào phần "Authentication" > "URL Configuration"
4. Thêm URL của ứng dụng đã triển khai vào danh sách "Site URLs" (ví dụ: https://your-app.vercel.app)
5. Lưu cấu hình

## Bước 5: Cập nhật biến môi trường

1. Sau khi triển khai thành công, lấy URL của ứng dụng (ví dụ: https://your-app.vercel.app)
2. Vào Vercel Dashboard > Project > Settings > Environment Variables
3. Cập nhật biến `NEXT_PUBLIC_SITE_URL` với URL của ứng dụng
4. Nhấn "Save" và triển khai lại ứng dụng

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

## Tài nguyên bổ sung

- [Tài liệu Vercel](https://vercel.com/docs)
- [Tài liệu Next.js](https://nextjs.org/docs)
- [Tài liệu Supabase](https://supabase.io/docs)
