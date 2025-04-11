import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  console.log('API check-session được gọi từ:', request.headers.get('referer') || 'unknown');
  
  try {
    // Lấy cookies để khởi tạo Supabase client
    const cookieStore = cookies();
    // Không cần log cookie ở đây vì có thể gây lỗi
    
    const supabase = createClient(cookieStore);
    
    // Lấy session
    console.log('Đang lấy session...');
    const { data, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Lỗi khi lấy session từ Supabase:', sessionError);
      return NextResponse.json({ 
        error: 'session_error', 
        message: 'Lỗi khi lấy thông tin session: ' + sessionError.message
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!data.session) {
      console.log('Không tìm thấy session hợp lệ');
      return NextResponse.json({ 
        error: 'no_session', 
        message: 'Không có phiên đăng nhập hợp lệ',
        authenticated: false
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Tìm thấy session hợp lệ cho user:', data.session.user.email);
    
    // Nếu có session, lấy thêm thông tin người dùng từ bảng accounts
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('role, status')
      .eq('user_id', data.session.user.id)
      .maybeSingle();
      
    if (accountError) {
      console.error('Lỗi khi lấy thông tin tài khoản từ database:', accountError);
      return NextResponse.json({ 
        error: 'account_error', 
        message: 'Lỗi khi lấy thông tin tài khoản: ' + accountError.message,
        authenticated: true,
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          metadata: data.session.user.user_metadata
        }
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Tìm thấy thông tin tài khoản với vai trò:', accountData?.role || 'không xác định');
    
    // Trả về thông tin session và tài khoản
    return NextResponse.json({
      authenticated: true,
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        role: accountData?.role || null,
        status: accountData?.status || null,
        metadata: data.session.user.user_metadata
      },
      expires_at: data.session.expires_at
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    console.error('Exception không xử lý được khi kiểm tra session:', error);
    return NextResponse.json({ 
      error: 'server_error', 
      message: error.message || 'Lỗi server không xác định',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  }
} 