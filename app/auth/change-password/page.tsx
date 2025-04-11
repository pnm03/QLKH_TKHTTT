'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/client';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import FormInput from '@/app/components/FormInput';

// Schema validation
const changePasswordSchema = z.object({
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isForced, setIsForced] = useState(false);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const [isFromVerification, setIsFromVerification] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    }
  });

  useEffect(() => {
    const checkUserSession = async () => {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
        return;
      }

      setUserEmail(session.user.email);

      // Kiểm tra nếu người dùng cần phải đổi mật khẩu (từ metadata)
      const requirePasswordChange = session.user.user_metadata?.require_password_change === true;
      const initialPassword = session.user.user_metadata?.initial_password;
      
      // Kiểm tra xem người dùng vừa truy cập từ liên kết xác thực hay không
      const isRecentVerification = Date.now() - (session.user.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : 0) < 5 * 60 * 1000; // 5 phút
      
      if (requirePasswordChange) {
        setIsForced(true);
        
        // Hiển thị mật khẩu ban đầu nếu có
        if (initialPassword) {
          setInitialPassword(initialPassword);
        }
        
        // Kiểm tra xem người dùng vừa mới xác thực không
        if (isRecentVerification) {
          setIsFromVerification(true);
        }
      } else {
        // Nếu không yêu cầu đổi mật khẩu và người dùng được chuyển đến trang này, có thể là đổi mật khẩu bình thường
        setIsForced(false);
      }
    };

    checkUserSession();
  }, [router]);

  const onSubmit = async (data: ChangePasswordFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      // Đổi mật khẩu
      const { error } = await supabase.auth.updateUser({
        password: data.password,
        data: {
          require_password_change: false // Xóa yêu cầu đổi mật khẩu
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Nếu đổi mật khẩu thành công
      setIsSuccess(true);

      // Đặt trạng thái tài khoản thành active
      try {
        if (userEmail) {
          // Lấy user_id từ session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const { error: accountError } = await supabase
              .from('accounts')
              .update({ 
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', session.user.id);

            if (accountError) {
              console.error('Lỗi khi cập nhật trạng thái tài khoản:', accountError);
            }
          }
        }
      } catch (dbError) {
        console.error('Lỗi khi cập nhật database:', dbError);
      }

      // Chuyển hướng về trang Dashboard sau 3 giây
      setIsRedirecting(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Lỗi khi đổi mật khẩu:', error);
      setError('Đã xảy ra lỗi khi đổi mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isFromVerification ? 'Hoàn tất xác thực tài khoản' : 'Đổi mật khẩu'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isFromVerification 
              ? 'Tài khoản của bạn đã được xác thực thành công. Vui lòng đổi mật khẩu để tiếp tục.'
              : isForced 
                ? 'Bạn cần đổi mật khẩu để tiếp tục sử dụng tài khoản.' 
                : 'Tạo mật khẩu mới cho tài khoản của bạn.'}
          </p>
          {userEmail && (
            <p className="mt-2 text-center text-sm font-medium text-indigo-600">
              {userEmail}
            </p>
          )}
          {isFromVerification && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-center font-semibold">
                Xác thực tài khoản thành công!
              </p>
              <p className="text-xs text-green-700 mt-1 text-center">
                Bước cuối cùng: Vui lòng thiết lập mật khẩu mới để bắt đầu sử dụng tài khoản
              </p>
            </div>
          )}
          {isForced && initialPassword && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 text-center">
                <span className="font-semibold">Mật khẩu tạm thời:</span> {initialPassword}
              </p>
              <p className="text-xs text-blue-700 mt-1 text-center">
                Vui lòng sử dụng mật khẩu mới khác với mật khẩu tạm thời
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {isSuccess ? (
          <div className="p-4 rounded-md bg-green-50 border border-green-200 text-center">
            <div className="flex flex-col items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-medium text-green-800">
                  Đổi mật khẩu thành công!
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  {isRedirecting ? (
                    <span>
                      Đang chuyển hướng tới trang chủ...
                      <span className="inline-block ml-2">
                        <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    </span>
                  ) : (
                    "Mật khẩu của bạn đã được cập nhật thành công."
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {/* Mật khẩu mới */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`block w-full h-11 text-base px-4 border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-indigo-500 focus:border-indigo-500 ${errors.password ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                    style={{ borderColor: errors.password ? '#f87171' : undefined, boxShadow: errors.password ? '0 0 0 1px #f87171' : undefined }}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Xác nhận mật khẩu
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`block w-full h-11 text-base px-4 border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-indigo-500 focus:border-indigo-500 ${errors.confirmPassword ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                    style={{ borderColor: errors.confirmPassword ? '#f87171' : undefined, boxShadow: errors.confirmPassword ? '0 0 0 1px #f87171' : undefined }}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 shadow-md"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  'Đổi mật khẩu'
                )}
              </button>
            </div>

            {!isForced && (
              <div className="text-center">
                <Link href="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                  Quay lại trang chủ
                </Link>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
} 