'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { 
  MagnifyingGlassIcon, 
  EyeIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  CreditCardIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

// Định nghĩa các interface
interface Order {
  order_id: string
  customer_id: string
  order_date: string
  price: number
  status: string
  is_shipping: boolean
  payment_method: number
  customer_name?: string
  customer_phone?: string
  payment_method_name?: string
}

interface OrderDetail {
  order_id: string
  product_id: number
  name_product: string
  name_check: string
  quantity: number
  unit_price: number
  subtotal: number
  product_image?: string
}

interface Shipping {
  shipping_id: string
  order_id: string
  name_customer: string
  phone_customer: string
  shipping_address: string
  carrier: string
  tracking_number: string
  shipping_cost: number
  status: string
  delivery_date: string | null
}

export default function SearchOrdersPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // State cho tìm kiếm và kết quả
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  })
  const [statusFilter, setStatusFilter] = useState('all') // all, paid, unpaid
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([])
  const [shippingInfo, setShippingInfo] = useState<Shipping | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ordersPerPage = 10
  
  // State cho thông báo lỗi
  const [error, setError] = useState<string | null>(null)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context và tải dữ liệu khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })
      
      // Tải dữ liệu đơn hàng ban đầu
      searchOrders()
    }
  }, [mounted, themeContext.currentTheme])

  // Tìm kiếm đơn hàng
  const searchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      // Truy vấn dữ liệu từ bảng orders với bộ lọc
      let query = supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false })
      
      // Không lọc theo trạng thái ở đây, sẽ lọc sau khi lấy dữ liệu
      
      // Áp dụng bộ lọc theo ngày
      if (dateRange.from) {
        query = query.gte('order_date', dateRange.from)
      }
      if (dateRange.to) {
        query = query.lte('order_date', dateRange.to)
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
      
      // Log dữ liệu để kiểm tra
      console.log('Dữ liệu orders:', ordersData)
      
      if (!ordersData || ordersData.length === 0) {
        console.log('Không tìm thấy đơn hàng nào')
        setOrders([])
        setTotalPages(1)
        setLoading(false)
        return
      }
      
      // Lọc dữ liệu theo trạng thái và từ khóa tìm kiếm
      let filteredOrders = ordersData;
      
      // Lọc theo trạng thái
      if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
        console.log('Sau khi lọc theo trạng thái:', filteredOrders.length, 'đơn hàng');
      }
      
      // Lọc theo từ khóa tìm kiếm
      if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.trim().toLowerCase();
        
        // Lấy thông tin người tạo từ bảng users
        const userIds = [...new Set(filteredOrders.map(order => order.customer_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        // Lấy thông tin khách hàng từ bảng shippings
        const orderIds = filteredOrders.map(order => order.order_id);
        const { data: shippingsData } = await supabase
          .from('shippings')
          .select('order_id, name_customer')
          .in('order_id', orderIds);
        
        // Tạo map để dễ dàng truy cập
        const usersMap = {};
        if (usersData) {
          usersData.forEach(user => {
            usersMap[user.user_id] = user.full_name;
          });
        }
        
        const shippingsMap = {};
        if (shippingsData) {
          shippingsData.forEach(shipping => {
            shippingsMap[shipping.order_id] = shipping.name_customer;
          });
        }
        
        // Lọc theo từ khóa
        filteredOrders = filteredOrders.filter(order => {
          // Tìm trong mã đơn hàng
          if (order.order_id.toLowerCase().includes(term)) return true;
          
          // Tìm trong ID khách hàng
          if (order.customer_id.toLowerCase().includes(term)) return true;
          
          // Tìm trong tên người tạo
          const creatorName = usersMap[order.customer_id] || '';
          if (creatorName.toLowerCase().includes(term)) return true;
          
          // Tìm trong tên khách hàng
          const customerName = order.is_shipping ? (shippingsMap[order.order_id] || '') : 'Vãng lai';
          if (customerName.toLowerCase().includes(term)) return true;
          
          return false;
        });
        
        console.log('Sau khi lọc theo từ khóa:', filteredOrders.length, 'đơn hàng');
      }
      
      // Lấy thông tin người tạo từ bảng users (nếu chưa lấy trong phần tìm kiếm)
      let usersMap = {};
      let shippingsMap = {};
      let paymentsMap = {};
      
      // Chỉ truy vấn nếu không có dữ liệu từ phần tìm kiếm
      if (Object.keys(usersMap).length === 0) {
        const userIds = [...new Set(filteredOrders.map(order => order.customer_id))];
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (usersData) {
          usersData.forEach(user => {
            usersMap[user.user_id] = user.full_name;
          });
        }
      }
      
      // Chỉ truy vấn nếu không có dữ liệu từ phần tìm kiếm
      if (Object.keys(shippingsMap).length === 0) {
        const orderIds = filteredOrders.map(order => order.order_id);
        const { data: shippingsData, error: shippingsError } = await supabase
          .from('shippings')
          .select('order_id, name_customer')
          .in('order_id', orderIds);
        
        if (shippingsData) {
          shippingsData.forEach(shipping => {
            shippingsMap[shipping.order_id] = shipping.name_customer;
          });
        }
      }
      
      // Lấy thông tin phương thức thanh toán từ bảng payments
      const paymentIds = [...new Set(filteredOrders.filter(order => order.payment_method).map(order => order.payment_method))];
      if (paymentIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('payment_id, payment_method_name')
          .in('payment_id', paymentIds);
        
        if (paymentsData) {
          paymentsData.forEach(payment => {
            paymentsMap[payment.payment_id] = payment.payment_method_name;
          });
        }
        
        if (paymentsError) {
          console.error('Lỗi khi lấy thông tin phương thức thanh toán:', paymentsError);
        }
      }
      
      // Xử lý dữ liệu trả về
      const formattedOrders = filteredOrders.map(order => {
        // Lấy tên người tạo từ bảng users dựa trên customer_id
        const creatorName = usersMap[order.customer_id] || `ID: ${order.customer_id}`;
        
        // Lấy tên khách hàng từ bảng shippings dựa trên order_id
        const customerName = order.is_shipping ? (shippingsMap[order.order_id] || 'Không xác định') : 'Vãng lai';
        
        // Lấy tên phương thức thanh toán từ bảng payments dựa trên payment_method
        const paymentMethodName = order.payment_method 
          ? (paymentsMap[order.payment_method] || `ID: ${order.payment_method}`) 
          : 'Không có';
        
        return {
          ...order,
          creator_name: creatorName,
          customer_name: customerName,
          payment_method_name: paymentMethodName
        }
      })
      
      console.log('Đã tìm thấy', formattedOrders.length, 'đơn hàng')
      setOrders(formattedOrders)
      setTotalPages(Math.ceil(formattedOrders.length / ordersPerPage))
    } catch (error) {
      console.error('Lỗi khi tìm kiếm đơn hàng:', error)
      setError(`Đã xảy ra lỗi khi tìm kiếm đơn hàng. Vui lòng thử lại sau.`)
      setOrders([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // Xem chi tiết đơn hàng
  const viewOrderDetails = async (order: Order) => {
    // Đã có thông tin người tạo và khách hàng từ danh sách đơn hàng
    setSelectedOrder(order)
    setShowOrderDetails(true)
    setOrderDetails([]) // Reset chi tiết đơn hàng
    setShippingInfo(null) // Reset thông tin vận chuyển
    
    try {
      // Lấy chi tiết đơn hàng
      const { data: orderDetailsData, error: orderDetailsError } = await supabase
        .from('orderdetails')
        .select(`
          *,
          products (image)
        `)
        .eq('order_id', order.order_id)
      
      if (orderDetailsError) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', orderDetailsError)
        setError(`Lỗi khi lấy chi tiết đơn hàng. Vui lòng thử lại sau.`)
        return
      }
      
      // Xử lý dữ liệu chi tiết đơn hàng
      const formattedOrderDetails = (orderDetailsData || []).map(detail => ({
        ...detail,
        product_image: detail.products?.image || null
      }))
      
      setOrderDetails(formattedOrderDetails)
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết đơn hàng:', error)
      setError(`Lỗi khi lấy chi tiết đơn hàng. Vui lòng thử lại sau.`)
    }
  }

  // Đóng modal chi tiết đơn hàng
  const closeOrderDetails = () => {
    setShowOrderDetails(false)
    setSelectedOrder(null)
    setOrderDetails([])
    setShippingInfo(null)
  }

  // Xử lý thay đổi trang
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
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

  // Lấy các đơn hàng cho trang hiện tại
  const getCurrentPageOrders = () => {
    const startIndex = (currentPage - 1) * ordersPerPage
    const endIndex = startIndex + ordersPerPage
    return orders.slice(startIndex, endIndex)
  }

  // Xuất đơn hàng ra PDF
  const exportOrderToPDF = (orderId: string) => {
    // TODO: Implement PDF export functionality
    console.log('Xuất đơn hàng', orderId, 'ra PDF')
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tìm kiếm và xem đơn hàng</h1>

      {/* Bộ lọc và tìm kiếm */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Tìm kiếm */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm theo mã đơn hàng, ID khách hàng..."
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchTerm(newValue);
                  
                  // Tự động tìm kiếm sau khi người dùng ngừng gõ 500ms
                  const delayDebounceFn = setTimeout(() => {
                    // Nếu xóa hết ký tự, đặt lại trạng thái ban đầu
                    if (!newValue || newValue.trim() === '') {
                      console.log('Đã xóa hết ký tự, tải lại tất cả dữ liệu');
                    }
                    searchOrders();
                  }, 500);
                  return () => clearTimeout(delayDebounceFn);
                }}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-10 pr-3`}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Lọc theo trạng thái */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(() => searchOrders(), 100);
                }}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-3 pr-10`}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
                <option value="Chưa thanh toán">Chưa thanh toán</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Lọc theo ngày bắt đầu */}
            <div>
              <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <input
                type="date"
                id="date-from"
                value={dateRange.from}
                onChange={(e) => {
                  setDateRange({ ...dateRange, from: e.target.value });
                  setTimeout(() => searchOrders(), 100);
                }}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-3 pr-3`}
              />
            </div>

            {/* Lọc theo ngày kết thúc */}
            <div>
              <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <input
                type="date"
                id="date-to"
                value={dateRange.to}
                onChange={(e) => {
                  setDateRange({ ...dateRange, to: e.target.value });
                  setTimeout(() => searchOrders(), 100);
                }}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-3 pr-3`}
              />
            </div>

            {/* Nút tìm kiếm */}
            <div className="flex items-end">
              <button
                onClick={searchOrders}
                className={`w-full h-10 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-medium rounded-md flex items-center justify-center`}
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

      {/* Thông báo lỗi */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
              <div className="mt-2">
                <button 
                  onClick={() => {
                    setError(null);
                    searchOrders();
                  }}
                  className="text-sm font-medium text-red-700 hover:text-red-600"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danh sách đơn hàng */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vận chuyển
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thanh toán
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : getCurrentPageOrders().length > 0 ? (
                getCurrentPageOrders().map((order) => (
                  <tr 
                    key={order.order_id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => viewOrderDetails(order)}
                  >
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'Đã thanh toán' 
                          ? 'bg-green-100 text-green-800' 
                          : order.status === 'Chưa thanh toán'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center ${
                        order.is_shipping 
                          ? 'text-blue-600' 
                          : 'text-gray-500'
                      }`}>
                        <TruckIcon className="h-5 w-5 mr-1" />
                        {order.is_shipping ? 'Có' : 'Không'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.payment_method_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => viewOrderDetails(order)}
                          className={`text-${themeColor}-600 hover:text-${themeColor}-900 p-1`}
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => exportOrderToPDF(order.order_id)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Xuất PDF"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                      Không tìm thấy đơn hàng nào
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center">
                      <button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const response = await fetch('/api/seed-orders');
                            const data = await response.json();
                            
                            if (data.success) {
                              alert(`Đã tạo ${data.data.orders} đơn hàng mẫu thành công!`);
                              searchOrders();
                            } else {
                              setError(`Không thể tạo dữ liệu mẫu: ${data.message}`);
                            }
                          } catch (error) {
                            console.error('Lỗi khi tạo dữ liệu mẫu:', error);
                            setError('Có lỗi xảy ra khi tạo dữ liệu mẫu');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                      >
                        Tạo dữ liệu mẫu
                      </button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Trước
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{(currentPage - 1) * ordersPerPage + 1}</span> đến <span className="font-medium">{Math.min(currentPage * ordersPerPage, orders.length)}</span> trong số <span className="font-medium">{orders.length}</span> đơn hàng
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Trang trước</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? `bg-${themeColor}-50 border-${themeColor}-500 text-${themeColor}-600 z-10`
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Trang sau</span>
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

      {/* Modal chi tiết đơn hàng */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Chi tiết đơn hàng #{selectedOrder.order_id}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Thông tin đơn hàng</h4>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="flex items-center mb-2">
                            <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700">Ngày đặt: {formatDate(selectedOrder.order_date)}</span>
                          </div>
                          <div className="flex items-center mb-2">
                            <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700">Phương thức thanh toán: {selectedOrder.payment_method_name}</span>
                          </div>
                          <div className="flex items-center mb-2">
                            {selectedOrder.status === 'Đã thanh toán' ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                            )}
                            <span className="text-sm text-gray-700">Trạng thái: {selectedOrder.status}</span>
                          </div>
                          <div className="flex items-center">
                            <TruckIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700">Vận chuyển: {selectedOrder.is_shipping ? 'Có' : 'Không'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Thông tin người tạo & khách hàng</h4>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-700 mb-2">Người tạo: {selectedOrder.creator_name}</p>
                          <p className="text-sm text-gray-700">Khách hàng: {selectedOrder.customer_name}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Chi tiết sản phẩm */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Chi tiết sản phẩm</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sản phẩm
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Đơn giá
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Số lượng
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thành tiền
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {orderDetails.map((detail, index) => (
                              <tr key={`${detail.order_id}-${detail.product_id}-${index}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {detail.product_image ? (
                                      <img src={detail.product_image} alt={detail.name_product} className="w-10 h-10 object-cover mr-2" />
                                    ) : (
                                      <div className="w-10 h-10 bg-gray-200 flex items-center justify-center mr-2">
                                        <span className="text-xs text-gray-500">No img</span>
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium text-gray-900">{detail.name_product}</div>
                                      {detail.name_check && (
                                        <div className="text-sm text-gray-500">{detail.name_check}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatCurrency(detail.unit_price)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{detail.quantity}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{formatCurrency(detail.subtotal)}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="px-6 py-4 text-right font-medium">
                                Tổng tiền:
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                                {formatCurrency(selectedOrder.price)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => exportOrderToPDF(selectedOrder.order_id)}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm`}
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Xuất PDF
                </button>
                
                {/* Nút xuất hóa đơn */}
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Implement invoice export functionality
                    console.log('Xuất hóa đơn cho đơn hàng', selectedOrder.order_id);
                  }}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm`}
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Xuất hóa đơn
                </button>
                
                {/* Nút xem đơn vận chuyển nếu có vận chuyển */}
                {selectedOrder.is_shipping && (
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Implement shipping details view
                      console.log('Xem đơn vận chuyển cho đơn hàng', selectedOrder.order_id);
                    }}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm`}
                  >
                    <TruckIcon className="h-5 w-5 mr-2" />
                    Xem đơn vận chuyển
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={closeOrderDetails}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}