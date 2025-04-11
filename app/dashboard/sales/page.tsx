'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/app/context/ThemeContext'

export default function SalesPage() {
  const [recentOrders, setRecentOrders] = useState([])
  const { currentTheme: theme } = useTheme()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Bán hàng</h1>
        <Link 
          href="/dashboard/sales/create"
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${theme.buttonBg} ${theme.buttonHoverBg}`}
        >
          <PlusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
          Tạo đơn hàng
        </Link>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Đơn hàng gần đây</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="text-center py-10">
            <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có đơn hàng nào</h3>
            <p className="mt-1 text-sm text-gray-500">
              Bắt đầu bằng cách tạo đơn hàng đầu tiên của bạn.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/sales/create"
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${theme.buttonBg} ${theme.buttonHoverBg} focus:outline-none`}
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Tạo đơn hàng mới
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Thống kê bán hàng</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Tổng quan về hiệu suất bán hàng.</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Tổng đơn hàng</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
            </div>

            <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Doanh số hôm nay</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">0₫</dd>
            </div>

            <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Sản phẩm đã bán</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
} 