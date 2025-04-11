import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: NextRequest) {
  try {
    // Tạo client Supabase
    const supabase = createRouteHandlerClient({ cookies });

    // Thực hiện đăng xuất
    await supabase.auth.signOut();

    // Thiết lập response với header đặc biệt
    const response = NextResponse.json({ 
      success: true,
      message: 'Đã đăng xuất thành công',
      intentional: true
    });
    
    // Thêm header đánh dấu đăng xuất có chủ ý và ngăn cache
    response.headers.set('X-Auth-Intentional-Logout', 'true');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    // Xóa cookies bằng cách set lại cùng tên với thời gian hết hạn 
    const cookieNames = ['sb-access-token', 'sb-refresh-token'];
    cookieNames.forEach(name => {
      response.cookies.set({
        name,
        value: '',
        expires: new Date(0),
        path: '/',
      });
    });
    
    return response;
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đăng xuất' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
} 