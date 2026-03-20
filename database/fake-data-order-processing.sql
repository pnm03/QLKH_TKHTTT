-- Dữ liệu fake cho chức năng Ghi nhận đơn hàng
-- Chạy script này trong Supabase SQL Editor để tạo dữ liệu mẫu

-- 1. Tạo khách hàng mẫu (nếu chưa có)
INSERT INTO customers (customer_id, full_name, phone, address, email, created_at)
VALUES 
  ('CUST001', 'Nguyễn Văn An', '0901234567', '123 Đường Lê Lợi, Q1, TP.HCM', 'nguyenvanan@email.com', NOW()),
  ('CUST002', 'Trần Thị Bình', '0912345678', '456 Đường Nguyễn Huệ, Q1, TP.HCM', 'tranthib@email.com', NOW()),
  ('CUST003', 'Lê Văn Cường', '0923456789', '789 Đường Hai Bà Trưng, Q3, TP.HCM', 'levanc@email.com', NOW()),
  ('CUST004', 'Phạm Thị Dung', '0934567890', '321 Đường Trần Hưng Đạo, Q5, TP.HCM', 'phamthid@email.com', NOW()),
  ('CUST005', 'Hoàng Văn Em', '0945678901', '654 Đường Võ Văn Tần, Q3, TP.HCM', 'hoangvane@email.com', NOW())
ON CONFLICT (customer_id) DO NOTHING;

-- 2. Tạo phương thức thanh toán (nếu chưa có)
INSERT INTO payment_methods (payment_method_id, method_name, description)
VALUES 
  ('PM001', 'Tiền mặt', 'Thanh toán bằng tiền mặt'),
  ('PM002', 'Chuyển khoản', 'Thanh toán qua chuyển khoản ngân hàng'),
  ('PM003', 'Ví điện tử', 'Thanh toán qua ví điện tử (MoMo, ZaloPay)'),
  ('PM004', 'Thẻ tín dụng', 'Thanh toán bằng thẻ tín dụng')
ON CONFLICT (payment_method_id) DO NOTHING;

-- 3. Lấy user_id đầu tiên từ bảng users (giả sử là nhân viên tạo đơn)
-- Thay thế 'YOUR_USER_ID' bằng user_id thực tế từ bảng users của bạn

-- 4. Tạo đơn hàng mẫu với trạng thái "Chờ xác nhận"
INSERT INTO orders (order_id, customer_id, user_id, order_date, price, status, is_shipping, payment_method_id)
VALUES 
  ('ORD2024001', 'CUST001', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '2 hours', 1500000, 'Chờ xác nhận', true, 'PM002'),
  ('ORD2024002', 'CUST002', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '1 hour', 850000, 'Chờ xác nhận', false, 'PM001'),
  ('ORD2024003', 'CUST003', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '30 minutes', 2300000, 'Chờ xác nhận', true, 'PM003'),
  ('ORD2024004', 'CUST004', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '15 minutes', 650000, 'Chờ xác nhận', false, 'PM001'),
  ('ORD2024005', 'CUST005', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '5 minutes', 1200000, 'Chờ xác nhận', true, 'PM004')
ON CONFLICT (order_id) DO NOTHING;

-- 5. Tạo đơn hàng mẫu với trạng thái "Đã xác nhận"
INSERT INTO orders (order_id, customer_id, user_id, order_date, price, status, is_shipping, payment_method_id)
VALUES 
  ('ORD2024006', 'CUST001', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '1 day', 980000, 'Đã xác nhận', true, 'PM002'),
  ('ORD2024007', 'CUST002', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '12 hours', 1450000, 'Đã xác nhận', false, 'PM001'),
  ('ORD2024008', 'CUST003', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '6 hours', 750000, 'Đã xác nhận', true, 'PM003')
ON CONFLICT (order_id) DO NOTHING;

-- 6. Tạo đơn hàng mẫu với trạng thái "Đã hủy"
INSERT INTO orders (order_id, customer_id, user_id, order_date, price, status, is_shipping, payment_method_id)
VALUES 
  ('ORD2024009', 'CUST004', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '2 days', 550000, 'Đã hủy', false, 'PM001'),
  ('ORD2024010', 'CUST005', (SELECT user_id FROM users LIMIT 1), NOW() - INTERVAL '1 day', 1800000, 'Đã hủy', true, 'PM002')
ON CONFLICT (order_id) DO NOTHING;

-- 7. Tạo chi tiết đơn hàng (orderdetails)
-- Giả sử có sản phẩm với product_id từ P001 đến P005

-- Chi tiết cho ORD2024001
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024001', (SELECT product_id FROM products LIMIT 1 OFFSET 0), 2, 500000),
  ('ORD2024001', (SELECT product_id FROM products LIMIT 1 OFFSET 1), 1, 500000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024002
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024002', (SELECT product_id FROM products LIMIT 1 OFFSET 2), 1, 850000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024003
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024003', (SELECT product_id FROM products LIMIT 1 OFFSET 0), 3, 500000),
  ('ORD2024003', (SELECT product_id FROM products LIMIT 1 OFFSET 3), 2, 400000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024004
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024004', (SELECT product_id FROM products LIMIT 1 OFFSET 4), 1, 650000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024005
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024005', (SELECT product_id FROM products LIMIT 1 OFFSET 1), 2, 600000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024006
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024006', (SELECT product_id FROM products LIMIT 1 OFFSET 2), 1, 980000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024007
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024007', (SELECT product_id FROM products LIMIT 1 OFFSET 0), 2, 725000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024008
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024008', (SELECT product_id FROM products LIMIT 1 OFFSET 3), 1, 750000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024009
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024009', (SELECT product_id FROM products LIMIT 1 OFFSET 4), 1, 550000)
ON CONFLICT DO NOTHING;

-- Chi tiết cho ORD2024010
INSERT INTO orderdetails (order_id, product_id, quantity, unit_price)
VALUES 
  ('ORD2024010', (SELECT product_id FROM products LIMIT 1 OFFSET 0), 3, 600000)
ON CONFLICT DO NOTHING;

-- 8. Tạo thông tin vận chuyển cho các đơn hàng có is_shipping = true
INSERT INTO shippings (shipping_id, order_id, shipping_address, carrier, shipping_cost, shipping_date, delivery_date, status)
VALUES 
  ('SHIP001', 'ORD2024001', '123 Đường Lê Lợi, Q1, TP.HCM', 'Giao Hàng Nhanh', 30000, NOW(), NULL, 'Chờ lấy hàng'),
  ('SHIP002', 'ORD2024003', '789 Đường Hai Bà Trưng, Q3, TP.HCM', 'Viettel Post', 35000, NOW(), NULL, 'Chờ lấy hàng'),
  ('SHIP003', 'ORD2024005', '654 Đường Võ Văn Tần, Q3, TP.HCM', 'J&T Express', 25000, NOW(), NULL, 'Chờ lấy hàng'),
  ('SHIP004', 'ORD2024006', '123 Đường Lê Lợi, Q1, TP.HCM', 'Giao Hàng Nhanh', 30000, NOW() - INTERVAL '1 day', NULL, 'Đang chuẩn bị'),
  ('SHIP005', 'ORD2024008', '789 Đường Hai Bà Trưng, Q3, TP.HCM', 'Viettel Post', 35000, NOW() - INTERVAL '6 hours', NULL, 'Đang chuẩn bị'),
  ('SHIP006', 'ORD2024010', '654 Đường Võ Văn Tần, Q3, TP.HCM', 'J&T Express', 25000, NOW() - INTERVAL '1 day', NULL, 'Đã hủy')
ON CONFLICT (shipping_id) DO NOTHING;

-- Hoàn thành! Bây giờ bạn có:
-- - 5 đơn hàng "Chờ xác nhận" (ORD2024001-005)
-- - 3 đơn hàng "Đã xác nhận" (ORD2024006-008)
-- - 2 đơn hàng "Đã hủy" (ORD2024009-010)
-- - Một số đơn có vận chuyển (is_shipping = true), một số không (is_shipping = false)

