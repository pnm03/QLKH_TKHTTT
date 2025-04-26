'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Order {
  order_id: string
  customer_id: string | null
  order_date: string
  price: number
  status: string
  is_shipping: boolean
  payment_method: number | null
  customer_name?: string | null
  payment_method_name?: string | null
  creator_name?: string | null
}

export default function UnpaidOrdersList() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [ordersPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
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

  // Lấy danh sách đơn hàng chưa thanh toán
  const fetchUnpaidOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Truy vấn dữ liệu từ bảng orders với bộ lọc status = 'Chưa thanh toán'
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (full_name, phone)
        `)
        .eq('status', 'Chưa thanh toán')
        .order('order_date', { ascending: false })

      // Áp dụng tìm kiếm nếu có
      if (searchTerm) {
        query = query.or(`order_id.ilike.%${searchTerm}%,customers.full_name.ilike.%${searchTerm}%`)
      }

      // Thực hiện truy vấn
      const { data: ordersData, error: ordersError } = await query

      if (ordersError) {
        console.error('Lỗi truy vấn orders:', ordersError)
        setError(`Lỗi khi truy vấn dữ liệu: ${ordersError.message}`)
        setOrders([])
        setTotalPages(1)
        setLoading(false)
        return
      }

      // Xử lý dữ liệu trả về
      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        setTotalPages(1)
        setLoading(false)
        return
      }

      // Lấy thông tin phương thức thanh toán
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('payment_id, payment_method_name')

      if (paymentsError) {
        console.error('Lỗi khi lấy thông tin phương thức thanh toán:', paymentsError)
      }

      // Lấy thông tin người dùng (người tạo đơn)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, full_name')

      if (usersError) {
        console.error('Lỗi khi lấy thông tin người dùng:', usersError)
      }

      // Xử lý và định dạng dữ liệu
      const processedOrders = ordersData.map(order => {
        // Tìm tên phương thức thanh toán
        const paymentMethod = paymentsData?.find(p => p.payment_id === order.payment_method)
        
        // Tìm tên người tạo đơn
        const creator = usersData?.find(u => u.user_id === order.user_id)
        
        return {
          ...order,
          customer_name: order.customers?.full_name || 'Khách vãng lai',
          payment_method_name: paymentMethod?.payment_method_name || 'Chưa có',
          creator_name: creator?.full_name || 'Hệ thống'
        }
      })

      setOrders(processedOrders)
      setTotalPages(Math.ceil(processedOrders.length / ordersPerPage))
    } catch (error: any) {
      console.error('Lỗi không xác định:', error)
      setError(`Lỗi không xác định: ${error.message || 'Không rõ nguyên nhân'}`)
      setOrders([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [supabase, searchTerm, ordersPerPage])

  // Gọi API khi component được mount hoặc searchTerm thay đổi
  useEffect(() => {
    if (mounted) {
      fetchUnpaidOrders()
    }
  }, [mounted, fetchUnpaidOrders])

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

  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  // Xử lý tìm kiếm
  const handleSearch = () => {
    setCurrentPage(1)
    fetchUnpaidOrders()
  }

  // Xử lý khi nhấn Enter trong ô tìm kiếm
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Tính toán đơn hàng hiển thị trên trang hiện tại
  const indexOfLastOrder = currentPage * ordersPerPage
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder)

  // Chuyển trang
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
      <div className="bg-gray-200 px-6 py-3 relative overflow-hidden">
        <h2 className="text-xl font-bold text-gray-700">
          Danh sách đơn hàng chưa thanh toán
        </h2>
        <p className="text-gray-500 text-sm mt-1">Các đơn hàng đang chờ thanh toán trong hệ thống</p>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn hàng, tên khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSearch}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Tìm kiếm
            </button>
            <button
              onClick={fetchUnpaidOrders}
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách đơn hàng */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mã đơn hàng
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Người tạo
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
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : currentOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Không tìm thấy đơn hàng nào chưa thanh toán
                </td>
              </tr>
            ) : (
              currentOrders.map((order) => (
                <tr key={order.order_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.order_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.creator_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(order.order_date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(order.price)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/dashboard/orders/search?id=${order.order_id}`}
                      className={`text-${themeColor}-600 hover:text-${themeColor}-900 mr-4`}
                    >
                      Xem chi tiết
                    </Link>
                    <Link 
                      href={`/dashboard/orders/create?order_id=${order.order_id}`}
                      className={`text-${themeColor}-600 hover:text-${themeColor}-900`}
                    >
                      Thanh toán
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {!loading && !error && orders.length > 0 && (
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Trước
            </button>
            <button
              onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">{indexOfFirstOrder + 1}</span> đến <span className="font-medium">{Math.min(indexOfLastOrder, orders.length)}</span> trong số <span className="font-medium">{orders.length}</span> đơn hàng
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Trang đầu</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`relative inline-flex items-center px-4 py-2 border ${currentPage === number ? `bg-${themeColor}-50 border-${themeColor}-500 text-${themeColor}-600` : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'} text-sm font-medium`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Trang cuối</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
