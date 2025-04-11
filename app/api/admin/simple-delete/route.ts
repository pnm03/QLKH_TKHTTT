import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// API endpoint siêu đơn giản để xóa tài khoản - không xác thực
export async function POST(request: Request) {
  console.log('[simple-delete] Nhận yêu cầu xóa tài khoản');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  try {
    // Parse body request
    let body;
    try {
      body = await request.json();
      console.log('[simple-delete] Request body:', body);
    } catch (e) {
      console.error('[simple-delete] Lỗi parse JSON:', e);
      return NextResponse.json({ error: 'Lỗi khi đọc dữ liệu' }, { status: 400 });
    }
    
    const { userId } = body;
    if (!userId) {
      console.error('[simple-delete] Thiếu user_id');
      return NextResponse.json({ error: 'Thiếu user_id' }, { status: 400 });
    }
    
    console.log('[simple-delete] Đang xóa tài khoản cho user_id:', userId);
    console.log('[simple-delete] SUPABASE_URL:', supabaseUrl);
    console.log('[simple-delete] SERVICE_ROLE_KEY đã được cấu hình:', !!supabaseKey);

    // Sử dụng direct SQL để xóa
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Xóa tài khoản từ bảng accounts
    console.log('[simple-delete] Đang thực hiện xóa từ bảng accounts...');
    
    const { data, error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('[simple-delete] Lỗi khi xóa:', deleteError);
      return NextResponse.json({ 
        error: 'Lỗi khi xóa tài khoản: ' + deleteError.message,
        details: deleteError
      }, { status: 500 });
    }
    
    console.log('[simple-delete] Xóa tài khoản thành công!');
    
    // Trả về thành công
    return NextResponse.json({
      success: true,
      message: `Đã xóa tài khoản đăng nhập thành công`
    });
    
  } catch (error: any) {
    console.error('[simple-delete] Lỗi:', error);
    return NextResponse.json({ 
      error: 'Lỗi hệ thống: ' + (error?.message || 'Lỗi không xác định'),
      stack: error?.stack,
      details: error
    }, { status: 500 });
  }
} 