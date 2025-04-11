import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs';

// API endpoint đơn giản để xóa tài khoản
export async function POST(request: Request) {
  console.log('[inline-delete] Nhận yêu cầu xóa tài khoản');
  
  // Thiết lập CORS headers
  const origin = request.headers.get('origin')
  const responseInit = {
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      console.log('[inline-delete] Request body:', body);
    } catch (e) {
      console.error('[inline-delete] Lỗi parse JSON:', e);
      body = {};
    }
    
    const { userId, captcha } = body;

    // Validation
    if (!userId) {
      console.error('[inline-delete] Lỗi: User ID không được để trống');
      return NextResponse.json(
        { error: 'User ID không được để trống' },
        { status: 400, ...responseInit }
      )
    }
    
    if (captcha !== 'XACNHAN') {
      console.error('[inline-delete] Lỗi: Mã xác nhận không hợp lệ');
      return NextResponse.json(
        { error: 'Mã xác nhận không hợp lệ' },
        { status: 400, ...responseInit }
      )
    }

    console.log('[inline-delete] Đang tạo admin client');
    
    // Tạo admin client với service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[inline-delete] Thiếu biến môi trường:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      throw new Error('Thiếu cấu hình Supabase');
    }
    
    console.log('[inline-delete] Đã có đủ thông tin cấu hình');
    
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
    
    console.log('[inline-delete] Đã tạo admin client thành công');
    
    try {
      // Kiểm tra nếu người dùng cần xóa tồn tại
      console.log('[inline-delete] Đang kiểm tra thông tin người dùng:', userId);
      const { data: targetUser, error: targetError } = await adminClient
        .from('users')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (targetError) {
        console.error('[inline-delete] Lỗi khi kiểm tra người dùng cần xóa:', targetError);
        return NextResponse.json(
          { error: 'Không thể xác minh người dùng cần xóa: ' + targetError.message },
          { status: 500, ...responseInit }
        );
      }
      
      if (!targetUser) {
        console.error('[inline-delete] Không tìm thấy người dùng cần xóa:', userId);
        return NextResponse.json(
          { error: 'Không tìm thấy người dùng cần xóa' },
          { status: 404, ...responseInit }
        );
      }
      
      console.log('[inline-delete] Đã tìm thấy người dùng:', targetUser.full_name);
      
      // Kiểm tra xem người dùng cần xóa có phải là admin không
      console.log('[inline-delete] Đang kiểm tra vai trò của người dùng');
      const { data: targetAccountData, error: targetAccountError } = await adminClient
        .from('accounts')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (targetAccountError) {
        console.error('[inline-delete] Lỗi khi kiểm tra quyền của người dùng:', targetAccountError);
        return NextResponse.json(
          { error: 'Không thể xác minh quyền của người dùng cần xóa: ' + targetAccountError.message },
          { status: 500, ...responseInit }
        );
      }
      
      console.log('[inline-delete] Thông tin vai trò:', targetAccountData);
      
      if (targetAccountData?.role === 'admin') {
        console.error('[inline-delete] Không thể xóa tài khoản admin');
        return NextResponse.json(
          { error: 'Không thể xóa tài khoản admin' },
          { status: 400, ...responseInit }
        );
      }
      
      // Xóa từ bảng accounts
      console.log('[inline-delete] Bắt đầu xóa tài khoản từ bảng accounts');
      
      // Thực hiện xóa
      const { error: deleteError } = await adminClient
        .from('accounts')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('[inline-delete] Lỗi khi xóa tài khoản:', deleteError);
        return NextResponse.json(
          { error: 'Không thể xóa tài khoản: ' + deleteError.message },
          { status: 500, ...responseInit }
        );
      }
      
      console.log('[inline-delete] Đã xóa tài khoản thành công');
      
      // Trả về kết quả thành công
      return NextResponse.json({
        success: true,
        message: `Đã xóa tài khoản đăng nhập của ${targetUser.full_name || 'người dùng'} thành công`
      }, responseInit);
      
    } catch (dbError: any) {
      console.error('[inline-delete] Lỗi khi truy vấn database:', dbError);
      return NextResponse.json(
        { error: 'Lỗi khi truy vấn cơ sở dữ liệu: ' + (dbError?.message || 'Lỗi không xác định') },
        { status: 500, ...responseInit }
      );
    }
  } catch (error: any) {
    console.error('[inline-delete] Lỗi server tổng thể:', error);
    
    return NextResponse.json(
      { error: 'Lỗi server: ' + (error?.message || 'Lỗi không xác định') },
      { status: 500, ...responseInit }
    );
  }
} 