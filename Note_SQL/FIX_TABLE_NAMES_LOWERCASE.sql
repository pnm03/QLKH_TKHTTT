-- ============================================================================
-- FIX: ĐỔI TÊN BẢNG VỀ CHỮ THƯỜNG
-- ============================================================================
-- Vấn đề: Code dùng .from('users') nhưng bảng tên là Users (chữ U hoa)
-- PostgreSQL phân biệt chữ hoa/thường → Không query được dữ liệu!
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: ĐỔI TÊN TẤT CẢ BẢNG VỀ CHỮ THƯỜNG
-- ============================================================================

-- Đổi tên bảng chính
ALTER TABLE IF EXISTS public.Branches RENAME TO branches;
ALTER TABLE IF EXISTS public.Users RENAME TO users;
ALTER TABLE IF EXISTS public.Accounts RENAME TO accounts;
ALTER TABLE IF EXISTS public.Customers RENAME TO customers;
ALTER TABLE IF EXISTS public.Staff RENAME TO staff;
ALTER TABLE IF EXISTS public.Category RENAME TO category;
ALTER TABLE IF EXISTS public.Products RENAME TO products;
ALTER TABLE IF EXISTS public.Payments RENAME TO payments;
ALTER TABLE IF EXISTS public.Orders RENAME TO orders;
ALTER TABLE IF EXISTS public.Orderdetails RENAME TO orderdetails;
ALTER TABLE IF EXISTS public.Shippings RENAME TO shippings;
ALTER TABLE IF EXISTS public.Returns RENAME TO returns;

-- ============================================================================
-- BƯỚC 2: CẬP NHẬT CÁC TRIGGERS
-- ============================================================================

-- Triggers đã tồn tại vẫn sẽ hoạt động vì chỉ đổi tên bảng
-- Không cần sửa gì thêm!

-- ============================================================================
-- BƯỚC 3: CẬP NHẬT FUNCTIONS (Nếu cần)
-- ============================================================================

-- Function handle_new_user - Cập nhật tên bảng
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_branch_id INT;
BEGIN
    RAISE NOTICE '🔔 Trigger: Tạo user mới - Email: %', NEW.email;
    
    -- Lấy branch_id đầu tiên (nếu có)
    SELECT branch_id INTO new_branch_id 
    FROM public.branches  -- Đổi sang chữ thường
    LIMIT 1;
    
    -- Thêm vào bảng users
    BEGIN
        INSERT INTO public.users (  -- Đổi sang chữ thường
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
        
        RAISE NOTICE '✅ Đã thêm vào users: %', NEW.email;
    EXCEPTION 
        WHEN foreign_key_violation THEN
            -- Nếu branch không tồn tại, thử lại với NULL
            INSERT INTO public.users (
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
            RAISE WARNING '❌ Lỗi users: % - %', SQLSTATE, SQLERRM;
    END;
    
    -- Thêm vào bảng accounts
    BEGIN
        INSERT INTO public.accounts (  -- Đổi sang chữ thường
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
        
        RAISE NOTICE '✅ Đã thêm vào accounts: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE WARNING '❌ Lỗi accounts: % - %', SQLSTATE, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function handle_user_email_confirmed
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        UPDATE public.accounts  -- Đổi sang chữ thường
        SET status = 'active', update_at = NOW()
        WHERE user_id = NEW.id;
        
        RAISE NOTICE '✅ Đã kích hoạt tài khoản: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function handle_user_login
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.accounts  -- Đổi sang chữ thường
    SET last_login = NOW(), update_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function update_product_stock
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products  -- Đổi sang chữ thường
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    
    IF (SELECT stock_quantity FROM public.products WHERE product_id = NEW.product_id) < 0 THEN
        RAISE WARNING 'Cảnh báo: Sản phẩm ID % có tồn kho âm!', NEW.product_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function calculate_order_total_price
CREATE OR REPLACE FUNCTION public.calculate_order_total_price()
RETURNS TRIGGER AS $$
DECLARE
    total_amount DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(subtotal), 0) INTO total_amount
    FROM public.orderdetails  -- Đổi sang chữ thường
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    UPDATE public.orders  -- Đổi sang chữ thường
    SET price = total_amount
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function save_cost_price_at_sale
CREATE OR REPLACE FUNCTION public.save_cost_price_at_sale()
RETURNS TRIGGER AS $$
BEGIN
    SELECT cost_price INTO NEW.cost_price_at_sale
    FROM public.products  -- Đổi sang chữ thường
    WHERE product_id = NEW.product_id;
    
    NEW.cost_price_at_sale := COALESCE(NEW.cost_price_at_sale, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function get_top_shipped_products_v2
CREATE OR REPLACE FUNCTION public.get_top_shipped_products_v2(limit_count INTEGER)
RETURNS TABLE (
    product_name TEXT,
    shipment_count BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        p.product_name, 
        COUNT(od.product_id) as shipment_count
    FROM 
        public.orderdetails od  -- Đổi sang chữ thường
    JOIN 
        public.products p ON od.product_id = p.product_id  -- Đổi sang chữ thường
    JOIN 
        public.orders o ON od.order_id = o.order_id  -- Đổi sang chữ thường
    WHERE 
        o.is_shipping = true
    GROUP BY 
        p.product_name
    ORDER BY 
        shipment_count DESC
    LIMIT 
        limit_count;
$$;

-- ============================================================================
-- BƯỚC 4: CẬP NHẬT RLS POLICIES
-- ============================================================================

-- RLS policies vẫn hoạt động bình thường sau khi đổi tên bảng
-- PostgreSQL tự động cập nhật

-- ============================================================================
-- BƯỚC 5: KIỂM TRA KẾT QUẢ
-- ============================================================================

-- Liệt kê tất cả bảng (phải là chữ thường)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Kiểm tra số lượng bản ghi
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.users) as public_users,
    (SELECT COUNT(*) FROM public.accounts) as public_accounts;

-- Kiểm tra triggers vẫn hoạt động
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================
-- ✅ Đã đổi tên tất cả bảng về chữ thường
-- ✅ Đã cập nhật tất cả functions
-- ✅ Triggers và RLS policies vẫn hoạt động bình thường
-- ✅ Code giờ sẽ query được dữ liệu!
-- ============================================================================

-- Test query để đảm bảo hoạt động
SELECT * FROM users LIMIT 5;
SELECT * FROM accounts LIMIT 5;
SELECT * FROM products LIMIT 5;

