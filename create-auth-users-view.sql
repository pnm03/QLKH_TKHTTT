-- Tạo RLS policy cho auth.users view
CREATE OR REPLACE VIEW auth_users_view AS
SELECT id, email, created_at, last_sign_in_at
FROM auth.users;

-- Cấp quyền truy cập cho authenticated users
GRANT SELECT ON auth_users_view TO authenticated;

-- Tạo RLS policy để đảm bảo admin chỉ có thể xem tất cả người dùng
CREATE POLICY admin_view_users
  ON auth_users_view
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE accounts.user_id = auth.uid() 
      AND accounts.role = 'admin'
    )
  );

-- Tạo RLS policy để người dùng thông thường chỉ xem được thông tin của chính họ
CREATE POLICY self_view_users
  ON auth_users_view
  FOR SELECT
  USING (id = auth.uid());

-- Bật RLS cho view
ALTER VIEW auth_users_view ENABLE ROW LEVEL SECURITY; 