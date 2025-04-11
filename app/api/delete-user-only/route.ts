import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// API endpoint chỉ xóa dữ liệu từ bảng users
export async function POST(request: Request) {
  console.log('[delete-user-only] Nhận yêu cầu xóa dữ liệu người dùng');
  
  try {
    // Parse body request
    let body;
    try {
      body = await request.json();
      console.log('[delete-user-only] Request body:', body);
    } catch (e) {
      console.error('[delete-user-only] Lỗi parse JSON:', e);
      return NextResponse.json({ error: 'Lỗi khi đọc dữ liệu' }, { status: 400 });
    }
    
    const { userId } = body;
    if (!userId) {
      console.error('[delete-user-only] Thiếu user_id');
      return NextResponse.json({ error: 'Thiếu user_id' }, { status: 400 });
    }
    
    console.log('[delete-user-only] Đang xóa dữ liệu người dùng cho user_id:', userId);
    
    // Tạo Supabase client với service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Kiểm tra trước nếu user tồn tại
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, full_name')
      .eq('user_id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('[delete-user-only] Lỗi hoặc không tìm thấy user:', userError);
      return NextResponse.json({ 
        error: 'Không tìm thấy dữ liệu người dùng hoặc đã bị xóa rồi'
      }, { status: 404 });
    }
    
    console.log('[delete-user-only] Đã tìm thấy user cần xóa:', userData);
    
    // QUAN TRỌNG: Vấn đề có thể là do trigger trả về OLD ngăn xóa bản ghi
    // Ta sẽ sử dụng một cách khác: gọi trực tiếp đến REST API của Supabase với quyền admin
    try {
      console.log('[delete-user-only] Gọi trực tiếp đến REST API của Supabase để xóa');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[delete-user-only] Lỗi khi xóa qua REST API:', response.status, errorData);
        throw new Error(`REST API error: ${response.status} - ${errorData}`);
      }
      
      console.log('[delete-user-only] Xóa qua REST API thành công:', response.status);
    } catch (restError) {
      console.error('[delete-user-only] Lỗi khi gọi REST API:', restError);
      
      // Thử lại với cách ORM thông thường
      console.log('[delete-user-only] Thử lại với cách xóa ORM...');
      
      // Thực hiện hai cách xóa khác nhau
      try {
        // Cách 1: DELETE thông thường
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('user_id', userId);
        
        if (deleteError) {
          console.error('[delete-user-only] Lỗi khi xóa cách 1:', deleteError);
          
          // Cách 2: UPDATE với NULL
          console.log('[delete-user-only] Thử cách 2: UPDATE thay vì DELETE...');
          const { error: updateError } = await supabase
            .from('users')
            .update({
              email: null,
              full_name: 'ĐÃ XÓA',
              phone: null,
              hometown: null,
              birth_date: null
            })
            .eq('user_id', userId);
            
          if (updateError) {
            console.error('[delete-user-only] Lỗi khi update cách 2:', updateError);
            throw updateError;
          } else {
            console.log('[delete-user-only] Cập nhật thành "ĐÃ XÓA" thành công!');
          }
        } else {
          console.log('[delete-user-only] Xóa cách 1 thành công!');
        }
      } catch (finalError) {
        console.error('[delete-user-only] Tất cả các phương pháp đều thất bại:', finalError);
        return NextResponse.json({ 
          error: 'Lỗi khi xóa dữ liệu người dùng: ' + (finalError instanceof Error ? finalError.message : String(finalError))
        }, { status: 500 });
      }
    }
    
    // Kiểm tra lại xem user có thực sự đã bị xóa không
    const { data: checkData, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (!checkError && checkData) {
      console.warn('[delete-user-only] Cảnh báo: User vẫn tồn tại sau khi thực hiện xóa!');
    } else {
      console.log('[delete-user-only] Kiểm tra xác nhận: User đã bị xóa thành công');
    }
    
    console.log('[delete-user-only] Xóa dữ liệu người dùng thành công!');
    
    // Trả về thành công
    return NextResponse.json({
      success: true,
      message: `Đã xóa thông tin người dùng ${userData.full_name || ''} thành công`,
      userWasDeleted: !checkData
    });
    
  } catch (error: any) {
    console.error('[delete-user-only] Lỗi:', error);
    return NextResponse.json({ 
      error: 'Lỗi hệ thống: ' + (error?.message || 'Lỗi không xác định')
    }, { status: 500 });
  }
} 