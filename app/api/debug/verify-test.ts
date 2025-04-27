import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Lấy tham số từ URL
    const email = request.nextUrl.searchParams.get('email');
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/auth/verify?redirect=/auth/change-password';

    if (!email) {
      return NextResponse.json({ error: 'Thiếu tham số email' }, { status: 400 });
    }

    // Lấy site URL từ biến môi trường hoặc sử dụng request origin nếu không có
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    // 1. Gửi lại email xác thực
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${siteUrl}/api/auth/callback`
      }
    });

    if (resendError) {
      return NextResponse.json({
        error: 'Lỗi gửi lại email xác thực',
        details: resendError.message,
        status: 'failed'
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Đã gửi lại email xác thực',
      email,
      redirectTo,
      status: 'success'
    });

  } catch (error) {
    console.error('Lỗi kiểm tra xác thực:', error);
    return NextResponse.json({
      error: 'Đã xảy ra lỗi khi kiểm tra xác thực',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
}