'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { createClient } from '@/utils/supabase/client'
import AccessDenied from '@/components/AccessDenied'
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PrinterIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  PresentationChartLineIcon,
  CircleStackIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

// Định nghĩa các interface
interface Order {
  order_id: string
  customer_id: string | null
  order_date: string
  price: number
  status: string | null
  is_shipping: boolean | null
  payment_method: number | null
  customer_name?: string | null
  payment_method_name?: string | null
}

interface OrderDetail {
  order_detail_id: string
  order_id: string
  product_id: string
  name_product: string
  quantity: number
  unit_price: number
  subtotal: number
  product_image?: string | null
}

interface OrderSummary {
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
  shippingOrders: number
  paidOrders: number
  unpaidOrders: number
}

interface ChartData {
  labels: string[]
  values: number[]
}

interface PaymentMethodSummary {
  method_id: number
  method_name: string
  count: number
  total: number
  percentage: number
}

interface TopCustomer {
  customer_id: string
  customer_name: string
  order_count: number
  total_spent: number
}

interface OrderTrend {
  period: string
  order_count: number
  revenue: number
  avg_value: number
  growth_rate?: number
}

export default function OrderReportsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // Refs cho xuất PDF
  const reportRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // State cho bộ lọc
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [statusFilter, setStatusFilter] = useState('all')
  const [isShippingFilter, setIsShippingFilter] = useState<string>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // State cho dữ liệu
  const [orders, setOrders] = useState<Order[]>([])
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    shippingOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0
  })
  const [revenueByDay, setRevenueByDay] = useState<ChartData>({
    labels: [],
    values: []
  })
  const [ordersByStatus, setOrdersByStatus] = useState<ChartData>({
    labels: [],
    values: []
  })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummary[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [orderTrends, setOrderTrends] = useState<OrderTrend[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'trends' | 'customers'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Kiểm tra vai trò người dùng hiện tại có phải admin không
  useEffect(() => {
    if (mounted) {
      const checkUserRole = async () => {
        try {
          const client = createClient()
          const { data: { session }, error: sessionError } = await client.auth.getSession()

          if (sessionError || !session) {
            console.error('Không có phiên đăng nhập:', sessionError?.message)
            setIsAdmin(false)
            setAuthLoading(false)
            return
          }

          const { data: accountData, error: accountError } = await client
            .from('accounts')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (accountError || !accountData) {
            console.error('Lỗi khi lấy thông tin tài khoản:', accountError)
            setIsAdmin(false)
            setAuthLoading(false)
            return
          }

          setIsAdmin(accountData.role === 'admin')
          setAuthLoading(false)
        } catch (error) {
          console.error('Lỗi khi kiểm tra vai trò:', error)
          setIsAdmin(false)
          setAuthLoading(false)
        }
      }

      checkUserRole()
    }
  }, [mounted])

  // Cập nhật themeState từ context
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })

      // Tải dữ liệu báo cáo khi component đã mounted
      fetchReportData()
    }
  }, [mounted, themeContext.currentTheme])

  // Hàm lấy dữ liệu báo cáo
  const fetchReportData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Xây dựng query cơ bản
      let query = supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false })

      // Áp dụng bộ lọc theo ngày
      if (dateRange.from) {
        query = query.gte('order_date', `${dateRange.from}T00:00:00.000Z`)
      }
      if (dateRange.to) {
        query = query.lte('order_date', `${dateRange.to}T23:59:59.999Z`)
      }

      // Áp dụng bộ lọc theo trạng thái
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Áp dụng bộ lọc theo vận chuyển
      if (isShippingFilter !== 'all') {
        const isShipping = isShippingFilter === 'true'
        query = query.eq('is_shipping', isShipping)
      }

      // Áp dụng bộ lọc theo giá trị đơn hàng
      if (minAmount && !isNaN(parseFloat(minAmount))) {
        query = query.gte('price', parseFloat(minAmount))
      }
      if (maxAmount && !isNaN(parseFloat(maxAmount))) {
        query = query.lte('price', parseFloat(maxAmount))
      }

      // Thực hiện truy vấn
      const { data: ordersData, error: ordersError } = await query

      if (ordersError) {
        throw ordersError
      }

      // Lấy thông tin chi tiết đơn hàng
      let enrichedOrdersData = [...(ordersData || [])]

      // Lấy thông tin vận chuyển cho các đơn hàng có vận chuyển
      const orderIdsWithShipping = enrichedOrdersData
        .filter(order => order.is_shipping)
        .map(order => order.order_id)

      if (orderIdsWithShipping.length > 0) {
        try {
          const { data: shippingsData, error: shippingsError } = await supabase
            .from('shippings')
            .select('*')
            .in('order_id', orderIdsWithShipping)

          if (!shippingsError && shippingsData) {
            // Thêm thông tin vận chuyển vào đơn hàng
            enrichedOrdersData = enrichedOrdersData.map(order => {
              const shipping = shippingsData.find(s => s.order_id === order.order_id)
              if (shipping) {
                return {
                  ...order,
                  shipping_address: shipping.shipping_address,
                  shipping_cost: shipping.shipping_cost,
                  shipping_status: shipping.status,
                  name_customer: shipping.name_customer || order.customer_name
                }
              }
              return order
            })
          }
        } catch (error) {
          console.error('Lỗi khi lấy dữ liệu vận chuyển:', error)
        }
      }

      // Xử lý dữ liệu đơn hàng
      setOrders(enrichedOrdersData)
      calculateSummary(enrichedOrdersData)
      calculateRevenueByDay(enrichedOrdersData)
      calculateOrdersByStatus(enrichedOrdersData)
      await fetchPaymentMethodsData(enrichedOrdersData)
      await fetchTopCustomers(enrichedOrdersData)
      calculateOrderTrends(enrichedOrdersData)
    } catch (error: any) {
      console.error('Lỗi khi lấy dữ liệu báo cáo:', error)
      const errorMessage = error.message || (error.details || error.toString()) || 'Không xác định';
      setError(`Lỗi khi lấy dữ liệu: ${errorMessage}`)
      setOrders([])
      setOrderSummary({
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        shippingOrders: 0,
        paidOrders: 0,
        unpaidOrders: 0
      })
      setRevenueByDay({ labels: [], values: [] })
      setOrdersByStatus({ labels: [], values: [] })
      setPaymentMethods([])
      setTopCustomers([])
      setOrderTrends([])
    } finally {
      setLoading(false)
    }
  }

  // Tính toán tổng kết từ dữ liệu đơn hàng
  const calculateSummary = (ordersData: Order[]) => {
    const totalOrders = ordersData.length
    const totalRevenue = ordersData.reduce((sum, order) => sum + (order.price || 0), 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const shippingOrders = ordersData.filter(order => order.is_shipping).length
    const paidOrders = ordersData.filter(order => order.status === 'Đã thanh toán').length
    const unpaidOrders = ordersData.filter(order => order.status === 'Chưa thanh toán').length

    setOrderSummary({
      totalOrders,
      totalRevenue,
      avgOrderValue,
      shippingOrders,
      paidOrders,
      unpaidOrders
    })
  }

  // Tính toán doanh thu theo ngày
  const calculateRevenueByDay = (ordersData: Order[]) => {
    // Nhóm đơn hàng theo ngày và tính tổng doanh thu
    const revenueMap = new Map<string, number>()

    ordersData.forEach(order => {
      const orderDate = new Date(order.order_date)
      const dateKey = orderDate.toISOString().split('T')[0] // Lấy phần ngày YYYY-MM-DD

      const currentRevenue = revenueMap.get(dateKey) || 0
      revenueMap.set(dateKey, currentRevenue + (order.price || 0))
    })

    // Sắp xếp theo ngày
    const sortedEntries = Array.from(revenueMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    // Giới hạn hiển thị 7 ngày gần nhất nếu có nhiều dữ liệu
    const limitedEntries = sortedEntries.slice(-7)

    // Định dạng ngày để hiển thị
    const labels = limitedEntries.map(([date]) => {
      const [year, month, day] = date.split('-')
      return `${day}/${month}`
    })

    const values = limitedEntries.map(([_, revenue]) => revenue)

    setRevenueByDay({
      labels,
      values
    })
  }

  // Tính toán đơn hàng theo trạng thái
  const calculateOrdersByStatus = (ordersData: Order[]) => {
    const statusMap = new Map<string, number>()

    ordersData.forEach(order => {
      const status = order.status || 'Không xác định'
      const currentCount = statusMap.get(status) || 0
      statusMap.set(status, currentCount + 1)
    })

    const labels = Array.from(statusMap.keys())
    const values = Array.from(statusMap.values())

    setOrdersByStatus({
      labels,
      values
    })
  }

  // Lấy dữ liệu phương thức thanh toán
  const fetchPaymentMethodsData = async (ordersData: Order[]) => {
    try {
      // Lấy danh sách các phương thức thanh toán từ bảng payments
      const { data: paymentMethodsData, error: paymentMethodsError } = await supabase
        .from('payments')
        .select('payment_id, payment_method_name')

      if (paymentMethodsError) {
        console.error('Lỗi khi lấy dữ liệu phương thức thanh toán:', paymentMethodsError)

        // Sử dụng danh sách mặc định nếu có lỗi
        const defaultPaymentMethods = [
          { payment_id: 1, payment_method_name: 'Tiền mặt' },
          { payment_id: 2, payment_method_name: 'Chuyển khoản' },
          { payment_id: 3, payment_method_name: 'Thẻ tín dụng' },
          { payment_id: 4, payment_method_name: 'Ví điện tử' }
        ]

        // Tính toán số lượng và tổng giá trị đơn hàng theo phương thức thanh toán
        const methodMap = new Map<number, { count: number, total: number }>()

        ordersData.forEach(order => {
          if (order.payment_method) {
            const methodId = order.payment_method
            const current = methodMap.get(methodId) || { count: 0, total: 0 }
            methodMap.set(methodId, {
              count: current.count + 1,
              total: current.total + (order.price || 0)
            })
          }
        })

        // Tổng hợp dữ liệu
        const totalOrders = ordersData.length
        const totalRevenue = ordersData.reduce((sum, order) => sum + (order.price || 0), 0)

        const paymentSummary: PaymentMethodSummary[] = defaultPaymentMethods.map(method => {
          const stats = methodMap.get(method.payment_id) || { count: 0, total: 0 }
          return {
            method_id: method.payment_id,
            method_name: method.payment_method_name,
            count: stats.count,
            total: stats.total,
            percentage: totalOrders > 0 ? (stats.count / totalOrders) * 100 : 0
          }
        })

        setPaymentMethods(paymentSummary)
        return
      }

      // Tính toán số lượng và tổng giá trị đơn hàng theo phương thức thanh toán
      const methodMap = new Map<number, { count: number, total: number }>()

      ordersData.forEach(order => {
        if (order.payment_method) {
          const methodId = order.payment_method
          const current = methodMap.get(methodId) || { count: 0, total: 0 }
          methodMap.set(methodId, {
            count: current.count + 1,
            total: current.total + (order.price || 0)
          })
        }
      })

      // Tổng hợp dữ liệu
      const totalOrders = ordersData.length
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.price || 0), 0)

      const paymentSummary: PaymentMethodSummary[] = paymentMethodsData?.map(method => {
        const stats = methodMap.get(method.payment_id) || { count: 0, total: 0 }
        return {
          method_id: method.payment_id,
          method_name: method.payment_method_name,
          count: stats.count,
          total: stats.total,
          percentage: totalOrders > 0 ? (stats.count / totalOrders) * 100 : 0
        }
      }) || []

      setPaymentMethods(paymentSummary)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu phương thức thanh toán:', error)
    }
  }

  // Lấy dữ liệu khách hàng hàng đầu
  const fetchTopCustomers = async (ordersData: Order[]) => {
    try {
      // Nhóm đơn hàng theo khách hàng
      const customerMap = new Map<string, {
        order_count: number,
        total_spent: number,
        customer_name: string
      }>()

      // Lọc ra các đơn hàng có customer_id và customer_name
      ordersData.forEach(order => {
        if (order.customer_id) {
          const customerId = order.customer_id
          const customerName = order.customer_name || 'Khách hàng ' + customerId.substring(0, 8)

          const current = customerMap.get(customerId) || {
            order_count: 0,
            total_spent: 0,
            customer_name: customerName
          }

          customerMap.set(customerId, {
            order_count: current.order_count + 1,
            total_spent: current.total_spent + (order.price || 0),
            customer_name: customerName
          })
        }
      })

      // Tạo danh sách khách hàng hàng đầu trực tiếp từ dữ liệu đơn hàng
      const topCustomersList: TopCustomer[] = Array.from(customerMap.entries()).map(([customerId, stats]) => {
        return {
          customer_id: customerId,
          customer_name: stats.customer_name,
          order_count: stats.order_count,
          total_spent: stats.total_spent
        }
      })

      // Sắp xếp theo tổng chi tiêu giảm dần và lấy 5 khách hàng hàng đầu
      const sortedCustomers = topCustomersList.sort((a, b) => b.total_spent - a.total_spent).slice(0, 5)

      setTopCustomers(sortedCustomers)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu khách hàng hàng đầu:', error)
      setTopCustomers([])
    }
  }

  // Tính toán xu hướng đơn hàng theo tháng
  const calculateOrderTrends = (ordersData: Order[]) => {
    // Nhóm đơn hàng theo tháng
    const monthMap = new Map<string, { order_count: number, revenue: number }>()

    ordersData.forEach(order => {
      const orderDate = new Date(order.order_date)
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`

      const current = monthMap.get(monthKey) || { order_count: 0, revenue: 0 }
      monthMap.set(monthKey, {
        order_count: current.order_count + 1,
        revenue: current.revenue + (order.price || 0)
      })
    })

    // Sắp xếp theo tháng
    const sortedEntries = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    // Tính toán xu hướng
    const trends: OrderTrend[] = sortedEntries.map(([monthKey, stats], index) => {
      const [year, month] = monthKey.split('-')
      const period = `${month}/${year}`
      const avg_value = stats.order_count > 0 ? stats.revenue / stats.order_count : 0

      // Tính tỷ lệ tăng trưởng so với tháng trước
      let growth_rate: number | undefined = undefined
      if (index > 0) {
        const prevRevenue = sortedEntries[index - 1][1].revenue
        if (prevRevenue > 0) {
          growth_rate = ((stats.revenue - prevRevenue) / prevRevenue) * 100
        }
      }

      return {
        period,
        order_count: stats.order_count,
        revenue: stats.revenue,
        avg_value,
        growth_rate
      }
    })

    // Lấy 6 tháng gần nhất
    const recentTrends = trends.slice(-6)

    setOrderTrends(recentTrends)
  }

  // Xử lý thay đổi bộ lọc
  const handleDateChange = (field: 'from' | 'to') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
  }

  const handleIsShippingFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsShippingFilter(e.target.value)
  }

  const handleAmountChange = (field: 'min' | 'max') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'min') {
      setMinAmount(e.target.value)
    } else {
      setMaxAmount(e.target.value)
    }
  }

  const handleApplyFilters = () => {
    fetchReportData()
  }

  const handleResetFilters = () => {
    setDateRange({ from: '', to: '' })
    setStatusFilter('all')
    setIsShippingFilter('all')
    setMinAmount('')
    setMaxAmount('')
    // Gọi lại API để lấy dữ liệu không có bộ lọc
    fetchReportData()
  }

  // Xuất báo cáo PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return

    setExportingPdf(true)

    try {
      // Tạo PDF với kích thước A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Sử dụng font Times New Roman
      pdf.setFont("times", "normal")

      // Thêm tiêu đề và thông tin chính thức
      pdf.setFontSize(13)
      pdf.setTextColor(0, 0, 0)
      pdf.setFont("times", "bold")
      pdf.text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 105, 15, { align: "center" })
      pdf.setLineWidth(0.5)
      pdf.line(60, 17, 150, 17)
      pdf.setFontSize(12)
      pdf.text("Độc lập - Tự do - Hạnh phúc", 105, 23, { align: "center" })
      pdf.line(75, 25, 135, 25)

      // Thêm tiêu đề báo cáo
      pdf.setFontSize(16)
      pdf.text("BÁO CÁO TỔNG HỢP ĐƠN HÀNG", 105, 35, { align: "center" })

      // Thêm thông tin thời gian và bộ lọc
      const now = new Date()
      let reportPeriod = "Tất cả thời gian"
      if (dateRange.from && dateRange.to) {
        reportPeriod = `Từ ngày ${dateRange.from} đến ngày ${dateRange.to}`
      } else if (dateRange.from) {
        reportPeriod = `Từ ngày ${dateRange.from}`
      } else if (dateRange.to) {
        reportPeriod = `Đến ngày ${dateRange.to}`
      }

      pdf.setFont("times", "normal")
      pdf.setFontSize(10)
      pdf.text(`Kỳ báo cáo: ${reportPeriod}`, 105, 42, { align: "center" })
      pdf.text(`Ngày xuất báo cáo: ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`, 105, 47, { align: "center" })

      if (statusFilter !== 'all') {
        pdf.text(`Trạng thái: ${statusFilter}`, 105, 52, { align: "center" })
      }

      // Thêm thông tin tổng quan
      pdf.setFont("times", "bold")
      pdf.setFontSize(12)
      pdf.text("I. THÔNG TIN TỔNG QUAN", 20, 60)
      pdf.setLineWidth(0.2)
      pdf.line(20, 62, 80, 62)

      pdf.setFont("times", "normal")
      pdf.setFontSize(10)

      // Tạo bảng thông tin tổng quan
      const summaryData = [
        ["Tổng số đơn hàng:", `${orderSummary.totalOrders} đơn`],
        ["Tổng doanh thu:", formatCurrency(orderSummary.totalRevenue)],
        ["Giá trị trung bình:", formatCurrency(orderSummary.avgOrderValue)],
        ["Đơn hàng vận chuyển:", `${orderSummary.shippingOrders} đơn (${orderSummary.totalOrders > 0 ? ((orderSummary.shippingOrders / orderSummary.totalOrders) * 100).toFixed(1) : 0}%)`],
        ["Đơn hàng đã thanh toán:", `${orderSummary.paidOrders} đơn (${orderSummary.totalOrders > 0 ? ((orderSummary.paidOrders / orderSummary.totalOrders) * 100).toFixed(1) : 0}%)`],
        ["Đơn hàng chưa thanh toán:", `${orderSummary.unpaidOrders} đơn (${orderSummary.totalOrders > 0 ? ((orderSummary.unpaidOrders / orderSummary.totalOrders) * 100).toFixed(1) : 0}%)`]
      ]

      let yPos = 68
      summaryData.forEach(row => {
        pdf.text(row[0], 25, yPos)
        pdf.text(row[1], 80, yPos)
        yPos += 7
      })

      // Thêm thông tin đơn hàng theo trạng thái
      pdf.setFont("times", "bold")
      pdf.setFontSize(12)
      pdf.text("II. ĐƠN HÀNG THEO TRẠNG THÁI", 20, yPos + 5)
      pdf.line(20, yPos + 7, 100, yPos + 7)

      pdf.setFont("times", "normal")
      pdf.setFontSize(10)
      yPos += 13

      // Hiển thị dữ liệu đơn hàng theo trạng thái dạng bảng thay vì biểu đồ
      ordersByStatus.labels.forEach((label, index) => {
        const value = ordersByStatus.values[index]
        const total = ordersByStatus.values.reduce((sum, val) => sum + val, 0)
        const percentage = total > 0 ? (value / total) * 100 : 0

        pdf.text(`${label}:`, 25, yPos)
        pdf.text(`${value} đơn hàng (${percentage.toFixed(1)}%)`, 80, yPos)

        yPos += 7
      })

      // Thêm thông tin phương thức thanh toán
      pdf.setFont("times", "bold")
      pdf.setFontSize(12)
      pdf.text("III. PHƯƠNG THỨC THANH TOÁN", 20, yPos + 5)
      pdf.line(20, yPos + 7, 100, yPos + 7)

      pdf.setFont("times", "normal")
      pdf.setFontSize(10)
      yPos += 13

      // Vẽ bảng phương thức thanh toán
      const paymentHeaders = ["Phương thức", "Số đơn hàng", "Tổng giá trị", "Tỷ lệ"]
      const paymentCellWidth = [50, 30, 50, 30]
      const paymentMargin = 25

      // Vẽ header
      pdf.setFillColor(240, 240, 240)
      pdf.rect(paymentMargin, yPos, paymentCellWidth.reduce((a, b) => a + b, 0), 8, 'F')

      pdf.setFont("times", "bold")
      let currentX = paymentMargin
      paymentHeaders.forEach((header, i) => {
        pdf.text(header, currentX + 2, yPos + 5)
        currentX += paymentCellWidth[i]
      })

      yPos += 8

      // Vẽ dữ liệu phương thức thanh toán
      pdf.setFont("times", "normal")
      paymentMethods.forEach(method => {
        currentX = paymentMargin

        const rowData = [
          method.method_name,
          method.count.toString(),
          formatCurrency(method.total),
          `${method.percentage.toFixed(1)}%`
        ]

        rowData.forEach((cell, i) => {
          pdf.text(cell, currentX + 2, yPos + 5)
          currentX += paymentCellWidth[i]
        })

        pdf.setDrawColor(200, 200, 200)
        pdf.line(paymentMargin, yPos, paymentMargin + paymentCellWidth.reduce((a, b) => a + b, 0), yPos)

        yPos += 8
      })

      // Kiểm tra nếu cần thêm trang mới
      if (yPos > 250) {
        pdf.addPage()
        pdf.setFont("times", "normal")
        yPos = 20
      }

      // Thêm thông tin doanh thu theo ngày
      pdf.setFont("times", "bold")
      pdf.setFontSize(12)
      pdf.text("IV. DOANH THU THEO NGÀY", 20, yPos + 10)
      pdf.line(20, yPos + 12, 90, yPos + 12)

      pdf.setFont("times", "normal")
      pdf.setFontSize(10)
      yPos += 20

      // Tạo bảng doanh thu theo ngày
      const tableHeaders = ["Ngày", "Doanh thu", "Số đơn hàng", "Giá trị trung bình"]
      const cellWidth = [30, 60, 30, 60]
      const cellHeight = 8
      const margin = 25

      // Vẽ header
      pdf.setFillColor(240, 240, 240)
      pdf.rect(margin, yPos, cellWidth.reduce((a, b) => a + b, 0), cellHeight, 'F')

      pdf.setFont("times", "bold")
      currentX = margin
      tableHeaders.forEach((header, i) => {
        pdf.text(header, currentX + 2, yPos + 5)
        currentX += cellWidth[i]
      })

      // Vẽ dữ liệu
      pdf.setFont("times", "normal")
      let currentY = yPos + cellHeight

      // Tạo dữ liệu bảng
      const tableData = revenueByDay.labels.map((label, index) => {
        const value = revenueByDay.values[index]
        const ordersInDay = orders.filter(order => {
          if (!order.order_date) return false
          try {
            const orderDate = new Date(order.order_date)
            const formattedDate = `${orderDate.getDate()}/${orderDate.getMonth() + 1}`
            return formattedDate === label
          } catch (e) {
            return false
          }
        })
        const orderCount = ordersInDay.length
        const avgValue = orderCount > 0 ? value / orderCount : 0
        return [label, formatCurrency(value), orderCount.toString(), formatCurrency(avgValue)]
      })

      tableData.forEach((row, rowIndex) => {
        currentX = margin

        // Kiểm tra nếu cần thêm trang mới
        if (currentY > 270) {
          pdf.addPage()
          pdf.setFont("times", "normal")
          currentY = 20

          // Vẽ lại header trên trang mới
          pdf.setFillColor(240, 240, 240)
          pdf.rect(margin, currentY, cellWidth.reduce((a, b) => a + b, 0), cellHeight, 'F')

          pdf.setFont("times", "bold")
          currentX = margin
          tableHeaders.forEach((header, i) => {
            pdf.text(header, currentX + 2, currentY + 5)
            currentX += cellWidth[i]
          })

          pdf.setFont("times", "normal")
          currentY += cellHeight
        }

        // Vẽ hàng
        row.forEach((cell, i) => {
          pdf.text(cell, currentX + 2, currentY + 5)
          currentX += cellWidth[i]
        })

        // Vẽ đường kẻ
        pdf.setDrawColor(200, 200, 200)
        pdf.line(margin, currentY, margin + cellWidth.reduce((a, b) => a + b, 0), currentY)

        currentY += cellHeight
      })

      // Thêm chữ ký
      const signatureY = currentY + 20
      pdf.setFont("times", "bold")
      pdf.text("Người lập báo cáo", 50, signatureY, { align: "center" })
      pdf.text("Người phê duyệt", 160, signatureY, { align: "center" })

      pdf.setFont("times", "italic")
      pdf.setFontSize(10)
      pdf.text("(Ký, ghi rõ họ tên)", 50, signatureY + 7, { align: "center" })
      pdf.text("(Ký, ghi rõ họ tên)", 160, signatureY + 7, { align: "center" })

      // Thêm thông tin công ty ở footer
      pdf.setFont("times", "normal")
      pdf.setFontSize(8)
      pdf.text("© Hệ thống quản lý bán hàng - Công ty TNHH ABC", 105, 290, { align: "center" })

      // Tạo tên file với timestamp
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
      const filename = `bao_cao_don_hang_${timestamp}.pdf`

      // Tải xuống PDF
      pdf.save(filename)
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error)
      alert('Có lỗi xảy ra khi xuất báo cáo PDF. Vui lòng thử lại sau.')
    } finally {
      setExportingPdf(false)
    }
  }

  // Xuất bảng dữ liệu sang PDF
  const exportTableToPDF = async () => {
    if (!tableRef.current) return

    setExportingPdf(true)

    try {
      const tableElement = tableRef.current
      const canvas = await html2canvas(tableElement, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')

      // Tạo PDF với kích thước A4 landscape
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 297 // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

      // Nếu nội dung dài hơn 1 trang
      if (imgHeight > 210) { // A4 landscape height in mm
        let remainingHeight = imgHeight
        let position = 0

        // Trang đầu tiên đã được thêm
        remainingHeight -= 210
        position += 210

        // Thêm các trang tiếp theo nếu cần
        while (remainingHeight > 0) {
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight)
          remainingHeight -= 210
          position += 210
        }
      }

      // Tạo tên file với timestamp
      const now = new Date()
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
      const filename = `bang_don_hang_${timestamp}.pdf`

      // Tải xuống PDF
      pdf.save(filename)
    } catch (error) {
      console.error('Lỗi khi xuất bảng PDF:', error)
      alert('Có lỗi xảy ra khi xuất bảng PDF. Vui lòng thử lại sau.')
    } finally {
      setExportingPdf(false)
    }
  }

  // Format tiền tệ
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Format ngày tháng
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    } catch (e) {
      return 'Ngày không hợp lệ'
    }
  }

  // Lấy tên trạng thái
  const getStatusName = (status: string | null | undefined): string => {
    if (!status) return 'Không xác định'
    return status
  }

  // Lấy màu trạng thái
  const getStatusColor = (status: string | null | undefined): string => {
    switch (status) {
      case 'Đã thanh toán': return 'green'
      case 'Chưa thanh toán': return 'yellow'
      default: return 'gray'
    }
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  // Hiển thị loading khi đang kiểm tra quyền
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-2 text-gray-500">Đang tải...</p>
      </div>
    )
  }

  // Hiển thị thông báo từ chối truy cập nếu không phải admin
  if (!isAdmin) {
    return <AccessDenied message="Truy cập bị từ chối. Bạn không có quyền truy cập chức năng báo cáo đơn hàng. Chỉ có admin mới truy cập được." />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/reports"
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Báo cáo đơn hàng</h1>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToPDF}
            disabled={exportingPdf || loading}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 ${(exportingPdf || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            {exportingPdf ? 'Đang xuất...' : 'Xuất báo cáo PDF'}
          </button>
          <button
            onClick={handleResetFilters}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2 text-gray-500" />
            Bộ lọc báo cáo
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lọc theo khoảng thời gian */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                id="date-from"
                value={dateRange.from}
                onChange={handleDateChange('from')}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                id="date-to"
                value={dateRange.to}
                onChange={handleDateChange('to')}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>

            {/* Lọc theo trạng thái */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
                <option value="Chưa thanh toán">Chưa thanh toán</option>
              </select>
            </div>

            {/* Lọc theo vận chuyển */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="shipping-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Vận chuyển
              </label>
              <select
                id="shipping-filter"
                value={isShippingFilter}
                onChange={handleIsShippingFilterChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              >
                <option value="all">Tất cả đơn hàng</option>
                <option value="true">Có vận chuyển</option>
                <option value="false">Không vận chuyển</option>
              </select>
            </div>

            {/* Lọc theo giá trị đơn hàng */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="min-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Giá trị tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                id="min-amount"
                value={minAmount}
                onChange={handleAmountChange('min')}
                placeholder="Nhập giá trị tối thiểu"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="max-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Giá trị tối đa (VNĐ)
              </label>
              <input
                type="number"
                id="max-amount"
                value={maxAmount}
                onChange={handleAmountChange('max')}
                placeholder="Nhập giá trị tối đa"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleApplyFilters}
              className={`inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Nội dung báo cáo */}
      <div ref={reportRef} className="space-y-6 bg-white p-6 rounded-lg shadow">
        {/* Tiêu đề báo cáo */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">BÁO CÁO ĐƠN HÀNG</h2>
          <p className="text-gray-500 mt-1">
            {dateRange.from && dateRange.to
              ? `Từ ngày ${dateRange.from} đến ngày ${dateRange.to}`
              : dateRange.from
                ? `Từ ngày ${dateRange.from}`
                : dateRange.to
                  ? `Đến ngày ${dateRange.to}`
                  : 'Tất cả thời gian'
            }
          </p>
          <p className="text-gray-500 mt-1">
            Ngày xuất báo cáo: {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>

        {/* Tab điều hướng */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Tổng quan
              </div>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`${
                activeTab === 'details'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <TableCellsIcon className="h-5 w-5 mr-2" />
                Chi tiết đơn hàng
              </div>
            </button>

            <button
              onClick={() => setActiveTab('trends')}
              className={`${
                activeTab === 'trends'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <PresentationChartLineIcon className="h-5 w-5 mr-2" />
                Xu hướng
              </div>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`${
                activeTab === 'customers'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Khách hàng
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Tổng quan */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Thống kê tổng quan */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-gray-500" />
                Thống kê tổng quan
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Tổng số đơn hàng */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-blue-100">
                        <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Tổng đơn hàng</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{orderSummary.totalOrders}</div>
                  </div>
                </div>

                {/* Tổng doanh thu */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-green-100">
                        <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Tổng doanh thu</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{formatCurrency(orderSummary.totalRevenue)}</div>
                  </div>
                </div>

                {/* Giá trị trung bình */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-blue-100">
                        <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Giá trị TB</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{formatCurrency(orderSummary.avgOrderValue)}</div>
                  </div>
                </div>

                {/* Đơn hàng có vận chuyển */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-purple-100">
                        <TruckIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Vận chuyển</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{orderSummary.shippingOrders}</div>
                  </div>
                </div>

                {/* Đơn hàng đã thanh toán */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-green-100">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Đã thanh toán</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{orderSummary.paidOrders}</div>
                  </div>
                </div>

                {/* Đơn hàng chưa thanh toán */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-yellow-100">
                        <ClockIcon className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Chưa thanh toán</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{orderSummary.unpaidOrders}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Biểu đồ doanh thu theo ngày */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2 text-gray-500" />
                Doanh thu theo ngày
              </h3>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                {revenueByDay.labels.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ngày
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Doanh thu
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Số đơn hàng
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Giá trị trung bình
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {revenueByDay.labels.map((label, index) => {
                          const value = revenueByDay.values[index]
                          // Tính số đơn hàng trong ngày
                          const ordersInDay = orders.filter(order => {
                            if (!order.order_date) return false
                            try {
                              const orderDate = new Date(order.order_date)
                              const formattedDate = `${orderDate.getDate()}/${orderDate.getMonth() + 1}`
                              return formattedDate === label
                            } catch (e) {
                              return false
                            }
                          })
                          const orderCount = ordersInDay.length
                          const avgValue = orderCount > 0 ? value / orderCount : 0

                          return (
                            <tr key={label} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{label}</div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right">
                                <div className="text-sm font-medium text-gray-900">{formatCurrency(value)}</div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-900">{orderCount}</div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-900">{formatCurrency(avgValue)}</div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <p className="text-gray-500">Không có dữ liệu doanh thu theo ngày</p>
                  </div>
                )}
              </div>
            </div>

            {/* Biểu đồ đơn hàng theo trạng thái */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CircleStackIcon className="h-5 w-5 mr-2 text-gray-500" />
                Đơn hàng theo trạng thái
              </h3>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                {ordersByStatus.labels.length > 0 ? (
                  <div className="h-auto">
                    {/* Biểu đồ thanh ngang */}
                    <div className="flex flex-col justify-center space-y-4 py-4">
                      {ordersByStatus.labels.map((label, index) => {
                        const value = ordersByStatus.values[index]
                        const total = ordersByStatus.values.reduce((sum, val) => sum + val, 0)
                        const percentage = total > 0 ? (value / total) * 100 : 0
                        const colors = ['bg-green-500', 'bg-yellow-500', 'bg-gray-500', 'bg-blue-500', 'bg-red-500']
                        const color = colors[index % colors.length]

                        return (
                          <div key={label} className="flex flex-col">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{label}</span>
                              <span className="text-sm font-medium text-gray-700">{value} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                              <div
                                className={`h-4 rounded-full ${color} shadow-sm`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <p className="text-gray-500">Không có dữ liệu đơn hàng theo trạng thái</p>
                  </div>
                )}
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-500" />
                Phương thức thanh toán
              </h3>

              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                {paymentMethods.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phương thức
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Số đơn hàng
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tổng doanh thu
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tỷ lệ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentMethods.map((method) => (
                          <tr key={method.method_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{method.method_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{method.count}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{formatCurrency(method.total)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`bg-${themeColor}-600 h-2.5 rounded-full`}
                                    style={{ width: `${method.percentage}%` }}
                                  ></div>
                                </div>
                                <span className="ml-2 text-sm text-gray-900">{method.percentage.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 px-4 text-center text-gray-500">
                    <p>Không có dữ liệu phương thức thanh toán</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Chi tiết đơn hàng */}
        {activeTab === 'details' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <TableCellsIcon className="h-5 w-5 mr-2 text-gray-500" />
                Danh sách đơn hàng
              </h3>
              <button
                onClick={exportTableToPDF}
                disabled={exportingPdf || loading}
                className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 ${(exportingPdf || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <PrinterIcon className="h-4 w-4 mr-1" />
                {exportingPdf ? 'Đang xuất...' : 'Xuất bảng'}
              </button>
            </div>

            <div ref={tableRef} className="bg-white overflow-hidden border border-gray-200 rounded-lg">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : error ? (
                <div className="py-8 px-4 text-center text-red-500">
                  <p>{error}</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-8 px-4 text-center text-gray-500">
                  <p>Không có đơn hàng nào phù hợp với bộ lọc</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mã đơn hàng
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày đặt
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Khách hàng
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
                          Địa chỉ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.order_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.order_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(order.order_date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{order.name_customer || order.customer_name || 'Khách lẻ'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(order.price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              getStatusColor(order.status) === 'green'
                                ? 'bg-green-100 text-green-800'
                                : getStatusColor(order.status) === 'yellow'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getStatusName(order.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.is_shipping
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {order.is_shipping ? 'Có' : 'Không'}
                              </span>
                              {order.is_shipping && order.shipping_cost && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({formatCurrency(order.shipping_cost)})
                                </span>
                              )}
                            </div>
                            {order.is_shipping && order.shipping_status && (
                              <div className="mt-1 text-xs text-gray-500">
                                {order.shipping_status}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {order.shipping_address || 'Không có'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Xu hướng */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <PresentationChartLineIcon className="h-5 w-5 mr-2 text-gray-500" />
              Xu hướng đơn hàng theo tháng
            </h3>

            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              {orderTrends.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tháng
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Số đơn hàng
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doanh thu
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Giá trị trung bình
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tăng trưởng
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderTrends.map((trend, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{trend.period}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{trend.order_count}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(trend.revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(trend.avg_value)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {trend.growth_rate !== undefined ? (
                              <div className={`text-sm font-medium ${trend.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.growth_rate >= 0 ? '+' : ''}{trend.growth_rate.toFixed(1)}%
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">-</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-gray-500">
                  <p>Không có dữ liệu xu hướng đơn hàng</p>
                </div>
              )}
            </div>

            {/* Biểu đồ xu hướng */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              {orderTrends.length > 0 ? (
                <div className="h-64 flex items-end space-x-2">
                  {orderTrends.map((trend, index) => {
                    const maxRevenue = Math.max(...orderTrends.map(t => t.revenue))
                    const height = maxRevenue > 0 ? (trend.revenue / maxRevenue) * 100 : 0

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full ${trend.growth_rate !== undefined && trend.growth_rate >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-t`}
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="text-xs mt-1 text-gray-600">{trend.period}</div>
                        <div className="text-xs font-medium text-gray-900">{formatCurrency(trend.revenue)}</div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-gray-500">Không có dữ liệu xu hướng đơn hàng</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Khách hàng */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2 text-gray-500" />
              Top khách hàng
            </h3>

            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              {topCustomers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Khách hàng
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Số đơn hàng
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tổng chi tiêu
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Chi tiêu trung bình
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topCustomers.map((customer) => (
                        <tr key={customer.customer_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{customer.customer_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{customer.order_count}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(customer.total_spent)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(customer.total_spent / customer.order_count)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-gray-500">
                  <p>Không có dữ liệu khách hàng</p>
                </div>
              )}
            </div>

            {/* Biểu đồ khách hàng */}
            {topCustomers.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="h-64">
                  {topCustomers.map((customer, index) => {
                    const maxSpent = Math.max(...topCustomers.map(c => c.total_spent))
                    const width = maxSpent > 0 ? (customer.total_spent / maxSpent) * 100 : 0
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500']
                    const color = colors[index % colors.length]

                    return (
                      <div key={customer.customer_id} className="mb-4">
                        <div className="flex items-center mb-1">
                          <div className="w-32 truncate text-sm font-medium text-gray-900">{customer.customer_name}</div>
                          <div className="flex-1 ml-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`${color} h-2.5 rounded-full`}
                                style={{ width: `${width}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="ml-2 text-sm font-medium text-gray-900">{formatCurrency(customer.total_spent)}</div>
                        </div>
                        <div className="text-xs text-gray-500 ml-32">
                          {customer.order_count} đơn hàng - Trung bình: {formatCurrency(customer.total_spent / customer.order_count)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}