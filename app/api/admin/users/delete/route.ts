import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs';

// API route để chỉ xóa dữ liệu trong bảng accounts
export async function POST(request: Request) {
  // Thiết lập CORS headers
  const origin = request.headers.get('origin')
  
  // Tạo response cơ bản với CORS headers
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
    // Kiểm tra xác thực và quyền
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    
    // Lấy session hiện tại
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Lỗi khi kiểm tra session:', sessionError);
      return NextResponse.json(
        { error: 'Lỗi xác thực: ' + sessionError.message },
        { status: 500, ...responseInit }
      );
    }
    
    if (!session || !session.user) {
      console.error('Không có session hợp lệ');
      return NextResponse.json(
        { error: 'Không có quyền truy cập: Chưa đăng nhập' },
        { status: 401, ...responseInit }
      );
    }
    
    // Kiểm tra quyền admin
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();
      
    if (accountError || !accountData) {
      console.error('Lỗi khi kiểm tra quyền:', accountError);
      return NextResponse.json(
        { error: 'Không có quyền truy cập: Không tìm thấy thông tin tài khoản' },
        { status: 403, ...responseInit }
      );
    }
    
    // Kiểm tra nếu người dùng không phải admin
    if (accountData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Không có quyền truy cập: Chỉ admin mới có thể xóa người dùng' },
        { status: 403, ...responseInit }
      );
    }
    
    // Parse body request
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID không được để trống' },
        { status: 400, ...responseInit }
      )
    }
    
    // Kiểm tra nếu cố gắng xóa chính mình
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Không thể xóa tài khoản của chính mình' },
        { status: 400, ...responseInit }
      );
    }

    try {
      // Lấy thông tin người dùng trước khi xóa
      const { data: userInfo, error: userInfoError } = await supabase
        .from('users')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle();
        
      const userName = userInfo?.full_name || 'Người dùng';
      
      // Kiểm tra xem người dùng cần xóa có phải là admin không
      const { data: targetAccountData, error: targetError } = await supabase
        .from('accounts')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (targetError) {
        console.warn('Không thể kiểm tra quyền của người dùng cần xóa:', targetError);
      }
      
      if (targetAccountData?.role === 'admin') {
        return NextResponse.json(
          { error: 'Không thể xóa tài khoản admin khác' },
          { status: 400, ...responseInit }
        );
      }
      
      // Xóa dữ liệu từ bảng accounts
      const { error: accountsDeleteError } = await supabase
        .from('accounts')
        .delete()
        .eq('user_id', userId);
        
      if (accountsDeleteError) {
        console.error('Lỗi khi xóa dữ liệu từ bảng accounts:', accountsDeleteError);
        return NextResponse.json(
          { error: `Không thể xóa người dùng: ${accountsDeleteError.message}` },
          { status: 500, ...responseInit }
        );
      }
      
      // Trả về kết quả thành công
      return NextResponse.json({
        success: true,
        message: `Đã xóa tài khoản của ${userName} thành công`
      }, responseInit);
    } catch (error: any) {
      console.error('Lỗi khi xóa người dùng:', error);
      return NextResponse.json(
        { error: `Lỗi khi xóa người dùng: ${error?.message || 'Lỗi không xác định'}` },
        { status: 500, ...responseInit }
      );
    }
  } catch (error: any) {
    console.error('Lỗi server khi xóa người dùng:', error)
    return NextResponse.json(
      { error: error?.message || 'Lỗi server khi xử lý yêu cầu' },
      { status: 500, ...responseInit }
    )
  }
} 