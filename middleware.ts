import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

// Danh sach cac route cong khai (khong can dang nhap)
const publicRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/forgot-password',
  '/auth/verify',
  '/debug',
  '/api/auth/callback',
  '/api/auth',
  '/api/auth/check-session',
  '/api/auth/preserve-session',
  '/api/admin/create-user',
  '/dashboard/profile',
  '/dashboard/sales/create'
];

// Kiem tra xem URL co phai la tai nguyen tinh hay khong
function isStaticResource(pathname: string): boolean {
  return pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon') || 
    pathname.startsWith('/images') || 
    pathname.startsWith('/fonts') || 
    pathname.endsWith('.png') || 
    pathname.endsWith('.jpg') || 
    pathname.endsWith('.jpeg') || 
    pathname.endsWith('.svg') || 
    pathname.endsWith('.ico') ||
    pathname.includes('_next/static') ||
    pathname.includes('_next/image') ||
    pathname.includes('_next/data');
}

// Kiểm tra xem URL có param để tạm bỏ qua xác thực không
function hasAuthBypassParams(url: URL): boolean {
  const loginSuccess = url.searchParams.get('login_success');
  const bypass = url.searchParams.get('bypass_auth');
  const ts = url.searchParams.get('ts');
  const auto = url.searchParams.get('auto');
  const isNewAccount = url.searchParams.get('type');
  const hasToken = url.searchParams.get('token');

  // Cho phép bypass xác thực nếu có tham số bypass_auth hoặc login_success
  // Hoặc nếu có tham số ts (timestamp) và thời gian không quá 10 phút
  // Hoặc nếu có tham số auto (tự động refresh)
  // Hoặc nếu là tài khoản mới (type=new)
  // Hoặc nếu có token (cho reset password)
  return (
    loginSuccess === 'true' || 
    bypass === 'true' ||
    auto === 'true' ||
    isNewAccount === 'new' ||
    !!hasToken ||
    (!!ts && !isNaN(parseInt(ts)) && (Date.now() - parseInt(ts)) < 10 * 60 * 1000)
  );
}

// Kiểm tra nếu đường dẫn là API route
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Middleware xac thuc
 * Kiem tra phien dang nhap va chuyen huong nguoi dung neu chua dang nhap
 */
export async function middleware(request: NextRequest) {
  // Debug route - Log ra headers và cookies
  if (request.nextUrl.pathname === '/debug-auth') {
    console.log('DEBUG AUTH - Headers:', [...request.headers.entries()]);
    console.log('DEBUG AUTH - Cookies:', [...request.cookies.getAll()]);
    return NextResponse.json({
      message: 'Debug info logged to console',
      headers: Object.fromEntries([...request.headers.entries()]),
      cookies: request.cookies.getAll().map(c => c.name)
    });
  }

  // Bo qua cac tai nguyen tinh
  if (isStaticResource(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Kiểm tra tham số URL đặc biệt
  const urlParams = request.nextUrl.searchParams;
  
  // Kiểm tra nếu có tham số logout=true, bỏ qua auth check
  if (urlParams.get('logout') === 'true') {
    console.log('Đã đăng xuất, bỏ qua kiểm tra xác thực');
    const response = NextResponse.next();
    response.headers.set('X-Auth-Logout', 'true');
    return response;
  }
  
  // Kiểm tra nếu có tham số noRedirect=true, bỏ qua chuyển hướng auth
  if (urlParams.get('noRedirect') === 'true') {
    console.log('Tham số noRedirect, bỏ qua kiểm tra xác thực');
    return NextResponse.next();
  }

  // Đặc biệt cho các trang dashboard
  if (request.nextUrl.pathname.includes('/dashboard')) {
    console.log('Route dashboard - cho phép truy cập mà không cần kiểm tra phiên');
    return NextResponse.next();
  }

  // Kiem tra xem route hien tai co phai route cong khai khong
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname === route ||
    request.nextUrl.pathname.startsWith(`${route}/`) ||
    request.nextUrl.pathname.includes('auth/callback')
  );

  // Đặc biệt cho trang reset-password: khi có token, luôn coi là route công khai
  if (request.nextUrl.pathname.startsWith('/auth/reset-password') && request.nextUrl.searchParams.get('token')) {
    console.log('Reset password page with token - allowing access without session check');
    return NextResponse.next();
  }

  // Log thông tin route cho debug
  console.log('Current route:', request.nextUrl.pathname, 'Is public:', isPublicRoute);

  // Neu la route cong khai, cho phep truy cap khong can kiem tra
  if (isPublicRoute) {
    // Đặc biệt xử lý cho API endpoint
    if (isApiRoute(request.nextUrl.pathname)) {
      console.log('API route công khai, cho phép truy cập không cần session');
      const response = NextResponse.next();
      response.headers.set('X-Public-API', 'true');
      return response;
    }
    return NextResponse.next();
  }

  // Kiểm tra đặc biệt cho trang signin có tham số redirectTo
  if (request.nextUrl.pathname.includes('/auth/signin') && urlParams.get('redirectTo')) {
    console.log('Đang ở trang đăng nhập với tham số redirectTo, bỏ qua kiểm tra xác thực');
    return NextResponse.next();
  }
  
  // Cho phép bypass xác thực nếu có tham số bypass
  if (hasAuthBypassParams(request.nextUrl)) {
    return NextResponse.next();
  }

  try {
    // Lay phien dang nhap tu cookie
    const { supabase, response } = createClient(request);
    const { data, error } = await supabase.auth.getSession();

    // Ghi log để debug
    if (error) {
      console.error('Loi khi lay session:', error.message);
    }

    // Neu co phien, cho phep truy cap
    if (data?.session) {
      console.log('Session hop le cho:', data.session.user.email);
      
      // Them header để client side có thể biết về session hiện tại
      const modified = NextResponse.next();
      
      // Copy tất cả cookies từ response ban đầu
      response.cookies.getAll().forEach(cookie => {
        modified.cookies.set(cookie.name, cookie.value, cookie);
      });
      
      // Them header X-Session-Valid để client-side JavaScript biết rằng user đã đăng nhập
      modified.headers.set('X-Session-Valid', 'true');
      
      // Kiểm tra xem người dùng có cần đổi mật khẩu không
      const requirePasswordChange = data.session.user.user_metadata?.require_password_change === true;

      // Nếu cần đổi mật khẩu và không phải đang ở trang đổi mật khẩu hoặc reset password
      if (requirePasswordChange && 
          !request.nextUrl.pathname.startsWith('/auth/change-password') && 
          !request.nextUrl.pathname.startsWith('/auth/reset-password') && 
          !request.nextUrl.pathname.startsWith('/auth/verify') && 
          !request.nextUrl.pathname.startsWith('/api/')) {
        
        // Kiểm tra đặc biệt cho trang reset-password với tham số type=new
        if (request.nextUrl.pathname.startsWith('/auth/reset-password') && 
            request.nextUrl.searchParams.get('type') === 'new') {
          console.log('Cho phép trang reset-password với tham số type=new');
          return modified;
        }
        
        // Chuyển đến trang đổi mật khẩu
        return NextResponse.redirect(new URL('/auth/reset-password', request.url));
      }
      
      return modified;
    }
    
    // Kiem tra them header Authorization neu co
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Co token Bearer, cho phep truy cap
      return NextResponse.next();
    }

    // Kiem tra them cookie hết hạn auth
    const sbAccessToken = request.cookies.get('sb-access-token');
    const sbRefreshToken = request.cookies.get('sb-refresh-token');
    
    if (sbAccessToken || sbRefreshToken) {
      console.log('Tìm thấy token nhưng session không hợp lệ, thử refresh...');
      
      // Kiểm tra xem đã thử refresh token trước đó chưa để tránh vòng lặp
      // Dùng searchParams để kiểm tra
      const hasTriedRefresh = urlParams.get('tried_refresh') === 'true';
      const isAutomatic = urlParams.get('auto') === 'true';
      const noLoop = urlParams.get('noLoop') === 'true';
      
      if (hasTriedRefresh || isAutomatic || noLoop) {
        console.log('Đã thử refresh trước đó hoặc có tham số noLoop, bỏ qua để tránh vòng lặp');
        // Cho phép truy cập để tránh vòng lặp
        // Phía client-side sẽ xử lý chuyển hướng nếu cần
        return NextResponse.next();
      }
      
      // Thêm đường dẫn redirect tự động
      const authRefreshUrl = new URL('/api/auth/refresh', request.url);
      authRefreshUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
      authRefreshUrl.searchParams.set('tried_refresh', 'true');
      authRefreshUrl.searchParams.set('ts', Date.now().toString());
      
      // Chuyển hướng đến API refresh
      return NextResponse.redirect(authRefreshUrl);
    }

    // Neu khong co phien, KHÔNG chuyển hướng đến trang đăng nhập cho dashboard
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      console.log('Không có phiên nhưng là trang dashboard, cho phép truy cập');
      return NextResponse.next();
    }

    // Xử lý đặc biệt cho API routes
    if (isApiRoute(request.nextUrl.pathname)) {
      console.log('API route without valid session:', request.nextUrl.pathname);
      
      // Trả về lỗi 401 Unauthorized thay vì chuyển hướng cho API routes
      // Kiểm tra xem API route có thuộc danh sách public không
      if (publicRoutes.some(route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/'))) {
        console.log('API route được cho phép truy cập công khai, bỏ qua kiểm tra session');
        const response = NextResponse.next();
        response.headers.set('X-Public-API', 'true');
        return response;
      }
      
      // Trả về lỗi 401 Unauthorized thay vì chuyển hướng
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Session không hợp lệ hoặc đã hết hạn',
          path: request.nextUrl.pathname,
          timestamp: new Date().toISOString(),
          code: 'AUTH_REQUIRED'
        }, 
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Neu khong co phien, chuyển hướng đến trang dang nhap cho các trang khác
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
    signInUrl.searchParams.set('noLoop', 'true'); // Thêm tham số để tránh vòng lặp
    signInUrl.searchParams.set('ts', Date.now().toString());
    
    // Log thông tin để debug
    console.log('Chuyển hướng đến trang đăng nhập:', signInUrl.toString());
    
    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error('Loi trong middleware:', error);

    // Neu co loi, cho phep truy cap de tranh loi lap
    return NextResponse.next();
  }
}

// Chi ap dung middleware cho cac route can thiet
export const config = {
  matcher: [
    /*
     * Khớp tất cả các request trừ những request đến:
     * - api routes (/api/*)
     * - static files (/_next/static/*, favicon.ico, images/*, etc.)
     * - TRICKY next static files (/_next/image/*, /_next/webpack-hmr/*, etc.)
     * - TRICKY utils supabase (/_supabase/*)
     * - home page (/)
     * - khác: _vercel, robots.txt, sitemap, .well-known
     */
    "/((?!_next/static|_next/image|_next/webpack-hmr|_supabase|api/auth|api/delete-user|api/delete-user-only|api/delete-user-full|api/get-user-info|favicon.ico|images|assets|$|robots.txt|sitemap.xml|.well-known).*)",
    "/dashboard/:path*",
  ],
};
