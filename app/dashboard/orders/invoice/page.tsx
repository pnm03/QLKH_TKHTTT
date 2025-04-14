'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { 
  PrinterIcon, 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function InvoicePage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // State cho tìm kiếm
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

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

  // Xử lý tìm kiếm đơn hàng
  const handleSearch = () => {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    
    // Giả lập tìm kiếm
    setTimeout(() => {
      setLoading(false)
      router.push(`/dashboard/orders/search?term=${searchTerm}`)
    }, 1000)
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">In hóa đơn cho đơn hàng</h1>

      {/* Tìm kiếm đơn hàng */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label htmlFor="order-search" className="block text-sm font-medium text-gray-700 mb-1">
                Nhập mã đơn hàng để in hóa đơn
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="order-search"
                  placeholder="Nhập mã đơn hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-10 pr-3`}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            <div>
              <button
                onClick={handleSearch}
                className={`w-full md:w-auto h-10 px-4 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-medium rounded-md flex items-center justify-center`}
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                    Tìm kiếm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <PrinterIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">Chức năng in hóa đơn</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Nhập mã đơn hàng ở ô tìm kiếm phía trên để tìm đơn hàng và in hóa đơn.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/dashboard/orders/search')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
                Xem danh sách đơn hàng
              </button>
              <button
                onClick={() => router.push('/dashboard/orders/create')}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Tạo đơn hàng mới
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}