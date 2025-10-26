-- ============================================================================
-- FIX: NUMERIC FIELD OVERFLOW - TĂNG KÍCH THƯỚC CÁC TRƯỜNG GIÁ
-- ============================================================================
-- Vấn đề: DECIMAL(15, 2) chỉ chứa được ~13 chữ số trước dấu phẩy
-- Giải pháp: Tăng lên DECIMAL(20, 2) hoặc DECIMAL(25, 2)
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: TĂNG KÍCH THƯỚC CÁC TRƯỜNG GIÁ TRONG PRODUCTS
-- ============================================================================

-- Tăng price từ DECIMAL(15,2) → DECIMAL(20,2)
ALTER TABLE products 
ALTER COLUMN price TYPE DECIMAL(20, 2);

-- Tăng cost_price từ DECIMAL(15,2) → DECIMAL(20,2)
ALTER TABLE products 
ALTER COLUMN cost_price TYPE DECIMAL(20, 2);

-- ============================================================================
-- BƯỚC 2: TĂNG KÍCH THƯỚC CÁC TRƯỜNG GIÁ TRONG ORDERDETAILS
-- ============================================================================

-- Tăng unit_price
ALTER TABLE orderdetails 
ALTER COLUMN unit_price TYPE DECIMAL(20, 2);

-- Tăng cost_price_at_sale
ALTER TABLE orderdetails 
ALTER COLUMN cost_price_at_sale TYPE DECIMAL(20, 2);

-- Tăng subtotal
ALTER TABLE orderdetails 
ALTER COLUMN subtotal TYPE DECIMAL(20, 2);

-- ============================================================================
-- BƯỚC 3: TĂNG KÍCH THƯỚC CÁC TRƯỜNG GIÁ TRONG ORDERS
-- ============================================================================

-- Tăng price (tổng giá trị đơn hàng)
ALTER TABLE orders 
ALTER COLUMN price TYPE DECIMAL(20, 2);

-- ============================================================================
-- BƯỚC 4: TĂNG KÍCH THƯỚC CÁC TRƯỜNG GIÁ TRONG RETURNS
-- ============================================================================

-- Tăng refund_amount
ALTER TABLE returns 
ALTER COLUMN refund_amount TYPE DECIMAL(20, 2);

-- ============================================================================
-- BƯỚC 5: TĂNG KÍCH THƯỚC LƯƠNG TRONG STAFF
-- ============================================================================

-- Tăng salary
ALTER TABLE staff 
ALTER COLUMN salary TYPE DECIMAL(20, 2);

-- ============================================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================================

-- Xem kiểu dữ liệu mới
SELECT 
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('products', 'orderdetails', 'orders', 'returns', 'staff')
AND data_type = 'numeric'
ORDER BY table_name, column_name;

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ Giá tối đa giờ là: 999,999,999,999,999,999.99 (18 chữ số trước dấu phẩy)
-- ✅ Đủ cho mọi giá trị trong thực tế!
-- ============================================================================

-- Test thêm sản phẩm với giá lớn
-- INSERT INTO products (category_id, product_name, description, price, cost_price, stock_quantity, image)
-- VALUES (1, 'Test Product', 'Test', 99999999999999.99, 88888888888888.88, 100, 'test.jpg');

