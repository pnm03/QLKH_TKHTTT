import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// API endpoint đơn giản chỉ xóa user_id từ bảng accounts
export async function POST(request: Request) {
  console.log('[delete-user] Nhận yêu cầu xóa tài khoản');
  
  try {
    // Parse body request
    let body;
    try {
      body = await request.json();
      console.log('[delete-user] Request body:', body);
    } catch (e) {
      console.error('[delete-user] Lỗi parse JSON:', e);
      return NextResponse.json({ error: 'Lỗi khi đọc dữ liệu' }, { status: 400 });
    }
    
    const { userId } = body;
    if (!userId) {
      console.error('[delete-user] Thiếu user_id');
      return NextResponse.json({ error: 'Thiếu user_id' }, { status: 400 });
    }
    
    console.log('[delete-user] Đang xóa tài khoản cho user_id:', userId);
    
    // Tạo Supabase client với service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );
    
    // Thực hiện xóa trực tiếp từ bảng accounts
    console.log('[delete-user] Đang thực hiện xóa từ bảng accounts...');
    
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('[delete-user] Lỗi khi xóa:', deleteError);
      return NextResponse.json({ 
        error: 'Lỗi khi xóa tài khoản: ' + deleteError.message 
      }, { status: 500 });
    }
    
    console.log('[delete-user] Xóa tài khoản thành công!');
    
    // Trả về thành công
    return NextResponse.json({
      success: true,
      message: 'Đã xóa tài khoản thành công'
    });
    
  } catch (error: any) {
    console.error('[delete-user] Lỗi:', error);
    return NextResponse.json({ 
      error: 'Lỗi hệ thống: ' + (error?.message || 'Lỗi không xác định')
    }, { status: 500 });
  }
} 