'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme, themeColors } from '@/app/context/ThemeContext'

export default function EditProductDefaultPage() {
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })
    }
  }, [mounted, themeContext.currentTheme])

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Chỉnh sửa sản phẩm</h1>
        </div>
      </div>

      <div className="py-20 text-center">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 inline-block text-left">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">Chưa có sản phẩm nào được chọn. Vui lòng chọn sản phẩm từ trang tìm kiếm.</p>
              <div className="mt-4">
                <Link 
                  href="/dashboard/products/search"
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                >
                  Quay về trang tìm kiếm sản phẩm
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
