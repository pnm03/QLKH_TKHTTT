# QLBH System - Hệ thống Quản lý Bán Hàng

Đây là ứng dụng quản lý bán hàng được xây dựng bằng Next.js và Supabase.

## Tính năng chính

- Quản lý đơn hàng
- Quản lý sản phẩm
- Quản lý khách hàng
- Quản lý người dùng và phân quyền
- Báo cáo tài chính
- Quản lý chi nhánh

## Công nghệ sử dụng

- **Frontend**: Next.js 15, React 19, TailwindCSS 4
- **Backend**: Supabase (Authentication, Database)
- **Hosting**: Vercel

## Hướng dẫn cài đặt và chạy ứng dụng

### Yêu cầu hệ thống

- Node.js 20.x trở lên
- npm 10.x trở lên

### Cài đặt

1. Clone repository:
   ```bash
   git clone https://github.com/pnm03/QLKH_TKHTTT.git
   cd qlbh-system
   ```

2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Tạo file `.env.local` với nội dung:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://aacmtacfsqbalzydqqmm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY210YWNmc3FiYWx6eWRxcW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4Mjc5OTIsImV4cCI6MjA2MDQwMzk5Mn0.yoPgz58cDdpDltnjFUZiBlnAUsufoLQanCb-vLMjXOI
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY210YWNmc3FiYWx6eWRxcW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDgyNzk5MiwiZXhwIjoyMDYwNDAzOTkyfQ.eI8h9j39JXveVtqo5gl66RLAn-tD5Oh0CyW-V-II4eo
   NEXT_PUBLIC_SITE_URL=https://qlkh-tkhttt.vercel.app/
   ```

4. Chạy ứng dụng ở môi trường development:
   ```bash
   npm run dev
   ```

5. Mở [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## Triển khai lên Vercel

1. Đăng ký tài khoản [Vercel](https://vercel.com)
2. Kết nối repository GitHub với Vercel
3. Cấu hình các biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (https://qlkh-tkhttt.vercel.app/)
4. Triển khai ứng dụng

Xem hướng dẫn chi tiết trong file [docs/vercel-deployment-guide.md](docs/vercel-deployment-guide.md).

## Các tùy chọn triển khai khác

- [Netlify](docs/netlify-deployment-guide.md)
- [Render](docs/render-deployment-guide.md)

## Tài liệu

- [Hướng dẫn triển khai Vercel](docs/vercel-deployment-guide.md)
- [Hướng dẫn triển khai Netlify](docs/netlify-deployment-guide.md)
- [Hướng dẫn triển khai Render](docs/render-deployment-guide.md)
- [So sánh các nền tảng triển khai](docs/deployment-options-comparison.md)
