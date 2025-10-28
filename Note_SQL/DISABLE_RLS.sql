-- ============================================================================
-- TẮT HẾT RLS (ROW LEVEL SECURITY) CHO TẤT CẢ BẢNG
-- ============================================================================
-- ⚠️ CHỈ DÙNG TRONG MÔI TRƯỜNG DEV/TEST
-- ⚠️ KHÔNG BAO GIỜ TẮT RLS TRONG PRODUCTION!
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: TẮT RLS CHO TẤT CẢ BẢNG CHÍNH
-- ============================================================================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.category DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orderdetails DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shippings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BƯỚC 2: KIỂM TRA KẾT QUẢ
-- ============================================================================

-- Xem trạng thái RLS của tất cả bảng
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Kết quả mong đợi: Tất cả "RLS Enabled" = false

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ Đã TẮT RLS cho tất cả bảng
-- ✅ Giờ có thể INSERT/UPDATE/DELETE tự do
-- ⚠️ Nhớ BẬT LẠI khi deploy production!
-- ============================================================================

SELECT 'RLS DISABLED FOR ALL TABLES!' as status,
       '⚠️ Only for DEV/TEST environment' as warning;

