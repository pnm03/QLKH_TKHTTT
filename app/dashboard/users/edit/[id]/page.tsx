'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import React from 'react'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClient } from '@/utils/supabase/client'
import { 
  UserCircleIcon, 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

// Schema validation for form
const userSchema = z.object({
  fullName: z.string().min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' }),
  email: z.string().email({ message: 'Email không hợp lệ' }),
  phone: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  hometown: z.string().nullable().optional(),
  role: z.string().optional(), // Thêm trường role
  status: z.string().optional(), // Thêm trường status
});

type UserFormValues = z.infer<typeof userSchema>;

// Ánh xạ vai trò từ giá trị đến tên hiển thị - Giữ lại để hiển thị
const ROLES = {
  'admin': 'Quản trị viên',
  'NVBH': 'Nhân viên bán hàng',
  'NVK': 'Nhân viên kho',
  'NVQLDH': 'Nhân viên quản lý đơn hàng'
};

// Bỏ mapping trạng thái STATUS vì không còn dùng đến

export default function EditUserPage(props: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // Lấy thông tin theme
  const themeContext = useTheme();
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  });

  // Form validation
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      hometown: '',
    }
  });

  // Đánh dấu component đã mounted và lấy userId từ params
  useEffect(() => {
    setMounted(true);
    
    // Lấy userId từ params khi component được mount
    const extractUserId = async () => {
      try {
        const { id } = await props.params;
        setUserId(id);
      } catch (error) {
        console.error('Lỗi khi lấy userId từ params:', error);
        setError('Không thể xác định người dùng. Vui lòng thử lại sau.');
      }
    };
    
    extractUserId();
  }, [props.params]);

  // Đảm bảo theme luôn có giá trị mặc định
  useEffect(() => {
    if (mounted) {
      // Đảm bảo theme luôn có giá trị mặc định
      if (!themeContext.currentTheme || !themeContext.currentTheme.textColor) {
        setThemeState({
          theme: {
            ...themeColors.indigo,
            textColor: 'text-indigo-600',
            name: 'indigo',
            buttonBg: 'bg-indigo-600',
            buttonHoverBg: 'hover:bg-indigo-700'
          }
        });
      } else {
        setThemeState({
          theme: themeContext.currentTheme
        });
      }
    }
  }, [mounted, themeContext.currentTheme]);

  // Kiểm tra phiên đăng nhập và quyền
  useEffect(() => {
    const checkSessionAndPermission = async () => {
      if (!mounted || !userId) return;
      
      try {
        const supabase = createClient();
        
        // Kiểm tra phiên đăng nhập
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('Không có phiên đăng nhập hợp lệ:', sessionError?.message);
          await supabase.auth.signOut();
          router.push(`/auth/signin?redirectTo=/dashboard/users/edit/${userId}`);
          return;
        }
        
        // Lưu ID của người dùng đang đăng nhập
        const currentUserId = session.user.id;
        // Kiểm tra xem người dùng có phải đang chỉnh sửa thông tin của chính mình
        setIsCurrentUser(currentUserId === userId);
        
        // Kiểm tra quyền
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('role')
          .eq('user_id', currentUserId)
          .maybeSingle();
        
        if (accountError) {
          console.error('Lỗi khi lấy vai trò:', accountError);
          setAccessDenied(true);
          setError('Không thể xác minh quyền của bạn. Vui lòng đăng nhập lại.');
          setLoading(false);
          return;
        }
        
        if (!accountData) {
          setAccessDenied(true);
          setError('Không tìm thấy thông tin tài khoản của bạn.');
          setLoading(false);
          return;
        }
        
        setUserRole(accountData.role);
        
        // Kiểm tra xem người dùng có phải là admin hay đang chỉnh sửa thông tin của chính mình
        const isAdmin = accountData.role === 'admin';
        const isEditingSelf = currentUserId === userId;
        
        if (!isAdmin && !isEditingSelf) {
          // Nếu không phải admin và không phải đang chỉnh sửa thông tin của chính mình
          setAccessDenied(true);
          const friendlyRoleName = ROLES[accountData.role as keyof typeof ROLES] || accountData.role;
          setError(`Truy cập bị từ chối. Bạn là ${friendlyRoleName}, chỉ có thể chỉnh sửa thông tin của chính mình.`);
          setLoading(false);
        } else {
          // Nếu là admin hoặc đang chỉnh sửa thông tin của chính mình
          setAccessDenied(false);
          // Tiếp tục tải thông tin người dùng
          loadUserData();
        }
      } catch (error: any) {
        console.error('Lỗi khi kiểm tra phiên:', error);
        setError('Đã xảy ra lỗi khi kiểm tra quyền. Vui lòng thử lại sau.');
        setLoading(false);
      }
    };
    
    checkSessionAndPermission();
  }, [mounted, router, userId]);

  // Hàm tải thông tin người dùng từ database
  const loadUserData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Lấy thông tin phiên của người dùng hiện tại
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Không có phiên đăng nhập hợp lệ:', sessionError?.message);
        router.push('/auth/signin');
        return;
      }
      
      const currentUserId = session.user.id;
      setIsCurrentUser(currentUserId === userId);
      
      // Kiểm tra quyền của người dùng hiện tại
      const { data: currentUserRoleData, error: currentUserRoleError } = await supabase
        .from('accounts')
        .select('role')
        .eq('user_id', currentUserId)
        .maybeSingle();
      
      if (currentUserRoleError) {
        console.error('Lỗi khi lấy quyền người dùng hiện tại:', currentUserRoleError);
        setError('Không thể xác minh quyền của bạn. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }
      
      const currentUserRole = currentUserRoleData?.role || '';
      setUserRole(currentUserRole);
      
      console.log('Đang tải thông tin người dùng với ID:', userId);
      
      // Đầu tiên lấy thông tin từ bảng users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          user_id,
          full_name,
          email,
          phone,
          birth_date,
          hometown,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .maybeSingle();
      
      // Nếu không tìm thấy bằng user_id, thử với id
      if (userError || !userData) {
        console.log('Không tìm thấy user với user_id, thử với id');
        const { data: userData2, error: userError2 } = await supabase
          .from('users')
          .select(`
            id,
            user_id,
            full_name,
            email,
            phone,
            birth_date,
            hometown,
            created_at,
            updated_at
          `)
          .eq('id', userId)
          .maybeSingle();
        
        if (userError2 || !userData2) {
          console.error('Không tìm thấy user với cả id và user_id:', userError2);
          // Hiển thị form với dữ liệu mẫu
          const sampleData = {
            user_id: userId,
            full_name: 'Nguyễn Văn A',
            email: 'nguyenvana@example.com',
            phone: '0912345678',
            hometown: 'Hà Nội, Việt Nam',
            birth_date: '1990-01-01',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            role: 'admin',
            status: 'active',
            last_login: new Date().toISOString()
          };
          
          console.log('Sử dụng dữ liệu mẫu để kiểm tra giao diện:', sampleData);
          setOriginalData(sampleData);
          populateForm(sampleData);
          setLoading(false);
          setError('⚠️ Đang hiển thị dữ liệu mẫu do không thể tải thông tin từ cơ sở dữ liệu');
          return;
        }
        
        // Lấy thêm thông tin từ bảng accounts
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('role, status, last_login')
          .eq('user_id', userData2.user_id)
          .maybeSingle();
        
        if (accountError) {
          console.warn('Không tìm thấy thông tin tài khoản:', accountError);
        }
        
        // Gộp thông tin từ cả users và accounts
        const combinedData = {
          ...userData2,
          role: accountData?.role || 'admin',
          status: accountData?.status || 'active',
          last_login: accountData?.last_login || null
        };
        
        console.log('Dữ liệu người dùng (id):', combinedData);
        
        setOriginalData(combinedData);
        
        populateForm(combinedData);
        setLoading(false);
        return;
      }
      
      // Trường hợp tìm thấy bằng user_id
      console.log('Đã tìm thấy thông tin người dùng (user_id):', userData);
      
      // Lấy thêm thông tin từ bảng accounts
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('role, status, last_login')
        .eq('user_id', userData.user_id)
        .maybeSingle();
      
      if (accountError) {
        console.warn('Không tìm thấy thông tin tài khoản:', accountError);
      }
      
      // Gộp thông tin từ cả users và accounts
      const combinedData = {
        ...userData,
        role: accountData?.role || 'admin',
        status: accountData?.status || 'active',
        last_login: accountData?.last_login || null
      };
      
      console.log('Dữ liệu người dùng (user_id):', combinedData);
      
      setOriginalData(combinedData);
      
      populateForm(combinedData);
      setLoading(false);
      
    } catch (error: any) {
      console.error('Lỗi khi tải thông tin người dùng:', error);
      setError('Không thể tải thông tin người dùng: ' + error.message);
      setLoading(false);
    }
  };
  
  // Hàm định dạng ngày mặc định nếu không có
  const getDefaultBirthDate = (): string => {
    // Mặc định là 01/01/2005 (18 tuổi)
    return '2005-01-01';
  };

  // Hàm điền thông tin vào form khi tải dữ liệu từ DB
  const populateForm = (userData: any) => {
    if (!userData) return;
    
    // Điền các giá trị vào form
    setValue('fullName', userData.full_name || '');
    setValue('email', userData.email || '');
    setValue('phone', userData.phone || '');
    setValue('birthDate', userData.birth_date ? formatDate(userData.birth_date) : '');
    setValue('hometown', userData.hometown || '');
    
    if (userData.role) {
      setValue('role', userData.role);
    }
    
    if (userData.status) {
      setValue('status', userData.status);
    }
    
    console.log('Đã điền form với dữ liệu:', userData);
  };

  // Hàm định dạng ngày tháng cho input date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return ''; // Trả về chuỗi rỗng nếu ngày không hợp lệ
      
      // Format theo định dạng yyyy-MM-dd cho input type="date"
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Lỗi khi định dạng ngày tháng:', error);
      return '';
    }
  };

  // Xử lý submit form
  const onSubmit = async (data: UserFormValues) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Kiểm tra nếu người dùng đang chỉnh sửa là admin khác
      if (originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser) {
        // Không cho phép chỉnh sửa admin khác
        setError('Không thể chỉnh sửa thông tin của admin khác.');
        setSaving(false);
        return;
      }
      
      const supabase = createClient();
      
      // Xác định trường ID cần dùng
      const user_id = originalData?.user_id || userId;
      
      if (!user_id) {
        throw new Error('Không thể xác định ID của người dùng cần cập nhật');
      }
      
      console.log('Đang cập nhật thông tin người dùng:', data);
      
      // Định dạng ngày tháng từ chuỗi ngày nhập vào
      let formattedBirthDate = null;
      if (data.birthDate) {
        formattedBirthDate = data.birthDate;
      }
      
      // Cập nhật thông tin trong bảng users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          birth_date: formattedBirthDate,
          hometown: data.hometown,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id);
      
      if (updateError) {
        console.error('Lỗi khi cập nhật người dùng:', updateError);
        throw updateError;
      }
      
      // Hiển thị thông báo thành công
      setSuccess('Cập nhật thông tin người dùng thành công');
      
      // Cập nhật lại dữ liệu gốc sau khi lưu
      setOriginalData({
        ...originalData,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        birth_date: formattedBirthDate,
        hometown: data.hometown,
        updated_at: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Lỗi khi cập nhật:', error);
      setError(error.message || 'Đã xảy ra lỗi khi cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  // Không render khi chưa mounted
  if (!mounted) {
    return null;
  }

  const { theme } = themeState;
  // Đảm bảo themeColor luôn có giá trị mặc định
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] || 'indigo' : 'indigo';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header và navigation */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Quay lại"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Chỉnh sửa thông tin người dùng</h1>
        </div>
        
        <div className="mt-4 md:mt-0 flex space-x-2">
          {userId && originalData && (
            <button
              onClick={() => setShowDetailModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <UserCircleIcon className="h-4 w-4 mr-2" />
              Xem chi tiết
            </button>
          )}
        </div>
      </div>

      {/* Nội dung chính */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-lg shadow">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-500">Đang tải thông tin...</p>
        </div>
      ) : error && accessDenied ? (
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
      ) : error ? (
        <div className="py-10 text-center bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Lỗi</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Quay lại
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          {/* Header thông tin người dùng với avatar - Thay đổi màu chữ */}
          {originalData && (
            <div className={`px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-${themeColor}-500 to-${themeColor}-600`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center border-4 border-white overflow-hidden shadow-md">
                    <span className={`text-${themeColor}-600 text-3xl font-bold`}>
                      {originalData.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-6">
                  {/* Thay đổi màu chữ từ trắng sang màu đen */}
                  <h2 className="text-2xl font-bold text-gray-900">{originalData.full_name || 'Chưa cập nhật'}</h2>
                  <p className="text-gray-700">{originalData.email}</p>
                  {/* Chỉ hiển thị vai trò, không có trạng thái */}
                  <div className="mt-2 flex space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-${themeColor}-800`}>
                      {ROLES[originalData.role as keyof typeof ROLES] || originalData.role || 'Chưa cập nhật'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Form content */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-6">
              {/* Thông báo */}
              {originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-yellow-700">Người dùng này cũng là admin. Bạn chỉ có thể xem nhưng không thể chỉnh sửa thông tin của họ.</p>
                </div>
              )}
              
              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-start mb-4">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}
              
              {error && !accessDenied && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start mb-4">
                  <XCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {/* Thông tin cơ bản */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className={`text-lg font-medium text-${themeColor}-600 mb-5 flex items-center`}>
                  <UserCircleIcon className="h-5 w-5 mr-2" />
                  Thông tin cá nhân
                </h3>
                
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:space-x-6">
                    <div className="w-full md:w-1/2">
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        {...register('fullName')}
                        className={`block w-full px-4 py-3 rounded-md shadow-sm ${
                          errors.fullName 
                            ? 'border-red-300 bg-red-50' 
                            : originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser
                              ? 'border-gray-300 bg-gray-100 text-gray-700'
                              : `border-${themeColor}-300`
                        } focus:ring-${themeColor}-500 focus:border-${themeColor}-500 text-base`}
                        disabled={originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser}
                      />
                      {errors.fullName && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.fullName.message}</p>
                      )}
                    </div>
                    
                    <div className="w-full md:w-1/2 mt-6 md:mt-0">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        {...register('email')}
                        className={`block w-full px-4 py-3 rounded-md shadow-sm ${
                          errors.email 
                            ? 'border-red-300 bg-red-50' 
                            : originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser
                              ? 'border-gray-300 bg-gray-100 text-gray-700'
                              : `border-${themeColor}-300`
                        } focus:ring-${themeColor}-500 focus:border-${themeColor}-500 text-base`}
                        disabled={originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:space-x-6">
                    <div className="w-full md:w-1/2">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        id="phone"
                        {...register('phone')}
                        placeholder="VD: 0912345678"
                        className={`block w-full px-4 py-3 rounded-md shadow-sm ${
                          errors.phone 
                            ? 'border-red-300 bg-red-50' 
                            : originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser
                              ? 'border-gray-300 bg-gray-100 text-gray-700'
                              : `border-${themeColor}-300`
                        } focus:ring-${themeColor}-500 focus:border-${themeColor}-500 text-base`}
                        disabled={originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser}
                      />
                      {errors.phone && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                    
                    <div className="w-full md:w-1/2 mt-6 md:mt-0">
                      <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Ngày sinh
                      </label>
                      <input
                        type="date"
                        id="birthDate"
                        {...register('birthDate')}
                        className={`block w-full px-4 py-3 rounded-md shadow-sm ${
                          errors.birthDate 
                            ? 'border-red-300 bg-red-50' 
                            : originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser
                              ? 'border-gray-300 bg-gray-100 text-gray-700'
                              : `border-${themeColor}-300`
                        } focus:ring-${themeColor}-500 focus:border-${themeColor}-500 text-base`}
                        disabled={originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser}
                      />
                      {errors.birthDate && (
                        <p className="mt-1.5 text-sm text-red-600">{errors.birthDate.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="hometown" className="block text-sm font-medium text-gray-700 mb-2">
                      Địa chỉ
                    </label>
                    <textarea
                      id="hometown"
                      rows={3}
                      {...register('hometown')}
                      className={`block w-full px-4 py-3 rounded-md shadow-sm ${
                        errors.hometown 
                          ? 'border-red-300 bg-red-50' 
                          : originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser
                            ? 'border-gray-300 bg-gray-100 text-gray-700'
                            : `border-${themeColor}-300`
                      } focus:ring-${themeColor}-500 focus:border-${themeColor}-500 text-base`}
                      disabled={originalData?.role === 'admin' && userRole === 'admin' && !isCurrentUser}
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Thông tin thời gian */}
              {originalData && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className={`text-lg font-medium text-${themeColor}-600 mb-5 flex items-center`}>
                    <ClockIcon className="h-5 w-5 mr-2" />
                    Thông tin thời gian
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
                    <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                      <div className="text-gray-500 mb-1.5">Ngày tạo</div>
                      <div className="font-medium">{originalData.created_at ? new Date(originalData.created_at).toLocaleString('vi-VN') : 'Không có dữ liệu'}</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                      <div className="text-gray-500 mb-1.5">Cập nhật lần cuối</div>
                      <div className="font-medium">{originalData.updated_at ? new Date(originalData.updated_at).toLocaleString('vi-VN') : 'Chưa cập nhật'}</div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                      <div className="text-gray-500 mb-1.5">Đăng nhập gần đây</div>
                      <div className="font-medium">{originalData.last_login ? new Date(originalData.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Form actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
              >
                Quay lại
              </button>
              
              {/* Hiển thị nút lưu chỉ khi người dùng là admin và không phải đang chỉnh sửa admin khác, hoặc khi người dùng đang chỉnh sửa chính mình */}
              {((userRole === 'admin' && (originalData?.role !== 'admin' || isCurrentUser)) || (originalData?.user_id === userId)) && (
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang lưu...
                    </>
                  ) : 'Lưu thay đổi'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Thêm modal chi tiết người dùng - Sử dụng lại thiết kế từ trang tìm kiếm */}
      {showDetailModal && originalData && (
        <>
          {/* Overlay để làm tối nền bên dưới, nhưng không có màu xám */}
          <div className="fixed inset-0 z-40 backdrop-brightness-[0.5] backdrop-blur-[0.8px]" onClick={() => setShowDetailModal(false)}></div>
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen">
              <div className="bg-white rounded-xl overflow-hidden shadow-2xl transform transition-all w-full max-w-3xl mx-auto border border-${themeColor}-300" onClick={(e) => e.stopPropagation()}>
                {/* Modal header */}
                <div className="bg-white px-6 py-4 border-b border-gray-100 sm:px-6 flex justify-between items-center">
                  <h3 className="text-xl leading-6 font-medium text-gray-900 flex items-center">
                    <UserCircleIcon className="h-6 w-6 mr-2 text-gray-500" />
                    Chi tiết người dùng
                  </h3>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-500 focus:outline-none transition-colors"
                    onClick={() => setShowDetailModal(false)}
                  >
                    <span className="sr-only">Đóng</span>
                    <XCircleIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                {/* Modal content */}
                <div className="bg-white px-6 py-5">
                  <div>
                    {/* Thông tin cơ bản */}
                    <div className="border-b border-gray-100 pb-6 flex items-start md:items-center flex-col md:flex-row">
                      <div className="flex-shrink-0 mb-4 md:mb-0">
                        <div className={`h-24 w-24 bg-${themeColor}-100 rounded-full flex items-center justify-center border-[1px] border-${themeColor}-300 overflow-hidden shadow-md`}>
                          <span className={`text-${themeColor}-800 text-3xl font-medium relative z-10`}>
                            {originalData.full_name ? originalData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : ''}
                          </span>
                          <div className={`absolute inset-0 bg-${themeColor}-200 opacity-30 rounded-full`}></div>
                        </div>
                      </div>
                      <div className="md:ml-6 w-full md:w-auto">
                        <h2 className="text-xl font-semibold text-gray-900">{originalData.full_name || 'Chưa cập nhật'}</h2>
                        <p className="text-sm text-gray-500 mt-1">{originalData.email}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${themeColor}-100 text-${themeColor}-800`}>
                            {ROLES[originalData.role as keyof typeof ROLES] || originalData.role || 'Chưa cập nhật'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Thông tin chi tiết */}
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <UserCircleIcon className="h-5 w-5 mr-2 text-gray-500" />
                        Thông tin chi tiết
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <dl className="space-y-4">
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <UserCircleIcon className="h-5 w-5 mr-2 text-gray-400" />
                                Họ và tên
                              </dt>
                              <dd className="text-sm text-gray-900 font-medium">{originalData.full_name || 'Chưa cập nhật'}</dd>
                            </div>
                            
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                Email
                              </dt>
                              <dd className="text-sm text-gray-900">{originalData.email}</dd>
                            </div>
                            
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                                Điện thoại
                              </dt>
                              <dd className="text-sm text-gray-900">{originalData.phone || 'Chưa cập nhật'}</dd>
                            </div>
                            
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                Ngày sinh
                              </dt>
                              <dd className="text-sm text-gray-900">{originalData.birth_date ? new Date(originalData.birth_date).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</dd>
                            </div>
                          </dl>
                        </div>
                        
                        <div>
                          <dl className="space-y-4">
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                Địa chỉ
                              </dt>
                              <dd className="text-sm text-gray-900">{originalData.hometown || 'Chưa cập nhật'}</dd>
                            </div>
                            
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Ngày tạo
                              </dt>
                              <dd className="text-sm text-gray-900">{originalData.created_at ? new Date(originalData.created_at).toLocaleString('vi-VN') : 'Không có dữ liệu'}</dd>
                            </div>
                            
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Cập nhật
                              </dt>
                              <dd className="text-sm text-gray-900">{originalData.updated_at ? new Date(originalData.updated_at).toLocaleString('vi-VN') : 'Chưa cập nhật'}</dd>
                            </div>
                            
                            <div className="flex">
                              <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                                <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Đăng nhập
                              </dt>
                              <dd className="text-sm text-gray-900">{originalData.last_login ? new Date(originalData.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Modal footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="min-w-[100px] py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium text-center"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
