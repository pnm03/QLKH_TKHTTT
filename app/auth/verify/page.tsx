'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const success = searchParams.get('success');
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Đang xác thực tài khoản của bạn...');

  useEffect(() => {
    const verifyAccount = async () => {
      try {
        const supabase = createClient();
        
        // Nếu có tham số success=true từ API callback, xem như đã xác thực thành công
        if (success === 'true') {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            throw sessionError;
          }
          
          if (session) {
            // Kiểm tra xem tài khoản có yêu cầu đổi mật khẩu không
            const requirePasswordChange = session.user.user_metadata?.require_password_change === true;
            
            if (requirePasswordChange) {
              // Nếu cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
              setStatus('success');
              setMessage('Xác thực thành công! Đang chuyển hướng đến trang đổi mật khẩu...');
              
              // Đánh dấu tài khoản là đã xác thực trong bảng accounts
              try {
                await supabase
                  .from('accounts')
                  .update({ 
                    status: 'active',
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', session.user.id);
              } catch (error) {
                console.error('Lỗi khi cập nhật trạng thái tài khoản:', error);
              }
              
              setTimeout(() => {
                router.push('/auth/change-password');
              }, 2000);
              return;
            } else {
              // Nếu không cần đổi mật khẩu, chuyển hướng đến trang được chỉ định
              setStatus('success');
              setMessage(`Xác thực thành công! Đang chuyển hướng đến ${redirectTo}...`);
              setTimeout(() => {
                router.push(redirectTo);
              }, 2000);
              return;
            }
          }
        }
        
        // Nếu có token trực tiếp từ URL (trường hợp link email cũ)
        if (token && type === 'signup') {
          try {
            // Cố gắng tự xác thực token
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'signup',
            });
            
            if (verifyError) {
              console.error('Lỗi khi xác thực token:', verifyError);
              setStatus('error');
              setMessage('Token xác thực không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
              
              setTimeout(() => {
                router.push('/auth/signin');
              }, 3000);
              return;
            }
            
            // Nếu xác thực thành công, kiểm tra lại session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
              throw new Error('Không thể lấy phiên đăng nhập sau khi xác thực token');
            }
            
            // Kiểm tra xem tài khoản có yêu cầu đổi mật khẩu không
            const requirePasswordChange = session.user.user_metadata?.require_password_change === true;
            
            if (requirePasswordChange) {
              // Nếu cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
              setStatus('success');
              setMessage('Xác thực thành công! Đang chuyển hướng đến trang đổi mật khẩu...');
              
              setTimeout(() => {
                router.push('/auth/change-password');
              }, 2000);
            } else {
              // Nếu không cần đổi mật khẩu, chuyển hướng đến trang được chỉ định
              setStatus('success');
              setMessage(`Xác thực thành công! Đang chuyển hướng đến ${redirectTo}...`);
              setTimeout(() => {
                router.push(redirectTo);
              }, 2000);
            }
            return;
          } catch (error) {
            console.error('Lỗi khi xử lý token:', error);
          }
        }
        
        // Nếu không có success=true hoặc token, kiểm tra phiên thông thường
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session) {
          // Kiểm tra xem tài khoản có yêu cầu đổi mật khẩu không
          const requirePasswordChange = session.user.user_metadata?.require_password_change === true;
          
          if (requirePasswordChange) {
            // Nếu cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
            setStatus('success');
            setMessage('Xác thực thành công! Đang chuyển hướng đến trang đổi mật khẩu...');
            
            // Đánh dấu tài khoản là đã xác thực trong bảng accounts
            try {
              await supabase
                .from('accounts')
                .update({ 
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', session.user.id);
            } catch (error) {
              console.error('Lỗi khi cập nhật trạng thái tài khoản:', error);
            }
            
            setTimeout(() => {
              router.push('/auth/change-password');
            }, 2000);
          } else {
            // Nếu không cần đổi mật khẩu, chuyển hướng đến trang được chỉ định
            setStatus('success');
            setMessage(`Xác thực thành công! Đang chuyển hướng đến ${redirectTo}...`);
            setTimeout(() => {
              router.push(redirectTo);
            }, 2000);
          }
        } else {
          // Nếu không có phiên đăng nhập, có thể là link hết hạn
          setStatus('error');
          setMessage('Đường dẫn xác thực không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
          
          setTimeout(() => {
            router.push('/auth/signin');
          }, 3000);
        }
      } catch (error) {
        console.error('Lỗi xác thực:', error);
        setStatus('error');
        setMessage('Đã xảy ra lỗi khi xác thực tài khoản. Vui lòng thử lại sau hoặc liên hệ quản trị viên.');
        
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      }
    };
    
    verifyAccount();
  }, [router, redirectTo, success, token, type]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {status === 'verifying' ? 'Đang xác thực' : 
             status === 'success' ? 'Xác thực thành công' : 
             'Xác thực không thành công'}
          </h2>
          <div className="mt-6 text-center">
            {status === 'verifying' && (
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            )}
            {status === 'success' && (
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <p className="mt-4 text-center text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
} 