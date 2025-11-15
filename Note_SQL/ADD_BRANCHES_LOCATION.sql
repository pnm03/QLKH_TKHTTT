-- ============================================================================
-- THÊM CỘT LATITUDE VÀ LONGITUDE VÀO BẢNG BRANCHES
-- ============================================================================
-- Mục đích: Hỗ trợ tính năng chọn vị trí chi nhánh trên bản đồ
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: THÊM CỘT LATITUDE (VĨ ĐỘ)
-- ============================================================================

ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

COMMENT ON COLUMN public.branches.latitude IS 'Vĩ độ của chi nhánh (để hiển thị trên bản đồ)';

-- ============================================================================
-- BƯỚC 2: THÊM CỘT LONGITUDE (KINH ĐỘ)
-- ============================================================================

ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

COMMENT ON COLUMN public.branches.longitude IS 'Kinh độ của chi nhánh (để hiển thị trên bản đồ)';

-- ============================================================================
-- BƯỚC 3: KIỂM TRA KẾT QUẢ
-- ============================================================================

-- Xem cấu trúc bảng branches sau khi thêm cột
SELECT 
    column_name, 
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'branches'
ORDER BY ordinal_position;

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ Đã thêm cột latitude và longitude
-- ✅ Có thể chọn vị trí chi nhánh trên bản đồ
-- ✅ DECIMAL(10,8) cho latitude (phạm vi: -90 đến 90)
-- ✅ DECIMAL(11,8) cho longitude (phạm vi: -180 đến 180)
-- ============================================================================

SELECT 'ADDED LOCATION COLUMNS TO BRANCHES!' as status;

