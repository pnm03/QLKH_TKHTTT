-- Tạo hàm xóa người dùng theo ID
CREATE OR REPLACE FUNCTION public.delete_user(user_id_to_delete uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- -- Xóa trong bảng accounts trước (vì nó có foreign key đến users)
  -- DELETE FROM public.accounts
  -- WHERE user_id = user_id_to_delete;
  
  -- Xóa trong bảng users
  DELETE FROM public.users
  WHERE user_id = user_id_to_delete;

  -- -- Xóa trong bảng auth.users (Supabase Auth)
  -- DELETE FROM auth.users
  -- WHERE id = user_id_to_delete;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Trả về true nếu có bản ghi nào bị ảnh hưởng
  RETURN affected_rows > 0;
END;
$$;

-- Cấp quyền thực thi hàm này cho authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user TO authenticated;

-- Thêm RLS policy để đảm bảo chỉ admin mới có thể sử dụng function này
CREATE POLICY delete_user_admin_only
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