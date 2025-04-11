-- Cấu hình Auth.email_domains để chấp nhận tất cả các domain email
UPDATE auth.config
SET email_domain_allowlist = null
WHERE id = 1;

-- Hoặc để chỉ chấp nhận một số domain cụ thể, hãy sử dụng:
-- UPDATE auth.config
-- SET email_domain_allowlist = ARRAY['example.com', 'test.com', 'yourdomain.com']
-- WHERE id = 1;

-- Đảm bảo email_confirm được đặt thành false nếu bạn không muốn xác nhận email
-- UPDATE auth.config
-- SET email_confirm_email_changes = false
-- WHERE id = 1; 