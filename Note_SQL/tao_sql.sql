-- Kích hoạt extension nếu cần dùng hàm tạo UUID tự động (tùy chọn, nếu bạn muốn DB tự sinh UUID)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng Branches (Chi nhánh) - Phải tạo trước Users vì Users tham chiếu đến nó
CREATE TABLE Branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    branch_address VARCHAR(255) NOT NULL,
    manager_id UUID NULL -- Sẽ thêm FOREIGN KEY sau khi bảng Users được tạo
);

COMMENT ON TABLE Branches IS 'Bảng lưu thông tin các chi nhánh';
COMMENT ON COLUMN Branches.branch_id IS 'Khóa chính định danh chi nhánh (tự tăng)';
COMMENT ON COLUMN Branches.branch_name IS 'Tên chi nhánh (duy nhất)';
COMMENT ON COLUMN Branches.branch_address IS 'Địa chỉ chi nhánh';
COMMENT ON COLUMN Branches.manager_id IS 'Người quản lý chi nhánh (tham chiếu đến Users.user_id)';

-- Bảng Users (Người dùng hệ thống)
CREATE TABLE Users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Giả sử dùng pgcrypto hoặc uuid-ossp
    branch_id INT NULL, -- Cho phép NULL tạm thời, sẽ thêm NOT NULL và FK sau
    full_name VARCHAR(255) NOT NULL CHECK (LENGTH(full_name) >= 2),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(11) NULL CHECK (phone IS NULL OR phone ~ '^0[0-9]{9,10}$'), -- Regex: Bắt đầu 0, 10 hoặc 11 số
    birth_date DATE NULL,
    hometown VARCHAR(255) NULL CHECK (hometown IS NULL OR LENGTH(hometown) >= 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Users IS 'Bảng lưu thông tin người dùng hệ thống (nhân viên, admin)';
COMMENT ON COLUMN Users.user_id IS 'Khóa chính định danh người dùng';
COMMENT ON COLUMN Users.branch_id IS 'Chi nhánh người dùng thuộc về (tham chiếu đến Branches.branch_id)';
COMMENT ON COLUMN Users.full_name IS 'Họ và tên đầy đủ (ít nhất 2 ký tự)';
COMMENT ON COLUMN Users.email IS 'Email (duy nhất)';
COMMENT ON COLUMN Users.phone IS 'Số điện thoại (Bắt đầu bằng số 0, có 10 hoặc 11 ký tự)';
COMMENT ON COLUMN Users.birth_date IS 'Ngày sinh';
COMMENT ON COLUMN Users.hometown IS 'Quê quán (Có ít nhất 2 ký tự)';
COMMENT ON COLUMN Users.created_at IS 'Thời gian tạo';
COMMENT ON COLUMN Users.updated_at IS 'Thời gian cập nhật';

-- Thêm ràng buộc FOREIGN KEY cho Users.branch_id sau khi Branches đã tạo
-- Lưu ý: Đảm bảo branch_id không được NULL trong thực tế nếu cần
ALTER TABLE Users
ADD CONSTRAINT fk_user_branch
FOREIGN KEY (branch_id) REFERENCES Branches(branch_id);
-- Nếu branch_id bắt buộc phải có, thêm ràng buộc NOT NULL
-- ALTER TABLE Users ALTER COLUMN branch_id SET NOT NULL;

-- Thêm ràng buộc FOREIGN KEY cho Branches.manager_id sau khi Users đã tạo
ALTER TABLE Branches
ADD CONSTRAINT fk_branch_manager
FOREIGN KEY (manager_id) REFERENCES Users(user_id);

-- Bảng Accounts (Tài khoản đăng nhập)
CREATE TABLE Accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES Users(user_id) ON DELETE CASCADE, -- Xóa tài khoản nếu user bị xóa
    user_name VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'NVBH', 'NVK')), -- NVBH: Nhân viên bán hàng, NVK: Nhân viên Kho
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'locked')),
    last_login TIMESTAMP WITH TIME ZONE NULL,
    create_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Accounts IS 'Bảng lưu thông tin tài khoản đăng nhập';
COMMENT ON COLUMN Accounts.id IS 'Khóa chính định danh tài khoản';
COMMENT ON COLUMN Accounts.user_id IS 'Liên kết với người dùng (duy nhất, không null)';
COMMENT ON COLUMN Accounts.user_name IS 'Tên đăng nhập (duy nhất)';
COMMENT ON COLUMN Accounts.password_hash IS 'Mật khẩu đã mã hóa';
COMMENT ON COLUMN Accounts.role IS 'Vai trò người dùng (admin, NVBH, NVK)';
COMMENT ON COLUMN Accounts.status IS 'Trạng thái tài khoản (active, inactive, locked)';
COMMENT ON COLUMN Accounts.last_login IS 'Lần đăng nhập cuối';
COMMENT ON COLUMN Accounts.create_at IS 'Thời gian tạo';
COMMENT ON COLUMN Accounts.update_at IS 'Thời gian cập nhật';

-- Bảng Customers (Khách hàng)
CREATE TABLE Customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(11) UNIQUE CHECK (phone IS NULL OR phone ~ '^0[0-9]{9,10}$'), -- Cho phép NULL nếu không bắt buộc, nhưng nếu có thì phải unique và đúng định dạng
    email VARCHAR(255) NOT NULL UNIQUE,
    hometown VARCHAR(255) NULL CHECK (hometown IS NULL OR LENGTH(hometown) >= 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Lưu ý: Đề bài ghi phone UNIQUE nhưng không ghi NOT NULL, email ghi UNIQUE, NOT NULL. Xem xét lại yêu cầu phone có bắt buộc không.
-- Nếu phone là bắt buộc và duy nhất: phone VARCHAR(11) NOT NULL UNIQUE CHECK (phone ~ '^0[0-9]{9,10}$')

COMMENT ON TABLE Customers IS 'Bảng lưu thông tin khách hàng';
COMMENT ON COLUMN Customers.customer_id IS 'Khóa chính định danh khách hàng';
COMMENT ON COLUMN Customers.full_name IS 'Họ và tên đầy đủ';
COMMENT ON COLUMN Customers.phone IS 'Số điện thoại (Bắt đầu bằng số 0, có 10 hoặc 11 ký tự, duy nhất)';
COMMENT ON COLUMN Customers.email IS 'Email (duy nhất)';
COMMENT ON COLUMN Customers.hometown IS 'Quê quán (Có ít nhất 2 ký tự, cho phép null)';
COMMENT ON COLUMN Customers.created_at IS 'Thời gian tạo';
COMMENT ON COLUMN Customers.updated_at IS 'Thời gian cập nhật';

-- Bảng Staff (Thông tin nhân viên chi tiết)
CREATE TABLE Staff (
    staff_id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES Users(user_id) ON DELETE SET NULL, -- Cho phép user bị xóa mà thông tin staff vẫn còn (nhưng user_id sẽ là NULL) hoặc dùng ON DELETE CASCADE
    start_date DATE NOT NULL,
    end_date DATE NULL,
    work_shift VARCHAR(100) NOT NULL,
    salary DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (salary >= 0),
    contract_type VARCHAR(100) NULL CHECK (contract_type IS NULL OR contract_type IN ('full-time', 'part-time', 'contract')),
    employment_status VARCHAR(100) NULL CHECK (employment_status IS NULL OR employment_status IN ('active', 'on-leave', 'terminated')),
    reports_to_user_id UUID NULL REFERENCES Users(user_id) -- Tham chiếu đến người quản lý trực tiếp
);

COMMENT ON TABLE Staff IS 'Bảng lưu thông tin chi tiết về nhân viên';
COMMENT ON COLUMN Staff.staff_id IS 'Khóa chính định danh nhân viên (tự tăng)';
COMMENT ON COLUMN Staff.user_id IS 'Liên kết với người dùng (Users)';
COMMENT ON COLUMN Staff.start_date IS 'Ngày bắt đầu làm việc';
COMMENT ON COLUMN Staff.end_date IS 'Ngày kết thúc làm việc (nếu có)';
COMMENT ON COLUMN Staff.work_shift IS 'Ca làm việc';
COMMENT ON COLUMN Staff.salary IS 'Lương';
COMMENT ON COLUMN Staff.contract_type IS 'Loại hợp đồng (full-time, part-time, contract)';
COMMENT ON COLUMN Staff.employment_status IS 'Trạng thái làm việc (active, on-leave, terminated)';
COMMENT ON COLUMN Staff.reports_to_user_id IS 'Người quản lý trực tiếp (tham chiếu đến Users.user_id)';

-- Bảng Category (Danh mục sản phẩm) - Phải tạo trước Products
CREATE TABLE Category (
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

-- Bảng Products (Sản phẩm)
CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES Category(category_id),
    product_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    color VARCHAR(50) NULL,
    size VARCHAR(50) NULL,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image TEXT NOT NULL, -- Lưu URL hoặc Base64 dạng text
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Products IS 'Bảng lưu thông tin sản phẩm';
COMMENT ON COLUMN Products.product_id IS 'Mã sản phẩm (tự tăng)';
COMMENT ON COLUMN Products.category_id IS 'Mã danh mục sản phẩm thuộc về';
COMMENT ON COLUMN Products.product_name IS 'Tên sản phẩm';
COMMENT ON COLUMN Products.description IS 'Mô tả chi tiết sản phẩm';
COMMENT ON COLUMN Products.color IS 'Màu sắc sản phẩm';
COMMENT ON COLUMN Products.size IS 'Kích thước sản phẩm';
COMMENT ON COLUMN Products.price IS 'Giá bán sản phẩm';
COMMENT ON COLUMN Products.stock_quantity IS 'Số lượng tồn kho';
COMMENT ON COLUMN Products.image IS 'URL/Đường dẫn hình ảnh sản phẩm (dạng text, base64 hoặc url)';
COMMENT ON COLUMN Products.created_at IS 'Ngày tạo sản phẩm';
COMMENT ON COLUMN Products.updated_at IS 'Ngày cập nhật sản phẩm gần nhất';

-- Bảng Payments (Phương thức thanh toán) - Phải tạo trước Orders
CREATE TABLE Payments (
    payment_id SERIAL PRIMARY KEY,
    payment_method_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    image TEXT NULL, -- Lưu URL hoặc Base64 dạng text
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Payments IS 'Bảng lưu các phương thức thanh toán';
COMMENT ON COLUMN Payments.payment_id IS 'Mã phương thức thanh toán (tự tăng)';
COMMENT ON COLUMN Payments.payment_method_name IS 'Tên phương thức thanh toán (Vd: Tiền mặt,...)';
COMMENT ON COLUMN Payments.description IS 'Mô tả chi tiết';
COMMENT ON COLUMN Payments.image IS 'URL/Đường dẫn ảnh logo/QR (dạng text, base64 hoặc url)';
COMMENT ON COLUMN Payments.created_at IS 'Ngày tạo phương thức';
COMMENT ON COLUMN Payments.updated_at IS 'Thời gian cập nhật';

-- Bảng Orders (Đơn hàng) - Phải tạo trước Orderdetails, Shippings, Returns
CREATE TABLE Orders (
    order_id TEXT PRIMARY KEY, -- Mã tự sinh dạng TEXT, cần logic ứng dụng hoặc trigger để tạo
    user_id UUID NULL REFERENCES Users(user_id), -- Người xử lý đơn (nhân viên), null nếu là khách vãng lai tự đặt
    customer_id UUID NOT NULL REFERENCES Customers(customer_id), -- Khách hàng đặt hàng
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price DECIMAL(15, 2) NOT NULL CHECK (price >= 0), -- Tổng giá trị đơn hàng
    status VARCHAR(50) NOT NULL CHECK (status IN ('Đã thanh toán', 'Chưa thanh toán')),
    payment_method INT NULL REFERENCES Payments(payment_id), -- Null khi chưa thanh toán
    is_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_payment_status CHECK ( (status = 'Chưa thanh toán' AND payment_method IS NULL) OR (status = 'Đã thanh toán' AND payment_method IS NOT NULL) )
);

COMMENT ON TABLE Orders IS 'Bảng lưu thông tin đơn hàng';
COMMENT ON COLUMN Orders.order_id IS 'Mã đơn hàng (tự sinh, dạng TEXT)';
COMMENT ON COLUMN Orders.user_id IS 'Mã người dùng tạo/xử lý đơn (NULL nếu là khách vãng lai)';
COMMENT ON COLUMN Orders.customer_id IS 'Mã khách hàng đặt hàng';
COMMENT ON COLUMN Orders.order_date IS 'Ngày đặt hàng';
COMMENT ON COLUMN Orders.price IS 'Tổng giá trị đơn hàng';
COMMENT ON COLUMN Orders.status IS 'Trạng thái đơn hàng (Đã thanh toán, Chưa thanh toán)';
COMMENT ON COLUMN Orders.payment_method IS 'Phương thức thanh toán (NULL khi chưa thanh toán)';
COMMENT ON COLUMN Orders.is_shipping IS 'Cờ đánh dấu có vận chuyển hay không';
COMMENT ON CONSTRAINT chk_payment_status ON Orders IS 'Kiểm tra logic: Nếu Chưa thanh toán thì payment_method phải NULL, nếu Đã thanh toán thì payment_method không được NULL';


-- Bảng Orderdetails (Chi tiết đơn hàng)
CREATE TABLE Orderdetails (
    orderdetail_id TEXT PRIMARY KEY, -- Mã tự sinh dạng TEXT
    order_id TEXT NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE, -- Xóa chi tiết nếu đơn hàng bị xóa
    product_id INT NOT NULL REFERENCES Products(product_id), -- Không nên xóa product nếu có trong đơn hàng cũ, có thể set ON DELETE RESTRICT
    name_product VARCHAR(255) NOT NULL, -- Lưu lại tên SP tại thời điểm đặt
    name_check VARCHAR(255) NOT NULL, -- Cần làm rõ ý nghĩa của trường này
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0), -- Lưu lại giá tại thời điểm đặt
    subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0),
    CONSTRAINT chk_subtotal CHECK (subtotal = quantity * unit_price) -- Ràng buộc thành tiền
);

COMMENT ON TABLE Orderdetails IS 'Bảng lưu chi tiết các sản phẩm trong một đơn hàng';
COMMENT ON COLUMN Orderdetails.orderdetail_id IS 'Mã chi tiết đơn hàng (tự sinh, dạng TEXT)';
COMMENT ON COLUMN Orderdetails.order_id IS 'Mã đơn hàng chứa chi tiết này';
COMMENT ON COLUMN Orderdetails.product_id IS 'Mã sản phẩm được đặt';
COMMENT ON COLUMN Orderdetails.name_product IS 'Tên sản phẩm tại thời điểm đặt hàng';
COMMENT ON COLUMN Orderdetails.name_check IS 'Tên hóa đơn trong đơn hàng (cần xem xét lại ý nghĩa)';
COMMENT ON COLUMN Orderdetails.quantity IS 'Số lượng sản phẩm';
COMMENT ON COLUMN Orderdetails.unit_price IS 'Đơn giá sản phẩm tại thời điểm đặt hàng';
COMMENT ON COLUMN Orderdetails.subtotal IS 'Thành tiền (quantity * unit_price)';
COMMENT ON CONSTRAINT chk_subtotal ON Orderdetails IS 'Đảm bảo thành tiền bằng số lượng nhân đơn giá';


-- Bảng Shippings (Vận chuyển)
CREATE TABLE Shippings (
    shipping_id TEXT PRIMARY KEY, -- Mã tự sinh dạng TEXT
    order_id TEXT NOT NULL UNIQUE REFERENCES Orders(order_id) ON DELETE CASCADE, -- Mỗi đơn hàng chỉ có 1 thông tin vận chuyển
    carrier VARCHAR(255) NULL, -- Đơn vị vận chuyển
    tracking_num VARCHAR(255) NULL UNIQUE, -- Mã vận đơn (thường là duy nhất, cho phép null)
    shipping_address TEXT NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    actual_delivery_date TIMESTAMP WITH TIME ZONE NULL,
    delivery_date TIMESTAMP WITH TIME ZONE NULL, -- Ngày giao dự kiến
    status VARCHAR(50) NOT NULL CHECK (status IN ('Chưa giao hàng', 'Đang chuẩn bị', 'đang giao', 'Đã giao', 'Đang hoàn về', 'Đã hủy')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(10, 3) NULL CHECK (weight IS NULL OR weight >= 0),
    unit_weight VARCHAR(10) NULL CHECK (unit_weight IS NULL OR unit_weight IN ('kg', 'g')),
    "long" DECIMAL(10, 2) NULL CHECK ("long" IS NULL OR "long" >= 0), -- Dùng dấu ngoặc kép vì "long" là từ khóa
    wide DECIMAL(10, 2) NULL CHECK (wide IS NULL OR wide >= 0),
    height DECIMAL(10, 2) NULL CHECK (height IS NULL OR height >= 0) -- Sửa hight thành height
);

COMMENT ON TABLE Shippings IS 'Bảng lưu thông tin vận chuyển của đơn hàng';
COMMENT ON COLUMN Shippings.shipping_id IS 'Mã vận chuyển (tự sinh, dạng TEXT)';
COMMENT ON COLUMN Shippings.order_id IS 'Mã đơn hàng được vận chuyển (duy nhất)';
COMMENT ON COLUMN Shippings.carrier IS 'Đơn vị vận chuyển (Vd: GHN, ViettelPost, ...)';
COMMENT ON COLUMN Shippings.tracking_num IS 'Mã vận đơn (nullable, unique)';
COMMENT ON COLUMN Shippings.shipping_address IS 'Địa chỉ giao hàng';
COMMENT ON COLUMN Shippings.shipping_cost IS 'Phí vận chuyển';
COMMENT ON COLUMN Shippings.actual_delivery_date IS 'Ngày giao hàng thực tế';
COMMENT ON COLUMN Shippings.delivery_date IS 'Ngày giao hàng dự kiến';
COMMENT ON COLUMN Shippings.status IS 'Trạng thái vận chuyển';
COMMENT ON COLUMN Shippings.created_at IS 'Ngày tạo thông tin vận chuyển';
COMMENT ON COLUMN Shippings.weight IS 'Cân nặng lô hàng';
COMMENT ON COLUMN Shippings.unit_weight IS 'Đơn vị cân nặng (kg, g)';
COMMENT ON COLUMN Shippings."long" IS 'Chiều dài kiện hàng';
COMMENT ON COLUMN Shippings.wide IS 'Chiều rộng kiện hàng';
COMMENT ON COLUMN Shippings.height IS 'Chiều cao kiện hàng';

-- Bảng Returns (Đổi/Trả hàng)
CREATE TABLE Returns (
    return_id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES Orders(order_id), -- Không nên cascade delete, đơn hàng vẫn tồn tại dù có yêu cầu trả
    return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    return_reason TEXT NOT NULL,
    refund_amount DECIMAL(15, 2) NULL CHECK (refund_amount IS NULL OR refund_amount >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('đang xử lý', 'đã chấp nhận', 'đã từ chối'))
);

COMMENT ON TABLE Returns IS 'Bảng lưu thông tin yêu cầu đổi/trả hàng';
COMMENT ON COLUMN Returns.return_id IS 'Mã yêu cầu đổi/trả (tự tăng)';
COMMENT ON COLUMN Returns.order_id IS 'Mã đơn hàng gốc liên quan';
COMMENT ON COLUMN Returns.return_date IS 'Ngày yêu cầu đổi/trả';
COMMENT ON COLUMN Returns.return_reason IS 'Lý do đổi/trả hàng';
COMMENT ON COLUMN Returns.refund_amount IS 'Số tiền hoàn lại (nếu có)';
COMMENT ON COLUMN Returns.status IS 'Trạng thái của yêu cầu đổi/trả (đang xử lý, đã chấp nhận, đã từ chối)';

-- Trigger
-- Hàm trigger để tính toán subtotal
CREATE OR REPLACE FUNCTION calculate_orderdetail_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    -- Tính subtotal = quantity * unit_price cho bản ghi MỚI (NEW)
    NEW.subtotal := NEW.quantity * NEW.unit_price;
    -- Trả về bản ghi MỚI đã được sửa đổi để INSERT
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger gắn vào bảng Orderdetails
CREATE OR REPLACE TRIGGER trg_calculate_orderdetail_subtotal
BEFORE INSERT ON Orderdetails -- Chạy TRƯỚC KHI insert
FOR EACH ROW -- Chạy cho mỗi dòng được insert
EXECUTE FUNCTION calculate_orderdetail_subtotal();


-- Hàm trigger để cập nhật số lượng tồn kho
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Giảm số lượng tồn kho của sản phẩm tương ứng
    UPDATE Products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;

    -- Kiểm tra nếu số lượng tồn kho âm (tùy chọn, vì đã có CHECK constraint)
    -- IF (SELECT stock_quantity FROM Products WHERE product_id = NEW.product_id) < 0 THEN
    --     RAISE EXCEPTION 'Số lượng tồn kho không đủ cho sản phẩm ID %', NEW.product_id;
    -- END IF;

    -- Trigger AFTER không cần trả về giá trị cụ thể (hoặc trả về NULL)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger gắn vào bảng Orderdetails
CREATE TRIGGER trg_update_product_stock
AFTER INSERT ON Orderdetails -- Chạy SAU KHI insert thành công
FOR EACH ROW -- Chạy cho mỗi dòng được insert
EXECUTE FUNCTION update_product_stock();

ALTER TABLE Orderdetails
DROP CONSTRAINT orderdetails_order_id_fkey;

ALTER TABLE Orderdetails
ADD CONSTRAINT orderdetails_order_id_fkey
FOREIGN KEY (order_id) REFERENCES Orders(order_id)
ON DELETE CASCADE; -- Thêm dòng này

-- -- Optional: Thêm Indexes để tăng tốc độ truy vấn cho các cột thường dùng trong WHERE, JOIN
-- CREATE INDEX idx_users_email ON Users(email);
-- CREATE INDEX idx_users_phone ON Users(phone);
-- CREATE INDEX idx_users_branch_id ON Users(branch_id);

-- CREATE INDEX idx_accounts_user_name ON Accounts(user_name);
-- CREATE INDEX idx_accounts_user_id ON Accounts(user_id); -- Đã có UNIQUE constraint nhưng index tường minh có thể hữu ích

-- CREATE INDEX idx_customers_email ON Customers(email);
-- CREATE INDEX idx_customers_phone ON Customers(phone);

-- CREATE INDEX idx_staff_user_id ON Staff(user_id);
-- CREATE INDEX idx_staff_reports_to ON Staff(reports_to_user_id);

-- CREATE INDEX idx_products_category_id ON Products(category_id);
-- CREATE INDEX idx_products_product_name ON Products(product_name); -- Có thể dùng index kiểu text search nếu cần tìm kiếm phức tạp

-- CREATE INDEX idx_orders_customer_id ON Orders(customer_id);
-- CREATE INDEX idx_orders_user_id ON Orders(user_id);
-- CREATE INDEX idx_orders_order_date ON Orders(order_date);
-- CREATE INDEX idx_orders_status ON Orders(status);

-- CREATE INDEX idx_orderdetails_order_id ON Orderdetails(order_id);
-- CREATE INDEX idx_orderdetails_product_id ON Orderdetails(product_id);

-- CREATE INDEX idx_shippings_order_id ON Shippings(order_id); -- Đã có UNIQUE constraint
-- CREATE INDEX idx_shippings_tracking_num ON Shippings(tracking_num); -- Đã có UNIQUE constraint
-- CREATE INDEX idx_shippings_status ON Shippings(status);

-- CREATE INDEX idx_returns_order_id ON Returns(order_id);
-- CREATE INDEX idx_returns_status ON Returns(status);