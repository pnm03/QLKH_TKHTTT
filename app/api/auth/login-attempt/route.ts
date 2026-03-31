import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, action } = await request.json();

    if (!email || !action) {
      return NextResponse.json({ error: 'Missing email or action' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Lấy thông tin tài khoản hiện tại để có user_id
    const { data: account, error: fetchError } = await adminClient
      .from('accounts')
      .select('user_id, status')
      .eq('user_name', email)
      .maybeSingle();

    if (fetchError || !account) {
      return NextResponse.json({ error: fetchError?.message || 'Account not found' }, { status: 404 });
    }

    // Nếu đã bị khóa, trả về khóa luôn
    if (account.status === 'locked') {
      return NextResponse.json({ locked: true, attemptsLeft: 0, status: 'locked' });
    }

    // 2. Lấy thông tin user trong auth.users để kiểm tra số lần đăng nhập sai (lưu trong metadata)
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(account.user_id);
    
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Auth user not found' }, { status: 404 });
    }

    const currentAttempts = userData.user.user_metadata?.failed_login_attempts || 0;

    // 3. Xử lý theo action
    if (action === 'success') {
      // Thành công -> reset số lần thất bại về 0
      if (currentAttempts > 0) {
        await adminClient.auth.admin.updateUserById(account.user_id, {
          user_metadata: { ...userData.user.user_metadata, failed_login_attempts: 0 }
        });
      }
      return NextResponse.json({ success: true, status: account.status });
    } 
    else if (action === 'failed') {
      // Đăng nhập sai -> Tăng biến đếm lên 1
      const newAttempts = currentAttempts + 1;
      let newStatus = account.status;
      let locked = false;

      // Nếu sai >= 3 lần thì khóa tài khoản
      if (newAttempts >= 3) {
        newStatus = 'locked';
        locked = true;
        
        // Khóa trong bảng accounts
        await adminClient
          .from('accounts')
          .update({ status: 'locked' })
          .eq('user_id', account.user_id);
      }

      // Lưu cập nhật failed lên user_metadata để tracking an toàn không cần thêm field DB
      await adminClient.auth.admin.updateUserById(account.user_id, {
        user_metadata: { ...userData.user.user_metadata, failed_login_attempts: newAttempts }
      });

      return NextResponse.json({ 
        locked, 
        attemptsLeft: Math.max(0, 3 - newAttempts), 
        currentAttempts: newAttempts,
        status: newStatus
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
