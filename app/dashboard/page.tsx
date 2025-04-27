'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ShoppingCartIcon, UserGroupIcon, CubeIcon, DocumentTextIcon, ChartBarIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

// Đăng ký các thành phần Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

interface DashboardStat {
  id: string;
  name: string;
  stat: string;
  icon: any;
  color: string;
  change?: {
    value: string;
    type: 'increase' | 'decrease';
    text: string;
  };
}

// Dữ liệu mẫu cho biểu đồ doanh số
const salesData = {
  labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
  datasets: [
    {
      label: 'Doanh số (triệu VNĐ)',
      data: [65, 78, 52, 91, 43, 56, 61, 87, 75, 64, 68, 92],
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4,
      fill: true
    }
  ]
};

// Dữ liệu mẫu cho biểu đồ đơn hàng theo trạng thái
const orderStatusData = {
  labels: ['Đã thanh toán', 'Chưa thanh toán', 'Đang vận chuyển', 'Đã hủy'],
  datasets: [
    {
      data: [63, 15, 22, 8],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(234, 179, 8)',
        'rgb(59, 130, 246)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }
  ]
};

// Dữ liệu mẫu cho biểu đồ sản phẩm bán chạy
const topProductsData = {
  labels: ['Sản phẩm A', 'Sản phẩm B', 'Sản phẩm C', 'Sản phẩm D', 'Sản phẩm E'],
  datasets: [
    {
      label: 'Số lượng bán',
      data: [42, 38, 34, 29, 25],
      backgroundColor: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(99, 102, 241, 0.7)',
        'rgba(99, 102, 241, 0.6)',
        'rgba(99, 102, 241, 0.5)',
        'rgba(99, 102, 241, 0.4)'
      ],
      borderWidth: 0
    }
  ]
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [userFullName, setUserFullName] = useState<string>('') // State for user's full name
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  // State cho thông báo đăng nhập thành công
  const [loginSuccess, setLoginSuccess] = useState(false)

  // Lấy thông tin theme từ context nhưng chỉ sử dụng khi component đã mounted
  const themeContext = useTheme()

  const [themeState, setThemeState] = useState({
    selectedTheme: 'indigo',
    theme: themeColors.indigo
  })

  // State cho dữ liệu thống kê
  const [orderStats, setOrderStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    shipping: 0
  })
  const [userCount, setUserCount] = useState(0)
  const [productCount, setProductCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [orderStatusStats, setOrderStatusStats] = useState<{
    labels: string[],
    data: number[]
  }>({
    labels: ['Đã thanh toán', 'Chưa thanh toán', 'Đang vận chuyển', 'Đã hủy'],
    data: [0, 0, 0, 0]
  })

  // State cho dữ liệu biểu đồ
  const [salesChartData, setSalesChartData] = useState(salesData)
  const [orderStatusChartData, setOrderStatusChartData] = useState(orderStatusData)
  const [topProductsChartData, setTopProductsChartData] = useState(topProductsData)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Kiểm tra tham số login_success trong URL
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('login_success') === 'true') {
        // Đánh dấu đăng nhập thành công
        setLoginSuccess(true);

        // Xóa tham số login_success khỏi URL để tránh refresh hiển thị lại thông báo
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('login_success');
        newUrl.searchParams.delete('ts');
        window.history.replaceState({}, document.title, newUrl.toString());

        // Tự động ẩn thông báo sau 5 giây
        setTimeout(() => {
          setLoginSuccess(false);
        }, 5000);
      }
    }
  }, [mounted]);

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        selectedTheme: themeContext.selectedTheme,
        theme: themeContext.currentTheme
      })
    }
  }, [mounted, themeContext.selectedTheme, themeContext.currentTheme])

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClientComponentClient()
        const { data } = await supabase.auth.getUser()
        setUser(data.user)

        // Lấy thông tin người dùng từ bảng users để lấy full_name
        if (data.user?.id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (userError) {
            console.error('Lỗi khi lấy thông tin người dùng:', userError)
          } else if (userData && userData.full_name) {
            console.log('Đã lấy được tên người dùng:', userData.full_name)
            setUserFullName(userData.full_name)
          } else {
            console.log('Không tìm thấy tên người dùng, sử dụng email')
            // Nếu không có full_name, để trống
            setUserFullName('')
          }
        }

        // Lấy dữ liệu thống kê
        await fetchDashboardData(supabase)
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error)
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      getUser()
    }
  }, [mounted])

  // Hàm lấy dữ liệu cho dashboard
  const fetchDashboardData = async (supabase: any) => {
    try {
      // Lấy thống kê đơn hàng
      await fetchOrderStats(supabase)

      // Lấy số lượng người dùng
      await fetchUserCount(supabase)

      // Lấy số lượng sản phẩm
      await fetchProductCount(supabase)

      // Lấy doanh số tháng hiện tại
      await fetchMonthlyRevenue(supabase)

      // Lấy đơn hàng gần đây
      await fetchRecentOrders(supabase)

      // Lấy top sản phẩm bán chạy
      await fetchTopProducts(supabase)

      // Lấy thống kê trạng thái đơn hàng
      await fetchOrderStatusStats(supabase)

      // Lấy dữ liệu doanh số theo tháng
      await fetchMonthlySales(supabase)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu dashboard:', error)
    }
  }

  // Lấy thống kê đơn hàng
  const fetchOrderStats = async (supabase: any) => {
    try {
      console.log('Đang lấy thống kê đơn hàng...')

      // Lấy tổng số đơn hàng
      const { count: totalCount, error: totalError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      if (totalError) {
        console.error('Lỗi khi lấy tổng số đơn hàng:', totalError)
        throw totalError
      }

      console.log('Tổng số đơn hàng:', totalCount)

      // Lấy số đơn hàng đã thanh toán
      const { count: paidCount, error: paidError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Đã thanh toán')

      if (paidError) {
        console.error('Lỗi khi lấy số đơn hàng đã thanh toán:', paidError)
        throw paidError
      }

      console.log('Số đơn hàng đã thanh toán:', paidCount)

      // Lấy số đơn hàng chưa thanh toán
      const { count: unpaidCount, error: unpaidError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Chưa thanh toán')

      if (unpaidError) {
        console.error('Lỗi khi lấy số đơn hàng chưa thanh toán:', unpaidError)
        throw unpaidError
      }

      console.log('Số đơn hàng chưa thanh toán:', unpaidCount)

      // Lấy số đơn hàng có vận chuyển
      const { count: shippingCount, error: shippingError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_shipping', true)

      if (shippingError) {
        console.error('Lỗi khi lấy số đơn hàng có vận chuyển:', shippingError)
        throw shippingError
      }

      console.log('Số đơn hàng có vận chuyển:', shippingCount)

      setOrderStats({
        total: totalCount || 0,
        paid: paidCount || 0,
        unpaid: unpaidCount || 0,
        shipping: shippingCount || 0
      })

      console.log('Đã cập nhật thống kê đơn hàng:', {
        total: totalCount || 0,
        paid: paidCount || 0,
        unpaid: unpaidCount || 0,
        shipping: shippingCount || 0
      })
    } catch (error) {
      console.error('Lỗi khi lấy thống kê đơn hàng:', error)
    }
  }

  // Lấy số lượng người dùng
  const fetchUserCount = async (supabase: any) => {
    try {
      console.log('Đang lấy số lượng người dùng...')

      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Lỗi khi lấy số lượng người dùng:', error)
        throw error
      }

      console.log('Số lượng người dùng:', count)
      setUserCount(count || 0)
    } catch (error) {
      console.error('Lỗi khi lấy số lượng người dùng:', error)
    }
  }

  // Lấy số lượng sản phẩm
  const fetchProductCount = async (supabase: any) => {
    try {
      console.log('Đang lấy số lượng sản phẩm...')

      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Lỗi khi lấy số lượng sản phẩm:', error)
        throw error
      }

      console.log('Số lượng sản phẩm:', count)
      setProductCount(count || 0)
    } catch (error) {
      console.error('Lỗi khi lấy số lượng sản phẩm:', error)
    }
  }

  // Lấy doanh số tháng hiện tại
  const fetchMonthlyRevenue = async (supabase: any) => {
    try {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const { data, error } = await supabase
        .from('orders')
        .select('price')
        .gte('order_date', firstDayOfMonth)
        .lte('order_date', lastDayOfMonth)
        .eq('status', 'Đã thanh toán')

      if (error) throw error

      const totalRevenue = data.reduce((sum, order) => sum + (order.price || 0), 0)
      setTotalRevenue(totalRevenue)
    } catch (error) {
      console.error('Lỗi khi lấy doanh số tháng:', error)
    }
  }

  // Lấy đơn hàng gần đây
  const fetchRecentOrders = async (supabase: any) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (full_name)
        `)
        .order('order_date', { ascending: false })
        .limit(5)

      if (error) throw error

      // Xử lý dữ liệu trả về
      const formattedOrders = data.map((order: any) => ({
        order_id: order.order_id,
        customer_name: order.customers?.full_name || 'Khách vãng lai',
        order_date: order.order_date,
        price: order.price,
        status: order.status
      }))

      setRecentOrders(formattedOrders)
    } catch (error) {
      console.error('Lỗi khi lấy đơn hàng gần đây:', error)
    }
  }

  // Lấy top sản phẩm bán chạy
  const fetchTopProducts = async (supabase: any) => {
    try {
      // Lấy số lượng bán của từng sản phẩm từ bảng orderdetails
      const { data, error } = await supabase
        .from('orderdetails')
        .select(`
          product_id,
          name_product,
          quantity
        `)

      if (error) throw error

      // Tính tổng số lượng bán cho mỗi sản phẩm
      const productMap = new Map<string, { name: string, quantity: number }>()

      data.forEach((detail: any) => {
        const productId = detail.product_id
        const productName = detail.name_product
        const quantity = detail.quantity || 0

        const current = productMap.get(productId) || { name: productName, quantity: 0 }
        productMap.set(productId, {
          name: productName,
          quantity: current.quantity + quantity
        })
      })

      // Chuyển đổi Map thành mảng và sắp xếp theo số lượng bán giảm dần
      const sortedProducts = Array.from(productMap.entries())
        .map(([id, { name, quantity }]) => ({ id, name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5) // Lấy top 5

      setTopProducts(sortedProducts)

      // Cập nhật dữ liệu biểu đồ
      const labels = sortedProducts.map(product => product.name)
      const values = sortedProducts.map(product => product.quantity)

      // Cập nhật dữ liệu cho biểu đồ
      setTopProductsChartData({
        labels,
        datasets: [
          {
            label: 'Số lượng bán',
            data: values,
            backgroundColor: [
              'rgba(99, 102, 241, 0.8)',
              'rgba(99, 102, 241, 0.7)',
              'rgba(99, 102, 241, 0.6)',
              'rgba(99, 102, 241, 0.5)',
              'rgba(99, 102, 241, 0.4)'
            ],
            borderWidth: 0
          }
        ]
      })
    } catch (error) {
      console.error('Lỗi khi lấy top sản phẩm bán chạy:', error)
    }
  }

  // Lấy thống kê trạng thái đơn hàng
  const fetchOrderStatusStats = async (supabase: any) => {
    try {
      // Lấy số lượng đơn hàng theo trạng thái
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, is_shipping')

      if (error) throw error

      // Đếm số lượng đơn hàng theo trạng thái
      const paidCount = orders.filter((order: any) => order.status === 'Đã thanh toán').length
      const unpaidCount = orders.filter((order: any) => order.status === 'Chưa thanh toán').length

      // Đếm số lượng đơn hàng đang vận chuyển
      const { data: shippings, error: shippingError } = await supabase
        .from('shippings')
        .select('status')
        .in('status', ['Đang chuẩn bị', 'Đang giao hàng'])

      if (shippingError) throw shippingError

      const shippingCount = shippings?.length || 0

      // Đếm số lượng đơn hàng đã hủy
      const { data: canceledShippings, error: canceledError } = await supabase
        .from('shippings')
        .select('status')
        .eq('status', 'Đã hủy')

      if (canceledError) throw canceledError

      const canceledCount = canceledShippings?.length || 0

      // Cập nhật dữ liệu cho biểu đồ
      setOrderStatusStats({
        labels: ['Đã thanh toán', 'Chưa thanh toán', 'Đang vận chuyển', 'Đã hủy'],
        data: [paidCount, unpaidCount, shippingCount, canceledCount]
      })

      // Cập nhật dữ liệu biểu đồ
      setOrderStatusChartData({
        labels: ['Đã thanh toán', 'Chưa thanh toán', 'Đang vận chuyển', 'Đã hủy'],
        datasets: [
          {
            data: [paidCount, unpaidCount, shippingCount, canceledCount],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(234, 179, 8, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(239, 68, 68, 0.8)'
            ],
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(234, 179, 8)',
              'rgb(59, 130, 246)',
              'rgb(239, 68, 68)'
            ],
            borderWidth: 1
          }
        ]
      })
    } catch (error) {
      console.error('Lỗi khi lấy thống kê trạng thái đơn hàng:', error)
    }
  }

  // Lấy dữ liệu doanh số theo tháng
  const fetchMonthlySales = async (supabase: any) => {
    try {
      // Lấy dữ liệu doanh số 12 tháng gần nhất
      const now = new Date()
      const monthsData = []

      for (let i = 11; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).toISOString()
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString()

        const { data, error } = await supabase
          .from('orders')
          .select('price')
          .gte('order_date', firstDay)
          .lt('order_date', lastDay)
          .eq('status', 'Đã thanh toán')

        if (error) throw error

        const totalRevenue = data.reduce((sum, order) => sum + (order.price || 0), 0)
        monthsData.push({
          month: `T${month.getMonth() + 1}`,
          revenue: Math.round(totalRevenue / 1000000) // Chuyển đổi sang triệu
        })
      }

      // Cập nhật dữ liệu biểu đồ
      setSalesChartData({
        labels: monthsData.map(item => item.month),
        datasets: [
          {
            label: 'Doanh số (triệu VNĐ)',
            data: monthsData.map(item => item.revenue),
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      })
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu doanh số theo tháng:', error)
    }
  }

  // Adjust colors based on the selected theme
  const themeColorMap = {
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    yellow: 'bg-amber-500',
    pink: 'bg-pink-500'
  }

  // Hàm định dạng số tiền
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
  }

  const stats: DashboardStat[] = [
    {
      id: 'sales',
      name: 'Tổng đơn hàng',
      stat: orderStats.total.toString(),
      icon: ShoppingCartIcon,
      color: themeState.selectedTheme === 'pink' ? themeColorMap.indigo : themeColorMap.pink,
      change: {
        value: '12%',
        type: 'increase',
        text: 'so với tháng trước'
      }
    },
    {
      id: 'users',
      name: 'Người dùng',
      stat: userCount.toString(),
      icon: UserGroupIcon,
      color: themeColorMap.blue,
      change: {
        value: '5%',
        type: 'increase',
        text: 'so với tháng trước'
      }
    },
    {
      id: 'products',
      name: 'Sản phẩm',
      stat: productCount.toString(),
      icon: CubeIcon,
      color: themeColorMap.green,
      change: {
        value: '3%',
        type: 'increase',
        text: 'so với tháng trước'
      }
    },
    {
      id: 'orders',
      name: 'Đơn hàng cần xử lý',
      stat: orderStats.unpaid.toString(),
      icon: DocumentTextIcon,
      color: themeColorMap.yellow,
      change: {
        value: '8%',
        type: 'decrease',
        text: 'so với tháng trước'
      }
    },
    {
      id: 'reports',
      name: 'Doanh số tháng',
      stat: formatCurrency(totalRevenue),
      icon: ChartBarIcon,
      color: themeState.selectedTheme === 'indigo' ? themeColorMap.pink : themeColorMap.indigo,
      change: {
        value: '15%',
        type: 'increase',
        text: 'so với tháng trước'
      }
    },
  ]

  if (loading || !mounted) {
    return null // Layout sẽ hiển thị loading
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Bảng điều khiển</h1>

      {loginSuccess && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md flex justify-between items-center">
          <div>
            <span className="font-medium">Đăng nhập thành công!</span> Chào mừng trở lại
          </div>
          <button
            onClick={() => setLoginSuccess(false)}
            className="text-green-500 hover:text-green-700"
          >
            <span className="sr-only">Đóng</span>
            ✕
          </button>
        </div>
      )}

      <div className="mt-4">
        <div className="px-4 py-3 bg-white shadow-sm rounded-lg">
          <h2 className="text-lg font-medium text-gray-900">Chào mừng trở lại</h2>
          <p className="mt-1 text-sm text-gray-500">
            Dưới đây là tổng quan về hoạt động của hệ thống.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.id}
              className="relative bg-white pt-5 px-4 pb-6 sm:pt-6 sm:px-6 shadow-sm rounded-lg overflow-hidden"
            >
              <div className="absolute top-0 right-0 mt-3 mr-3">
                <div className={`${item.color} rounded-full p-2`}>
                  <item.icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </div>
              <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{item.stat}</dd>
              {item.change && (
                <div className="mt-2 flex items-center text-sm">
                  {item.change.type === 'increase' ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`font-medium ${item.change.type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change.value}
                  </span>
                  <span className="ml-1 text-gray-500">{item.change.text}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Biểu đồ doanh số */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Doanh số theo tháng</h3>
            <div className="mt-4 h-80">
              <Line
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value + ' tr';
                        }
                      }
                    }
                  },
                  interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Biểu đồ đơn hàng theo trạng thái */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Đơn hàng theo trạng thái</h3>
            <div className="mt-4 flex justify-center h-80">
              <div className="w-64">
                <Doughnut
                  data={orderStatusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      }
                    },
                    cutout: '65%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Sản phẩm bán chạy</h3>
            <div className="mt-4 h-80">
              <Bar
                data={topProductsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                    }
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      grid: {
                        display: true,
                        drawBorder: false,
                      }
                    },
                    y: {
                      grid: {
                        display: false,
                        drawBorder: false,
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Hoạt động gần đây</h3>
            <div className="mt-4 space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <div key={order.order_id} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`h-8 w-8 rounded-full ${order.status === 'Đã thanh toán' ? 'bg-green-100' : 'bg-yellow-100'} flex items-center justify-center`}>
                        <ShoppingCartIcon className={`h-4 w-4 ${order.status === 'Đã thanh toán' ? 'text-green-600' : 'text-yellow-600'}`} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {order.status === 'Đã thanh toán' ? 'Đơn hàng đã thanh toán' : 'Đơn hàng mới'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Đơn hàng #{order.order_id} - {order.customer_name} - {formatCurrency(order.price)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(order.order_date).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Không có hoạt động gần đây.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Cập nhật hệ thống</h3>
            <div className="mt-2">
              <div className="flex items-center text-sm text-green-600">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-2">Hệ thống đang hoạt động bình thường.</p>
              </div>
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900">Cập nhật gần đây</h4>
                <ul className="mt-2 space-y-2 text-sm text-gray-500">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Cập nhật giao diện người dùng (2 ngày trước)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Thêm tính năng xuất báo cáo PDF (5 ngày trước)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Cải thiện hiệu suất hệ thống (1 tuần trước)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}