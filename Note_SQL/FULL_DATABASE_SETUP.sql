-- ============================================================================
-- FULL DATABASE SETUP FOR QLBH SYSTEM (Quản Lý Bán Hàng)
-- Version: 2.0
-- Date: October 24, 2025
-- 
-- HƯỚNG DẪN SỬ DỤNG:
-- 1. Tạo dự án mới trên Supabase
-- 2. Vào SQL Editor
-- 3. Copy toàn bộ file này và chạy
-- 4. Chờ khoảng 1-2 phút để hoàn tất
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: KÍCH HOẠT EXTENSIONS CẦN THIẾT
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- BƯỚC 2: TẠO CÁC BẢNG CƠ BẢN
-- ============================================================================

-- Bảng Branches (Chi nhánh) - Tạo trước vì Users tham chiếu đến nó
CREATE TABLE IF NOT EXISTS public.Branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    branch_address VARCHAR(255) NOT NULL,
    manager_id UUID NULL
);

COMMENT ON TABLE public.Branches IS 'Bảng lưu thông tin các chi nhánh';
COMMENT ON COLUMN public.Branches.branch_id IS 'Khóa chính định danh chi nhánh (tự tăng)';
COMMENT ON COLUMN public.Branches.branch_name IS 'Tên chi nhánh (duy nhất)';
COMMENT ON COLUMN public.Branches.branch_address IS 'Địa chỉ chi nhánh';
COMMENT ON COLUMN public.Branches.manager_id IS 'Người quản lý chi nhánh (tham chiếu đến Users.user_id)';

-- Bảng Users (Người dùng hệ thống)
CREATE TABLE IF NOT EXISTS public.Users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT NULL,
    full_name VARCHAR(255) NOT NULL CHECK (LENGTH(full_name) >= 2),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(11) NULL CHECK (phone IS NULL OR phone ~ '^0[0-9]{9,10}$'),
    birth_date DATE NULL,
    hometown VARCHAR(255) NULL CHECK (hometown IS NULL OR LENGTH(hometown) >= 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.Users IS 'Bảng lưu thông tin người dùng hệ thống (nhân viên, admin)';
COMMENT ON COLUMN public.Users.user_id IS 'Khóa chính định danh người dùng';
COMMENT ON COLUMN public.Users.branch_id IS 'Chi nhánh người dùng thuộc về';
COMMENT ON COLUMN public.Users.full_name IS 'Họ và tên đầy đủ (ít nhất 2 ký tự)';
COMMENT ON COLUMN public.Users.email IS 'Email (duy nhất)';
COMMENT ON COLUMN public.Users.phone IS 'Số điện thoại (Bắt đầu bằng số 0, có 10 hoặc 11 ký tự)';

-- Thêm FOREIGN KEY cho Users.branch_id
ALTER TABLE public.Users
ADD CONSTRAINT fk_user_branch
FOREIGN KEY (branch_id) REFERENCES public.Branches(branch_id);

-- Thêm FOREIGN KEY cho Branches.manager_id
ALTER TABLE public.Branches
ADD CONSTRAINT fk_branch_manager
FOREIGN KEY (manager_id) REFERENCES public.Users(user_id);

-- Bảng Accounts (Tài khoản đăng nhập)
CREATE TABLE IF NOT EXISTS public.Accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.Users(user_id) ON DELETE CASCADE,
    user_name VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'NVBH', 'NVK')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'locked')),
    last_login TIMESTAMP WITH TIME ZONE NULL,
    create_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.Accounts IS 'Bảng lưu thông tin tài khoản đăng nhập';
COMMENT ON COLUMN public.Accounts.role IS 'Vai trò người dùng (admin, NVBH, NVK)';
COMMENT ON COLUMN public.Accounts.status IS 'Trạng thái tài khoản (active, inactive, locked)';

-- Bảng Customers (Khách hàng)
CREATE TABLE IF NOT EXISTS public.Customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(11) UNIQUE CHECK (phone IS NULL OR phone ~ '^0[0-9]{9,10}$'),
    email VARCHAR(255) NOT NULL UNIQUE,
    hometown VARCHAR(255) NULL CHECK (hometown IS NULL OR LENGTH(hometown) >= 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.Customers IS 'Bảng lưu thông tin khách hàng';

-- Bảng Staff (Thông tin nhân viên chi tiết)
CREATE TABLE IF NOT EXISTS public.Staff (
    staff_id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES public.Users(user_id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    work_shift VARCHAR(100) NOT NULL,
    salary DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (salary >= 0),
    contract_type VARCHAR(100) NULL CHECK (contract_type IS NULL OR contract_type IN ('full-time', 'part-time', 'contract')),
    employment_status VARCHAR(100) NULL CHECK (employment_status IS NULL OR employment_status IN ('active', 'on-leave', 'terminated')),
    reports_to_user_id UUID NULL REFERENCES public.Users(user_id)
);

COMMENT ON TABLE public.Staff IS 'Bảng lưu thông tin chi tiết về nhân viên';

-- Bảng Category (Danh mục sản phẩm)
CREATE TABLE IF NOT EXISTS public.Category (
    category_id SERIAL PRIMARY KEY,
    name_category VARCHAR(255) NOT NULL UNIQUE,
    description_category TEXT NOT NULL,
    image_category TEXT NULL
);

COMMENT ON TABLE public.Category IS 'Bảng lưu thông tin danh mục sản phẩm';

-- Bảng Products (Sản phẩm)
CREATE TABLE IF NOT EXISTS public.Products (
    product_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES public.Category(category_id),
    product_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    color VARCHAR(50) NULL,
    size VARCHAR(50) NULL,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.Products IS 'Bảng lưu thông tin sản phẩm';
COMMENT ON COLUMN public.Products.cost_price IS 'Giá nhập sản phẩm';

-- Bảng Payments (Phương thức thanh toán)
CREATE TABLE IF NOT EXISTS public.Payments (
    payment_id SERIAL PRIMARY KEY,
    payment_method_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    image TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.Payments IS 'Bảng lưu các phương thức thanh toán';

-- Bảng Orders (Đơn hàng)
CREATE TABLE IF NOT EXISTS public.Orders (
    order_id TEXT PRIMARY KEY,
    user_id UUID NULL REFERENCES public.Users(user_id),
    customer_id UUID NOT NULL REFERENCES public.Customers(customer_id),
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price DECIMAL(15, 2) NOT NULL CHECK (price >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Đã thanh toán', 'Chưa thanh toán')),
    payment_method INT NULL REFERENCES public.Payments(payment_id),
    is_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_payment_status CHECK (
        (status = 'Chưa thanh toán' AND payment_method IS NULL) OR 
        (status = 'Đã thanh toán' AND payment_method IS NOT NULL)
    )
);

COMMENT ON TABLE public.Orders IS 'Bảng lưu thông tin đơn hàng';

-- Bảng Orderdetails (Chi tiết đơn hàng)
CREATE TABLE IF NOT EXISTS public.Orderdetails (
    orderdetail_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.Orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES public.Products(product_id),
    name_product VARCHAR(255) NOT NULL,
    name_check VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),
    cost_price_at_sale DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (cost_price_at_sale >= 0),
    subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0)
);

COMMENT ON TABLE public.Orderdetails IS 'Bảng lưu chi tiết các sản phẩm trong một đơn hàng';
COMMENT ON COLUMN public.Orderdetails.cost_price_at_sale IS 'Giá nhập tại thời điểm bán';

-- Bảng Shippings (Vận chuyển)
CREATE TABLE IF NOT EXISTS public.Shippings (
    shipping_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE REFERENCES public.Orders(order_id) ON DELETE CASCADE,
    carrier VARCHAR(255) NULL,
    tracking_num VARCHAR(255) NULL UNIQUE,
    shipping_address TEXT NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    actual_delivery_date TIMESTAMP WITH TIME ZONE NULL,
    delivery_date TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Chưa giao hàng', 'Đang chuẩn bị', 'đang giao', 'Đã giao', 'Đang hoàn về', 'Đã hủy')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(10, 3) NULL CHECK (weight IS NULL OR weight >= 0),
    unit_weight VARCHAR(10) NULL CHECK (unit_weight IS NULL OR unit_weight IN ('kg', 'g')),
    "long" DECIMAL(10, 2) NULL CHECK ("long" IS NULL OR "long" >= 0),
    wide DECIMAL(10, 2) NULL CHECK (wide IS NULL OR wide >= 0),
    height DECIMAL(10, 2) NULL CHECK (height IS NULL OR height >= 0)
);

COMMENT ON TABLE public.Shippings IS 'Bảng lưu thông tin vận chuyển của đơn hàng';

-- Bảng Returns (Đổi/Trả hàng)
CREATE TABLE IF NOT EXISTS public.Returns (
    return_id SERIAL PRIMARY KEY,
    name_return TEXT,
    order_id TEXT NOT NULL REFERENCES public.Orders(order_id),
    return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    return_reason TEXT NOT NULL,
    refund_amount DECIMAL(15, 2) NULL CHECK (refund_amount IS NULL OR refund_amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('đang xử lý', 'đã chấp nhận', 'đã từ chối'))
);

COMMENT ON TABLE public.Returns IS 'Bảng lưu thông tin yêu cầu đổi/trả hàng';

-- ============================================================================
-- BƯỚC 3: TẠO CÁC BẢNG CHAT (Tính năng nhắn tin)
-- ============================================================================

-- Bảng chat_conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng chat_participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
    participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(conversation_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

-- Bảng chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(conversation_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_to UUID REFERENCES public.chat_messages(message_id) ON DELETE SET NULL
);

-- Bảng chat_message_status
CREATE TABLE IF NOT EXISTS public.chat_message_status (
    status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.chat_messages(message_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(message_id, user_id)
);

-- ============================================================================
-- BƯỚC 4: TẠO INDEXES ĐỂ TĂNG TỐC ĐỘ TRUY VẤN
-- ============================================================================

-- Indexes cho chat tables
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_default ON public.chat_conversations(is_default);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation_id ON public.chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_status_message_id ON public.chat_message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_status_user_id ON public.chat_message_status(user_id);

-- Indexes cho các bảng chính
CREATE INDEX IF NOT EXISTS idx_users_email ON public.Users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.Users(phone);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.Users(branch_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_name ON public.Accounts(user_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.Customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.Customers(phone);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.Products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.Orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.Orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.Orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orderdetails_order_id ON public.Orderdetails(order_id);
CREATE INDEX IF NOT EXISTS idx_orderdetails_product_id ON public.Orderdetails(product_id);

-- ============================================================================
-- BƯỚC 5: TẠO CÁC TRIGGERS VÀ FUNCTIONS
-- ============================================================================

-- Function tự động tính subtotal trong Orderdetails
CREATE OR REPLACE FUNCTION public.calculate_orderdetail_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_calculate_orderdetail_subtotal
BEFORE INSERT ON public.Orderdetails
FOR EACH ROW
EXECUTE FUNCTION public.calculate_orderdetail_subtotal();

-- Function tự động cập nhật stock_quantity khi có đơn hàng mới
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.Products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_product_stock
AFTER INSERT ON public.Orderdetails
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock();

-- Function cập nhật updated_at cho Users
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.Users
FOR EACH ROW
EXECUTE FUNCTION public.update_users_updated_at();

-- Function cập nhật updated_at cho Products
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.Products
FOR EACH ROW
EXECUTE FUNCTION public.update_products_updated_at();

-- Function cập nhật updated_at cho Payments
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.Payments
FOR EACH ROW
EXECUTE FUNCTION public.update_payments_updated_at();

-- ============================================================================
-- BƯỚC 6: TẠO CÁC FUNCTIONS HỮU ÍCH
-- ============================================================================

-- Function lấy top sản phẩm được vận chuyển nhiều nhất
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
        public.Orderdetails od
    JOIN 
        public.Products p ON od.product_id = p.product_id
    JOIN 
        public.Orders o ON od.order_id = o.order_id
    WHERE 
        o.is_shipping = true
    GROUP BY 
        p.product_name
    ORDER BY 
        shipment_count DESC
    LIMIT 
        limit_count;
$$;

-- Function xóa user (dành cho admin)
CREATE OR REPLACE FUNCTION public.admin_delete_user(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows integer;
BEGIN
    DELETE FROM public.Accounts
    WHERE user_id = uid;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;

-- ============================================================================
-- BƯỚC 7: THIẾT LẬP ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Bật RLS cho các bảng chat
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies cho chat_conversations
CREATE POLICY "Users can view conversations they are part of" 
ON public.chat_conversations FOR SELECT 
USING (
    conversation_id IN (
        SELECT conversation_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);

-- RLS Policies cho chat_participants
CREATE POLICY "Users can view participants of their conversations" 
ON public.chat_participants FOR SELECT 
USING (
    conversation_id IN (
        SELECT conversation_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can add participants to conversations they admin" 
ON public.chat_participants FOR INSERT 
WITH CHECK (
    conversation_id IN (
        SELECT conversation_id FROM public.chat_participants 
        WHERE user_id = auth.uid() AND is_admin = true
    ) OR user_id = auth.uid()
);

-- RLS Policies cho chat_messages
CREATE POLICY "Users can view messages from their conversations" 
ON public.chat_messages FOR SELECT 
USING (
    conversation_id IN (
        SELECT conversation_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages to their conversations" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
    conversation_id IN (
        SELECT conversation_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    ) AND sender_id = auth.uid()
);

CREATE POLICY "Users can update their own messages" 
ON public.chat_messages FOR UPDATE 
USING (sender_id = auth.uid());

-- RLS Policies cho chat_message_status
CREATE POLICY "Users can view message status from their conversations" 
ON public.chat_message_status FOR SELECT 
USING (
    message_id IN (
        SELECT message_id FROM public.chat_messages 
        WHERE conversation_id IN (
            SELECT conversation_id FROM public.chat_participants 
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their own message status" 
ON public.chat_message_status FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own message status" 
ON public.chat_message_status FOR UPDATE 
USING (user_id = auth.uid());

-- RLS cho Payments
ALTER TABLE public.Payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.Payments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.Payments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS cho Users - Admin có thể xem tất cả, user thường chỉ xem được mình
ALTER TABLE public.Users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all users" ON public.Users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.Accounts 
            WHERE Accounts.user_id = auth.uid() 
            AND Accounts.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own profile" ON public.Users
    FOR SELECT 
    USING (user_id = auth.uid());

-- ============================================================================
-- BƯỚC 8: ĐỒNG BỘ DỮ LIỆU TỪ AUTH.USERS (NẾU CÓ)
-- ============================================================================

-- Function tự động tạo user profile khi đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    log_message TEXT;
BEGIN
    log_message := 'Bắt đầu đồng bộ dữ liệu cho: ' || NEW.email;
    RAISE NOTICE '%', log_message;
    
    -- Thêm vào bảng Users
    BEGIN
        INSERT INTO public.Users (user_id, full_name, email, phone, created_at, updated_at)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            NEW.created_at,
            NEW.updated_at
        );
        RAISE NOTICE 'Đã thêm người dùng thành công: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE WARNING 'Lỗi khi thêm vào Users: % - %', SQLSTATE, SQLERRM;
    END;
    
    -- Thêm vào bảng Accounts
    BEGIN
        INSERT INTO public.Accounts (user_id, user_name, role, status, create_at, update_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'role', 'NVBH'),
            CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active' ELSE 'inactive' END,
            NEW.created_at,
            NEW.updated_at
        );
        RAISE NOTICE 'Đã thêm tài khoản thành công: %', NEW.email;
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE WARNING 'Lỗi khi thêm vào Accounts: % - %', SQLSTATE, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo trigger để đồng bộ khi có user mới đăng ký
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HOÀN TẤT SETUP!
-- ============================================================================
-- Database đã được thiết lập thành công!
-- Bây giờ bạn có thể:
-- 1. Tạo tài khoản người dùng qua Authentication
-- 2. Thêm dữ liệu mẫu vào các bảng
-- 3. Sử dụng các API từ Next.js app của bạn
-- ============================================================================

