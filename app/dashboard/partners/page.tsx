'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnersPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to customers page
    router.push('/dashboard/partners/customers')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">Đang chuyển hướng</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Quản lý đối tác
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            Đang chuyển hướng đến trang quản lý khách hàng...
          </p>
        </div>
      </div>
    </div>
  )
}