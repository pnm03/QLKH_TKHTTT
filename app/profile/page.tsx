'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [accountData, setAccountData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Lấy thông tin người dùng hiện tại
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setError('Bạn chưa đăng nhập. Vui lòng đăng nhập để xem thông tin cá nhân.')
          setTimeout(() => {
            router.push('/auth/signin')
          }, 3000)
          return
        }
        
        // Lấy dữ liệu từ bảng Users
        const { data: userData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (usersError) {
          console.error('Lỗi khi lấy dữ liệu từ bảng Users:', usersError)
          setError('Không thể lấy thông tin người dùng từ bảng Users. Có thể cần chạy script đồng bộ dữ liệu.')
        } else {
          setUserData(userData)
        }
        
        // Lấy dữ liệu từ bảng Accounts
        const { data: accountData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (accountsError) {
          console.error('Lỗi khi lấy dữ liệu từ bảng Accounts:', accountsError)
        } else {
          setAccountData(accountData)
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error)
        setError('Đã xảy ra lỗi khi lấy thông tin người dùng.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded max-w-lg">
          <h2 className="text-xl font-bold mb-2">Lỗi</h2>
          <p>{error}</p>
          {error.includes('đăng nhập') && (
            <div className="mt-4">
              <p>Đang chuyển hướng đến trang đăng nhập...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Thông tin cá nhân</h1>
        
        {!userData && !accountData ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded mb-8">
            <p>Không tìm thấy dữ liệu trong bảng Users và Accounts.</p>
            <p className="mt-2">Hãy chạy script SQL đồng bộ dữ liệu trong SQL Editor của Supabase.</p>
          </div>
        ) : (
          <>
            {userData && (
              <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
                <div className="bg-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white">Thông tin cá nhân</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Họ và tên</p>
                    <p className="font-medium">{userData.full_name || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{userData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Địa chỉ</p>
                    <p className="font-medium">{userData.hometown || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ngày sinh</p>
                    <p className="font-medium">{userData.birth_date ? new Date(userData.birth_date).toLocaleDateString() : 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium">{userData.phone || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Thời gian tạo</p>
                    <p className="font-medium">{new Date(userData.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
            
            {accountData && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white">Thông tin tài khoản</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tên đăng nhập</p>
                    <p className="font-medium">{accountData.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vai trò</p>
                    <p className="font-medium capitalize">{accountData.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Trạng thái</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      accountData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {accountData.status === 'active' ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Đăng nhập gần nhất</p>
                    <p className="font-medium">{accountData.last_login ? new Date(accountData.last_login).toLocaleString() : 'Chưa có'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8">
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none"
              >
                Quay lại Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 