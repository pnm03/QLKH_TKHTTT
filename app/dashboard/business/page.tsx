'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/app/context/ThemeContext'
import { BuildingOfficeIcon, UserIcon } from '@heroicons/react/24/outline'

export default function BusinessPage() {
  const router = useRouter()
  const themeContext = useTheme()
  const [mounted, setMounted] = useState(false)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Lấy theme hiện tại
  const currentTheme = themeContext.currentTheme

  const businessModules = [
    {
      name: 'Chi nhánh',
      description: 'Quản lý các chi nhánh của doanh nghiệp',
      icon: BuildingOfficeIcon,
      href: '/dashboard/business/branches',
    },
    {
      name: 'Nhân viên',
      description: 'Quản lý thông tin nhân viên',
      icon: UserIcon,
      href: '/dashboard/business/staff',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Quản lý doanh nghiệp
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Quản lý thông tin chi nhánh và nhân viên của doanh nghiệp
            </p>
          </div>

          <div className="px-6 py-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {businessModules.map((module) => (
                <div
                  key={module.name}
                  className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => router.push(module.href)}
                >
                  <div>
                    <div className={`inline-flex rounded-lg p-3 ${currentTheme?.bgLight || 'bg-blue-50'}`}>
                      <module.icon className={`h-6 w-6 ${currentTheme?.textColor || 'text-blue-600'}`} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900">{module.name}</h3>
                    <p className="mt-2 text-sm text-gray-500">{module.description}</p>
                  </div>
                  <div className="absolute top-0 right-0 -mt-2 -mr-2">
                    <span className={`inline-flex items-center rounded-full ${currentTheme?.bgColor || 'bg-blue-600'} px-2.5 py-0.5 text-xs font-medium text-white`}>
                      Mới
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}