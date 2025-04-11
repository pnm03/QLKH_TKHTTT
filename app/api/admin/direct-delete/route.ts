import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs';

// API endpoint đơn giản để xóa tài khoản - sử dụng service role trực tiếp
export async function POST(request: Request) {
  console.log('[direct-delete] Bắt đầu xử lý yêu cầu xóa tài khoản');
  
  // Thiết lập CORS headers
  const origin = request.headers.get('origin')
  const responseInit = {
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store, max-age=0',
    },
  }
  
  // Xử lý OPTIONS request (preflight)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, responseInit)
  }
  
  try {
    // Parse body request
    let body;
    try {
      body = await request.json();
      console.log('[direct-delete] Body request:', body);
    } catch (e) {
      console.error('[direct-delete] Lỗi parse JSON:', e);
      body = {};
    }
    
    const { userId, captcha } = body;

    // Validation
    if (!userId) {
      console.error('[direct-delete] User ID không được cung cấp');
      return NextResponse.json(
        { error: 'User ID không được để trống' },
        { status: 400, ...responseInit }
      )
    }
    
    if (captcha !== 'XACNHAN') {
      console.error('[direct-delete] Mã xác nhận không hợp lệ');
      return NextResponse.json(
        { error: 'Mã xác nhận không hợp lệ' },
        { status: 400, ...responseInit }
      )
    }

    console.log('[direct-delete] Validation thành công, bắt đầu kết nối database');
    
    // Tạo admin client với service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[direct-delete] Thiếu thông tin cấu hình Supabase');
      throw new Error('Thiếu cấu hình Supabase');
    }
    
    console.log('[direct-delete] URL:', supabaseUrl);
    console.log('[direct-delete] Key length:', supabaseServiceKey.length);
    
    // Tạo client admin trực tiếp
    const adminClient = createServerClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {}
        }
      }
    );
    
    console.log('[direct-delete] Đã tạo admin client');
    
    try {
      // Xác minh thông tin người dùng
      const { data: userData, error: userError } = await adminClient
        .from('users')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (userError) {
        console.error('[direct-delete] Lỗi khi kiểm tra người dùng:', userError);
        return NextResponse.json(
          { error: 'Lỗi khi kiểm tra người dùng: ' + userError.message },
          { status: 500, ...responseInit }
        );
      }
      
      if (!userData) {
        console.error('[direct-delete] Không tìm thấy người dùng:', userId);
        return NextResponse.json(
          { error: 'Không tìm thấy người dùng' },
          { status: 404, ...responseInit }
        );
      }
      
      const fullName = userData.full_name || 'người dùng';
      console.log('[direct-delete] Đã tìm thấy người dùng:', fullName);
      
      // Kiểm tra vai trò
      const { data: accountData, error: accountError } = await adminClient
        .from('accounts')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (accountError) {
        console.error('[direct-delete] Lỗi khi kiểm tra tài khoản:', accountError);
        return NextResponse.json(
          { error: 'Lỗi khi kiểm tra tài khoản: ' + accountError.message },
          { status: 500, ...responseInit }
        );
      }
      
      if (!accountData) {
        console.error('[direct-delete] Không tìm thấy tài khoản cho user_id:', userId);
        return NextResponse.json(
          { error: 'Không tìm thấy tài khoản cho người dùng này', isSuccess: false },
          { status: 200, ...responseInit }
        );
      }
      
      if (accountData.role === 'admin') {
        console.error('[direct-delete] Không thể xóa tài khoản admin');
        return NextResponse.json(
          { error: 'Không thể xóa tài khoản admin', isSuccess: false },
          { status: 200, ...responseInit }
        );
      }
      
      console.log('[direct-delete] Tiến hành xóa tài khoản cho:', userId);
      
      // Thực hiện xóa tài khoản 
      const { error: deleteError } = await adminClient
        .from('accounts')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('[direct-delete] Lỗi khi xóa tài khoản:', deleteError);
        return NextResponse.json(
          { error: 'Lỗi khi xóa tài khoản: ' + deleteError.message, isSuccess: false },
          { status: 200, ...responseInit }
        );
      }
      
      console.log('[direct-delete] Xóa thành công tài khoản của:', fullName);
      
      // Trả về thành công
      return NextResponse.json({
        success: true,
        isSuccess: true,
        message: `Đã xóa tài khoản của ${fullName} thành công`
      }, responseInit);
      
    } catch (err: any) {
      console.error('[direct-delete] Lỗi khi xử lý yêu cầu:', err);
      return NextResponse.json(
        { error: 'Lỗi khi xử lý yêu cầu: ' + (err?.message || 'Lỗi không xác định'), isSuccess: false },
        { status: 200, ...responseInit }
      );
    }
    
  } catch (error: any) {
    console.error('[direct-delete] Lỗi tổng thể:', error);
    return NextResponse.json(
      { error: 'Lỗi hệ thống: ' + (error?.message || 'Lỗi không xác định'), isSuccess: false },
      { status: 200, ...responseInit }
    );
  }
} 