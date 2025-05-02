import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Lấy dữ liệu từ request body
    const userData = await request.json();

    // Kiểm tra dữ liệu gửi lên
    if (!userData.email || !userData.password || !userData.fullName || !userData.role) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Sử dụng admin client với SUPABASE_SERVICE_ROLE_KEY có đầy đủ quyền
    // bỏ qua việc kiểm tra session/cookies
    const adminClient = createAdminClient();

    // 1. Tạo tài khoản auth bằng admin API
    console.log('Đang tạo người dùng mới với email:', userData.email);

    let userId;

    try {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.fullName,
          phone: userData.phone || null,
          hometown: null,
          birth_date: null,
          require_password_change: true,
          initial_password: userData.password,
          role: userData.role // Lưu role trong metadata
        }
      });

      if (error) {
        console.error('Lỗi khi tạo người dùng với admin API:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      userId = data.user?.id;

      if (!userId) {
        console.error('Không thể lấy ID người dùng sau khi tạo');
        return NextResponse.json({ error: 'Không thể tạo người dùng' }, { status: 500 });
      }

      console.log('Tạo người dùng thành công với ID:', userId);

    } catch (createUserError: any) {
      console.error('Exception khi tạo người dùng với admin API:', createUserError);
      return NextResponse.json({
        error: createUserError.message || 'Lỗi khi tạo người dùng với admin API',
        details: process.env.NODE_ENV === 'development' ? createUserError.stack : undefined
      }, { status: 500 });
    }

    // 2. Kiểm tra số điện thoại đã tồn tại chưa
    if (userData.phone) {
      try {
        const { data: existingPhoneData, error: phoneCheckError } = await adminClient
          .from('users')
          .select('user_id, full_name, email, phone')
          .eq('phone', userData.phone)
          .maybeSingle();

        if (phoneCheckError) {
          console.error('Lỗi khi kiểm tra số điện thoại:', phoneCheckError);
        } else if (existingPhoneData) {
          console.error('Số điện thoại đã tồn tại:', userData.phone);
          return NextResponse.json({
            error: `Số điện thoại ${userData.phone} đã được sử dụng bởi người dùng khác (${existingPhoneData.full_name})`
          }, { status: 400 });
        }
      } catch (phoneError: any) {
        console.error('Exception khi kiểm tra số điện thoại:', phoneError);
      }
    }

    // 3. Thêm vào bảng users nếu chưa tồn tại
    try {
      // Kiểm tra xem người dùng đã tồn tại trong bảng users chưa
      const { data: existingUserData } = await adminClient
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      // Chỉ thêm vào bảng users nếu chưa tồn tại
      if (!existingUserData) {
        const { error: userError } = await adminClient
          .from('users')
          .insert({
            user_id: userId,
            email: userData.email,
            full_name: userData.fullName,
            phone: userData.phone || null,
            hometown: null,
            birth_date: null
          });

        if (userError) {
          console.error('Lỗi khi thêm người dùng vào bảng users:', userError);
          return NextResponse.json({ error: userError.message }, { status: 500 });
        }
      }
    } catch (userError: any) {
      console.error('Exception khi thêm người dùng vào bảng users:', userError);
      return NextResponse.json({ error: userError.message || 'Lỗi khi thêm người dùng' }, { status: 500 });
    }

    // 4. Thêm vào bảng accounts nếu chưa tồn tại
    try {
      // Kiểm tra xem tài khoản đã tồn tại trong bảng accounts chưa
      const { data: existingAccountData } = await adminClient
        .from('accounts')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      // Chỉ thêm vào bảng accounts nếu chưa tồn tại
      if (!existingAccountData) {
        const { error: accountError } = await adminClient
          .from('accounts')
          .insert({
            user_id: userId,
            username: userData.email,
            status: 'active',
            role: userData.role,
            password_hash: userData.password
          });

        if (accountError) {
          console.error('Lỗi khi thêm người dùng vào bảng accounts:', accountError);
          return NextResponse.json({ error: accountError.message }, { status: 500 });
        }
      }
    } catch (accountError: any) {
      console.error('Exception khi thêm người dùng vào bảng accounts:', accountError);
      return NextResponse.json({ error: accountError.message || 'Lỗi khi thêm tài khoản' }, { status: 500 });
    }

    // 5. Gửi email khôi phục mật khẩu nếu yêu cầu
    let emailSent = false;
    let emailError = null;

    if (userData.sendPassword) {
      try {
        console.log('Chuẩn bị gửi email khôi phục mật khẩu cho:', userData.email);

        const { error: resetError } = await adminClient.auth.resetPasswordForEmail(userData.email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/reset-password?type=new`
        });

        if (resetError) {
          console.error('Lỗi khi gửi email khôi phục mật khẩu:', resetError);
          emailError = resetError.message;
        } else {
          console.log('Đã gửi email khôi phục mật khẩu thành công');
          emailSent = true;
        }
      } catch (resetError: any) {
        console.error('Exception khi gửi email khôi phục mật khẩu:', resetError);
        emailError = resetError.message || 'Lỗi khi gửi email';
      }
    }

    // 6. Trả về thông tin người dùng đã tạo
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData.email,
        fullName: userData.fullName
      },
      emailSent: emailSent,
      emailError: emailError
    });

  } catch (error: any) {
    console.error('Lỗi chung khi xử lý request tạo người dùng:', error);
    return NextResponse.json({
      error: error.message || 'Đã xảy ra lỗi không xác định',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}