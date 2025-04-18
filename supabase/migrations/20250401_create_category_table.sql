-- Create Category table
CREATE TABLE IF NOT EXISTS Category (
    category_id SERIAL PRIMARY KEY,
    name_category VARCHAR(255) NOT NULL UNIQUE,
    description_category TEXT NOT NULL,
    image_category TEXT NULL -- Lưu URL hoặc Base64 dạng text, NULL cho phép
);

COMMENT ON TABLE Category IS 'Bảng lưu thông tin danh mục sản phẩm';
COMMENT ON COLUMN Category.category_id IS 'Mã danh mục (tự tăng)';
COMMENT ON COLUMN Category.name_category IS 'Tên danh mục sản phẩm (duy nhất)';
COMMENT ON COLUMN Category.description_category IS 'Mô tả về danh mục';
COMMENT ON COLUMN Category.image_category IS 'URL/Đường dẫn ảnh danh mục (dạng text, base64 hoặc url)';