# Hướng dẫn khắc phục lỗi Danh mục sản phẩm

## Vấn đề

Hiện tại, chức năng Danh mục sản phẩm đang gặp lỗi:
- Lỗi khi tải danh mục: `relation "public.Category" does not exist`
- Thiếu phần thêm image cho danh mục

## Nguyên nhân

1. Bảng `category` chưa được tạo trong cơ sở dữ liệu Supabase
2. Có sự không khớp giữa tên bảng trong code (`Category` - chữ hoa) và tên bảng thực tế trong PostgreSQL (nên là `category` - chữ thường)
3. Thiếu trường `image_category` trong form thêm danh mục

## Cách khắc phục

### 1. Tạo bảng category trong cơ sở dữ liệu

#### Cách 1: Sử dụng trang debug

1. Truy cập trang debug: [http://localhost:3000/debug/category](http://localhost:3000/debug/category)
2. Nhấn nút "Create Category Table" để tạo bảng

#### Cách 2: Sử dụng Supabase Dashboard

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn dự án của bạn (URL: https://aacmtacfsqbalzydqqmm.supabase.co)
3. Vào phần "SQL Editor"
4. Tạo một query mới và dán đoạn SQL sau:

```sql
CREATE TABLE IF NOT EXISTS category (
    category_id SERIAL PRIMARY KEY,
    name_category VARCHAR(255) NOT NULL UNIQUE,
    description_category TEXT NOT NULL,
    image_category TEXT NULL
);

COMMENT ON TABLE category IS 'Bảng lưu thông tin danh mục sản phẩm';
COMMENT ON COLUMN category.category_id IS 'Mã danh mục (tự tăng)';
COMMENT ON COLUMN category.name_category IS 'Tên danh mục sản phẩm (duy nhất)';
COMMENT ON COLUMN category.description_category IS 'Mô tả về danh mục';
COMMENT ON COLUMN category.image_category IS 'URL/Đường dẫn ảnh danh mục (dạng text, base64 hoặc url)';
```

5. Nhấn nút "Run" để thực thi SQL

#### Cách 3: Sử dụng script Node.js

1. Mở terminal và chạy lệnh:

```bash
cd e:/QLBH_TKHTTTQL/qlbh-system
node create-category-table.js
```

### 2. Đã sửa code để sử dụng tên bảng đúng

Các file đã được sửa:
- `app/dashboard/products/categories/page.tsx`
- `app/api/categories/route.ts`

Thay đổi từ `Category` (chữ hoa) thành `category` (chữ thường) trong các truy vấn Supabase.

### 3. Đã thêm chức năng upload ảnh cho danh mục

Các tính năng đã được thêm:
- Trường input để chọn file ảnh
- Xem trước ảnh trước khi upload
- Chuyển đổi ảnh sang base64 để lưu vào database
- Hiển thị ảnh trong bảng danh mục

## Kiểm tra sau khi sửa

1. Khởi động lại server Next.js:

```bash
npm run dev
```

2. Truy cập trang Danh mục sản phẩm: [http://localhost:3000/dashboard/products/categories](http://localhost:3000/dashboard/products/categories)

3. Thử thêm một danh mục mới với đầy đủ thông tin và ảnh

## Lưu ý

- Nếu vẫn gặp lỗi, hãy kiểm tra console của trình duyệt để xem thông báo lỗi chi tiết
- Đảm bảo rằng bạn đã đăng nhập vào hệ thống trước khi truy cập trang Danh mục sản phẩm
- Kích thước ảnh tải lên không nên quá lớn (khuyến nghị dưới 2MB) để tránh lỗi khi lưu vào database