import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs';

export async function POST(request: Request) {
  console.log('[sql-delete] Bắt đầu xử lý yêu cầu xóa người dùng');
  
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
      console.log('[sql-delete] Body request:', body);
    } catch (e) {
      console.error('[sql-delete] Lỗi parse JSON:', e);
      body = {};
    }
    
    const { userId, captcha } = body;

    // Validation
    if (!userId) {
      console.error('[sql-delete] User ID không được cung cấp');
      return NextResponse.json(
        { error: 'User ID không được để trống' },
        { status: 400, ...responseInit }
      )
    }
    
    if (captcha !== 'XACNHAN') {
      console.error('[sql-delete] Mã xác nhận không hợp lệ');
      return NextResponse.json(
        { error: 'Mã xác nhận không hợp lệ' },
        { status: 400, ...responseInit }
      )
    }

    // Lấy thông tin người dùng từ Supabase trước khi xóa
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Thiếu cấu hình Supabase');
    }
    
    // Tạo Supabase admin client
    const supabase = createServerClient(
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
    
    // Lấy thông tin người dùng
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (userError) {
      console.error('[sql-delete] Lỗi khi kiểm tra người dùng:', userError);
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra người dùng: ' + userError.message },
        { status: 500, ...responseInit }
      );
    }
    
    if (!userData) {
      console.error('[sql-delete] Không tìm thấy người dùng:', userId);
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404, ...responseInit }
      );
    }
    
    // Kiểm tra vai trò
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (accountError) {
      console.error('[sql-delete] Lỗi khi kiểm tra tài khoản:', accountError);
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra tài khoản: ' + accountError.message },
        { status: 500, ...responseInit }
      );
    }
    
    if (!accountData) {
      console.error('[sql-delete] Không tìm thấy tài khoản cho user_id:', userId);
      return NextResponse.json(
        { error: 'Không tìm thấy tài khoản cho người dùng này' },
        { status: 404, ...responseInit }
      );
    }
    
    if (accountData.role === 'admin') {
      console.error('[sql-delete] Không thể xóa tài khoản admin');
      return NextResponse.json(
        { error: 'Không thể xóa tài khoản admin' },
        { status: 400, ...responseInit }
      );
    }
    
    // Xử lý xóa tài khoản bằng query SQL trực tiếp
    try {
      // Xóa tài khoản sử dụng Supabase API
      console.log('[sql-delete] Đang xóa tài khoản với Supabase API...');
      const { error: deleteError } = await supabase
        .from('accounts')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('[sql-delete] Lỗi khi xóa tài khoản với Supabase API:', deleteError);
        throw deleteError;
      }
      
      console.log('[sql-delete] Xóa tài khoản thành công!');
      
      // Trả về thành công
      return NextResponse.json({
        success: true,
        message: `Đã xóa tài khoản đăng nhập của ${userData.full_name || 'người dùng'} thành công`
      }, responseInit);
      
    } catch (sqlError: any) {
      console.error('[sql-delete] Lỗi SQL:', sqlError);
      
      return NextResponse.json(
        { error: 'Lỗi khi xóa tài khoản: ' + (sqlError?.message || 'Lỗi không xác định') },
        { status: 500, ...responseInit }
      );
    }
    
  } catch (error: any) {
    console.error('[sql-delete] Lỗi tổng thể:', error);
    
    return NextResponse.json(
      { error: 'Lỗi hệ thống: ' + (error?.message || 'Lỗi không xác định') },
      { status: 500, ...responseInit }
    );
  }
} 