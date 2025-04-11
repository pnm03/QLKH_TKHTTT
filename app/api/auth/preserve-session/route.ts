import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API endpoint đơn giản giúp duy trì phiên và refresh cookie
 * Được gọi trước khi thực hiện các thao tác quan trọng từ client
 */
export async function GET(request: NextRequest) {
  console.log('Preserve session API được gọi từ:', request.headers.get('referer') || 'unknown');
  
  // Kiểm tra nếu là yêu cầu preflight CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // Thiết lập các header chuẩn để tránh cache
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  };
  
  try {
    // Lấy cookies hiện tại
    const cookieStore = cookies();
    
    // Kiểm tra trình duyệt và request headers
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log('User-Agent:', userAgent);
    
    // Khởi tạo Supabase client với cookies hiện tại
    const supabase = await createClient(cookieStore);
    
    // Kiểm tra phiên làm việc hiện tại
    console.log('Đang kiểm tra phiên làm việc trong preserve-session...');
    let { data, error } = await supabase.auth.getSession();
    
    // Nếu có lỗi hoặc không có phiên, thử refresh session
    if (error || !data.session) {
      console.log('Không tìm thấy phiên hợp lệ, thử refresh token...');
      
      try {
        // Thử refresh phiên sử dụng token hiện có
        const refreshResult = await supabase.auth.refreshSession();

        if (refreshResult.error) {
          console.error('Lỗi khi refresh token:', refreshResult.error.message);
          throw refreshResult.error;
        }

        if (refreshResult.data?.session) {
          // Nếu refresh thành công, cập nhật data
          data = refreshResult.data;
          console.log('Refresh token thành công, phiên mới có hiệu lực');
          
          // Trả về thông tin cơ bản về phiên đã refresh
          return NextResponse.json(
            {
              status: 'success',
              message: 'Phiên đăng nhập đã được làm mới',
              refreshed: true,
              user_email: refreshResult.data.session.user.email,
              user_id: refreshResult.data.session.user.id,
              expires_at: refreshResult.data.session.expires_at,
              timestamp: new Date().toISOString()
            },
            {
              headers
            }
          );
        }
      } catch (refreshError) {
        console.error('Lỗi khi refresh token:', refreshError);
      }
    }
    
    if (error) {
      console.error('Lỗi khi lấy phiên trong preserve-session:', error.message);
      return NextResponse.json(
        { 
          error: 'session_error', 
          message: 'Không thể lấy thông tin phiên: ' + error.message,
          status: 'error',
          timestamp: new Date().toISOString(),
          code: 'AUTH_SESSION_ERROR'
        }, 
        { 
          status: 500,
          headers
        }
      );
    }
    
    if (!data.session) {
      console.log('Không tìm thấy phiên hợp lệ trong preserve-session');
      return NextResponse.json(
        { 
          error: 'no_session', 
          message: 'Không có phiên đăng nhập hợp lệ hoặc phiên đã hết hạn',
          status: 'error',
          timestamp: new Date().toISOString(),
          code: 'AUTH_NO_SESSION'
        }, 
        { 
          status: 401,
          headers
        }
      );
    }
    
    // Log thông tin phiên hợp lệ
    console.log('Phiên hợp lệ cho user:', data.session.user.email);
    
    // Trả về thông tin cơ bản về phiên
    return NextResponse.json(
      {
        status: 'success',
        message: 'Phiên đăng nhập hợp lệ',
        user_email: data.session.user.email,
        user_id: data.session.user.id,
        expires_at: data.session.expires_at,
        timestamp: new Date().toISOString()
      },
      {
        headers
      }
    );
    
  } catch (error: any) {
    console.error('Lỗi không xử lý được khi preserve session:', error);
    return NextResponse.json(
      { 
        error: 'server_error', 
        message: error.message || 'Lỗi server không xác định',
        status: 'error',
        timestamp: new Date().toISOString(),
        code: 'SERVER_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { 
        status: 500,
        headers
      }
    );
  }
}

// Thêm handler OPTIONS để xử lý các yêu cầu CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 