import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra xem có phải URL dashboard không
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const timestamp = request.nextUrl.searchParams.get('ts') || Date.now().toString();
    
    // Nếu là trang dashboard, trả về trang đó luôn không chuyển hướng login
    if (redirectUrl.includes('/dashboard')) {
      console.log('Phát hiện trang dashboard, không chuyển hướng đến trang đăng nhập');
      
      // Thêm timestamp để tránh cache
      const finalRedirectUrl = new URL(redirectUrl, request.url);
      finalRedirectUrl.searchParams.set('ts', timestamp);
      finalRedirectUrl.searchParams.set('bypass_auth', 'true');
      
      return NextResponse.redirect(finalRedirectUrl);
    }
    
    // Lấy cookies hiện tại
    const cookieStore = cookies();
    
    // Kiểm tra access token và refresh token qua request cookies
    const accessToken = request.cookies.get('sb-access-token');
    const refreshToken = request.cookies.get('sb-refresh-token');
    
    // Nếu không có token nào và là trang dashboard, trả về trang đó luôn không chuyển hướng login
    if ((!accessToken && !refreshToken) && redirectUrl.includes('/dashboard')) {
      console.log('Không tìm thấy token trong cookies, nhưng là trang dashboard');
      
      const finalRedirectUrl = new URL(redirectUrl, request.url);
      finalRedirectUrl.searchParams.set('bypass_auth', 'true');
      finalRedirectUrl.searchParams.set('ts', timestamp);
      
      return NextResponse.redirect(finalRedirectUrl);
    }
    
    // Nếu không có token nào và không phải dashboard, đi đến trang đăng nhập
    if (!accessToken && !refreshToken && !redirectUrl.includes('/dashboard')) {
      console.log('Không tìm thấy token trong cookies, chuyển hướng đến trang đăng nhập');
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('redirectTo', redirectUrl);
      signInUrl.searchParams.set('noLoop', 'true');
      signInUrl.searchParams.set('ts', timestamp);
      
      return NextResponse.redirect(signInUrl);
    }
    
    // Tạo supabase client từ cookies
    const supabase = createClient(cookieStore);
    
    // Thử refresh session
    const { data, error } = await supabase.auth.getSession();
    
    if (error && redirectUrl.includes('/dashboard')) {
      console.error('Lỗi refresh token cho trang dashboard:', error.message);
      
      // Nếu là trang dashboard, trả về trang đó luôn không chuyển hướng login
      const finalRedirectUrl = new URL(redirectUrl, request.url);
      finalRedirectUrl.searchParams.set('bypass_auth', 'true');
      finalRedirectUrl.searchParams.set('ts', timestamp);
      
      return NextResponse.redirect(finalRedirectUrl);
    }
    
    if (error && !redirectUrl.includes('/dashboard')) {
      console.error('Lỗi refresh token:', error.message);
      
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('expired', 'true');
      signInUrl.searchParams.set('redirectTo', redirectUrl);
      signInUrl.searchParams.set('noLoop', 'true');
      signInUrl.searchParams.set('ts', timestamp);
      
      return NextResponse.redirect(signInUrl);
    }
    
    if (data?.session) {
      console.log('Session đã được refresh thành công');
      
      // Thêm timestamp để tránh cache và các tham số bypass cho middleware
      const finalRedirectUrl = new URL(redirectUrl, request.url);
      
      // Đảm bảo các tham số cần thiết được thêm vào URL
      finalRedirectUrl.searchParams.set('login_success', 'true');
      finalRedirectUrl.searchParams.set('ts', timestamp);
      finalRedirectUrl.searchParams.set('bypass_auth', 'true');
      
      // Tạo response để chuyển hướng
      const response = NextResponse.redirect(finalRedirectUrl);
      
      // Thêm header đặc biệt để client biết đã refresh thành công
      response.headers.set('X-Auth-Refreshed', 'true');
      
      return response;
    }
    
    // Nếu không có session và là trang dashboard, trả về trang đó không chuyển hướng
    if (redirectUrl.includes('/dashboard')) {
      console.log('Không có session nhưng là trang dashboard, trả về trang gốc');
      
      const finalRedirectUrl = new URL(redirectUrl, request.url);
      finalRedirectUrl.searchParams.set('bypass_auth', 'true');
      finalRedirectUrl.searchParams.set('ts', timestamp);
      
      return NextResponse.redirect(finalRedirectUrl);
    }
    
    // Nếu không có session và không phải dashboard, chuyển hướng về trang đăng nhập
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('expired', 'true');
    signInUrl.searchParams.set('redirectTo', redirectUrl);
    signInUrl.searchParams.set('noLoop', 'true');
    signInUrl.searchParams.set('ts', timestamp);
    
    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error('Lỗi xử lý refresh token:', error);
    
    // Lấy redirect URL
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    
    // Nếu là trang dashboard, trả về trang gốc không chuyển hướng login
    if (redirectUrl.includes('/dashboard')) {
      const finalRedirectUrl = new URL(redirectUrl, request.url);
      finalRedirectUrl.searchParams.set('bypass_auth', 'true');
      finalRedirectUrl.searchParams.set('ts', Date.now().toString());
      
      return NextResponse.redirect(finalRedirectUrl);
    }
    
    // Nếu không phải dashboard, chuyển hướng về trang đăng nhập
    return NextResponse.redirect(new URL('/auth/signin?error=refresh_failed&noLoop=true', request.url));
  }
}

// Thêm hàm POST để xử lý form submit nếu cần
export async function POST(request: NextRequest) {
  return GET(request);
} 