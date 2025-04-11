'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTheme, themeColors } from '@/app/context/ThemeContext'

// Định nghĩa các loại vai trò
const USER_ROLES = {
  admin: 'Quản trị viên',
  sales: 'Nhân viên bán hàng',
  warehouse: 'Nhân viên kho',
  accounting: 'Kế toán',
  customer: 'Khách hàng',
}

type UserRole = keyof typeof USER_ROLES

// Định nghĩa kiểu dữ liệu cho User từ database
interface UserData {
  user_id: string
  full_name: string
  email: string
  hometown: string
  birth_date: string
  phone: string
  created_at: string
  updated_at: string
}

// Định nghĩa kiểu dữ liệu cho Account
interface AccountData {
  account_id: string
  user_id: string
  username: string
  role: UserRole
  status: 'active' | 'locked'
  last_login: string
  created_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  // States cho form chỉnh sửa
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    hometown: '',
    birth_date: '',
  })
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  
  // Lấy thông tin theme từ context nhưng chỉ sử dụng khi component đã mounted
  const themeContext = useTheme()
  
  const [themeState, setThemeState] = useState({
    theme: themeColors.blue
  })
  
  // Đầu component ProfilePage, thêm useEffect mới để dừng loading ngay khi component render
  useEffect(() => {
    // Dừng loading ban đầu sau một khoảng thời gian ngắn 
    // để cải thiện UX, không hiển thị spinner quá lâu
    const initialRenderTimeout = setTimeout(() => {
      setLoading(false);
    }, 800); // Hiển thị spinner trong 800ms cho người dùng biết đang tải
    
    return () => clearTimeout(initialRenderTimeout);
  }, []);

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme
      })
    }
  }, [mounted, themeContext.currentTheme])
  
  useEffect(() => {
    let isMounted = true; // Giúp tránh cập nhật state sau khi component unmount
    
    // Thêm timeout để tránh loading vô hạn
    const loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.log('[Profile] Timeout - dừng loading sau 5 giây');
        setLoading(false);
        setUser({
          email: 'guest@example.com',
          id: 'guest-user',
          user_metadata: {
            name: 'Khách'
          }
        });
        setFormError('Đã hết thời gian tải dữ liệu. Vui lòng làm mới trang.');
      }
    }, 5000); // Timeout sau 5 giây
    
    const fetchUserData = async () => {
      try {
        if (!mounted) return;
        
        // Lấy tham số URL để kiểm tra
        const urlParams = new URLSearchParams(window.location.search);
        const hasNoLoop = urlParams.get('noLoop') === 'true';
        const isLogout = urlParams.get('logout') === 'true';
        
        // Nếu có tham số logout=true, thực hiện đăng xuất ngay lập tức
        if (isLogout) {
          console.log('[Profile] 👋 Phát hiện tham số logout=true, thực hiện đăng xuất ngay');
          handleLogout();
          return;
        }
        
        // Đơn giản hóa: bỏ qua toàn bộ kiểm tra phiên, luôn hiển thị giao diện
        console.log('[Profile] Khởi tạo Supabase client...')
        const supabase = createClient()
        
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !sessionData?.session) {
            console.log('[Profile] Không có phiên hợp lệ, hiển thị dữ liệu guest')
            
            // Hiển thị thông tin khách
            if (isMounted) {
              setUser({
                email: 'guest@example.com',
                id: 'guest-user',
                user_metadata: {
                  name: 'Khách'
                }
              });
              setFormError('Bạn chưa đăng nhập. Một số tính năng có thể bị hạn chế.');
              setLoading(false);
            }
            return;
          }
          
          // Có phiên hợp lệ, tiếp tục lấy dữ liệu
          console.log('[Profile] Đã lấy được phiên đăng nhập')
          const authUser = sessionData.session.user
          if (isMounted) setUser(authUser)

          // Sử dụng setTimeout để ngừng loading sau khoảng thời gian ngắn
          setTimeout(() => {
            if (isMounted) {
              // Set loading = false để hiển thị giao diện
              console.log('[Profile] Thiết lập loading = false sau 500ms');
              setLoading(false);
            }
          }, 500);

          // 2. Lấy thông tin chi tiết user từ database
          console.log('[Profile] Đang truy vấn bảng users với user_id:', authUser.id)
          try {
            // Đảm bảo truy vấn đúng bảng và điều kiện
            const { data: userProfileData, error: userError } = await supabase
              .from('users') 
              .select('*')
              .eq('user_id', authUser.id)
              .maybeSingle(); // Sử dụng maybeSingle thay vì single để không báo lỗi khi không tìm thấy
            
            console.log('[Profile] Kết quả truy vấn users:', JSON.stringify({
              data: userProfileData,
              error: userError ? {
                message: userError.message,
                code: userError.code
              } : null
            }, null, 2));
            
            // Nếu có lỗi, log lỗi và xử lý
            if (userError && userError.code !== 'PGRST116') {
              console.error('[Profile] Lỗi khi truy vấn users:', userError);
            }
            
            // Nếu không tìm thấy user hoặc có lỗi, tạo mới bản ghi
            if (!userProfileData || userError) {
              console.log('[Profile] Không tìm thấy thông tin người dùng hoặc có lỗi, tạo bản ghi mới...');
              
              // Tạo bản ghi người dùng mới trong bảng users
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([
                  {
                    user_id: authUser.id,
                    email: authUser.email,
                    full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
                    phone: authUser.user_metadata?.phone || '',
                    hometown: authUser.user_metadata?.hometown || '',
                    birth_date: authUser.user_metadata?.birth_date || null
                  }
                ])
                .select();
              
              // Xử lý kết quả tạo user mới
              if (createError) {
                console.error('[Profile] Lỗi khi tạo hồ sơ người dùng mới:', createError);
              } else if (newUser && newUser.length > 0) {
                console.log('[Profile] Đã tạo hồ sơ người dùng mới thành công:', newUser[0]);
                if (isMounted) {
                  setUserData(newUser[0] as UserData);
                  setEditFormData({
                    fullName: newUser[0].full_name || '',
                    phone: newUser[0].phone || '',
                    hometown: newUser[0].hometown || '',
                    birth_date: newUser[0].birth_date || '',
                  });
                }
              }
            } else {
              // Tìm thấy user data, cập nhật state
              console.log('[Profile] Đã tìm thấy thông tin người dùng:', userProfileData);
              if (isMounted) {
                setUserData(userProfileData as UserData);
                setEditFormData({
                  fullName: userProfileData.full_name || '',
                  phone: userProfileData.phone || '',
                  hometown: userProfileData.hometown || '',
                  birth_date: userProfileData.birth_date || '',
                });
              }
            }
          } catch (userQueryError) {
            console.error('[Profile] Lỗi khi truy vấn thông tin người dùng:', userQueryError);
          }
          
          // 3. Lấy thông tin tài khoản từ database
          console.log('[Profile] Đang truy vấn bảng accounts với user_id:', authUser.id)
          try {
            const { data: accountInfo, error: accountError } = await supabase
              .from('accounts') 
              .select('*')
              .eq('user_id', authUser.id)
              .maybeSingle(); // Sử dụng maybeSingle thay vì single
            
            console.log('[Profile] Kết quả truy vấn accounts:', JSON.stringify({
              data: accountInfo,
              error: accountError ? {
                message: accountError.message,
                code: accountError.code
              } : null
            }, null, 2));
            
            // Nếu không tìm thấy account hoặc có lỗi, tạo mới bản ghi
            if (!accountInfo || accountError) {
              console.log('[Profile] Không tìm thấy thông tin tài khoản hoặc có lỗi, tạo mới...');
              
              // Tạo bản ghi tài khoản mới
              const { data: newAccount, error: createAccountError } = await supabase
                .from('accounts')
                .insert([
                  {
                    user_id: authUser.id,
                    username: authUser.email,
                    role: 'customer',
                    status: 'active',
                  }
                ])
                .select();
              
              if (createAccountError) {
                console.error('[Profile] Lỗi khi tạo tài khoản mới:', createAccountError);
              } else if (newAccount && newAccount.length > 0) {
                console.log('[Profile] Đã tạo tài khoản mới thành công:', newAccount[0]);
                if (isMounted) {
                  setAccountData(newAccount[0] as AccountData);
                }
              }
            } else {
              // Tìm thấy account data, cập nhật state
              console.log('[Profile] Đã tìm thấy thông tin tài khoản:', accountInfo);
              if (isMounted) {
                setAccountData(accountInfo as AccountData);
              }
            }
          } catch (accountQueryError) {
            console.error('[Profile] Lỗi khi truy vấn thông tin tài khoản:', accountQueryError);
          }
        } catch (authError: any) {
          console.error('[Profile] Lỗi xác thực:', authError)
          
          if (isMounted) {
            setUser({
              email: 'guest@example.com',
              id: 'guest-user',
              user_metadata: {
                name: 'Khách'
              }
            });
            setFormError('Lỗi xác thực: ' + (authError?.message || 'Không thể lấy thông tin người dùng'));
            setLoading(false);
          }
        } finally {
          if (isMounted) {
            // Đảm bảo loading luôn dừng sau khi xử lý xong
            setTimeout(() => {
              if (isMounted) setLoading(false);
            }, 1000);
          }
        }
      } catch (error: any) {
        console.error('[Profile] Lỗi fetching user data:', error)
        setFormError(`Lỗi: ${error?.message || error || 'Không thể tải dữ liệu người dùng'}`)
        setLoading(false)
      }
    }

    if (mounted) {
      // Đặt một timeout ngắn để đảm bảo mounted thực sự đã hoàn thành
      setTimeout(() => {
        if (isMounted) {
          fetchUserData();
        }
      }, 100);
    }
    
    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      // Xóa flag kiểm tra phiên khi component unmount
      sessionStorage.removeItem('profile_session_checked');
    }
  }, [mounted, loading])
  
  // Hàm xử lý khi thay đổi giá trị form chỉnh sửa
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    })
  }
  
  // Hàm xử lý khi thay đổi giá trị form mật khẩu
  const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordFormData({
      ...passwordFormData,
      [e.target.name]: e.target.value
    })
  }
  
  // Hàm lưu thông tin chỉnh sửa
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    
    try {
      const supabase = createClient()
      
      if (!userData || !user) {
        throw new Error('Không tìm thấy thông tin người dùng')
      }
      
      // 1. Cập nhật thông tin người dùng trong database (bảng users - viết thường)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: editFormData.fullName,
          phone: editFormData.phone,
          hometown: editFormData.hometown,
          birth_date: editFormData.birth_date,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
      
      if (updateError) {
        console.error('Lỗi khi cập nhật thông tin:', updateError.message, updateError.code, updateError.details)
        throw new Error(`Lỗi khi cập nhật: ${updateError.message}`)
      }
      
      // 2. Cập nhật lại thông tin người dùng trong state
      const { data: updatedUserData, error: refreshError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single()
        
      if (refreshError) {
        console.error('Lỗi khi làm mới dữ liệu:', refreshError.message, refreshError.code)
      } else if (updatedUserData) {
        setUserData(updatedUserData as UserData)
      }
      
      setFormSuccess('Thông tin đã được cập nhật thành công')
      setIsEditing(false)
    } catch (error: any) {
      console.error('Lỗi cập nhật hồ sơ:', error.message ? error.message : JSON.stringify(error))
      setFormError(error.message || 'Có lỗi xảy ra khi cập nhật thông tin')
    }
  }
  
  // Hàm đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp')
      return
    }
    
    if (passwordFormData.newPassword.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: passwordFormData.newPassword
      })
      
      if (error) {
        console.error('Lỗi đổi mật khẩu:', error.message)
        throw new Error(`Lỗi đổi mật khẩu: ${error.message}`)
      }
      
      setFormSuccess('Mật khẩu đã được thay đổi thành công')
      setIsChangingPassword(false)
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      console.error('Lỗi đổi mật khẩu:', error.message ? error.message : JSON.stringify(error))
      setFormError(error.message || 'Có lỗi xảy ra khi thay đổi mật khẩu')
    }
  }
  
  // Sửa lại hàm xử lý đăng xuất
  const handleLogout = async () => {
    console.log('Đang tiến hành đăng xuất...');
    setFormError('');
    setFormSuccess('Đang đăng xuất...');
    
    try {
      // Đánh dấu là đăng xuất có chủ ý
      sessionStorage.setItem('intentional_logout', 'true');
      sessionStorage.setItem('user_logged_out', 'true');
      
      // Dùng hàm fetch để gọi API đăng xuất
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Xóa cache và session ngay lập tức
      localStorage.removeItem('sb_session_cache');
      
      // Nếu dùng client object để đăng xuất không được, xóa trực tiếp cookies
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Xóa cookies
      document.cookie.split(";").forEach(c => {
        const cookieName = c.split("=")[0].trim();
        if (cookieName.includes('supabase') || cookieName.includes('sb-')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      setFormSuccess('Đăng xuất thành công! Đang chuyển hướng...');
      
      // Chuyển hướng trực tiếp đến trang đăng nhập
      window.location.href = '/auth/signin?logout=true&t=' + Date.now();
    } catch (error: any) {
      console.error('Lỗi khi đăng xuất:', error);
      
      // Nếu có lỗi, vẫn thử logout bằng phương pháp thay thế
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Lỗi khi đăng xuất qua Supabase client:', e);
      }
      
      // Chuyển hướng bất kể thế nào
      window.location.href = '/auth/signin?logout=true&t=' + Date.now();
    }
  };
  
  // Hàm để chuyển hướng đến trang đăng nhập khi phiên hết hạn
  const redirectToLogin = (message: string) => {
    console.log('[Profile] Đang chuyển hướng đến trang đăng nhập:', message);
    setFormError(message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    
    // Xóa các flag phiên trong sessionStorage
    sessionStorage.removeItem('profile_session_checked');
    sessionStorage.removeItem('dashboard_session_checked');
    
    // Xóa dữ liệu phiên cục bộ 
    try {
      console.log('[Profile] Đang xóa dữ liệu phiên cục bộ...');
      
      // Xóa localStorage liên quan đến Supabase
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
          console.log(`[Profile] Đã xóa localStorage: ${key}`);
        }
      });
      
      // Xóa sessionStorage liên quan đến Supabase
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
          console.log(`[Profile] Đã xóa sessionStorage: ${key}`);
        }
      });
      
      // Xóa cookies liên quan đến Supabase
      document.cookie.split(";").forEach(c => {
        const cookieName = c.split("=")[0].trim();
        if (cookieName.includes('supabase') || cookieName.includes('sb-')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          console.log(`[Profile] Đã xóa cookie: ${cookieName}`);
        }
      });
      
      console.log('[Profile] Đã xóa xong dữ liệu phiên cục bộ');
    } catch (clearError) {
      console.error('[Profile] Lỗi khi xóa dữ liệu cục bộ:', clearError)
    }
    
    // Chuyển hướng đơn giản hóa với các tham số quan trọng
    console.log('[Profile] Chuẩn bị chuyển hướng sau 1 giây');
    setTimeout(() => {
      // Thêm timestamp để tránh browser cache và thêm noLoop để tránh vòng lặp
      window.location.replace(`/auth/signin?noLoop=true&expired=true&from=profile&t=${Date.now()}`);
    }, 1000);
  };
  
  // Thêm hàm này ở đầu component (bên trong function ProfilePage)
  const getCachedSession = () => {
    try {
      const cachedSessionStr = localStorage.getItem('sb_session_cache');
      if (cachedSessionStr) {
        const cachedSession = JSON.parse(cachedSessionStr);
        const now = Date.now();
        // Kiểm tra nếu cache chưa quá hạn (hết hạn hoặc quá 10 phút)
        if (cachedSession.expires_at && cachedSession.timestamp &&
            (cachedSession.expires_at * 1000 > now) &&
            (now - cachedSession.timestamp < 10 * 60 * 1000)) {
          console.log('[Profile] Sử dụng session cache');
          return cachedSession.user;
        }
      }
    } catch (error) {
      console.error('[Profile] Lỗi khi đọc session cache:', error);
    }
    return null;
  };
  
  // Thay đổi phần return dưới đây để không hiện spinner khi loading
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-2">Đang khởi tạo trang...</p>
      </div>
    )
  }

  const { theme } = themeState

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Thông tin cá nhân</h1>
      
      {formError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {formError}
        </div>
      )}
      
      {formSuccess && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {formSuccess}
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Thông tin người dùng</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Chi tiết tài khoản và thông tin cá nhân</p>
          </div>
          {user && user.id !== 'guest-user' && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${theme.buttonBg} ${theme.buttonHoverBg} transition duration-150 ease-in-out`}
            >
              {isEditing ? 'Hủy' : 'Chỉnh sửa'}
            </button>
          )}
        </div>
        
        {!isEditing ? (
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.email || 'Chưa đăng nhập'}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Tên người dùng</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {userData?.full_name || user?.user_metadata?.name || 'Chưa cập nhật'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Số điện thoại</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {userData?.phone || 'Chưa cập nhật'}
                </dd>
              </div>
              
              {/* Nếu chưa đăng nhập, hiển thị thông báo */}
              {user?.id === 'guest-user' && (
                <div className="bg-yellow-50 px-4 py-5 sm:px-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Thông tin bị giới hạn</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Vui lòng đăng nhập để xem đầy đủ thông tin cá nhân và chỉnh sửa hồ sơ.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tiếp tục hiển thị các thông tin khác chỉ khi có userData */}
              {userData && (
                <>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Địa chỉ</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {userData?.hometown || 'Chưa cập nhật'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Ngày sinh</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {userData?.birth_date ? new Date(userData.birth_date).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                    </dd>
                  </div>
                </>
              )}
              
              {/* Hiển thị thông tin tài khoản chỉ khi có accountData */}
              {accountData && (
                <>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Vai trò</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {USER_ROLES[accountData.role as UserRole] || 'Chưa xác định'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Trạng thái tài khoản</dt>
                    <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        accountData?.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {accountData?.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Ngày tạo tài khoản</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {accountData?.created_at ? new Date(accountData.created_at).toLocaleDateString('vi-VN') : 'Không có thông tin'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Lần đăng nhập cuối</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {accountData?.last_login ? new Date(accountData.last_login).toLocaleString('vi-VN') : 'Không có thông tin'}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        ) : (
          <div className="border-t border-gray-200">
            <form onSubmit={handleSaveProfile} className="px-4 py-5">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Tên người dùng <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="fullName"
                      id="fullName"
                      required
                      value={editFormData.fullName}
                      onChange={handleEditFormChange}
                      className={`shadow-sm focus:ring-${theme.textColor.split('-')[1]}-500 focus:border-${theme.textColor.split('-')[1]}-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 transition duration-150 ease-in-out`}
                      placeholder="Nhập tên đầy đủ của bạn"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      required
                      value={editFormData.phone}
                      onChange={handleEditFormChange}
                      className={`shadow-sm focus:ring-${theme.textColor.split('-')[1]}-500 focus:border-${theme.textColor.split('-')[1]}-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 transition duration-150 ease-in-out`}
                      placeholder="Nhập số điện thoại của bạn"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700">
                    Ngày sinh
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="date"
                      name="birth_date"
                      id="birth_date"
                      value={editFormData.birth_date}
                      onChange={handleEditFormChange}
                      className={`shadow-sm focus:ring-${theme.textColor.split('-')[1]}-500 focus:border-${theme.textColor.split('-')[1]}-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 transition duration-150 ease-in-out`}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Vai trò
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="text"
                      id="role"
                      value={accountData ? USER_ROLES[accountData.role as UserRole] : 'Khách hàng'}
                      readOnly
                      className="bg-gray-100 shadow-sm block w-full sm:text-sm border-gray-300 rounded-md p-2.5 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Vai trò được quản lý bởi admin hệ thống</p>
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="hometown" className="block text-sm font-medium text-gray-700">
                    Địa chỉ
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <textarea
                      name="hometown"
                      id="hometown"
                      rows={3}
                      value={editFormData.hometown}
                      onChange={handleEditFormChange}
                      className={`shadow-sm focus:ring-${theme.textColor.split('-')[1]}-500 focus:border-${theme.textColor.split('-')[1]}-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 transition duration-150 ease-in-out`}
                      placeholder="Nhập địa chỉ của bạn"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${theme.buttonBg} ${theme.buttonHoverBg} transition duration-150 ease-in-out`}
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Bảo mật tài khoản</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Thiết lập và quản lý bảo mật</p>
        </div>
        
        {/* Chỉ hiển thị các tùy chọn bảo mật khi đã đăng nhập */}
        {user && user.id !== 'guest-user' ? (
          !isChangingPassword ? (
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:p-6 flex space-x-4">
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 transition duration-150 ease-in-out`}
                >
                  Đổi mật khẩu
                </button>
                
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200">
              <form onSubmit={handleChangePassword} className="px-4 py-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Mật khẩu hiện tại <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        required
                        value={passwordFormData.currentPassword}
                        onChange={handlePasswordFormChange}
                        className={`shadow-sm focus:ring-${theme.textColor.split('-')[1]}-500 focus:border-${theme.textColor.split('-')[1]}-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 transition duration-150 ease-in-out`}
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      Mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        required
                        value={passwordFormData.newPassword}
                        onChange={handlePasswordFormChange}
                        className={`shadow-sm focus:ring-${theme.textColor.split('-')[1]}-500 focus:border-${theme.textColor.split('-')[1]}-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 transition duration-150 ease-in-out`}
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        required
                        value={passwordFormData.confirmPassword}
                        onChange={handlePasswordFormChange}
                        className={`shadow-sm focus:ring-${theme.textColor.split('-')[1]}-500 focus:border-${theme.textColor.split('-')[1]}-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 transition duration-150 ease-in-out`}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 transition duration-150 ease-in-out`}
                  >
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            </div>
          )
        ) : (
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-blue-700">
                      Bạn cần đăng nhập để quản lý bảo mật tài khoản.
                    </p>
                    <div className="mt-3">
                      <a
                        href="/auth/signin?redirectTo=/dashboard/profile"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition ease-in-out duration-150"
                      >
                        Đăng nhập
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
