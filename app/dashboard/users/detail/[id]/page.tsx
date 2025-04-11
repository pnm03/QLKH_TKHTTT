'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  KeyIcon, 
  UserCircleIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon, 
  ShieldCheckIcon 
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClient } from '@/utils/supabase/client'

// Kiểu dữ liệu chi tiết người dùng
interface UserDetail {
  id: string
  name: string
  email: string
  phone?: string
  hometown?: string
  birth_date?: string
  role: string
  status: string
  created_at: string
  updated_at?: string
  last_login?: string
}

// Ánh xạ vai trò để hiển thị friendly names
const ROLE_MAPPING: Record<string, string> = {
  'admin': 'Quản trị viên',
  'NVBH': 'Nhân viên bán hàng',
  'NVK': 'Nhân viên kho',
  'NVQLDH': 'Nhân viên quản lý đơn hàng'
};

export default function UserDetail(props: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [mounted, setMounted] = useState(false);

  // Theme context
  const themeContext = useTheme();
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
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

  // Lấy thông tin người dùng - chỉ chạy một lần khi mounted và userId có giá trị
  useEffect(() => {
    if (mounted && userId) {
      let isMounted = true; // Flag để tránh cập nhật state sau khi component unmounted
      
      const fetchUserDetail = async () => {
        try {
          if (!isMounted) return;
          setLoading(true);
          setError(null);
          
          const supabase = createClient();
          
          // Lấy thông tin từ bảng users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_id, full_name, email, phone, hometown, birth_date, created_at, updated_at')
            .eq('user_id', userId)
            .single();
          
          if (userError) throw userError;
          
          if (!userData) {
            throw new Error('Không tìm thấy thông tin người dùng');
          }
          
          // Lấy thông tin từ bảng accounts
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('role, status, last_login')
            .eq('user_id', userId)
            .single();
          
          if (accountError) throw accountError;
          
          if (!isMounted) return;
          
          // Kết hợp thông tin
          setUser({
            id: userData.user_id,
            name: userData.full_name || 'Chưa cập nhật',
            email: userData.email,
            phone: userData.phone,
            hometown: userData.hometown,
            birth_date: userData.birth_date,
            role: accountData?.role || 'Không có quyền',
            status: accountData?.status || 'inactive',
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            last_login: accountData?.last_login
          });
          
          setLoading(false);
        } catch (error: any) {
          if (!isMounted) return;
          console.error('Lỗi khi tải thông tin người dùng:', error);
          setError(error.message || 'Đã xảy ra lỗi khi tải thông tin người dùng');
          setLoading(false);
        }
      };
      
      fetchUserDetail();
      
      // Cleanup function
      return () => {
        isMounted = false;
      };
    }
  }, [mounted, userId]);

  // Định dạng ngày tháng
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Chưa cập nhật';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('vi-VN', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Ngày không hợp lệ';
    }
  };
  
  // Định dạng ngày sinh
  const formatBirthDate = (dateString?: string): string => {
    if (!dateString) return 'Chưa cập nhật';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('vi-VN', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return 'Ngày không hợp lệ';
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
    <div>
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
          <h1 className="text-2xl font-semibold text-gray-900">Chi tiết người dùng</h1>
        </div>
        
        <div className="mt-4 md:mt-0 flex space-x-2">
          {userId && (
            <>
              <Link
                href={`/dashboard/users/edit/${userId}`}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${theme.buttonBg} ${theme.buttonHoverBg}`}
              >
                <PencilIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Chỉnh sửa
              </Link>
              
              <button
                type="button" 
                onClick={() => window.location.href = `/dashboard/users/permissions/${userId}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <KeyIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" aria-hidden="true" />
                Quản lý quyền
              </button>
            </>
          )}
        </div>
      </div>

      {/* Nội dung chính */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-lg shadow">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-500">Đang tải thông tin...</p>
        </div>
      ) : error ? (
        <div className="py-10 text-center bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800">Không thể tải thông tin</h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Quay lại
            </button>
          </div>
        </div>
      ) : user ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Thông tin cơ bản */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row">
            <div className="flex items-center">
              <div className={`h-20 w-20 bg-${themeColor}-100 rounded-full flex items-center justify-center border-[1px] border-${themeColor}-300 overflow-hidden shadow-sm mr-5`}>
                <span className={`text-${themeColor}-800 text-2xl font-medium relative z-10`}>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
                <div className={`absolute inset-0 bg-${themeColor}-200 opacity-30 rounded-full`}></div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}
                  </span>
                  
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                    {ROLE_MAPPING[user.role] || user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chi tiết thông tin */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin chi tiết</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dl className="space-y-4">
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <UserCircleIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Họ và tên
                    </dt>
                    <dd className="text-sm text-gray-900">{user.name}</dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Email
                    </dt>
                    <dd className="text-sm text-gray-900">{user.email}</dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <PhoneIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Điện thoại
                    </dt>
                    <dd className="text-sm text-gray-900">{user.phone || 'Chưa cập nhật'}</dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Ngày sinh
                    </dt>
                    <dd className="text-sm text-gray-900">{formatBirthDate(user.birth_date)}</dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Địa chỉ
                    </dt>
                    <dd className="text-sm text-gray-900">{user.hometown || 'Chưa cập nhật'}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <dl className="space-y-4">
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Vai trò
                    </dt>
                    <dd className="text-sm text-gray-900">{ROLE_MAPPING[user.role] || user.role}</dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Trạng thái
                    </dt>
                    <dd className="flex items-center">
                      {user.status === 'active' ? (
                        <>
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1.5" />
                          <span className="text-sm text-gray-900">Đang hoạt động</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-5 w-5 text-red-500 mr-1.5" />
                          <span className="text-sm text-gray-900">Không hoạt động</span>
                        </>
                      )}
                    </dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Ngày tạo
                    </dt>
                    <dd className="text-sm text-gray-900">{formatDate(user.created_at)}</dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Cập nhật
                    </dt>
                    <dd className="text-sm text-gray-900">{formatDate(user.updated_at)}</dd>
                  </div>
                  
                  <div className="flex">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-32">
                      <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                      Đăng nhập
                    </dt>
                    <dd className="text-sm text-gray-900">{formatDate(user.last_login)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
