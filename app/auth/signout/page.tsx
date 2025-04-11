'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function SignoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        const supabase = createClient()

        await supabase.auth.signOut()
        
        // Chuyển hướng về trang đăng nhập sau khi đăng xuất
        router.push('/auth/signin')
      } catch (error) {
        console.error('Lỗi khi đăng xuất:', error)
      }
    }

    handleSignOut()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Đang đăng xuất...</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Vui lòng đợi trong giây lát.
          </p>
        </div>
      </div>
    </div>
  )
} 