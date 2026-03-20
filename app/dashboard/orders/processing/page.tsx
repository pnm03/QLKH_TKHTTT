'use client'

import { useState, useEffect } from 'react'
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  CreditCardIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

// ============================================
// FAKE DATA - Dữ liệu giả để test giao diện
// Khi nào có database thì comment phần này và uncomment dòng import Supabase ở trên
// ============================================
const FAKE_ORDERS_DATA = [
  // Đơn hàng CHỜ XÁC NHẬN (5 đơn)
  {
    order_id: 'ORD2024001',
    customer_id: 'CUST001',
    order_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    price: 1500000,
    status: 'Chờ xác nhận',
    is_shipping: true,
    payment_method: 2,
    customer_name: 'Nguyễn Văn An',
    customer_phone: '0901234567',
    payment_method_name: 'Chuyển khoản',
    creator_name: 'Admin'
  },
  {
    order_id: 'ORD2024002',
    customer_id: 'CUST002',
    order_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    price: 850000,
    status: 'Chờ xác nhận',
    is_shipping: false,
    payment_method: 1,
    customer_name: 'Trần Thị Bình',
    customer_phone: '0912345678',
    payment_method_name: 'Tiền mặt',
    creator_name: 'Admin'
  },
  {
    order_id: 'ORD2024003',
    customer_id: 'CUST003',
    order_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    price: 2300000,
    status: 'Chờ xác nhận',
    is_shipping: true,
    payment_method: 3,
    customer_name: 'Lê Văn Cường',
    customer_phone: '0923456789',
    payment_method_name: 'Ví điện tử',
    creator_name: 'Admin'
  },
  {
    order_id: 'ORD2024004',
    customer_id: 'CUST004',
    order_date: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    price: 650000,
    status: 'Chờ xác nhận',
    is_shipping: false,
    payment_method: 1,
    customer_name: 'Phạm Thị Dung',
    customer_phone: '0934567890',
    payment_method_name: 'Tiền mặt',
    creator_name: 'Admin'
  },
  {
    order_id: 'ORD2024005',
    customer_id: 'CUST005',
    order_date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    price: 1200000,
    status: 'Chờ xác nhận',
    is_shipping: true,
    payment_method: 4,
    customer_name: 'Hoàng Văn Em',
    customer_phone: '0945678901',
    payment_method_name: 'Thẻ tín dụng',
    creator_name: 'Admin'
  },
  // Đơn hàng ĐÃ XÁC NHẬN (3 đơn)
  {
    order_id: 'ORD2024006',
    customer_id: 'CUST001',
    order_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    price: 980000,
    status: 'Đã xác nhận',
    is_shipping: true,
    payment_method: 2,
    customer_name: 'Nguyễn Văn An',
    customer_phone: '0901234567',
    payment_method_name: 'Chuyển khoản',
    creator_name: 'Admin'
  },
  {
    order_id: 'ORD2024007',
    customer_id: 'CUST002',
    order_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    price: 1450000,
    status: 'Đã xác nhận',
    is_shipping: false,
    payment_method: 1,
    customer_name: 'Trần Thị Bình',
    customer_phone: '0912345678',
    payment_method_name: 'Tiền mặt',
    creator_name: 'Admin'
  },
  {
    order_id: 'ORD2024008',
    customer_id: 'CUST003',
    order_date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    price: 750000,
    status: 'Đã xác nhận',
    is_shipping: true,
    payment_method: 3,
    customer_name: 'Lê Văn Cường',
    customer_phone: '0923456789',
    payment_method_name: 'Ví điện tử',
    creator_name: 'Admin'
  },
  // Đơn hàng ĐÃ HỦY (2 đơn)
  {
    order_id: 'ORD2024009',
    customer_id: 'CUST004',
    order_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    price: 550000,
    status: 'Đã hủy',
    is_shipping: false,
    payment_method: 1,
    customer_name: 'Phạm Thị Dung',
    customer_phone: '0934567890',
    payment_method_name: 'Tiền mặt',
    creator_name: 'Admin'
  },
  {
    order_id: 'ORD2024010',
    customer_id: 'CUST005',
    order_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    price: 1800000,
    status: 'Đã hủy',
    is_shipping: true,
    payment_method: 2,
    customer_name: 'Hoàng Văn Em',
    customer_phone: '0945678901',
    payment_method_name: 'Chuyển khoản',
    creator_name: 'Admin'
  }
]

const FAKE_ORDER_DETAILS: Record<string, any[]> = {
  'ORD2024001': [
    { order_id: 'ORD2024001', product_id: 1, name_product: 'Laptop Dell XPS 13', quantity: 1, unit_price: 1500000, subtotal: 1500000 }
  ],
  'ORD2024002': [
    { order_id: 'ORD2024002', product_id: 2, name_product: 'Chuột Logitech MX Master', quantity: 1, unit_price: 850000, subtotal: 850000 }
  ],
  'ORD2024003': [
    { order_id: 'ORD2024003', product_id: 3, name_product: 'Bàn phím cơ Keychron K2', quantity: 2, unit_price: 1150000, subtotal: 2300000 }
  ],
  'ORD2024004': [
    { order_id: 'ORD2024004', product_id: 4, name_product: 'Tai nghe Sony WH-1000XM4', quantity: 1, unit_price: 650000, subtotal: 650000 }
  ],
  'ORD2024005': [
    { order_id: 'ORD2024005', product_id: 5, name_product: 'Webcam Logitech C920', quantity: 2, unit_price: 600000, subtotal: 1200000 }
  ],
  'ORD2024006': [
    { order_id: 'ORD2024006', product_id: 1, name_product: 'Laptop Dell XPS 13', quantity: 1, unit_price: 980000, subtotal: 980000 }
  ],
  'ORD2024007': [
    { order_id: 'ORD2024007', product_id: 2, name_product: 'Chuột Logitech MX Master', quantity: 2, unit_price: 725000, subtotal: 1450000 }
  ],
  'ORD2024008': [
    { order_id: 'ORD2024008', product_id: 3, name_product: 'Bàn phím cơ Keychron K2', quantity: 1, unit_price: 750000, subtotal: 750000 }
  ],
  'ORD2024009': [
    { order_id: 'ORD2024009', product_id: 4, name_product: 'Tai nghe Sony WH-1000XM4', quantity: 1, unit_price: 550000, subtotal: 550000 }
  ],
  'ORD2024010': [
    { order_id: 'ORD2024010', product_id: 5, name_product: 'Webcam Logitech C920', quantity: 3, unit_price: 600000, subtotal: 1800000 }
  ]
}

const FAKE_SHIPPING_INFO: Record<string, any> = {
  'ORD2024001': {
    shipping_id: 'SHIP001',
    order_id: 'ORD2024001',
    name_customer: 'Nguyễn Văn An',
    phone_customer: '0901234567',
    shipping_address: '123 Đường Lê Lợi, Q1, TP.HCM',
    carrier: 'Giao Hàng Nhanh',
    tracking_number: 'GHN123456',
    shipping_cost: 30000,
    status: 'Chờ lấy hàng'
  },
  'ORD2024003': {
    shipping_id: 'SHIP002',
    order_id: 'ORD2024003',
    name_customer: 'Lê Văn Cường',
    phone_customer: '0923456789',
    shipping_address: '789 Đường Hai Bà Trưng, Q3, TP.HCM',
    carrier: 'Viettel Post',
    tracking_number: 'VTP789012',
    shipping_cost: 35000,
    status: 'Chờ lấy hàng'
  },
  'ORD2024005': {
    shipping_id: 'SHIP003',
    order_id: 'ORD2024005',
    name_customer: 'Hoàng Văn Em',
    phone_customer: '0945678901',
    shipping_address: '654 Đường Võ Văn Tần, Q3, TP.HCM',
    carrier: 'J&T Express',
    tracking_number: 'JT345678',
    shipping_cost: 25000,
    status: 'Chờ lấy hàng'
  },
  'ORD2024006': {
    shipping_id: 'SHIP004',
    order_id: 'ORD2024006',
    name_customer: 'Nguyễn Văn An',
    phone_customer: '0901234567',
    shipping_address: '123 Đường Lê Lợi, Q1, TP.HCM',
    carrier: 'Giao Hàng Nhanh',
    tracking_number: 'GHN654321',
    shipping_cost: 30000,
    status: 'Đang chuẩn bị'
  },
  'ORD2024008': {
    shipping_id: 'SHIP005',
    order_id: 'ORD2024008',
    name_customer: 'Lê Văn Cường',
    phone_customer: '0923456789',
    shipping_address: '789 Đường Hai Bà Trưng, Q3, TP.HCM',
    carrier: 'Viettel Post',
    tracking_number: 'VTP210987',
    shipping_cost: 35000,
    status: 'Đang chuẩn bị'
  },
  'ORD2024010': {
    shipping_id: 'SHIP006',
    order_id: 'ORD2024010',
    name_customer: 'Hoàng Văn Em',
    phone_customer: '0945678901',
    shipping_address: '654 Đường Võ Văn Tần, Q3, TP.HCM',
    carrier: 'J&T Express',
    tracking_number: 'JT876543',
    shipping_cost: 25000,
    status: 'Đã hủy'
  }
}

// Định nghĩa các interface
interface Order {
  order_id: string
  customer_id: string | null
  order_date: string
  price: number
  status: string
  is_shipping: boolean
  payment_method: number | null
  customer_name?: string
  customer_phone?: string
  payment_method_name?: string
  creator_name?: string
}

interface OrderDetail {
  order_id: string
  product_id: number
  name_product: string
  quantity: number
  unit_price: number
  subtotal?: number
  product_image?: string | null
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

interface OrderStats {
  pending: number
  confirmed: number
  cancelled: number
}

export default function OrderProcessingPage() {
  // const supabase = createClientComponentClient() // Comment khi dùng fake data
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // State cho đơn hàng
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([])
  const [shippingInfo, setShippingInfo] = useState<Shipping | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [stats, setStats] = useState<OrderStats>({
    pending: 0,
    confirmed: 0,
    cancelled: 0
  })

  // State cho bộ lọc trạng thái - Mặc định là "Chờ xác nhận"
  const [statusFilter, setStatusFilter] = useState<string>('Chờ xác nhận')

  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const [ordersPerPage, setOrdersPerPage] = useState(10)

  // State cho từ chối đơn hàng
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [orderToReject, setOrderToReject] = useState<string | null>(null)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context
  useEffect(() => {
    if (mounted && themeContext) {
      setThemeState({
        theme: themeContext.theme
      })
    }
  }, [mounted, themeContext])

  // Load stats khi component mounted
  useEffect(() => {
    if (mounted) {
      updateStats()
    }
  }, [mounted])

  // Hàm load danh sách đơn hàng
  const loadOrders = async () => {
    setLoading(true)
    try {
      // ===== SỬ DỤNG FAKE DATA =====
      // Lọc đơn hàng theo trạng thái
      let filteredOrders = FAKE_ORDERS_DATA

      if (statusFilter !== 'Tất cả') {
        filteredOrders = FAKE_ORDERS_DATA.filter(order => order.status === statusFilter)
      }

      // Sắp xếp theo ngày đặt hàng (mới nhất trước)
      filteredOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())

      setOrders(filteredOrders)

      // Giả lập delay để có cảm giác loading
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success('Đã tải danh sách đơn hàng')

      // ===== KHI CÓ DATABASE, UNCOMMENT ĐOẠN NÀY VÀ XÓA PHẦN FAKE DATA Ở TRÊN =====
      // let query = supabase
      //   .from('orders')
      //   .select(`
      //     *,
      //     customers (full_name, phone),
      //     payment_methods (method_name),
      //     users!orders_user_id_fkey (full_name)
      //   `)
      //   .in('status', ['Chờ xác nhận', 'Đã xác nhận', 'Đã hủy'])
      //   .order('order_date', { ascending: false })

      // if (statusFilter !== 'Tất cả') {
      //   query = query.eq('status', statusFilter)
      // }

      // const { data: ordersData, error: ordersError } = await query

      // if (ordersError) {
      //   console.error('Lỗi khi tải đơn hàng:', ordersError)
      //   toast.error('Không thể tải danh sách đơn hàng')
      //   return
      // }

      // const formattedOrders = ordersData?.map((order: any) => ({
      //   ...order,
      //   customer_name: order.customers?.full_name || 'Khách lẻ',
      //   customer_phone: order.customers?.phone || '',
      //   payment_method_name: order.payment_methods?.method_name || 'Chưa chọn',
      //   creator_name: order.users?.full_name || 'N/A'
      // })) || []

      // setOrders(formattedOrders)
    } catch (error) {
      console.error('Lỗi:', error)
      toast.error('Đã xảy ra lỗi khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  // Cập nhật thống kê - Chỉ tính tổng cho tất cả trạng thái
  const updateStats = async () => {
    try {
      // ===== SỬ DỤNG FAKE DATA =====
      const pending = FAKE_ORDERS_DATA.filter(o => o.status === 'Chờ xác nhận').length
      const confirmed = FAKE_ORDERS_DATA.filter(o => o.status === 'Đã xác nhận').length
      const cancelled = FAKE_ORDERS_DATA.filter(o => o.status === 'Đã hủy').length

      setStats({
        pending,
        confirmed,
        cancelled
      })

      // ===== KHI CÓ DATABASE, UNCOMMENT ĐOẠN NÀY VÀ XÓA PHẦN FAKE DATA Ở TRÊN =====
      // const { data: pendingData } = await supabase
      //   .from('orders')
      //   .select('order_id', { count: 'exact', head: true })
      //   .eq('status', 'Chờ xác nhận')

      // const { data: confirmedData } = await supabase
      //   .from('orders')
      //   .select('order_id', { count: 'exact', head: true })
      //   .eq('status', 'Đã xác nhận')

      // const { data: cancelledData } = await supabase
      //   .from('orders')
      //   .select('order_id', { count: 'exact', head: true })
      //   .eq('status', 'Đã hủy')

      // setStats({
      //   pending: pendingData?.length || 0,
      //   confirmed: confirmedData?.length || 0,
      //   cancelled: cancelledData?.length || 0
      // })
    } catch (error) {
      console.error('Lỗi khi cập nhật thống kê:', error)
    }
  }

  // Load orders khi statusFilter thay đổi
  useEffect(() => {
    if (mounted) {
      loadOrders()
    }
  }, [mounted, statusFilter])

  // Xem chi tiết đơn hàng
  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order)
    setLoading(true)

    try {
      // ===== SỬ DỤNG FAKE DATA =====
      // Lấy chi tiết sản phẩm từ fake data
      const details = FAKE_ORDER_DETAILS[order.order_id] || []
      setOrderDetails(details)

      // Nếu có vận chuyển, lấy thông tin vận chuyển từ fake data
      if (order.is_shipping) {
        const shipping = FAKE_SHIPPING_INFO[order.order_id] || null
        setShippingInfo(shipping)
      } else {
        setShippingInfo(null)
      }

      // Giả lập delay
      await new Promise(resolve => setTimeout(resolve, 300))

      setShowOrderDetails(true)

      // ===== KHI CÓ DATABASE, UNCOMMENT ĐOẠN NÀY VÀ XÓA PHẦN FAKE DATA Ở TRÊN =====
      // const { data: detailsData, error: detailsError } = await supabase
      //   .from('orderdetails')
      //   .select('*')
      //   .eq('order_id', order.order_id)

      // if (detailsError) {
      //   console.error('Lỗi khi tải chi tiết đơn hàng:', detailsError)
      //   toast.error('Không thể tải chi tiết đơn hàng')
      //   return
      // }

      // setOrderDetails(detailsData || [])

      // if (order.is_shipping) {
      //   const { data: shippingData, error: shippingError } = await supabase
      //     .from('shippings')
      //     .select('*')
      //     .eq('order_id', order.order_id)
      //     .single()

      //   if (!shippingError && shippingData) {
      //     setShippingInfo(shippingData)
      //   }
      // } else {
      //   setShippingInfo(null)
      // }

      // setShowOrderDetails(true)
    } catch (error) {
      console.error('Lỗi:', error)
      toast.error('Đã xảy ra lỗi')
    } finally {
      setLoading(false)
    }
  }

  // Chấp nhận đơn hàng
  const acceptOrder = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn chấp nhận đơn hàng này?')) {
      return
    }

    try {
      // ===== SỬ DỤNG FAKE DATA =====
      // Tìm và cập nhật trạng thái trong fake data
      const orderIndex = FAKE_ORDERS_DATA.findIndex(o => o.order_id === orderId)
      if (orderIndex !== -1) {
        FAKE_ORDERS_DATA[orderIndex].status = 'Đã xác nhận'
      }

      // Giả lập delay
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success('Đơn hàng đã được chấp nhận thành công!')
      loadOrders()
      updateStats()
      setShowOrderDetails(false)

      // ===== KHI CÓ DATABASE, UNCOMMENT ĐOẠN NÀY VÀ XÓA PHẦN FAKE DATA Ở TRÊN =====
      // const { error } = await supabase
      //   .from('orders')
      //   .update({ status: 'Đã xác nhận' })
      //   .eq('order_id', orderId)

      // if (error) {
      //   console.error('Lỗi khi chấp nhận đơn hàng:', error)
      //   toast.error('Không thể chấp nhận đơn hàng')
      //   return
      // }

      // toast.success('Đơn hàng đã được chấp nhận thành công!')
      // loadOrders()
      // updateStats()
      // setShowOrderDetails(false)
    } catch (error) {
      console.error('Lỗi:', error)
      toast.error('Đã xảy ra lỗi')
    }
  }

  // Mở modal từ chối
  const openRejectModal = (orderId: string) => {
    setOrderToReject(orderId)
    setRejectReason('')
    setShowRejectModal(true)
  }

  // Từ chối đơn hàng
  const rejectOrder = async () => {
    if (!orderToReject) return

    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }

    try {
      // ===== SỬ DỤNG FAKE DATA =====
      // Tìm và cập nhật trạng thái trong fake data
      const orderIndex = FAKE_ORDERS_DATA.findIndex(o => o.order_id === orderToReject)
      if (orderIndex !== -1) {
        FAKE_ORDERS_DATA[orderIndex].status = 'Đã hủy'
      }

      // Giả lập delay
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success(`Đơn hàng đã được từ chối. Lý do: ${rejectReason}`)
      setShowRejectModal(false)
      setOrderToReject(null)
      setRejectReason('')
      loadOrders()
      updateStats()
      setShowOrderDetails(false)

      // ===== KHI CÓ DATABASE, UNCOMMENT ĐOẠN NÀY VÀ XÓA PHẦN FAKE DATA Ở TRÊN =====
      // const { error } = await supabase
      //   .from('orders')
      //   .update({
      //     status: 'Đã hủy',
      //     // Có thể thêm trường reject_reason nếu có trong database
      //   })
      //   .eq('order_id', orderToReject)

      // if (error) {
      //   console.error('Lỗi khi từ chối đơn hàng:', error)
      //   toast.error('Không thể từ chối đơn hàng')
      //   return
      // }

      // toast.success(`Đơn hàng đã được từ chối. Lý do: ${rejectReason}`)
      // setShowRejectModal(false)
      // setOrderToReject(null)
      // setRejectReason('')
      // loadOrders()
      // updateStats()
      // setShowOrderDetails(false)
    } catch (error) {
      console.error('Lỗi:', error)
      toast.error('Đã xảy ra lỗi')
    }
  }

  // Cập nhật trạng thái đơn hàng
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!confirm(`Bạn có chắc chắn muốn cập nhật trạng thái thành "${newStatus}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('order_id', orderId)

      if (error) {
        console.error('Lỗi khi cập nhật trạng thái:', error)
        toast.error('Không thể cập nhật trạng thái')
        return
      }

      toast.success(`Đã cập nhật trạng thái thành "${newStatus}"`)
      loadOrders()
      updateStats()
      setShowOrderDetails(false)
    } catch (error) {
      console.error('Lỗi:', error)
      toast.error('Đã xảy ra lỗi')
    }
  }

  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  // Format ngày giờ
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN')
  }

  // Lấy class cho status badge
  const getStatusClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'Chờ xác nhận': 'bg-yellow-100 text-yellow-800',
      'Đã xác nhận': 'bg-green-100 text-green-800',
      'Đang chuẩn bị': 'bg-blue-100 text-blue-800',
      'Đang vận chuyển': 'bg-purple-100 text-purple-800',
      'Đã hủy': 'bg-red-100 text-red-800'
    }
    return statusMap[status] || 'bg-gray-100 text-gray-800'
  }

  if (!mounted) {
    return null
  }

  const themeColor = themeState.theme

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ghi nhận đơn hàng</h1>
          <p className="mt-1 text-sm text-gray-500">
            Xem và xử lý các đơn hàng mới từ khách hàng
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 disabled:opacity-50`}
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Stats Cards - Có thể click để lọc */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
        {/* Card Chờ xác nhận */}
        <button
          onClick={() => setStatusFilter('Chờ xác nhận')}
          className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow text-left ${
            statusFilter === 'Chờ xác nhận' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-10 w-10 text-yellow-500" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Chờ xác nhận
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {stats.pending}
                  </dd>
                </div>
              </div>
              <div className="text-xs text-gray-500 hover:text-gray-700">
                <EyeIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Click để xem chi tiết
            </div>
          </div>
        </button>

        {/* Card Đã xác nhận */}
        <button
          onClick={() => setStatusFilter('Đã xác nhận')}
          className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow text-left ${
            statusFilter === 'Đã xác nhận' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-10 w-10 text-green-500" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Đã xác nhận
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {stats.confirmed}
                  </dd>
                </div>
              </div>
              <div className="text-xs text-gray-500 hover:text-gray-700">
                <EyeIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Click để xem chi tiết
            </div>
          </div>
        </button>

        {/* Card Đã hủy */}
        <button
          onClick={() => setStatusFilter('Đã hủy')}
          className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow text-left ${
            statusFilter === 'Đã hủy' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-10 w-10 text-red-500" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Đã hủy
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {stats.cancelled}
                  </dd>
                </div>
              </div>
              <div className="text-xs text-gray-500 hover:text-gray-700">
                <EyeIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Click để xem chi tiết
            </div>
          </div>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Danh sách đơn hàng
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Hiển thị:</label>
                <select
                  value={ordersPerPage}
                  onChange={(e) => {
                    setOrdersPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="block w-20 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">dòng</span>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Hiển thị {orders.length} đơn hàng {statusFilter !== 'Tất cả' && `(${statusFilter})`}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Đang tải...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có đơn hàng</h3>
              <p className="mt-1 text-sm text-gray-500">
                Hiện tại không có đơn hàng nào cần xử lý
              </p>
            </div>
          ) : (
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
                    Thanh toán
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vận chuyển
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage).map((order) => (
                  <tr
                    key={order.order_id}
                    onClick={() => viewOrderDetails(order)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                      {order.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customer_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(order.order_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.is_paid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Đã thanh toán
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          Chưa thanh toán
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.is_shipping ? (
                        <span className="inline-flex items-center text-blue-600">
                          <TruckIcon className="h-4 w-4 mr-1" />
                          Giao hàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-green-600">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Tại cửa hàng
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && orders.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(orders.length / ordersPerPage)))}
                disabled={currentPage === Math.ceil(orders.length / ordersPerPage)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{(currentPage - 1) * ordersPerPage + 1}</span> đến{' '}
                  <span className="font-medium">{Math.min(currentPage * ordersPerPage, orders.length)}</span> trong tổng số{' '}
                  <span className="font-medium">{orders.length}</span> đơn hàng
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  {Array.from({ length: Math.ceil(orders.length / ordersPerPage) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(orders.length / ordersPerPage)))}
                    disabled={currentPage === Math.ceil(orders.length / ordersPerPage)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Chi tiết đơn hàng */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0, 0, 0, 0.3)' }} onClick={() => setShowOrderDetails(false)}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                      Chi tiết đơn hàng: {selectedOrder.order_id}
                    </h3>

                    {/* Thông tin đơn hàng */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Thông tin đơn hàng</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Mã đơn:</span> {selectedOrder.order_id}</p>
                          <p><span className="font-medium">Ngày đặt:</span> {formatDateTime(selectedOrder.order_date)}</p>
                          <p><span className="font-medium">Trạng thái:</span> <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(selectedOrder.status)}`}>{selectedOrder.status}</span></p>
                          <p><span className="font-medium">Tổng tiền:</span> <span className="text-lg font-bold text-green-600">{formatCurrency(selectedOrder.price)}</span></p>
                          <p><span className="font-medium">Phương thức thanh toán:</span> {selectedOrder.payment_method_name}</p>
                          <p><span className="font-medium">Người tạo:</span> {selectedOrder.creator_name}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Thông tin khách hàng</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Tên:</span> {selectedOrder.customer_name}</p>
                          <p><span className="font-medium">Điện thoại:</span> {selectedOrder.customer_phone}</p>
                          {shippingInfo && (
                            <>
                              <p><span className="font-medium">Địa chỉ giao hàng:</span> {shippingInfo.shipping_address}</p>
                              <p><span className="font-medium">Đơn vị vận chuyển:</span> {shippingInfo.carrier}</p>
                              <p><span className="font-medium">Phí vận chuyển:</span> {formatCurrency(shippingInfo.shipping_cost)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết sản phẩm */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Chi tiết sản phẩm</h4>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orderDetails.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.name_product}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedOrder.status === 'Chờ xác nhận' && (
                  <>
                    <button
                      type="button"
                      onClick={() => acceptOrder(selectedOrder.order_id)}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Chấp nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOrderDetails(false)
                        openRejectModal(selectedOrder.order_id)
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      <XCircleIcon className="h-5 w-5 mr-2" />
                      Từ chối
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowOrderDetails(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ chối đơn hàng */}
      {showRejectModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowRejectModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <XCircleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Từ chối đơn hàng
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        Vui lòng nhập lý do từ chối đơn hàng. Thông tin này sẽ được gửi đến khách hàng.
                      </p>
                      <textarea
                        rows={4}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Nhập lý do từ chối..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={rejectOrder}
                  disabled={!rejectReason.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Xác nhận từ chối
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                    setOrderToReject(null)
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  )
}

