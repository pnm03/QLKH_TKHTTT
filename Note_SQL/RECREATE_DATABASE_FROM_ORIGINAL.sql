-- ============================================================================
-- TẠO LẠI DATABASE THEO SCHEMA GỐC (database.txt)
-- ============================================================================
-- Mục đích: Xóa tất cả tables và tạo lại theo schema đã hoạt động ổn định
-- Nguồn: database.txt (schema gốc đã test và hoạt động tốt)
-- ============================================================================

-- ============================================================================
-- BƯỚC 1: XÓA TẤT CẢ TABLES CŨ (THEO THỨ TỰ NGƯỢC)
-- ============================================================================

-- Xóa các bảng con trước (có foreign keys)
DROP TABLE IF EXISTS public.chat_message_status CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
DROP TABLE IF EXISTS public.returns CASCADE;
DROP TABLE IF EXISTS public.shippings CASCADE;
DROP TABLE IF EXISTS public.orderdetails CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.category CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;

-- ============================================================================
-- BƯỚC 2: TẠO LẠI CÁC BẢNG THEO ĐÚNG SCHEMA GỐC
-- ============================================================================

-- ============================================================================
-- BẢNG BRANCHES (Tạo trước KHÔNG có foreign key manager_id)
-- ============================================================================
CREATE TABLE public.branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    branch_address VARCHAR(255) NOT NULL,
    manager_id UUID  -- Chưa có foreign key, sẽ thêm sau
);

COMMENT ON TABLE public.branches IS 'Bảng quản lý chi nhánh';
COMMENT ON COLUMN public.branches.branch_id IS 'Khóa chính định danh chi nhánh';
COMMENT ON COLUMN public.branches.branch_name IS 'Tên chi nhánh (duy nhất)';
COMMENT ON COLUMN public.branches.branch_address IS 'Địa chỉ chi nhánh';
COMMENT ON COLUMN public.branches.manager_id IS 'Người quản lý chi nhánh';

-- ============================================================================
-- BẢNG USERS
-- ============================================================================
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id INT REFERENCES public.branches(branch_id),
    full_name VARCHAR(255) NOT NULL CHECK (LENGTH(full_name) >= 2),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(11) CHECK (phone ~ '^0[0-9]{9,10}$'),
    birth_date DATE,
    hometown VARCHAR(255) CHECK (LENGTH(hometown) >= 2 OR hometown IS NULL),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.users IS 'Bảng người dùng trong hệ thống';
COMMENT ON COLUMN public.users.user_id IS 'Khóa chính định danh người dùng';
COMMENT ON COLUMN public.users.branch_id IS 'Chi nhánh người dùng thuộc về';
COMMENT ON COLUMN public.users.full_name IS 'Họ và tên đầy đủ';
COMMENT ON COLUMN public.users.email IS 'Email (duy nhất)';
COMMENT ON COLUMN public.users.phone IS 'Số điện thoại';
COMMENT ON COLUMN public.users.birth_date IS 'Ngày sinh';
COMMENT ON COLUMN public.users.hometown IS 'Quê quán';

-- ============================================================================
-- THÊM FOREIGN KEY CHO BRANCHES.MANAGER_ID (SAU KHI ĐÃ TẠO USERS)
-- ============================================================================
ALTER TABLE public.branches 
ADD CONSTRAINT fk_branches_manager 
FOREIGN KEY (manager_id) REFERENCES public.users(user_id);

-- ============================================================================
-- BẢNG ACCOUNTS
-- ============================================================================
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(user_id) ON DELETE CASCADE,
    user_name VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'NVBH', 'NVK')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'locked')),
    last_login TIMESTAMP WITH TIME ZONE,
    create_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.accounts IS 'Bảng tài khoản đăng nhập';
COMMENT ON COLUMN public.accounts.id IS 'Khóa chính định danh tài khoản';
COMMENT ON COLUMN public.accounts.user_id IS 'Liên kết với người dùng';
COMMENT ON COLUMN public.accounts.user_name IS 'Tên đăng nhập (duy nhất)';
COMMENT ON COLUMN public.accounts.password_hash IS 'Mật khẩu đã mã hóa';
COMMENT ON COLUMN public.accounts.role IS 'Vai trò người dùng';
COMMENT ON COLUMN public.accounts.status IS 'Trạng thái tài khoản';

-- ============================================================================
-- BẢNG CUSTOMERS
-- ============================================================================
CREATE TABLE public.customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(11) UNIQUE CHECK (phone ~ '^0[0-9]{9,10}$'),
    email VARCHAR(255) UNIQUE NOT NULL,
    hometown VARCHAR(255) CHECK (LENGTH(hometown) >= 2 OR hometown IS NULL),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.customers IS 'Bảng khách hàng';
COMMENT ON COLUMN public.customers.customer_id IS 'Khóa chính định danh khách hàng';
COMMENT ON COLUMN public.customers.full_name IS 'Họ và tên đầy đủ';
COMMENT ON COLUMN public.customers.phone IS 'Số điện thoại';
COMMENT ON COLUMN public.customers.email IS 'Email (duy nhất)';

-- ============================================================================
-- BẢNG STAFF
-- ============================================================================
CREATE TABLE public.staff (
    staff_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    work_shift VARCHAR(100) NOT NULL,
    salary DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (salary >= 0),
    contract_type VARCHAR(100) CHECK (contract_type IN ('full-time', 'part-time', 'contract')),
    employment_status VARCHAR(100) CHECK (employment_status IN ('active', 'on-leave', 'terminated')),
    reports_to_user_id UUID REFERENCES public.users(user_id)
);

COMMENT ON TABLE public.staff IS 'Bảng nhân viên';
COMMENT ON COLUMN public.staff.staff_id IS 'Khóa chính định danh nhân viên';
COMMENT ON COLUMN public.staff.user_id IS 'Liên kết với người dùng';
COMMENT ON COLUMN public.staff.start_date IS 'Ngày bắt đầu làm việc';

-- ============================================================================
-- BẢNG CATEGORY
-- ============================================================================
CREATE TABLE public.category (
    category_id SERIAL PRIMARY KEY,
    name_category VARCHAR(255) NOT NULL UNIQUE,
    description_category TEXT NOT NULL,
    image_category TEXT
);

COMMENT ON TABLE public.category IS 'Bảng danh mục sản phẩm';
COMMENT ON COLUMN public.category.category_id IS 'Mã danh mục';
COMMENT ON COLUMN public.category.name_category IS 'Tên danh mục sản phẩm';
COMMENT ON COLUMN public.category.description_category IS 'Mô tả về danh mục';

-- ============================================================================
-- BẢNG PRODUCTS
-- ============================================================================
CREATE TABLE public.products (
    product_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES public.category(category_id),
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50),
    size VARCHAR(50),
    price DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    image TEXT NOT NULL
);

COMMENT ON TABLE public.products IS 'Bảng sản phẩm';
COMMENT ON COLUMN public.products.product_id IS 'Mã sản phẩm';
COMMENT ON COLUMN public.products.category_id IS 'Mã danh mục sản phẩm thuộc về';
COMMENT ON COLUMN public.products.product_name IS 'Tên sản phẩm';
COMMENT ON COLUMN public.products.price IS 'Giá bán sản phẩm';
COMMENT ON COLUMN public.products.cost_price IS 'Giá nhập sản phẩm';
COMMENT ON COLUMN public.products.stock_quantity IS 'Số lượng tồn kho';

-- ============================================================================
-- BẢNG PAYMENTS
-- ============================================================================
CREATE TABLE public.payments (
    payment_id SERIAL PRIMARY KEY,
    payment_method_name VARCHAR(100) NOT NULL,
    description TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.payments IS 'Bảng phương thức thanh toán';
COMMENT ON COLUMN public.payments.payment_id IS 'Mã phương thức thanh toán';
COMMENT ON COLUMN public.payments.payment_method_name IS 'Tên phương thức thanh toán';

-- ============================================================================
-- BẢNG ORDERS
-- ============================================================================
CREATE TABLE public.orders (
    order_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(user_id),
    customer_id UUID REFERENCES public.customers(customer_id),
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price DECIMAL(15, 2) NOT NULL CHECK (price >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Đã thanh toán', 'Chưa thanh toán')),
    payment_method INT REFERENCES public.payments(payment_id),
    is_shipping BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.orders IS 'Bảng đơn hàng';
COMMENT ON COLUMN public.orders.order_id IS 'Mã đơn hàng';
COMMENT ON COLUMN public.orders.user_id IS 'Mã người dùng tạo/xử lý đơn';
COMMENT ON COLUMN public.orders.customer_id IS 'Mã khách hàng đặt hàng';
COMMENT ON COLUMN public.orders.order_date IS 'Ngày đặt hàng';
COMMENT ON COLUMN public.orders.price IS 'Tổng giá trị đơn hàng';
COMMENT ON COLUMN public.orders.status IS 'Trạng thái đơn hàng';
COMMENT ON COLUMN public.orders.payment_method IS 'Phương thức thanh toán';
COMMENT ON COLUMN public.orders.is_shipping IS 'Cờ đánh dấu có vận chuyển hay không';

-- ============================================================================
-- BẢNG ORDERDETAILS
-- ============================================================================
CREATE TABLE public.orderdetails (
    orderdetail_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES public.products(product_id),
    name_product VARCHAR(255) NOT NULL,
    name_check VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0),
    cost_price_at_sale DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (cost_price_at_sale >= 0)
);

COMMENT ON TABLE public.orderdetails IS 'Bảng chi tiết đơn hàng';
COMMENT ON COLUMN public.orderdetails.orderdetail_id IS 'Mã chi tiết đơn hàng';
COMMENT ON COLUMN public.orderdetails.order_id IS 'Mã đơn hàng chứa chi tiết này';
COMMENT ON COLUMN public.orderdetails.product_id IS 'Mã sản phẩm được đặt';
COMMENT ON COLUMN public.orderdetails.name_product IS 'Tên sản phẩm tại thời điểm đặt hàng';
COMMENT ON COLUMN public.orderdetails.name_check IS 'Tên hóa đơn trong đơn hàng';
COMMENT ON COLUMN public.orderdetails.quantity IS 'Số lượng sản phẩm';
COMMENT ON COLUMN public.orderdetails.unit_price IS 'Đơn giá sản phẩm tại thời điểm đặt hàng';
COMMENT ON COLUMN public.orderdetails.subtotal IS 'Thành tiền (quantity * unit_price)';
COMMENT ON COLUMN public.orderdetails.cost_price_at_sale IS 'Giá nhập tại thời điểm bán';

-- ============================================================================
-- BẢNG SHIPPINGS (THEO ĐÚNG SCHEMA GỐC - KHÔNG THÊM CỘT MỚI)
-- ============================================================================
CREATE TABLE public.shippings (
    shipping_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE REFERENCES public.orders(order_id) ON DELETE CASCADE,
    carrier VARCHAR(255),
    tracking_num VARCHAR(255) UNIQUE,
    shipping_address TEXT NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    delivery_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Chưa giao hàng', 'Đang chuẩn bị', 'Đang giao hàng', 'Đã giao hàng', 'Đang hoàn về', 'Đã hủy')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(10, 3) CHECK (weight >= 0),
    unit_weight VARCHAR(10) CHECK (unit_weight IN ('kg', 'g')),
    "long" DECIMAL(10, 2) CHECK ("long" >= 0),
    wide DECIMAL(10, 2) CHECK (wide >= 0),
    hight DECIMAL(10, 2) CHECK (hight >= 0)
);

COMMENT ON TABLE public.shippings IS 'Bảng lưu thông tin vận chuyển của đơn hàng';
COMMENT ON COLUMN public.shippings.shipping_id IS 'Mã vận chuyển';
COMMENT ON COLUMN public.shippings.order_id IS 'Mã đơn hàng được vận chuyển';
COMMENT ON COLUMN public.shippings.carrier IS 'Đơn vị vận chuyển';
COMMENT ON COLUMN public.shippings.tracking_num IS 'Mã vận đơn';
COMMENT ON COLUMN public.shippings.shipping_address IS 'Địa chỉ giao hàng';
COMMENT ON COLUMN public.shippings.shipping_cost IS 'Phí vận chuyển';
COMMENT ON COLUMN public.shippings.actual_delivery_date IS 'Ngày giao hàng thực tế';
COMMENT ON COLUMN public.shippings.delivery_date IS 'Ngày giao hàng dự kiến';
COMMENT ON COLUMN public.shippings.status IS 'Trạng thái vận chuyển';
COMMENT ON COLUMN public.shippings.weight IS 'Cân nặng lô hàng';
COMMENT ON COLUMN public.shippings.unit_weight IS 'Đơn vị cân nặng';
COMMENT ON COLUMN public.shippings."long" IS 'Chiều dài kiện hàng';
COMMENT ON COLUMN public.shippings.wide IS 'Chiều rộng kiện hàng';
COMMENT ON COLUMN public.shippings.hight IS 'Chiều cao kiện hàng';

-- ============================================================================
-- BẢNG RETURNS
-- ============================================================================
CREATE TABLE public.returns (
    return_id SERIAL PRIMARY KEY,
    name_return TEXT,
    order_id TEXT NOT NULL REFERENCES public.orders(order_id),
    return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    return_reason TEXT NOT NULL,
    refund_amount DECIMAL(15, 2) CHECK (refund_amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('đang xử lý', 'đã chấp nhận', 'đã từ chối'))
);

COMMENT ON TABLE public.returns IS 'Bảng đổi/trả hàng';
COMMENT ON COLUMN public.returns.return_id IS 'Mã yêu cầu đổi/trả';
COMMENT ON COLUMN public.returns.name_return IS 'Tên yêu cầu đổi/trả';
COMMENT ON COLUMN public.returns.order_id IS 'Mã đơn hàng gốc liên quan';
COMMENT ON COLUMN public.returns.return_date IS 'Ngày yêu cầu đổi/trả';
COMMENT ON COLUMN public.returns.return_reason IS 'Lý do đổi/trả hàng';
COMMENT ON COLUMN public.returns.refund_amount IS 'Số tiền hoàn lại';
COMMENT ON COLUMN public.returns.status IS 'Trạng thái của yêu cầu đổi/trả';

-- ============================================================================
-- BƯỚC 3: TẠO LẠI CÁC TRIGGERS (THEO database.txt)
-- ============================================================================

-- TRIGGER 1: Tự động tính subtotal khi thêm orderdetail
CREATE OR REPLACE FUNCTION calculate_orderdetail_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_subtotal
BEFORE INSERT OR UPDATE ON public.orderdetails
FOR EACH ROW
EXECUTE FUNCTION calculate_orderdetail_subtotal();

-- TRIGGER 2: Cập nhật tồn kho khi thêm orderdetail
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock
AFTER INSERT ON public.orderdetails
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- TRIGGER 3: Tự động xóa orderdetails khi xóa order (CASCADE đã handle)
-- Không cần trigger vì đã có ON DELETE CASCADE

-- ============================================================================
-- BƯỚC 4: TẠO RLS POLICIES (Giống như trước)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orderdetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shippings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Policies cho authenticated users (view all)
CREATE POLICY "Authenticated users can view all users"
ON public.users FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all accounts"
ON public.accounts FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all customers"
ON public.customers FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all products"
ON public.products FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all orders"
ON public.orders FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all orderdetails"
ON public.orderdetails FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all branches"
ON public.branches FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all categories"
ON public.category FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all payments"
ON public.payments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all staff"
ON public.staff FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all shippings"
ON public.shippings FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all returns"
ON public.returns FOR SELECT USING (auth.role() = 'authenticated');

-- Policies cho INSERT/UPDATE/DELETE (authenticated)
CREATE POLICY "Authenticated users can insert"
ON public.customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products"
ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert orders"
ON public.orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert orderdetails"
ON public.orderdetails FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert shippings"
ON public.shippings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders"
ON public.orders FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
ON public.products FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shippings"
ON public.shippings FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- HOÀN TẤT!
-- ============================================================================

SELECT 'DATABASE RECREATED SUCCESSFULLY!' as status;
SELECT 'Schema đã được tạo lại theo database.txt gốc' as message;

-- Kiểm tra các tables đã tạo
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

