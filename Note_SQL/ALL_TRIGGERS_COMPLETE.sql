-- ============================================================================
-- TẤT CẢ TRIGGERS CHO DỰ ÁN QLBH
-- ============================================================================
-- File này chứa TOÀN BỘ triggers và functions cần thiết
-- Chạy file này SAU KHI đã chạy FULL_DATABASE_SETUP.sql
-- ============================================================================

-- ============================================================================
-- PHẦN 1: TRIGGERS CHO ORDERDETAILS
-- ============================================================================

-- Function: Tự động tính subtotal = quantity * unit_price
CREATE OR REPLACE FUNCTION public.calculate_orderdetail_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Gọi function trước khi INSERT hoặc UPDATE
DROP TRIGGER IF EXISTS trg_calculate_orderdetail_subtotal ON public.Orderdetails;
CREATE TRIGGER trg_calculate_orderdetail_subtotal
    BEFORE INSERT OR UPDATE ON public.Orderdetails
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_orderdetail_subtotal();

COMMENT ON TRIGGER trg_calculate_orderdetail_subtotal ON public.Orderdetails IS 
'Tự động tính subtotal = quantity × unit_price';

-- ============================================================================
-- PHẦN 2: TRIGGERS CHO PRODUCTS (TỒN KHO)
-- ============================================================================

-- Function: Tự động giảm stock_quantity khi có đơn hàng
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.Products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    
    -- Kiểm tra nếu tồn kho âm
    IF (SELECT stock_quantity FROM public.Products WHERE product_id = NEW.product_id) < 0 THEN
        RAISE WARNING 'Cảnh báo: Sản phẩm ID % có tồn kho âm!', NEW.product_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Gọi function sau khi INSERT vào Orderdetails
DROP TRIGGER IF EXISTS trg_update_product_stock ON public.Orderdetails;
CREATE TRIGGER trg_update_product_stock
    AFTER INSERT ON public.Orderdetails
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_stock();

COMMENT ON TRIGGER trg_update_product_stock ON public.Orderdetails IS 
'Tự động giảm số lượng tồn kho khi có đơn hàng mới';

-- ============================================================================
-- PHẦN 3: TRIGGERS CHO UPDATED_AT (Tự động cập nhật thời gian)
-- ============================================================================

-- Function chung: Cập nhật updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho bảng USERS
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.Users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.Users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger cho bảng PRODUCTS
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.Products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.Products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger cho bảng CUSTOMERS
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.Customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.Customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger cho bảng PAYMENTS
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.Payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.Payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PHẦN 4: TRIGGERS CHO UPDATE_AT (Tên khác updated_at)
-- ============================================================================

-- Function chung: Cập nhật update_at (tên khác)
CREATE OR REPLACE FUNCTION public.update_update_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.update_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho bảng ACCOUNTS (dùng update_at thay vì updated_at)
DROP TRIGGER IF EXISTS trg_accounts_update_at ON public.Accounts;
CREATE TRIGGER trg_accounts_update_at
    BEFORE UPDATE ON public.Accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_update_at_column();

-- ============================================================================
-- PHẦN 5: TRIGGERS ĐỒNG BỘ AUTH.USERS → USERS & ACCOUNTS
-- ============================================================================
-- ⚠️ LƯU Ý: Triggers cho auth.users và auth.sessions đã được tạo trong 
-- FULL_DATABASE_SETUP.sql. Nếu gặp lỗi "must be owner", có thể BỎ QUA.
-- ============================================================================

-- Function: Tạo user mới trong Users và Accounts khi đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_branch_id INT;
BEGIN
    RAISE NOTICE '🔔 Trigger: Tạo user mới - Email: %', NEW.email;
    
    -- Lấy branch_id đầu tiên (nếu có)
    SELECT branch_id INTO new_branch_id 
    FROM public.Branches 
    LIMIT 1;
    
    -- Thêm vào bảng Users
    BEGIN
        INSERT INTO public.Users (
            user_id, branch_id, full_name, email, phone, 
            birth_date, hometown, created_at, updated_at
        )
        VALUES (
            NEW.id,
            new_branch_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            NEW.email,
            NEW.raw_user_meta_data->>'phone',
            (NEW.raw_user_meta_data->>'birth_date')::DATE,
            NEW.raw_user_meta_data->>'hometown',
            NEW.created_at,
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE '✅ Đã thêm vào Users: %', NEW.email;
    EXCEPTION 
        WHEN foreign_key_violation THEN
            -- Nếu branch không tồn tại, thử lại với NULL
            INSERT INTO public.Users (
                user_id, full_name, email, phone, birth_date, 
                hometown, created_at, updated_at
            )
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                NEW.email,
                NEW.raw_user_meta_data->>'phone',
                (NEW.raw_user_meta_data->>'birth_date')::DATE,
                NEW.raw_user_meta_data->>'hometown',
                NEW.created_at,
                NOW()
            )
            ON CONFLICT (user_id) DO NOTHING;
        WHEN OTHERS THEN 
            RAISE WARNING '❌ Lỗi Users: % - %', SQLSTATE, SQLERRM;
    END;
    
    -- Thêm vào bảng Accounts
    BEGIN
        INSERT INTO public.Accounts (
            id, user_id, user_name, password_hash, role, 
            status, create_at, update_at
        )
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.email,
            '',
            COALESCE(NEW.raw_user_meta_data->>'role', 'NVBH'),
            CASE 
                WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active'
                ELSE 'inactive'
            END,
            NEW.created_at,
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE '✅ Đã thêm vào Accounts: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE WARNING '❌ Lỗi Accounts: % - %', SQLSTATE, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ⚠️ TRIGGER CHO AUTH.USERS - CÓ THỂ GẶP LỖI QUYỀN
-- Nếu gặp lỗi "must be owner of relation users", trigger đã tồn tại từ FULL_DATABASE_SETUP.sql
-- Bỏ qua lỗi này và tiếp tục!

DO $$
BEGIN
    -- Thử tạo trigger, nếu lỗi thì bỏ qua
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE '✅ Đã tạo trigger on_auth_user_created';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️ Trigger on_auth_user_created đã tồn tại (từ FULL_DATABASE_SETUP.sql) - Bỏ qua';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Không thể tạo trigger on_auth_user_created - Có thể đã tồn tại';
END $$;

-- ============================================================================
-- PHẦN 6: TRIGGERS XÁC NHẬN EMAIL
-- ============================================================================

-- Function: Cập nhật status thành 'active' khi email được confirm
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ chạy khi email VỪA được confirm
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        UPDATE public.Accounts
        SET status = 'active', update_at = NOW()
        WHERE user_id = NEW.id;
        
        RAISE NOTICE '✅ Đã kích hoạt tài khoản: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Thử tạo trigger cho email confirmation
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
    CREATE TRIGGER on_auth_user_email_confirmed
        AFTER UPDATE ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_user_email_confirmed();
    
    RAISE NOTICE '✅ Đã tạo trigger on_auth_user_email_confirmed';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️ Không có quyền tạo trigger trên auth.users - Bỏ qua';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Không thể tạo trigger email confirmation - Bỏ qua';
END $$;

-- ============================================================================
-- PHẦN 7: TRIGGERS CẬP NHẬT LAST_LOGIN
-- ============================================================================

-- Function: Cập nhật last_login khi user đăng nhập
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.Accounts
    SET last_login = NOW(), update_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Thử tạo trigger cho login tracking
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_auth_session_created ON auth.sessions;
    CREATE TRIGGER on_auth_session_created
        AFTER INSERT ON auth.sessions
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_user_login();
    
    RAISE NOTICE '✅ Đã tạo trigger on_auth_session_created';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️ Không có quyền tạo trigger trên auth.sessions - Bỏ qua';
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Không thể tạo trigger login tracking - Bỏ qua';
END $$;

-- ============================================================================
-- PHẦN 8: TRIGGERS CẬP NHẬT ORDERS.PRICE
-- ============================================================================

-- Function: Tự động tính tổng price của Order từ Orderdetails
CREATE OR REPLACE FUNCTION public.calculate_order_total_price()
RETURNS TRIGGER AS $$
DECLARE
    total_amount DECIMAL(15, 2);
BEGIN
    -- Tính tổng từ tất cả orderdetails của order này
    SELECT COALESCE(SUM(subtotal), 0) INTO total_amount
    FROM public.Orderdetails
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Cập nhật vào bảng Orders
    UPDATE public.Orders
    SET price = total_amount
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Gọi function sau khi INSERT, UPDATE, DELETE orderdetail
DROP TRIGGER IF EXISTS trg_calculate_order_total_price_insert ON public.Orderdetails;
CREATE TRIGGER trg_calculate_order_total_price_insert
    AFTER INSERT OR UPDATE OR DELETE ON public.Orderdetails
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_order_total_price();

COMMENT ON TRIGGER trg_calculate_order_total_price_insert ON public.Orderdetails IS 
'Tự động cập nhật tổng giá trị đơn hàng khi có thay đổi chi tiết đơn';

-- ============================================================================
-- PHẦN 9: TRIGGER TỰ ĐỘNG LƯU COST_PRICE KHI TẠO ORDERDETAIL
-- ============================================================================

-- Function: Lưu cost_price_at_sale từ Products vào Orderdetails
CREATE OR REPLACE FUNCTION public.save_cost_price_at_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Lấy cost_price hiện tại của product và lưu vào orderdetail
    SELECT cost_price INTO NEW.cost_price_at_sale
    FROM public.Products
    WHERE product_id = NEW.product_id;
    
    -- Nếu không tìm thấy hoặc NULL, set = 0
    NEW.cost_price_at_sale := COALESCE(NEW.cost_price_at_sale, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Gọi function trước khi INSERT orderdetail
DROP TRIGGER IF EXISTS trg_save_cost_price_at_sale ON public.Orderdetails;
CREATE TRIGGER trg_save_cost_price_at_sale
    BEFORE INSERT ON public.Orderdetails
    FOR EACH ROW
    EXECUTE FUNCTION public.save_cost_price_at_sale();

COMMENT ON TRIGGER trg_save_cost_price_at_sale ON public.Orderdetails IS 
'Tự động lưu giá nhập tại thời điểm bán vào orderdetail';

-- ============================================================================
-- PHẦN 10: ĐỒNG BỘ DỮ LIỆU CŨ (NẾU CÓ)
-- ============================================================================

-- Đồng bộ user từ auth.users vào Users (nếu thiếu)
INSERT INTO public.Users (
    user_id, full_name, email, phone, birth_date, 
    hometown, created_at, updated_at
)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    au.email,
    au.raw_user_meta_data->>'phone',
    (au.raw_user_meta_data->>'birth_date')::DATE,
    au.raw_user_meta_data->>'hometown',
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.Users u WHERE u.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Đồng bộ user từ auth.users vào Accounts (nếu thiếu)
INSERT INTO public.Accounts (
    id, user_id, user_name, password_hash, role, 
    status, create_at, update_at
)
SELECT 
    gen_random_uuid(),
    au.id,
    au.email,
    '',
    COALESCE(au.raw_user_meta_data->>'role', 'NVBH'),
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
        ELSE 'inactive'
    END,
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.Accounts a WHERE a.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- PHẦN 11: KIỂM TRA KẾT QUẢ
-- ============================================================================

-- Hiển thị danh sách triggers đã tạo
SELECT 
    event_object_table as bang,
    trigger_name,
    action_timing || ' ' || string_agg(event_manipulation, ', ') as su_kien
FROM information_schema.triggers
WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
GROUP BY event_object_table, trigger_name, action_timing
ORDER BY event_object_table, trigger_name;

-- Hiển thị số lượng users trong các bảng
SELECT 'auth.users' as bang, COUNT(*) as so_luong FROM auth.users
UNION ALL
SELECT 'public.Users' as bang, COUNT(*) as so_luong FROM public.Users
UNION ALL
SELECT 'public.Accounts' as bang, COUNT(*) as so_luong FROM public.Accounts;

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ Đã tạo 10 triggers chính:
-- 1. trg_calculate_orderdetail_subtotal - Tính subtotal tự động
-- 2. trg_update_product_stock - Giảm tồn kho khi bán
-- 3. trg_users_updated_at - Cập nhật updated_at cho Users
-- 4. trg_products_updated_at - Cập nhật updated_at cho Products
-- 5. trg_customers_updated_at - Cập nhật updated_at cho Customers
-- 6. trg_payments_updated_at - Cập nhật updated_at cho Payments
-- 7. trg_accounts_update_at - Cập nhật update_at cho Accounts
-- 8. on_auth_user_created - Đồng bộ user mới từ auth
-- 9. on_auth_user_email_confirmed - Kích hoạt khi confirm email
-- 10. on_auth_session_created - Cập nhật last_login
-- 11. trg_calculate_order_total_price - Tính tổng giá trị đơn hàng
-- 12. trg_save_cost_price_at_sale - Lưu giá nhập khi bán
-- ============================================================================

