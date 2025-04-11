'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LogoutButton({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      
      // Đánh dấu đây là đăng xuất có chủ ý trước khi thực sự đăng xuất
      sessionStorage.setItem('intentional_logout', 'true')
      
      // Gọi API đăng xuất
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
    //   if (!response.ok) {
    //     throw new Error('Lỗi khi đăng xuất')
    //   }
      
    //   // Chuyển hướng đến trang đăng nhập với tham số logout
    //   window.location.href = '/auth/signin?logout=true&t=' + Date.now()
    // } catch (error) {
    //   console.error('Lỗi đăng xuất:', error)
      
    //   // Fallback nếu API không hoạt động
    //   const supabase = createClient()
    //   await supabase.auth.signOut()
      
    //   // Vẫn chuyển hướng đến trang đăng nhập
    // //   window.location.href = '/auth/signin?logout=true&t=' + Date.now()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center justify-center text-sm"
    >
      {isLoading ? 'Đang đăng xuất...' : children}
    </button>
  )
} 