'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormInput from '@/app/components/FormInput'
import { createClient } from '@/utils/supabase/client'
import ReCAPTCHA from "react-google-recaptcha";

// Định nghĩa schema validation
const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  recaptcha: z.string().min(1, 'Vui lòng xác minh bạn không phải là robot')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accountUnlocked, setAccountUnlocked] = useState(false)
  const [isNewAccount, setIsNewAccount] = useState(false)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  
  useEffect(() => {
    // Thêm một input ẩn để lưu token vào DOM
    // Việc này giúp bảo vệ token khi refresh hoặc có lỗi JavaScript
    const preserveTokenToDom = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const urlType = urlParams.get('type');
        
        if (urlToken) {
          // Tạo hoặc cập nhật hidden input
          let hiddenInput = document.getElementById('preserved-token') as HTMLInputElement;
          if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'preserved-token';
            document.body.appendChild(hiddenInput);
          }
          hiddenInput.value = urlToken;
          
          // Tạo hoặc cập nhật meta tag
          let metaTag = document.querySelector('meta[name="reset-token"]') as HTMLMetaElement;
          if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'reset-token';
            document.head.appendChild(metaTag);
          }
          metaTag.content = urlToken;
          
          console.log('Đã lưu token vào DOM để bảo vệ khỏi mất khi refresh');
          
          // Cũng lưu type nếu có
          if (urlType) {
            let typeInput = document.getElementById('preserved-type') as HTMLInputElement;
            if (!typeInput) {
              typeInput = document.createElement('input');
              typeInput.type = 'hidden';
              typeInput.id = 'preserved-type';
              document.body.appendChild(typeInput);
            }
            typeInput.value = urlType;
          }
        }
      } catch (error) {
        console.warn('Không thể lưu token vào DOM:', error);
      }
    };
    
    // Gọi hàm để lưu token vào DOM
    preserveTokenToDom();
    
  }, []);

  // Kiểm tra người dùng đã đăng nhập chưa và lấy email
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Phân tích tham số URL để debug
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const urlType = urlParams.get('type');
        const isRecovery = urlParams.get('type') === 'recovery';
        const isNewAccount = urlParams.get('type') === 'new';
        const isAuto = urlParams.get('auto') === 'true';
        
        // Kiểm tra token từ DOM nếu không có trong URL
        let domToken = null;
        let domType = null;
        try {
          const hiddenInput = document.getElementById('preserved-token') as HTMLInputElement;
          if (hiddenInput) {
            domToken = hiddenInput.value;
          }
          
          if (!domToken) {
            const metaTag = document.querySelector('meta[name="reset-token"]') as HTMLMetaElement;
            if (metaTag) {
              domToken = metaTag.content;
            }
          }
          
          const typeInput = document.getElementById('preserved-type') as HTMLInputElement;
          if (typeInput) {
            domType = typeInput.value;
          }
          
          if (domToken) {
            console.log('Đã tìm thấy token trong DOM:', domToken.substring(0, 5) + '...');
          }
        } catch (domError) {
          console.warn('Lỗi khi đọc token từ DOM:', domError);
        }
        
        // Sử dụng token từ URL, DOM hoặc localStorage
        const tokenToUse = urlToken || domToken;
        const typeToUse = urlType || domType;
        
        console.log('URL params:', {
          token: tokenToUse ? (tokenToUse.substring(0, 5) + '...') : 'missing',
          type: typeToUse,
          isRecovery: typeToUse === 'recovery',
          isNewAccount: typeToUse === 'new',
          isAuto,
          source: urlToken ? 'URL' : (domToken ? 'DOM' : 'none')
        });
        
        // Kiểm tra xem có token không (từ URL, DOM hoặc localStorage)
        if (tokenToUse) {
          console.log('Token found, assume valid reset password request');
          
          // Lưu token vào localStorage để tránh mất nó khi refresh trang
          try {
            localStorage.setItem('resetPasswordToken', tokenToUse);
            console.log('Token đã được lưu vào localStorage để bảo vệ khỏi mất khi refresh trang');
          } catch (storageError) {
            console.warn('Không thể lưu token vào localStorage:', storageError);
          }
          
          try {
            // Xử lý token để tạo session - QUAN TRỌNG: phải xử lý token trước khi sử dụng
            const supabase = createClient();
            
            console.log('Đang xử lý token thành session...');
            console.log('Token length:', tokenToUse.length);
            console.log('Token prefix:', tokenToUse.substring(0, 10) + '...');
            
            // Kiểm tra xem token có đúng định dạng không trước khi xử lý
            if (!tokenToUse.includes('.') && tokenToUse.length < 20) {
              console.warn('Token có vẻ không đúng định dạng, độ dài quá ngắn hoặc không chứa dấu chấm');
            }
            
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(tokenToUse);
            
            if (sessionError) {
              console.error('Lỗi khi đổi token thành session:', sessionError);
              console.error('Chi tiết lỗi:', {
                message: sessionError.message,
                status: sessionError.status,
                name: sessionError.name
              });
              // Không setError để người dùng vẫn có thể thử đặt lại mật khẩu
              // Tuy nhiên vẫn cho phép họ ở lại trang này để thử đặt lại mật khẩu
            } else {
              console.log('Đã tạo session từ token thành công:', 
                sessionData?.session ? 
                  `Session active, user ID: ${sessionData.session.user.id.slice(0,5)}...` : 
                  'No session created');
                  
              if (sessionData?.session) {
                console.log('Session details:', {
                  userId: sessionData.session.user.id.slice(0, 5) + '...',
                  email: sessionData.session.user.email,
                  aud: sessionData.session.user.aud,
                  role: sessionData.session.user.role,
                  metadata: sessionData.session.user.user_metadata
                });
              }
            }
            
            // Sau khi xử lý token, kiểm tra session
            const { data } = await supabase.auth.getSession();
            
            if (data.session) {
              console.log('Session exists after token processing');
              // Lưu email người dùng để sử dụng sau này
              setUserEmail(data.session.user.email);
              
              // Kiểm tra xem có phải tài khoản mới không
              if (data.session.user.user_metadata?.require_password_change === true) {
                console.log('User requires password change: New account detected');
                setIsNewAccount(true);
              }
            } else {
              console.log('No session after token processing, but token exists - proceeding with reset');
              // Token tồn tại nhưng không có session - vẫn cho phép đặt lại mật khẩu
              // KHÔNG chuyển hướng về trang đăng nhập
            }
          } catch (tokenError) {
            console.error('Lỗi khi xử lý token:', tokenError);
            // Vẫn cho phép người dùng ở lại trang này
          }
        } else {
          // Kiểm tra xem có token trong localStorage không (nếu trang đã refresh)
          let storedToken;
          try {
            storedToken = localStorage.getItem('resetPasswordToken');
            if (storedToken) {
              console.log('Token found in localStorage, will attempt to use this instead');
            }
          } catch (storageError) {
            console.warn('Không thể đọc token từ localStorage:', storageError);
          }
          
          if (storedToken) {
            // Nếu có token trong localStorage, thử xử lý nó
            try {
              const supabase = createClient();
              console.log('Đang xử lý token từ localStorage thành session...');
              
              const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(storedToken);
              
              if (sessionError) {
                console.error('Lỗi khi đổi token từ localStorage thành session:', sessionError);
                localStorage.removeItem('resetPasswordToken'); // Xóa token không hợp lệ
              } else if (sessionData?.session) {
                console.log('Đã tạo session từ token trong localStorage thành công');
                setUserEmail(sessionData.session.user.email);
                
                if (sessionData.session.user.user_metadata?.require_password_change === true) {
                  setIsNewAccount(true);
                }
                return; // Tiếp tục với form đặt lại mật khẩu
              }
            } catch (tokenError) {
              console.error('Lỗi khi xử lý token từ localStorage:', tokenError);
              localStorage.removeItem('resetPasswordToken'); // Xóa token không hợp lệ
            }
          }
          
          // QUAN TRỌNG: Chỉ khi KHÔNG có token trong URL, localStorage và DOM, kiểm tra session hiện tại
          console.log('No token in URL, localStorage or DOM - checking for existing session');
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          
          if (!data.session) {
            console.log('No token and no session - redirecting to signin');
            // Chỉ khi không có cả token và session, mới chuyển hướng đến trang đăng nhập
            router.push('/auth/signin');
            return;
          } else {
            // Lưu email người dùng để sử dụng sau này
            setUserEmail(data.session.user.email);
            
            // Kiểm tra xem có phải tài khoản mới không
            if (data.session.user.user_metadata?.require_password_change === true) {
              console.log('Session exists and user requires password change');
              setIsNewAccount(true);
            }
          }
        }
      } catch (error) {
        console.error('Lỗi kiểm tra phiên:', error);
      }
    };
    
    checkUser();
  }, [router]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema)
  })

  const onRecaptchaChange = (token: string | null) => {
    setValue('recaptcha', token || '');
  };

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      setIsLoading(true)
      setError(null)

      // Phân tích URL params
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlType = urlParams.get('type');
      const isRecovery = urlType === 'recovery';

      // Kiểm tra reCAPTCHA
      if (!data.recaptcha) {
        setError('Vui lòng xác minh bạn không phải là robot');
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      let result;
      
      // Kiểm tra xem có token trong localStorage không
      let storedToken;
      try {
        storedToken = localStorage.getItem('resetPasswordToken');
      } catch (e) {
        console.warn('Không thể đọc từ localStorage:', e);
      }
      
      // Kiểm tra token: ưu tiên từ URL, sau đó từ localStorage
      const tokenToUse = urlToken || storedToken;
      
      // Kiểm tra xem có session không trước khi cập nhật
      const { data: sessionData } = await supabase.auth.getSession();
      
      if ((!sessionData.session) && tokenToUse) {
        // Nếu không có session nhưng có token, thử đổi token thành session một lần nữa
        console.log('Không tìm thấy session hiện tại, đang thử xử lý token lại...');
        console.log('Dùng token từ ' + (urlToken ? 'URL' : 'localStorage'));
        
        try {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(tokenToUse);
          
          if (exchangeError) {
            console.error('Lỗi khi đổi token thành session lần thứ hai:', exchangeError);
            setError(`Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.`);
            
            // Xóa token không hợp lệ khỏi localStorage
            if (storedToken) {
              try {
                localStorage.removeItem('resetPasswordToken');
                console.log('Đã xóa token không hợp lệ khỏi localStorage');
              } catch (e) {
                console.warn('Không thể xóa từ localStorage:', e);
              }
            }
            
            setIsLoading(false);
            return;
          }
          
          console.log('Đã xử lý token thành công:', 
            exchangeData?.session ? 
              `Session created, user ID: ${exchangeData.session.user.id.slice(0,5)}...` : 
              'No session created'
          );
        } catch (exchangeError) {
          console.error('Exception khi xử lý token:', exchangeError);
        }
      }
      
      // Sau khi xử lý token, cập nhật mật khẩu
      console.log('Đang tiến hành cập nhật mật khẩu...');
      result = await supabase.auth.updateUser({
        password: data.password
      });
      
      // Kiểm tra kết quả cập nhật
      if (result.error) {
        console.error('Lỗi khi cập nhật mật khẩu:', result.error);
        setError(result.error.message);
        return;
      }
      
      // Kiểm tra nếu cập nhật thành công có user thực sự được cập nhật không
      if (!result.data.user) {
        console.error('Không có thông tin user sau khi cập nhật mật khẩu');
        setError('Không thể cập nhật mật khẩu: Không có phiên đăng nhập hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.');
        return;
      }
      
      console.log('Cập nhật mật khẩu thành công cho user ID:', result.data.user.id.slice(0, 5) + '...');
      
      // Lấy thông tin session sau khi cập nhật mật khẩu
      const { data: updatedSession } = await supabase.auth.getSession();
      const userId = updatedSession.session?.user.id || sessionData.session?.user.id || result.data.user.id;
      
      // Kiểm tra xem có phải tài khoản mới không
      // Kiểm tra cả metadata và param URL
      const isNewUserMetadata = updatedSession.session?.user.user_metadata?.require_password_change === true ||
                              sessionData.session?.user.user_metadata?.require_password_change === true ||
                              result.data.user.user_metadata?.require_password_change === true;
      const isNewUserFromURL = urlType === 'new';
      const isNewAccount = isNewUserMetadata || isNewUserFromURL;
      
      setIsNewAccount(isNewAccount);
      
      // Nếu có userId, cập nhật trạng thái tài khoản
      if (userId) {
        try {
          // Cập nhật trạng thái tài khoản thành active
          const { error: updateError } = await supabase
            .from('accounts')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
            
          if (!updateError) {
            console.log('Đã cập nhật trạng thái tài khoản thành active sau khi đặt lại mật khẩu');
            // Nếu có session, cũng cập nhật metadata để loại bỏ flag require_password_change
            try {
              const { error: metadataError } = await supabase.auth.updateUser({
                data: { require_password_change: false }
              });
              
              if (!metadataError) {
                console.log('Đã cập nhật metadata người dùng thành công');
              }
            } catch (metadataError) {
              console.error('Lỗi khi cập nhật metadata:', metadataError);
            }
          } else {
            console.error('Lỗi khi cập nhật trạng thái tài khoản:', updateError);
          }
        } catch (dbError) {
          console.error('Lỗi khi cập nhật trạng thái tài khoản:', dbError);
        }
      }

      // Xóa token từ localStorage sau khi đặt lại mật khẩu thành công
      try {
        localStorage.removeItem('resetPasswordToken');
        console.log('Đã xóa token khỏi localStorage sau khi đặt lại mật khẩu thành công');
      } catch (e) {
        console.warn('Không thể xóa từ localStorage:', e);
      }

      // Đặt lại mật khẩu thành công
      setIsSuccess(true)
      
      // Chuyển hướng sau 3 giây
      setTimeout(() => {
        if (isNewAccount) {
          router.push('/dashboard')
        } else {
          router.push('/auth/signin')
        }
      }, 3000)
    } catch (error) {
      console.error('Lỗi khi đặt lại mật khẩu:', error)
      setError('Đã xảy ra lỗi khi đặt lại mật khẩu. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
              {isNewAccount ? 'Thiết lập tài khoản thành công!' : 'Đặt lại mật khẩu thành công!'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {isNewAccount 
                ? 'Tài khoản của bạn đã được thiết lập và kích hoạt. Bạn sẽ được chuyển hướng đến trang quản trị trong vài giây.'
                : 'Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển hướng đến trang đăng nhập trong vài giây.'}
            </p>
            
            {accountUnlocked && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Chú ý:</span> Tài khoản của bạn đã được mở khóa và bây giờ bạn có thể đăng nhập bình thường.
                </p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <Link href={isNewAccount ? '/dashboard' : '/auth/signin'} className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                {isNewAccount ? 'Đi đến trang quản trị ngay' : 'Đi đến trang đăng nhập ngay'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">Đặt lại mật khẩu</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
                <div className="mt-1 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormInput
              id="password"
              type="password"
              label="Mật khẩu mới"
              placeholder="Nhập mật khẩu mới"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
            />

            <FormInput
              id="confirmPassword"
              type="password"
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Xác minh bạn không phải là robot
              </label>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Đây là test key, hãy thay bằng key thật khi triển khai
                onChange={onRecaptchaChange}
              />
              {errors.recaptcha && (
                <p className="mt-1 text-sm text-red-600">{errors.recaptcha.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
        
      </div>
    </div>
  )
} 