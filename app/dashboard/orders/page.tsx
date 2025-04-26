'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// Xóa các import không được sử dụng
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import Link from 'next/link'
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ClipboardDocumentListIcon,
  CreditCardIcon,
  TruckIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

// Định nghĩa các interface
interface OrderSummary {
  total: number
  paid: number
  unpaid: number
  shipping: number
}

interface RecentOrder {
  order_id: string
  customer_name: string
  order_date: string
  price: number
  status: string
}

export default function OrdersPage() {
  // Xóa các biến không được sử dụng
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // State cho thống kê đơn hàng
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    total: 0,
    paid: 0,
    unpaid: 0,
    shipping: 0
  })
  
  // State cho đơn hàng gần đây
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  // Xóa các biến không được sử dụng
  // Xóa các biến không được sử dụng

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
      
      // Lấy dữ liệu thống kê và đơn hàng gần đây
      fetchOrderSummary()
      fetchRecentOrders()
    }
  }, [mounted, themeContext.currentTheme])

  // Lấy thống kê đơn hàng
  const fetchOrderSummary = async () => {
    try {
      // Lấy tổng số đơn hàng
      const { count: totalCount, error: totalError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
      
      if (totalError) throw totalError
      
      // Lấy số đơn hàng đã thanh toán
      const { count: paidCount, error: paidError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Đã thanh toán')
      
      if (paidError) throw paidError
      
      // Lấy số đơn hàng chưa thanh toán
      const { count: unpaidCount, error: unpaidError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Chưa thanh toán')
      
      if (unpaidError) throw unpaidError
      
      // Lấy số đơn hàng có vận chuyển
      const { count: shippingCount, error: shippingError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_shipping', true)
      
      if (shippingError) throw shippingError
      
      setOrderSummary({
        total: totalCount || 0,
        paid: paidCount || 0,
        unpaid: unpaidCount || 0,
        shipping: shippingCount || 0
      })
    } catch (error) {
      console.error('Lỗi khi lấy thống kê đơn hàng:', error)
    }
  }

  // Lấy đơn hàng gần đây
  const fetchRecentOrders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_customer_id_fkey (full_name)
        `)
        .order('order_date', { ascending: false })
        .limit(5)
      
      if (error) throw error
      
      // Xử lý dữ liệu trả về
      const formattedOrders = data.map(order => ({
        order_id: order.order_id,
        customer_name: order.users?.full_name || 'Khách lẻ',
        order_date: order.order_date,
        price: order.price,
        status: order.status
      }))
      
      setRecentOrders(formattedOrders)
    } catch (error) {
      console.error('Lỗi khi lấy đơn hàng gần đây:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Format ngày tháng
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý đơn hàng</h1>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/orders/create"
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Tạo đơn hàng
          </Link>
          <Link
            href="/dashboard/orders/search"
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
            Tìm kiếm
          </Link>
        </div>
      </div>

      {/* Thống kê đơn hàng */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Tổng số đơn hàng */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 bg-${themeColor}-100`}>
                <ClipboardDocumentListIcon className={`h-6 w-6 text-${themeColor}-600`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Tổng đơn hàng</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{orderSummary.total}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className={`bg-gray-50 px-5 py-3 border-t border-gray-200`}>
            <div className="text-sm">
              <Link href="/dashboard/orders/search" className={`font-medium text-${themeColor}-600 hover:text-${themeColor}-900`}>
                Xem tất cả
              </Link>
            </div>
          </div>
        </div>

        {/* Đơn hàng đã thanh toán */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md p-3 bg-green-100">
                <BanknotesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Đã thanh toán</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{orderSummary.paid}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <div className="text-sm">
              <Link 
                href="/dashboard/orders/search?status=Đã thanh toán" 
                className={`font-medium text-${themeColor}-600 hover:text-${themeColor}-900`}
              >
                Xem chi tiết
              </Link>
            </div>
          </div>
        </div>

        {/* Đơn hàng chưa thanh toán */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md p-3 bg-yellow-100">
                <CreditCardIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Chưa thanh toán</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{orderSummary.unpaid}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <div className="text-sm">
              <button
                // Xóa các tham chiếu không được sử dụng
                className={`font-medium text-${themeColor}-600 hover:text-${themeColor}-900`}
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        </div>

        {/* Đơn hàng có vận chuyển */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md p-3 bg-blue-100">
                <TruckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Đơn vận chuyển</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{orderSummary.shipping}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <div className="text-sm">
              <Link 
                href="/dashboard/orders/search?shipping=true" 
                className={`font-medium text-${themeColor}-600 hover:text-${themeColor}-900`}
              >
                Xem chi tiết
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Phần chính */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Đơn hàng gần đây */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Đơn hàng gần đây</h2>
            <button 
              onClick={fetchRecentOrders}
              className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Làm mới
            </button>
          </div>
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã đơn hàng
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày đặt
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </td>
                    </tr>
                  ) : recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.order_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customer_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(order.order_date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(order.price)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'Đã thanh toán'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status}
                          </span>
                          <button
                            // Xóa các tham chiếu không được sử dụng
                            className={`ml-2 font-medium text-${themeColor}-600 hover:text-${themeColor}-900`}
                          >
                            Thanh toán
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        Không có đơn hàng nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/orders/search" className={`font-medium text-${themeColor}-600 hover:text-${themeColor}-900`}>
                  Xem tất cả đơn hàng
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Các liên kết nhanh */}
      </div>
    </div>
  )
}