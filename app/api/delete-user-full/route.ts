import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// API endpoint xóa dữ liệu theo thứ tự: users -> accounts -> auth.users
export async function POST(request: Request) {
  console.log('[delete-user-full] Nhận yêu cầu xóa dữ liệu người dùng');
  
  try {
    // Parse body request
    let body;
    try {
      body = await request.json();
      console.log('[delete-user-full] Request body:', body);
    } catch (e) {
      console.error('[delete-user-full] Lỗi parse JSON:', e);
      return NextResponse.json({ error: 'Lỗi khi đọc dữ liệu' }, { status: 400 });
    }
    
    const { userId } = body;
    if (!userId) {
      console.error('[delete-user-full] Thiếu user_id');
      return NextResponse.json({ error: 'Thiếu user_id' }, { status: 400 });
    }
    
    console.log('[delete-user-full] Bắt đầu quy trình xóa dữ liệu cho user_id:', userId);
    
    // Tạo Supabase client với service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Kiểm tra người dùng tồn tại trước khi xóa
    console.log('[delete-user-full] Kiểm tra thông tin người dùng...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, full_name')
      .eq('user_id', userId)
      .single();
    
    if (userError) {
      console.error('[delete-user-full] Lỗi khi kiểm tra người dùng:', userError);
      if (userError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Không tìm thấy người dùng với ID đã cung cấp' 
        }, { status: 404 });
      }
      throw userError;
    }
    
    if (!userData) {
      console.error('[delete-user-full] Không tìm thấy người dùng với ID:', userId);
      return NextResponse.json({ 
        error: 'Không tìm thấy người dùng' 
      }, { status: 404 });
    }
    
    console.log('[delete-user-full] Đã tìm thấy người dùng:', userData.full_name);
    
    // Kết quả xóa
    const results = {
      users: false,
      accounts: false,
      auth_users: false
    };
    
    // 2. Xóa dữ liệu từ bảng users
    console.log('[delete-user-full] Bước 1: Cập nhật trạng thái del cho người dùng trong bảng users...');
    try {
      // Đánh dấu người dùng đã bị xóa bằng cách cập nhật cột del
      const { error: updateError } = await supabase
        .from('users')
        .update({
          del: true,
          email: null,
          phone: null,
          hometown: null,
          birth_date: null
        })
        .eq('user_id', userId);
        
      if (!updateError) {
        results.users = true;
        console.log('[delete-user-full] ✓ Đã cập nhật trạng thái del cho người dùng');
      } else {
        console.error('[delete-user-full] ✗ Lỗi khi cập nhật trạng thái del:', updateError);
        
        // Thử lại với RPC nếu phương pháp thông thường thất bại
        try {
          console.log('[delete-user-full] Thử cập nhật bằng SQL trực tiếp...');
          const { error: sqlError } = await supabase.rpc('execute_sql', { 
            sql_query: `UPDATE users SET del = true, email = NULL, phone = NULL, hometown = NULL, birth_date = NULL WHERE user_id = '${userId}'` 
          });
          
          if (!sqlError) {
            results.users = true;
            console.log('[delete-user-full] ✓ Đã cập nhật trạng thái del bằng SQL trực tiếp');
          } else {
            console.error('[delete-user-full] ✗ Lỗi khi cập nhật bằng SQL trực tiếp:', sqlError);
          }
        } catch (sqlError) {
          console.error('[delete-user-full] ✗ Lỗi khi thử SQL trực tiếp:', sqlError);
        }
      }
    } catch (updateError) {
      console.error('[delete-user-full] ✗ Lỗi khi cập nhật trạng thái del:', updateError);
    }
    
    // 3. Xóa dữ liệu từ bảng accounts
    console.log('[delete-user-full] Bước 2: Xóa dữ liệu từ bảng accounts...');
    try {
      // Sử dụng hàm RPC admin_delete_from_table để xóa từ bảng accounts với quyền SECURITY DEFINER
      await supabase.rpc('admin_delete_from_table', {
        table_name: 'accounts',
        user_id_value: userId
      });
      
      results.accounts = true;
      console.log('[delete-user-full] ✓ Đã xóa dữ liệu từ bảng accounts');
    } catch (accountsError) {
      console.error('[delete-user-full] ✗ Lỗi khi xóa từ bảng accounts:', accountsError);
      
      // Thử lại với cách thông thường nếu RPC thất bại
      try {
        console.log('[delete-user-full] Thử xóa accounts bằng cách thông thường...');
        const { error: deleteError } = await supabase
          .from('accounts')
          .delete()
          .eq('user_id', userId);
        
        if (!deleteError) {
          results.accounts = true;
          console.log('[delete-user-full] ✓ Đã xóa dữ liệu từ bảng accounts (cách thông thường)');
        } else {
          console.error('[delete-user-full] ✗ Lỗi khi xóa accounts (cách thông thường):', deleteError);
          
          // Thử cách cuối cùng: SQL trực tiếp
          try {
            console.log('[delete-user-full] Thử xóa accounts bằng SQL trực tiếp...');
            const { error: sqlError } = await supabase.rpc('execute_sql', { 
              sql_query: `DELETE FROM accounts WHERE user_id = '${userId}'` 
            });
            
            if (!sqlError) {
              results.accounts = true;
              console.log('[delete-user-full] ✓ Đã xóa dữ liệu từ bảng accounts (SQL trực tiếp)');
            } else {
              console.error('[delete-user-full] ✗ Lỗi khi xóa accounts (SQL trực tiếp):', sqlError);
            }
          } catch (sqlError) {
            console.error('[delete-user-full] ✗ Lỗi khi thử SQL trực tiếp:', sqlError);
          }
        }
      } catch (retryError) {
        console.error('[delete-user-full] ✗ Lỗi khi thử lại xóa accounts:', retryError);
      }
    }
    
    // 4. Xóa dữ liệu từ bảng auth.users
    console.log('[delete-user-full] Bước 3: Xóa dữ liệu từ bảng auth.users...');
    try {
      const { error: authUsersError } = await supabase.auth.admin.deleteUser(userId);
      
      if (!authUsersError) {
        results.auth_users = true;
        console.log('[delete-user-full] ✓ Đã xóa dữ liệu từ bảng auth.users');
      } else {
        console.error('[delete-user-full] ✗ Lỗi khi xóa từ bảng auth.users:', authUsersError);
      }
    } catch (authUsersError) {
      console.error('[delete-user-full] ✗ Lỗi khi xóa từ bảng auth.users:', authUsersError);
    }
    
    // 5. Kiểm tra kết quả
    console.log('[delete-user-full] Tóm tắt kết quả xóa:', results);
    
    if (!results.users && !results.accounts && !results.auth_users) {
      return NextResponse.json({ 
        success: false,
        error: 'Không thể xóa dữ liệu người dùng từ bất kỳ bảng nào',
        results
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Đã xóa dữ liệu người dùng ${userData.full_name || ''}`,
      results
    });
    
  } catch (error: any) {
    console.error('[delete-user-full] Lỗi:', error);
    return NextResponse.json({ 
      error: 'Lỗi hệ thống: ' + (error?.message || 'Lỗi không xác định')
    }, { status: 500 });
  }
} 