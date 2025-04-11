'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ShoppingCartIcon, UserGroupIcon, CubeIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { useTheme, themeColors } from '@/app/context/ThemeContext'

interface DashboardStat {
  id: string;
  name: string;
  stat: string;
  icon: any;
  color: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  // State cho thông báo đăng nhập thành công
  const [loginSuccess, setLoginSuccess] = useState(false)
  
  // Lấy thông tin theme từ context nhưng chỉ sử dụng khi component đã mounted
  const themeContext = useTheme()
  
  const [themeState, setThemeState] = useState({
    selectedTheme: 'indigo',
    theme: themeColors.indigo
  })

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Kiểm tra tham số login_success trong URL
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('login_success') === 'true') {
        // Đánh dấu đăng nhập thành công
        setLoginSuccess(true);
        
        // Xóa tham số login_success khỏi URL để tránh refresh hiển thị lại thông báo
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('login_success');
        newUrl.searchParams.delete('ts');
        window.history.replaceState({}, document.title, newUrl.toString());
        
        // Tự động ẩn thông báo sau 5 giây
        setTimeout(() => {
          setLoginSuccess(false);
        }, 5000);
      }
    }
  }, [mounted]);

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        selectedTheme: themeContext.selectedTheme,
        theme: themeContext.currentTheme
      })
    }
  }, [mounted, themeContext.selectedTheme, themeContext.currentTheme])

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        setUser(data.user)
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  // Adjust colors based on the selected theme
  const themeColorMap = {
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    yellow: 'bg-amber-500',
    pink: 'bg-pink-500'
  }

  const stats: DashboardStat[] = [
    {
      id: 'sales',
      name: 'Tổng đơn hàng',
      stat: '0',
      icon: ShoppingCartIcon,
      color: themeState.selectedTheme === 'pink' ? themeColorMap.indigo : themeColorMap.pink
    },
    {
      id: 'users',
      name: 'Người dùng',
      stat: '0',
      icon: UserGroupIcon,
      color: themeColorMap.blue
    },
    {
      id: 'products',
      name: 'Sản phẩm',
      stat: '0',
      icon: CubeIcon,
      color: themeColorMap.green
    },
    {
      id: 'orders',
      name: 'Đơn hàng cần xử lý',
      stat: '0',
      icon: DocumentTextIcon,
      color: themeColorMap.yellow
    },
    {
      id: 'reports',
      name: 'Doanh số tháng',
      stat: '0₫',
      icon: ChartBarIcon,
      color: themeState.selectedTheme === 'indigo' ? themeColorMap.pink : themeColorMap.indigo
    },
  ]

  if (loading || !mounted) {
    return null // Layout sẽ hiển thị loading
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Bảng điều khiển</h1>
      
      {loginSuccess && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md flex justify-between items-center">
          <div>
            <span className="font-medium">Đăng nhập thành công!</span> Chào mừng trở lại {user?.email}
          </div>
          <button 
            onClick={() => setLoginSuccess(false)}
            className="text-green-500 hover:text-green-700"
          >
            <span className="sr-only">Đóng</span>
            ✕
          </button>
        </div>
      )}
      
      <div className="mt-4">
        <div className="px-4 py-3 bg-white shadow-sm rounded-lg">
          <h2 className="text-lg font-medium text-gray-900">Chào mừng trở lại, {user?.email}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Dưới đây là tổng quan về hoạt động của hệ thống.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.id}
              className="relative bg-white pt-5 px-4 pb-6 sm:pt-6 sm:px-6 shadow-sm rounded-lg overflow-hidden"
            >
              <div className="absolute top-0 right-0 mt-3 mr-3">
                <div className={`${item.color} rounded-full p-2`}>
                  <item.icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </div>
              <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{item.stat}</dd>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Hoạt động gần đây</h3>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Không có hoạt động gần đây.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Cập nhật hệ thống</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Hệ thống đang hoạt động bình thường.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 