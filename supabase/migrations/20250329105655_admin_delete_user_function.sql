-- Tạo hàm admin_delete_user để xóa người dùng trực tiếp từ auth.users
CREATE OR REPLACE FUNCTION public.admin_delete_user(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Function thực thi với quyền của người tạo ra nó (SUPERUSER)
AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- Xóa trong bảng auth.users trực tiếp (Supabase Auth)
  DELETE FROM accounts
  WHERE id = uid;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Trả về true nếu có bản ghi nào bị ảnh hưởng
  RETURN affected_rows > 0;
END;
$$;

-- Cấp quyền thực thi hàm này cho authenticated users
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;

-- Thêm RLS policy để đảm bảo chỉ admin mới có thể sử dụng function này
CREATE POLICY admin_delete_user_admin_only
  ON public.users
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1
      FROM public.accounts
      WHERE accounts.user_id = auth.uid()
        AND accounts.role = 'admin'
    )
  );
