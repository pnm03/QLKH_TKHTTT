import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Xử lý token từ Supabase và đổi lấy session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Lỗi khi trao đổi code:', error.message);
      
      // Nếu có lỗi, chuyển hướng đến trang đăng nhập
      return NextResponse.redirect(new URL('/auth/signin?error=auth_callback_error', request.url));
    }
    
    // Nếu thành công và người dùng cần đổi mật khẩu, chuyển thẳng đến trang đổi mật khẩu
    if (data?.session && data.session.user.user_metadata?.require_password_change === true) {
      // Cập nhật trạng thái tài khoản thành active
      try {
        await supabase
          .from('accounts')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', data.session.user.id);
      } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái tài khoản:', error);
      }
      
      // Chuyển hướng trực tiếp đến trang đổi mật khẩu
      return NextResponse.redirect(new URL('/auth/change-password', request.url));
    }
    
    // Nếu không cần đổi mật khẩu, chuyển về dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Nếu không có code, chuyển hướng đến trang đăng nhập
  console.error('Không có code trong URL callback');
  return NextResponse.redirect(new URL('/auth/signin?error=missing_code', request.url));
} 