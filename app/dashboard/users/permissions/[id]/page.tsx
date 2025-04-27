'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClient } from '@/utils/supabase/client'
import { 
  UserCircleIcon, 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ShieldCheckIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

// Schema validation cho form phân quyền
const permissionsSchema = z.object({
  role: z.string().min(1, { message: 'Vui lòng chọn vai trò' }),
  status: z.string().min(1, { message: 'Vui lòng chọn trạng thái' }),
});

type PermissionsFormValues = z.infer<typeof permissionsSchema>;

// Ánh xạ vai trò từ giá trị đến tên hiển thị
const ROLES = {
  'admin': 'Quản trị viên',
  'NVBH': 'Nhân viên bán hàng',
  'NVK': 'Nhân viên kho',
  'NVQLDH': 'Nhân viên quản lý đơn hàng'
};

// Ánh xạ trạng thái
const STATUS = {
  'active': 'Đang hoạt động',
  'inactive': 'Không hoạt động'
};

export default function UserPermissionsPage(props: { params: Promise<{ id: string }> }) {
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
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // Lấy thông tin theme
  const themeContext = useTheme();
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  });

  // Form validation
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      role: '',
      status: '',
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
          router.push(`/auth/signin?redirectTo=/dashboard/users/permissions/${userId}`);
          return;
        }
        
        // Lưu ID của người dùng đang đăng nhập
        const currentUserId = session.user.id;
        
        // Kiểm tra xem có phải đang phân quyền chính mình không
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
        
        // Xác định nếu đang xem phân quyền của người khác
        const isViewingOtherUser = currentUserId !== userId;
        
        // Chỉ admin mới có quyền phân quyền người khác
        const isAdmin = accountData.role === 'admin';
        
        if (isViewingOtherUser && !isAdmin) {
          // Nếu không phải admin và đang cố xem phân quyền người khác, từ chối truy cập
          setAccessDenied(true);
          const friendlyRoleName = ROLES[accountData.role as keyof typeof ROLES] || accountData.role;
          setError(`Truy cập bị từ chối. Bạn là ${friendlyRoleName}, chỉ admin mới có quyền quản lý phân quyền người dùng khác.`);
          setLoading(false);
        } else {
          // Nếu là admin hoặc đang xem phân quyền của chính mình, cho phép truy cập
          setAccessDenied(false);
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
      
      const supabase = createClient();
      console.log('Đang tải thông tin phân quyền cho user ID:', userId);
      
      // Đầu tiên lấy thông tin từ bảng users để hiển thị tên và email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          user_id,
          email,
          full_name,
          created_at
        `)
        .eq('user_id', userId)
        .maybeSingle();
      
      // Nếu không tìm thấy bằng user_id, thử với id
      if (userError || !userData) {
        console.log('Không tìm thấy dữ liệu với user_id, thử với id');
        const { data: userData2, error: userError2 } = await supabase
          .from('users')
          .select(`
            id,
            user_id,
            email,
            full_name,
            created_at
          `)
          .eq('id', userId)
          .maybeSingle();
        
        // Nếu cả hai cách đều không tìm được
        if (userError2 || !userData2) {
          console.error('Không tìm thấy user với cả id và user_id:', userError2);
          setError('Không tìm thấy thông tin người dùng. Vui lòng thử lại sau.');
          setLoading(false);
          return;
        }
        
        // Tiếp tục với dữ liệu tìm được bằng id
        // Lấy thông tin tài khoản từ bảng accounts
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
        
        // Kiểm tra nếu người dùng đang xem là admin
        if (combinedData.role === 'admin' && userRole === 'admin' && !isCurrentUser) {
          // Hiển thị thông báo không thể chỉnh sửa admin khác
          setError('Người dùng này cũng là admin và không thể bị chỉnh sửa quyền. Vui lòng liên hệ bộ phận quản trị hệ thống để thay đổi.');
        }
        
        populateForm(accountData || { role: 'admin', status: 'active' });
        setLoading(false);
        return;
      }
      
      // Trường hợp tìm thấy bằng user_id
      console.log('Đã tìm thấy thông tin người dùng (user_id):', userData);
      
      // Lấy thông tin tài khoản từ bảng accounts
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
      
      // Kiểm tra nếu người dùng đang xem là admin
      if (combinedData.role === 'admin' && userRole === 'admin' && !isCurrentUser) {
        // Hiển thị thông báo không thể chỉnh sửa admin khác
        setError('Người dùng này cũng là admin và không thể bị chỉnh sửa quyền. Vui lòng liên hệ bộ phận quản trị hệ thống để thay đổi.');
      }
      
      populateForm(accountData || { role: 'admin', status: 'active' });
      setLoading(false);
    } catch (error: any) {
      console.error('Lỗi khi tải thông tin người dùng:', error);
      setError('Không thể tải thông tin người dùng: ' + error.message);
      setLoading(false);
    }
  };

  // Hàm điền thông tin vào form từ dữ liệu
  const populateForm = (accountData: any) => {
    if (!accountData) return;
    
    setValue('role', accountData.role || '');
    setValue('status', accountData.status || '');
    
    console.log('Đã điền các trường sau vào form:', {
      role: accountData.role,
      status: accountData.status
    });
  };

  // Xử lý submit form
  const onSubmit = async (data: PermissionsFormValues) => {
    if (!userId || !originalData) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Kiểm tra nếu người dùng đang chỉnh sửa là admin
      if (originalData.role === 'admin') {
        // Không cho phép chỉnh sửa admin khác
        setError('Không thể chỉnh sửa quyền của admin khác. Vui lòng liên hệ bộ phận quản trị hệ thống để thay đổi.');
        setSaving(false);
        return;
      }
      
      const supabase = createClient();
      
      console.log('Đang cập nhật phân quyền người dùng:', data);
      
      // Xác định trường ID cần dùng
      const user_id = originalData.user_id || originalData.id;
      
      if (!user_id) {
        throw new Error('Không thể xác định ID của người dùng cần cập nhật');
      }
      
      // Cập nhật thông tin trong bảng accounts
      const { error: accountUpdateError } = await supabase
        .from('accounts')
        .update({
          role: data.role,
          status: data.status
        })
        .eq('user_id', user_id);
      
      if (accountUpdateError) {
        console.error('Lỗi khi cập nhật quyền người dùng:', accountUpdateError);
        throw accountUpdateError;
      }

      // Cập nhật originalData để hiển thị dữ liệu mới
      setOriginalData({
        ...originalData,
        role: data.role,
        status: data.status
      });
      
      // Hiển thị thông báo thành công
      setSuccess('Cập nhật phân quyền người dùng thành công');
      
    } catch (error: any) {
      console.error('Lỗi khi cập nhật quyền:', error);
      setError(error.message || 'Đã xảy ra lỗi khi cập nhật quyền');
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
          <h1 className="text-2xl font-semibold text-gray-900">Quản lý phân quyền người dùng</h1>
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
          {/* Header thông tin người dùng với avatar */}
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
                  <h2 className="text-2xl font-bold text-gray-900">{originalData.full_name || 'Chưa cập nhật'}</h2>
                  <p className="text-gray-600">{originalData.email}</p>
                  {/* Hiển thị vai trò và trạng thái hiện tại */}
                  <div className="mt-2 flex space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-${themeColor}-800`}>
                      {ROLES[originalData.role as keyof typeof ROLES] || originalData.role || 'Chưa cập nhật'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${originalData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {STATUS[originalData.status as keyof typeof STATUS] || originalData.status || 'Chưa cập nhật'}
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
                <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start mb-4">
                  <XCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">Người dùng này cũng là admin và không thể bị chỉnh sửa quyền. Vui lòng liên hệ bộ phận quản trị hệ thống để thay đổi.</p>
                </div>
              )}
              
              {isCurrentUser && userRole !== 'admin' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-blue-700">Đây là thông tin phân quyền tài khoản của bạn. Chỉ quản trị viên mới có thể thay đổi thông tin này.</p>
                </div>
              )}

              {isCurrentUser && userRole === 'admin' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start mb-4">
                  <XCircleIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">Bạn không thể thay đổi quyền của chính mình để đảm bảo an toàn hệ thống.</p>
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
              
              {/* Phân quyền người dùng */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className={`text-lg font-medium text-${themeColor}-600 mb-5 flex items-center`}>
                  <KeyIcon className="h-5 w-5 mr-2" />
                  {userRole === 'admin' && !isCurrentUser ? 'Thiết lập phân quyền' : 'Thông tin phân quyền'}
                </h3>
                
                <div className="space-y-6">
                  {/* Vai trò */}
                  <div className="w-full">
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Vai trò {userRole === 'admin' && !isCurrentUser && originalData?.role !== 'admin' && <span className="text-red-500">*</span>}
                    </label>
                    {/* Nếu là admin đang xem phân quyền người khác và người đó không phải admin → hiển thị select */}
                    {userRole === 'admin' && !isCurrentUser && originalData?.role !== 'admin' ? (
                      <>
                        <select
                          id="role"
                          {...register('role')}
                          className={`block w-full px-4 py-3 rounded-md shadow-sm ${
                            errors.role 
                              ? 'border-red-300 bg-red-50' 
                              : `border-${themeColor}-300`
                          } focus:ring-${themeColor}-500 focus:border-${themeColor}-500 text-base`}
                        >
                          <option value="">-- Chọn vai trò --</option>
                          {Object.entries(ROLES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {errors.role && (
                          <p className="mt-1.5 text-sm text-red-600">{errors.role.message}</p>
                        )}
                      </>
                    ) : (
                      /* Nếu người dùng thường hoặc admin xem phân quyền của chính mình hoặc admin khác → hiển thị text */
                      <div className="px-4 py-3 bg-gray-100 rounded-md border border-gray-300 text-gray-800">
                        {ROLES[originalData?.role as keyof typeof ROLES] || originalData?.role || 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>
                  
                  {/* Trạng thái */}
                  <div className="w-full">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Trạng thái {userRole === 'admin' && !isCurrentUser && originalData?.role !== 'admin' && <span className="text-red-500">*</span>}
                    </label>
                    {/* Nếu là admin đang xem phân quyền người khác và người đó không phải admin → hiển thị select */}
                    {userRole === 'admin' && !isCurrentUser && originalData?.role !== 'admin' ? (
                      <>
                        <select
                          id="status"
                          {...register('status')}
                          className={`block w-full px-4 py-3 rounded-md shadow-sm ${
                            errors.status 
                              ? 'border-red-300 bg-red-50' 
                              : `border-${themeColor}-300`
                          } focus:ring-${themeColor}-500 focus:border-${themeColor}-500 text-base`}
                        >
                          <option value="">-- Chọn trạng thái --</option>
                          {Object.entries(STATUS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {errors.status && (
                          <p className="mt-1.5 text-sm text-red-600">{errors.status.message}</p>
                        )}
                      </>
                    ) : (
                      /* Nếu người dùng thường hoặc admin xem phân quyền của chính mình hoặc admin khác → hiển thị text */
                      <div className={`px-4 py-3 rounded-md border ${
                        originalData?.status === 'active' 
                          ? 'bg-green-50 border-green-200 text-green-800' 
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        {STATUS[originalData?.status as keyof typeof STATUS] || originalData?.status || 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Thông tin quyền */}
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <h3 className={`text-md font-medium text-yellow-800 mb-3 flex items-center`}>
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Thông tin về quyền hạn
                </h3>
                
                <div className="space-y-2 text-sm text-yellow-700">
                  <p><strong>Quản trị viên (Admin):</strong> Có toàn quyền quản lý hệ thống, bao gồm phân quyền, quản lý người dùng, và tất cả các chức năng khác.</p>
                  <p><strong>Nhân viên bán hàng (NVBH):</strong> Có quyền quản lý đơn hàng, tạo đơn hàng mới, xem danh sách sản phẩm, quản lý khách hàng.</p>
                  <p><strong>Nhân viên kho (NVK):</strong> Có quyền quản lý kho, nhập/xuất hàng, kiểm kho, quản lý sản phẩm.</p>
                  /*<p><strong>Nhân viên quản lý đơn hàng (NVQLDH):</strong> Có quyền xem và cập nhật trạng thái đơn hàng, quản lý giao hàng.</p>*/
                </div>
              </div>
            </div>
            
            {/* Form actions */}
            <div className="px-6 py-5 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-between items-center">
              <div className="mt-3 sm:mt-0">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Quay lại
                </button>
              </div>
              
              {/* Chỉ hiển thị nút Lưu khi là admin xem phân quyền người khác và người dùng đó không phải admin */}
              {userRole === 'admin' && !isCurrentUser && originalData?.role !== 'admin' && (
                <div className="w-full sm:w-auto">
                  <button
                    type="submit"
                    className={`w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${theme.buttonBg} ${theme.buttonHoverBg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}