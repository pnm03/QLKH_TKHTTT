'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClient } from '@/utils/supabase/client'
import { EyeIcon, EyeSlashIcon, InformationCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { XCircleIcon } from '@heroicons/react/24/solid'
import { debounce } from 'lodash'

// Schema validation
const userSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
  confirmPassword: z.string(),
  fullName: z.string().min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' }),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, { message: 'Số điện thoại không hợp lệ' }).optional().or(z.literal('')),
  address: z.string().optional(),
  role: z.string().min(1, { message: 'Vui lòng chọn vai trò' }),
  sendPassword: z.boolean().optional().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type UserFormValues = z.infer<typeof userSchema>;

const ROLES = {
  admin: 'Quản trị viên',
  NVBH: 'Nhân viên bán hàng',
  NVK: 'Nhân viên kho',
};

// Kiểu dữ liệu cho người dùng đã tồn tại
type ExistingUser = {
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  phone?: string;
};

export default function AddUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null);
  const [existingPhone, setExistingPhone] = useState<ExistingUser | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [passwordValue, setPasswordValue] = useState<string>('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState<string>('');
  const [sendPassword, setSendPassword] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Lấy thông tin theme từ context nhưng chỉ sử dụng khi component đã mounted
  const themeContext = useTheme();

  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      });
    }
  }, [mounted, themeContext.currentTheme]);

  // Thêm giá trị mặc định cho theme để tránh lỗi
  useEffect(() => {
    // Đảm bảo theme luôn có giá trị mặc định ngay cả khi context chưa load xong
    if (!themeState.theme || !themeState.theme.textColor) {
      setThemeState({
        theme: {
          ...themeColors.indigo,
          textColor: 'text-indigo-600',
          name: 'indigo'
        }
      });
    }
  }, [themeState.theme]);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      phone: '',
      address: '',
      role: '',
      sendPassword: true,
    }
  });

  // Theo dõi giá trị mật khẩu
  const password = watch('password');

  // Hàm tạo mật khẩu ngẫu nhiên
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()';
    let newPassword = '';
    for (let i = 0; i < 10; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Cập nhật cả state và giá trị form
    setPasswordValue(newPassword);
    setConfirmPasswordValue(newPassword);

    // Sử dụng setValue để cập nhật giá trị form và trigger validation
    setValue('password', newPassword, { shouldValidate: true });
    setValue('confirmPassword', newPassword, { shouldValidate: true });
  };

  // Kiểm tra phiên đăng nhập và chuyển hướng nếu không hợp lệ
  useEffect(() => {
    const checkSession = async () => {
      if (!mounted) return;

      try {
        const supabase = createClient();

        // Kiểm tra phiên đăng nhập
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // Nếu không có phiên hoặc có lỗi, chuyển hướng đến trang đăng nhập
        if (sessionError || !session) {
          console.error('Không có phiên đăng nhập hợp lệ:', sessionError?.message);

          // Xóa dữ liệu phiên trước khi chuyển hướng
          await supabase.auth.signOut();

          // Chuyển hướng đến trang đăng nhập
          router.push('/auth/signin?redirectTo=/dashboard/users/add');
          return;
        }

        // Nếu có phiên, tiếp tục kiểm tra quyền
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (accountError) {
          console.error('Lỗi khi lấy vai trò:', accountError);
          setAccessDenied(true);
          setError('Không thể xác minh quyền của bạn. Vui lòng đăng nhập lại.');
          return;
        }

        if (!accountData) {
          setAccessDenied(true);
          setError('Không tìm thấy thông tin tài khoản của bạn.');
          return;
        }

        setUserRole(accountData.role);

        // Kiểm tra quyền admin
        const isAdmin = accountData.role && accountData.role.toLowerCase() === 'admin';
        if (!isAdmin) {
          setAccessDenied(true);
          const friendlyRoleName = ROLES[accountData.role as keyof typeof ROLES] || accountData.role;
          setError(`Truy cập bị từ chối. Bạn là ${friendlyRoleName}, bạn không có quyền truy cập. Chỉ có admin mới truy cập được.`);
        } else {
          setAccessDenied(false);
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra phiên:', error);

        // Trong trường hợp lỗi, cũng chuyển hướng đến trang đăng nhập
        router.push('/auth/signin?redirectTo=/dashboard/users/add');
      }
    };

    checkSession();
  }, [mounted, router]);

  // Tự động ẩn thông báo thành công sau 3 giây
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [success]);

  const onSubmit = async (data: UserFormValues) => {
    // Nếu không phải admin thì không cho thực hiện hành động này
    const isAdmin = userRole && userRole.toLowerCase() === 'admin';
    if (!isAdmin) {
      const friendlyRoleName = userRole ? (ROLES[userRole as keyof typeof ROLES] || userRole) : 'người dùng không xác định';
      setError(`Truy cập bị từ chối. Bạn là ${friendlyRoleName}, bạn không có quyền truy cập. Chỉ có admin mới truy cập được.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Kiểm tra mật khẩu trước khi gửi
    if (!data.password || data.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setIsLoading(false);
      return;
    }

    // Kiểm tra xác nhận mật khẩu
    if (data.password !== data.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setIsLoading(false);
      return;
    }

    try {
      // Log để debug
      console.log('Đang gửi dữ liệu người dùng mới:', {
        email: data.email,
        passwordLength: data.password.length,
        fullName: data.fullName,
        role: data.role,
        sendPassword: data.sendPassword
      });

      // Gửi request tạo người dùng mới
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          phone: data.phone,
          role: data.role,
          sendPassword: data.sendPassword
        })
      });

      // Xử lý response
      const result = await response.json();

      if (!response.ok) {
        setError(result?.error || 'Đã xảy ra lỗi khi tạo người dùng');
        return;
      }

      // Hiển thị thông báo thành công ngắn gọn hơn
      setSuccess(`Đã tạo người dùng ${result.user.fullName} thành công.`);

      // Kiểm tra kết quả gửi email
      if (data.sendPassword) {
        if (result.emailSent) {
          setSuccess(prev => `${prev} Đã gửi email thiết lập mật khẩu.`);
        } else if (result.emailError) {
          setSuccess(prev => `${prev} Tuy nhiên, không thể gửi email: ${result.emailError}`);
        }
      }

      // Reset form với các giá trị mặc định
      reset({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        phone: '',
        address: '',
        role: '',
        sendPassword: true,
      });

      // Đặt lại các state
      setPasswordValue('');
      setConfirmPasswordValue('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setExistingUser(null);
      setExistingPhone(null);
      setCheckingEmail(false);
      setCheckingPhone(false);

    } catch (error: any) {
      console.error('Lỗi khi tạo người dùng:', error);
      setError(error.message || 'Đã xảy ra lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm kiểm tra email đã tồn tại
  const checkExistingEmail = useCallback(
    debounce(async (email: string) => {
      if (!email || !email.includes('@') || !email.includes('.')) return;

      setCheckingEmail(true);
      try {
        const supabase = createClient();

        // Kiểm tra trong bảng users
        const { data, error } = await supabase
          .from('users')
          .select('user_id, full_name, email')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          console.error('Lỗi khi kiểm tra email:', JSON.stringify(error));
          return;
        }

        if (data) {
          // Nếu tìm thấy email, kiểm tra role từ bảng accounts
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('role, status')
            .eq('user_id', data.user_id)
            .maybeSingle();

          if (accountError) {
            console.error('Lỗi khi kiểm tra vai trò người dùng:', JSON.stringify(accountError));
          }

          setExistingUser({
            email: email,
            full_name: data.full_name || '',
            role: accountData?.role || 'customer',
            avatar_url: undefined // Cập nhật nếu có avatar trong database
          });
        } else {
          setExistingUser(null);
        }
      } catch (error: any) {
        console.error('Lỗi khi kiểm tra email:', error?.message || JSON.stringify(error));
      } finally {
        setCheckingEmail(false);
      }
    }, 500),
    []
  );

  // Hàm kiểm tra số điện thoại đã tồn tại
  const checkExistingPhone = useCallback(
    debounce(async (phone: string) => {
      if (!phone || phone.length < 10) return;

      setCheckingPhone(true);
      try {
        const supabase = createClient();

        // Kiểm tra trong bảng users
        const { data, error } = await supabase
          .from('users')
          .select('user_id, full_name, email, phone')
          .eq('phone', phone)
          .maybeSingle();

        if (error) {
          console.error('Lỗi khi kiểm tra số điện thoại:', JSON.stringify(error));
          return;
        }

        if (data) {
          // Nếu tìm thấy số điện thoại, kiểm tra role từ bảng accounts
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('role, status')
            .eq('user_id', data.user_id)
            .maybeSingle();

          if (accountError) {
            console.error('Lỗi khi kiểm tra vai trò người dùng:', JSON.stringify(accountError));
          }

          setExistingPhone({
            email: data.email || '',
            full_name: data.full_name || '',
            role: accountData?.role || 'customer',
            avatar_url: undefined, // Cập nhật nếu có avatar trong database
            phone: phone
          });
        } else {
          setExistingPhone(null);
        }
      } catch (error: any) {
        console.error('Lỗi khi kiểm tra số điện thoại:', error?.message || JSON.stringify(error));
      } finally {
        setCheckingPhone(false);
      }
    }, 500),
    []
  );

  // Xử lý khi email thay đổi
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    if (email) {
      checkExistingEmail(email);
    } else {
      setExistingUser(null);
    }
  };

  // Xử lý khi số điện thoại thay đổi
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    if (phone) {
      checkExistingPhone(phone);
    } else {
      setExistingPhone(null);
    }
  };

  if (!mounted) {
    return null;
  }

  const { theme = themeColors.indigo } = themeState;
  const themeName = theme?.name || 'indigo';
  const themeColor = themeName === 'indigo' ? '#4f46e5' :
                    themeName === 'blue' ? '#2563eb' :
                    themeName === 'green' ? '#16a34a' :
                    themeName === 'red' ? '#dc2626' :
                    themeName === 'purple' ? '#9333ea' : '#4f46e5';

  // Định nghĩa biến textColor đúng cách với fallback
  const textColor = theme?.textColor || `text-${themeName}-600`;

  // Nếu không có quyền truy cập, hiển thị thông báo từ chối
  if (accessDenied) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Thêm người dùng mới</h1>
        </div>

        <div className="py-10 text-center bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Truy cập bị từ chối</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Quay lại Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className={`bg-gradient-to-r from-${themeName}-600 to-${themeName}-700 p-4`}>
          <div className="flex items-center">
            <div className="bg-white/20 p-2 rounded-lg">
              <UserPlusIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white ml-3">Thêm người dùng mới</h1>
            <div className="ml-4 pl-4 border-l border-white/20">
              <span className="text-white/80 text-sm">Vai trò của bạn: <span className="text-white font-semibold">
                {userRole ? (ROLES[userRole as keyof typeof ROLES] || userRole) : 'Đang tải...'}
              </span></span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
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

          {success && (
            <div className="p-4 rounded-lg bg-green-100 border-l-4 border-green-500 mb-6 shadow-md animate-fade-in">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-green-800">
                    {success}
                  </p>
                  <div className="mt-3 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess(null);
                        // Reset form đã được xử lý trước đó, không cần gọi lại
                      }}
                      className={`px-4 py-2 text-sm font-medium text-white bg-${themeName}-600 hover:bg-${themeName}-700 rounded-md shadow-sm transition-colors duration-150`}
                    >
                      Tạo người dùng khác
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/users')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm transition-colors duration-150"
                    >
                      Quay lại danh sách
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Tài khoản mới được tạo sẽ ở trạng thái <span className="font-medium">hoạt động</span>.
                  Email xác nhận sẽ được gửi tới địa chỉ email của người dùng.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Hiển thị người dùng đã tồn tại (email) */}
            {existingUser && (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-12 w-12 rounded-full bg-${themeName}-100 flex items-center justify-center`}>
                      {existingUser.avatar_url ? (
                        <img src={existingUser.avatar_url} alt={existingUser.full_name} className="h-12 w-12 rounded-full" />
                      ) : (
                        <span className={`text-${themeName}-700 font-medium text-lg`}>
                          {existingUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Email đã tồn tại trong hệ thống!
                    </h3>
                    <div className="mt-1">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">{existingUser.full_name}</span> -
                        <span className="italic ml-1">{
                          existingUser.role === "admin" ? "Quản trị viên" :
                          existingUser.role === "NVBH" ? "Nhân viên bán hàng" :
                          existingUser.role === "NVK" ? "Nhân viên kho" :
                          existingUser.role
                        }</span>
                      </p>
                      <p className="text-sm text-yellow-700">
                        {existingUser.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hiển thị người dùng đã tồn tại (số điện thoại) */}
            {existingPhone && (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-12 w-12 rounded-full bg-${themeName}-100 flex items-center justify-center`}>
                      {existingPhone.avatar_url ? (
                        <img src={existingPhone.avatar_url} alt={existingPhone.full_name} className="h-12 w-12 rounded-full" />
                      ) : (
                        <span className={`text-${themeName}-700 font-medium text-lg`}>
                          {existingPhone.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Số điện thoại đã tồn tại trong hệ thống!
                    </h3>
                    <div className="mt-1">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">{existingPhone.full_name}</span> -
                        <span className="italic ml-1">{
                          existingPhone.role === "admin" ? "Quản trị viên" :
                          existingPhone.role === "NVBH" ? "Nhân viên bán hàng" :
                          existingPhone.role === "NVK" ? "Nhân viên kho" :
                          existingPhone.role
                        }</span>
                      </p>
                      <p className="text-sm text-yellow-700">
                        {existingPhone.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thông tin tài khoản */}
            <div>
              <h2 className={`text-lg font-semibold ${textColor} mb-3`}>Thông tin tài khoản</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md">
                    <input
                      type="email"
                      id="email"
                      autoComplete="email"
                      className={`block w-full h-11 text-base px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-${themeName}-500 focus:border-${themeName}-500 ${errors.email ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      style={{ borderColor: errors.email ? '#f87171' : undefined, boxShadow: errors.email ? '0 0 0 1px #f87171' : undefined }}
                      {...register('email')}
                      onChange={(e) => {
                        register('email').onChange(e);
                        handleEmailChange(e);
                      }}
                    />
                    {checkingEmail && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    {errors.email && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                {/* Vai trò */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md">
                    <select
                      id="role"
                      className={`block w-full h-11 text-base px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-${themeName}-500 focus:border-${themeName}-500 ${errors.role ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      style={{ borderColor: errors.role ? '#f87171' : undefined, boxShadow: errors.role ? '0 0 0 1px #f87171' : undefined }}
                      {...register('role')}
                    >
                      <option value="">-- Chọn vai trò --</option>
                      {Object.entries(ROLES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {errors.role && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.role && (
                    <p className="mt-2 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>

                {/* Mật khẩu */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className={`text-xs text-${themeName}-600 hover:text-${themeName}-800 font-medium`}
                    >
                      Tạo mật khẩu ngẫu nhiên
                    </button>
                  </div>
                  <div className="relative rounded-md">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      autoComplete="new-password"
                      className={`block w-full h-11 text-base px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-${themeName}-500 focus:border-${themeName}-500 ${errors.password ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      style={{ borderColor: errors.password ? '#f87171' : undefined, boxShadow: errors.password ? '0 0 0 1px #f87171' : undefined }}
                      {...register('password', {
                        onChange: (e) => {
                          setPasswordValue(e.target.value);
                        }
                      })}
                      value={passwordValue}
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
                    {errors.password && (
                      <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Xác nhận mật khẩu */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      autoComplete="new-password"
                      className={`block w-full h-11 text-base px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-${themeName}-500 focus:border-${themeName}-500 ${errors.confirmPassword ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      style={{ borderColor: errors.confirmPassword ? '#f87171' : undefined, boxShadow: errors.confirmPassword ? '0 0 0 1px #f87171' : undefined }}
                      {...register('confirmPassword', {
                        onChange: (e) => {
                          setConfirmPasswordValue(e.target.value);
                        }
                      })}
                      value={confirmPasswordValue}
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
                    {errors.confirmPassword && (
                      <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Thông tin cá nhân */}
            <div>
              <h2 className={`text-lg font-semibold ${textColor} mb-3`}>Thông tin cá nhân</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Họ tên */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md">
                    <input
                      type="text"
                      id="fullName"
                      autoComplete="name"
                      className={`block w-full h-11 text-base px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-${themeName}-500 focus:border-${themeName}-500 ${errors.fullName ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      style={{ borderColor: errors.fullName ? '#f87171' : undefined, boxShadow: errors.fullName ? '0 0 0 1px #f87171' : undefined }}
                      {...register('fullName')}
                    />
                    {errors.fullName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.fullName && (
                    <p className="mt-2 text-sm text-red-600">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Số điện thoại */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative rounded-md">
                    <input
                      type="text"
                      id="phone"
                      autoComplete="tel"
                      placeholder="0xxxxxxxxx"
                      className={`block w-full h-11 text-base px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-${themeName}-500 focus:border-${themeName}-500 ${errors.phone ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                      style={{ borderColor: errors.phone ? '#f87171' : undefined, boxShadow: errors.phone ? '0 0 0 1px #f87171' : undefined }}
                      {...register('phone')}
                      onChange={(e) => {
                        register('phone').onChange(e);
                        handlePhoneChange(e);
                      }}
                    />
                    {checkingPhone && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                    {errors.phone && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.phone && (
                    <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                {/* Địa chỉ */}
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ
                  </label>
                  <div className="relative rounded-md">
                    <input
                      type="text"
                      id="address"
                      autoComplete="street-address"
                      className={`block w-full h-11 text-base px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-opacity-50 focus:ring-${themeName}-500 focus:border-${themeName}-500`}
                      {...register('address')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tùy chọn gửi mật khẩu qua email */}
            <div className="flex items-center">
              <input
                id="sendPassword"
                type="checkbox"
                className={`h-4 w-4 text-${themeName}-600 focus:ring-${themeName}-500 border-gray-300 rounded`}
                checked={sendPassword}
                onChange={(e) => {
                  setSendPassword(e.target.checked);
                  setValue('sendPassword', e.target.checked);
                }}
              />
              <label htmlFor="sendPassword" className="ml-2 block text-sm text-gray-700">
                Gửi email kèm thông tin mật khẩu tạm thời
              </label>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    // Reset form với các giá trị mặc định
                    reset({
                      email: '',
                      password: '',
                      confirmPassword: '',
                      fullName: '',
                      phone: '',
                      address: '',
                      role: '',
                      sendPassword: true,
                    });

                    // Đặt lại các state
                    setPasswordValue('');
                    setConfirmPasswordValue('');
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                    setExistingUser(null);
                    setExistingPhone(null);
                    setCheckingEmail(false);
                    setCheckingPhone(false);
                    setSendPassword(true);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="py-2.5 px-5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150"
                  disabled={isLoading}
                >
                  Làm mới
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (existingUser !== null) || (existingPhone !== null)}
                  className={`py-2.5 px-5 border rounded-md shadow-sm text-sm font-medium transition duration-150 ${
                    isLoading || existingUser || existingPhone
                      ? 'border-gray-300 bg-white text-gray-500 cursor-not-allowed'
                      : `border-transparent text-white bg-${themeName}-600 hover:bg-${themeName}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeName}-500`
                  }`}
                  style={{ backgroundColor: (existingUser || existingPhone || isLoading) ? undefined : themeColor }}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : existingUser ? 'Email đã tồn tại' : existingPhone ? 'Số điện thoại đã tồn tại' : 'Thêm người dùng'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}