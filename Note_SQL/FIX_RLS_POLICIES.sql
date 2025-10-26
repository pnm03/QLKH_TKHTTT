-- ============================================================================
-- FIX: RLS POLICIES - CHO PHÉP XEM DỮ LIỆU
-- ============================================================================
-- Vấn đề: RLS đang bật nhưng không có policy → Không xem được dữ liệu!
-- Giải pháp: Tạo policies cho phép authenticated users xem dữ liệu
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: TẠT RLS POLICIES CHO BẢNG USERS
-- ============================================================================

-- Xóa policies cũ (nếu có)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;

-- Policy mới: Cho phép authenticated users xem TẤT CẢ users
CREATE POLICY "Authenticated users can view all users"
ON users
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Cho phép user cập nhật profile của mình
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- BƯỚC 2: TẠT RLS POLICIES CHO BẢNG ACCOUNTS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all accounts" ON accounts;
DROP POLICY IF EXISTS "Admin can view all accounts" ON accounts;

-- Cho phép authenticated users xem TẤT CẢ accounts
CREATE POLICY "Authenticated users can view all accounts"
ON accounts
FOR SELECT
USING (auth.role() = 'authenticated');

-- Cho phép admin cập nhật accounts
CREATE POLICY "Admin can update accounts"
ON accounts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- BƯỚC 3: TẠT RLS POLICIES CHO BẢNG CUSTOMERS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all customers" ON customers;

CREATE POLICY "Authenticated users can view all customers"
ON customers
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers"
ON customers
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers"
ON customers
FOR UPDATE
USING (auth.role() = 'authenticated');

-- ============================================================================
-- BƯỚC 4: TẠT RLS POLICIES CHO BẢNG PRODUCTS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all products" ON products;

CREATE POLICY "Authenticated users can view all products"
ON products
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert products"
ON products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'NVBH')
  )
);

CREATE POLICY "Admin can update products"
ON products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'NVBH')
  )
);

-- ============================================================================
-- BƯỚC 5: TẠT RLS POLICIES CHO BẢNG ORDERS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all orders" ON orders;

CREATE POLICY "Authenticated users can view all orders"
ON orders
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert orders"
ON orders
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders"
ON orders
FOR UPDATE
USING (auth.role() = 'authenticated');

-- ============================================================================
-- BƯỚC 6: TẠT RLS POLICIES CHO BẢNG ORDERDETAILS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all orderdetails" ON orderdetails;

CREATE POLICY "Authenticated users can view all orderdetails"
ON orderdetails
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert orderdetails"
ON orderdetails
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- BƯỚC 7: TẠT RLS POLICIES CHO BẢNG BRANCHES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all branches" ON branches;

CREATE POLICY "Authenticated users can view all branches"
ON branches
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage branches"
ON branches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- BƯỚC 8: TẠT RLS POLICIES CHO BẢNG CATEGORY
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all categories" ON category;

CREATE POLICY "Authenticated users can view all categories"
ON category
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage categories"
ON category
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- BƯỚC 9: TẠT RLS POLICIES CHO BẢNG STAFF
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all staff" ON staff;

CREATE POLICY "Authenticated users can view all staff"
ON staff
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage staff"
ON staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- BƯỚC 10: TẠT RLS POLICIES CHO BẢNG SHIPPINGS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all shippings" ON shippings;

CREATE POLICY "Authenticated users can view all shippings"
ON shippings
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage shippings"
ON shippings
FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================================================
-- BƯỚC 11: TẠT RLS POLICIES CHO BẢNG RETURNS
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view all returns" ON returns;

CREATE POLICY "Authenticated users can view all returns"
ON returns
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage returns"
ON returns
FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================================================
-- BƯỚC 12: PAYMENTS ĐÃ CÓ POLICY RỒI (GIỮ NGUYÊN)
-- ============================================================================
-- Payments đã có policy từ FULL_DATABASE_SETUP.sql, không cần sửa

-- ============================================================================
-- BƯỚC 13: KIỂM TRA KẾT QUẢ
-- ============================================================================

-- Liệt kê tất cả policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test query xem có lấy được dữ liệu không
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_accounts FROM accounts;
SELECT COUNT(*) as total_customers FROM customers;
SELECT COUNT(*) as total_products FROM products;

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ Đã tạo RLS policies cho tất cả bảng chính
-- ✅ Authenticated users có thể xem dữ liệu
-- ✅ Admin có quyền cao hơn để quản lý
-- ✅ Nhãn "Unrestricted" sẽ biến mất!
-- ============================================================================

-- Lưu ý: Nếu vẫn thấy "Unrestricted", refresh lại Table Editor

