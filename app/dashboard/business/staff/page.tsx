'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/app/context/ThemeContext'
import { UserIcon } from '@heroicons/react/24/outline'

export default function StaffPage() {
  const themeContext = useTheme()
  const [mounted, setMounted] = useState(false)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Lấy theme hiện tại
  const currentTheme = themeContext.currentTheme

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center">
              <UserIcon className={`h-8 w-8 ${currentTheme?.textColor || 'text-blue-500'} mr-3`} />
              <h2 className="text-2xl font-bold text-gray-900">
                Quản lý nhân viên
              </h2>
            </div>
          </div>

          <div className="px-6 py-8">
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chức năng đang phát triển</h3>
              <p className="mt-1 text-sm text-gray-500">
                Chức năng quản lý nhân viên sẽ sớm được cập nhật.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}