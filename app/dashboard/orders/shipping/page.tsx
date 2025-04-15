'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import {
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon, // Added for better icon context
  PhotoIcon, // Added for image placeholder
  UserCircleIcon, // Added for customer placeholder
} from '@heroicons/react/24/outline'

// Định nghĩa các interface (Giữ nguyên)
interface Shipping {
  shipping_id: string
  order_id: string
  name_customer: string
  phone_customer: string
  shipping_address: string
  carrier: string
  tracking_number: string
  shipping_cost: number
  status: string // 'pending', 'shipped', 'delivered', 'cancelled'
  created_at: string
  actual_delivery_date: string | null
  delivery_date: string | null
  weight?: number | null
  unit_weight?: string | null
  long?: number | null
  wide?: number | null
  hight?: number | null // Sửa lỗi chính tả: height -> hight (theo code gốc)
  unit_size?: string | null
  cod_shipping?: boolean | null
}

interface Order {
  order_id: string
  customer_id: string | null // Allow null if not always available
  order_date: string
  price: number
  status: string | null // Allow null if not always available
  is_shipping: boolean | null // Allow null if not always available
  payment_method: number | null // Allow null if not always available
  shipping_id?: string | null
  customer_name?: string | null // Added for consistency
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

export default function ShippingOrdersPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()

  // Sử dụng callback để tránh tạo theme object mới mỗi lần render trừ khi context thay đổi
  const getCurrentTheme = useCallback(() => {
    return themeContext.currentTheme || themeColors.indigo
  }, [themeContext.currentTheme])

  const [themeState, setThemeState] = useState({
    theme: getCurrentTheme(),
  })

  // State cho tìm kiếm và kết quả
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'pending', 'shipped', 'delivered', 'cancelled'
  const [shippings, setShippings] = useState<Shipping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null) // State cho thông báo lỗi

  // State cho modal chi tiết và chỉnh sửa
  const [selectedShipping, setSelectedShipping] = useState<Shipping | null>(null)
  const [showShippingDetails, setShowShippingDetails] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedShipping, setEditedShipping] = useState<Shipping | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false) // State loading riêng cho modal

  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const shippingsPerPage = 10

  // --- Helper Functions ---

  // Format tiền tệ
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return 'N/A'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Format ngày tháng
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Chưa có thông tin'
    try {
      const date = new Date(dateString)
      // Kiểm tra nếu date không hợp lệ
      if (isNaN(date.getTime())) {
        return 'Ngày không hợp lệ';
      }
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        // second: '2-digit', // Có thể thêm giây nếu cần
        hour12: false, // Sử dụng định dạng 24h
      }).format(date)
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Ngày lỗi'; // Trả về thông báo lỗi nếu có vấn đề
    }
  }

  // Lấy tên trạng thái (cải thiện với kiểu trả về rõ ràng)
  const getStatusName = (status: string | null | undefined): string => {
    switch (status) {
      case 'pending': return 'Chờ xử lý'
      case 'shipped': return 'Đang vận chuyển'
      case 'delivered': return 'Đã giao hàng'
      case 'cancelled': return 'Đã hủy'
      default: return status || 'Không xác định'
    }
  }

  // Lấy màu trạng thái (cải thiện với kiểu trả về rõ ràng và fallback)
  type StatusColor = 'yellow' | 'blue' | 'green' | 'red' | 'gray';
  const getStatusColor = (status: string | null | undefined): StatusColor => {
    switch (status) {
      case 'pending': return 'yellow'
      case 'shipped': return 'blue'
      case 'delivered': return 'green'
      case 'cancelled': return 'red'
      default: return 'gray'
    }
  }

  // Logo công ty (SVG của truck icon - giữ nguyên)
  const companyLogo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS10cnVjayI+PHBhdGggZD0iTTEwIDEzYTIgMiAwIDEgMSA0IDAgMiAyIDAgMCAxLTQgMFoiLz48cGF0aCBkPSJNMTggMTJhMiAyIDAgMSAxIDQgMCAyIDIgMCAwIDEtNCAwWiIvPjxwYXRoIGQ9Ik0xMCAxNGgtNC4xOGEuODIuODIgMCAwIDEtLjgyLS44MnYtMS4xOGEuODIuODIgMCAwIDEgLjgyLS44Mmg0LjE4Ii8+PHBhdGggZD0iTTIuMDYgMTJWNy44OEEyLjg4IDIuODggMCAwIDEgNC45NCA1aDQuMTJhMiAyIDAgMCAxIDIgMnYxLjE4YS44Mi44MiAwIDAgMCAuODIuODJoMi4wNmE4IDggMCAwIDEgNS4wNiAyLjI0bDIuMTggMi4xOGMuNTYuNTYuODIgMS40MS42NyAyLjIzLS4xNi44Mi0uODUgMS40Mi0xLjY3IDEuNDJIMjAiLz48cGF0aCBkPSJNMTggMTJhMiAyIDAgMSAwIDQgMCAyIDIgMCAwIDAtNCAwWiIvPjxwYXRoIGQ9Ik0xMCAxM2EyIDIgMCAxIDAgNCAwIDIgMiAwIDAgMC00IDBaIi8+PC9zdmc+'

  // --- Effects ---

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context
  useEffect(() => {
    if (mounted) {
      setThemeState({ theme: getCurrentTheme() })
    }
  }, [mounted, getCurrentTheme]) // Sử dụng callback trong dependency array

  // Tải dữ liệu đơn vận chuyển khi component mounted hoặc bộ lọc/trang thay đổi
  // Sử dụng useCallback để tránh tạo hàm mới mỗi lần render
  const searchShippings = useCallback(async (resetPage: boolean = false) => {
    if (!mounted) return; // Đảm bảo component đã mount

    setLoading(true)
    setError(null)
    const pageToFetch = resetPage ? 1 : currentPage;
    if (resetPage && currentPage !== 1) {
      setCurrentPage(1); // Reset page state if requested
      // Việc fetch sẽ được trigger bởi useEffect bên dưới khi currentPage thay đổi
      setLoading(false); // Tạm dừng loading ở đây, useEffect sẽ set lại
      return;
    }


    try {
      let query = supabase
        .from('shippings')
        .select('*', { count: 'exact' }) // Lấy count để phân trang chính xác
        .order('created_at', { ascending: false })

      // Áp dụng bộ lọc theo trạng thái
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Áp dụng bộ lọc theo ngày (đảm bảo bao gồm cả ngày kết thúc)
      if (dateRange.from) {
        // Đặt thời gian về đầu ngày
        query = query.gte('created_at', `${dateRange.from}T00:00:00.000Z`)
      }
      if (dateRange.to) {
        // Đặt thời gian về cuối ngày
        query = query.lte('created_at', `${dateRange.to}T23:59:59.999Z`)
      }

      // Áp dụng tìm kiếm theo từ khóa (bỏ khoảng trắng thừa)
      const trimmedSearchTerm = searchTerm.trim()
      if (trimmedSearchTerm) {
        query = query.or(
          `name_customer.ilike.%${trimmedSearchTerm}%,` +
          `phone_customer.ilike.%${trimmedSearchTerm}%,` +
          `shipping_id.ilike.%${trimmedSearchTerm}%,` +
          `order_id.ilike.%${trimmedSearchTerm}%,` +
          `tracking_number.ilike.%${trimmedSearchTerm}%`
        )
      }

      // Tính toán range cho phân trang
      const startIndex = (pageToFetch - 1) * shippingsPerPage
      const endIndex = startIndex + shippingsPerPage - 1

      // Thực hiện truy vấn với phân trang
      const { data, error: shippingsError, count } = await query.range(startIndex, endIndex)

      if (shippingsError) {
        console.error('Lỗi truy vấn shippings:', shippingsError)
        setError(`Lỗi khi truy vấn dữ liệu: ${shippingsError.message}`)
        setShippings([])
        setTotalPages(1)
      } else {
        // Log dữ liệu để kiểm tra (có thể xóa sau khi debug)
        // console.log('Dữ liệu shippings:', data)
        // console.log('Tổng số bản ghi:', count)

        setShippings(data || [])

        // Tính tổng số trang dựa trên count trả về từ Supabase
        const totalCount = count || 0
        const calculatedTotalPages = Math.ceil(totalCount / shippingsPerPage)
        setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1)

        // Điều chỉnh currentPage nếu nó vượt quá totalPages mới (ví dụ sau khi lọc)
        if (pageToFetch > calculatedTotalPages && calculatedTotalPages > 0) {
           setCurrentPage(calculatedTotalPages);
           // Fetch lại cho trang cuối nếu cần (trigger bởi useEffect bên dưới)
        }
      }
    } catch (error: any) {
      console.error('Lỗi không mong muốn khi tìm kiếm đơn vận chuyển:', error)
      setError(`Có lỗi xảy ra: ${error.message || 'Không xác định'}`)
      setShippings([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, supabase, searchTerm, statusFilter, dateRange, currentPage, shippingsPerPage]) // Các dependency ảnh hưởng đến query

  // Gọi searchShippings khi các dependency thay đổi
  useEffect(() => {
    searchShippings();
  }, [searchShippings]); // Chỉ phụ thuộc vào hàm useCallback

  // --- Event Handlers ---

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchShippings(true); // Reset về trang 1 khi nhấn Enter tìm kiếm
    }
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
    // searchShippings sẽ được gọi bởi useEffect
    setCurrentPage(1); // Reset về trang 1 khi đổi filter
  }

  const handleDateChange = (field: 'from' | 'to') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [field]: e.target.value }))
    // Không tự động search khi đổi date, chờ nhấn nút "Tìm kiếm"
  }

  const handleSearchButtonClick = () => {
    searchShippings(true); // Reset về trang 1 khi nhấn nút tìm kiếm
  }

  // Xem chi tiết đơn vận chuyển
  const viewShippingDetails = async (shipping: Shipping) => {
    if (!shipping) return;

    setSelectedShipping(shipping)
    setEditedShipping({ ...shipping }) // Khởi tạo editedShipping với dữ liệu hiện tại
    setShowShippingDetails(true)
    setLoadingDetails(true) // Bắt đầu loading cho modal
    setSelectedOrder(null) // Reset order cũ
    setOrderDetails([]) // Reset details cũ
    setError(null) // Reset lỗi cũ

    try {
      // Tạo các promise để chạy song song
      const orderPromise = supabase
        .from('oorders') // Thử oorders trước
        .select('*')
        .eq('order_id', shipping.order_id)
        .maybeSingle() // Trả về null nếu không tìm thấy, không lỗi

      const orderDetailsPromise = supabase
        .from('orderdetails')
        .select(`
          *,
          products (image)
        `)
        .eq('order_id', shipping.order_id)

      // Thực thi các promise
      const [
         { data: oorderData, error: oorderError },
         { data: orderDetailsData, error: orderDetailsError }
      ] = await Promise.all([orderPromise, orderDetailsPromise]);


      let finalOrder: Order | null = null;
      let paymentMethodName: string | null = 'Không xác định';

      if (oorderError) {
        console.warn('Lỗi khi truy vấn oorders:', oorderError.message);
        // Không phải lỗi nghiêm trọng, có thể thử bảng orders
      }

      if (oorderData) {
        console.log('Tìm thấy đơn hàng trong oorders:', oorderData);
        finalOrder = {
          ...oorderData,
          customer_name: shipping.name_customer || 'Không xác định',
          payment_method_name: 'Đang tải...', // Sẽ cập nhật sau
          shipping_id: shipping.shipping_id
        };
      } else {
        // Nếu không có trong oorders, thử bảng orders
        console.log('Không tìm thấy trong oorders, thử bảng orders...');
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('order_id', shipping.order_id)
          .maybeSingle();

        if (orderError) {
            console.error('Lỗi khi truy vấn orders:', orderError.message);
            setError(`Lỗi khi lấy thông tin đơn hàng: ${orderError.message}`);
            // Vẫn tiếp tục để hiển thị thông tin shipping và chi tiết nếu có
        } else if (orderData) {
            console.log('Tìm thấy đơn hàng trong orders:', orderData);
            finalOrder = {
                ...orderData,
                customer_name: shipping.name_customer || 'Không xác định',
                payment_method_name: 'Đang tải...', // Sẽ cập nhật sau
                shipping_id: shipping.shipping_id
            };
        } else {
            console.warn('Không tìm thấy đơn hàng nào phù hợp với mã:', shipping.order_id);
            // Tạo đơn hàng mặc định nếu không tìm thấy để ít nhất hiển thị thông tin shipping
             finalOrder = {
                order_id: shipping.order_id,
                customer_id: null,
                order_date: shipping.created_at || new Date().toISOString(),
                price: 0, // Không có giá trị chính xác
                status: 'Không xác định',
                is_shipping: true,
                payment_method: null,
                customer_name: shipping.name_customer || 'Không xác định',
                payment_method_name: 'Không xác định',
                shipping_id: shipping.shipping_id
            };
        }
      }

       // Lấy tên phương thức thanh toán nếu có finalOrder và payment_method
       if (finalOrder && finalOrder.payment_method) {
         try {
            const { data: paymentData, error: paymentError } = await supabase
                .from('Payments') // Đảm bảo tên bảng chính xác
                .select('payment_method_name')
                .eq('payment_id', finalOrder.payment_method)
                .single(); // Dùng single vì mong đợi 1 kết quả

            if (paymentError) {
                console.warn("Lỗi lấy tên phương thức thanh toán:", paymentError.message);
            } else if (paymentData) {
                paymentMethodName = paymentData.payment_method_name;
            }
         } catch (paymentFetchError: any) {
              console.error("Lỗi không mong muốn khi lấy PTTT:", paymentFetchError);
         }
       }

      // Cập nhật finalOrder với tên PTTT
      if(finalOrder){
          finalOrder.payment_method_name = paymentMethodName;
      }
      setSelectedOrder(finalOrder); // Cập nhật state Order

      // Xử lý chi tiết đơn hàng
      if (orderDetailsError) {
        console.error('Lỗi khi truy vấn orderdetails:', orderDetailsError)
        setError((prevError) => prevError ? `${prevError}\nLỗi khi lấy chi tiết đơn hàng: ${orderDetailsError.message}` : `Lỗi khi lấy chi tiết đơn hàng: ${orderDetailsError.message}`)
        setOrderDetails([])
      } else if (orderDetailsData && orderDetailsData.length > 0) {
        console.log('Tìm thấy chi tiết đơn hàng:', orderDetailsData.length, 'sản phẩm')
        // Format lại để khớp interface OrderDetail (đảm bảo tên cột đúng)
        const formattedOrderDetails: OrderDetail[] = orderDetailsData.map((detail: any) => ({
          order_detail_id: detail.orderdetail_id || detail.order_detail_id || `generated-${Math.random()}`, // Cần ID duy nhất
          order_id: detail.order_id,
          product_id: detail.product_id,
          name_product: detail.name_product || 'N/A',
          quantity: detail.quantity || 0,
          unit_price: detail.unit_price || 0,
          subtotal: detail.subtotal || (detail.quantity || 0) * (detail.unit_price || 0), // Tính lại nếu subtotal thiếu
          // Sử dụng optional chaining và fallback cho image
          product_image: detail.products?.image || null
        }))
        setOrderDetails(formattedOrderDetails)
      } else {
        console.log('Không tìm thấy chi tiết đơn hàng cho mã:', shipping.order_id)
        setOrderDetails([])
      }

    } catch (error: any) {
      console.error('Lỗi không mong muốn khi lấy chi tiết đơn vận chuyển:', error)
      setError(`Lỗi khi tải chi tiết: ${error.message || 'Không xác định'}`)
    } finally {
      setLoadingDetails(false) // Kết thúc loading cho modal
    }
  }

  // Đóng modal chi tiết
  const closeModal = () => {
    setShowShippingDetails(false)
    setIsEditing(false)
    setSelectedShipping(null)
    setSelectedOrder(null)
    setEditedShipping(null)
    setOrderDetails([])
    setLoadingDetails(false) // Đảm bảo reset loading
    setError(null) // Reset lỗi khi đóng modal
  }

  // Xử lý thay đổi input khi chỉnh sửa
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    // Xử lý checkbox riêng
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
       setEditedShipping(prev => prev ? { ...prev, [name]: e.target.checked } : null);
       return;
    }

    // Xử lý các kiểu dữ liệu khác (number, date, text, select)
    let processedValue: string | number | boolean | null = value;
    // Chuyển đổi sang number nếu cần (ví dụ: shipping_cost, weight, long, wide, hight)
    if (['shipping_cost', 'weight', 'long', 'wide', 'hight'].includes(name)) {
        processedValue = value === '' ? null : parseFloat(value); // Cho phép rỗng (null) hoặc số
        // Kiểm tra NaN sau khi parse
         if (isNaN(processedValue as number) && value !== '') {
           console.warn(`Invalid number input for ${name}: ${value}`);
           // Có thể không cập nhật state hoặc giữ giá trị cũ tùy theo yêu cầu
           return; // Không cập nhật nếu nhập chữ vào ô số
        }
    }
     // Xử lý date input (trả về YYYY-MM-DD)
    if (type === 'date' && value === '') {
       processedValue = null; // Set null nếu ngày bị xóa
    }


    setEditedShipping(prev => prev ? { ...prev, [name]: processedValue } : null)
  }

  // Lưu thay đổi
  const saveShippingInfo = async () => {
    if (!editedShipping || !selectedShipping) return // Cần cả hai để so sánh và lấy ID

    setIsSaving(true)
    setError(null)

    // Tạo object chứa các trường cần cập nhật
    const updateData: Partial<Shipping> = {
        name_customer: editedShipping.name_customer,
        phone_customer: editedShipping.phone_customer,
        shipping_address: editedShipping.shipping_address,
        carrier: editedShipping.carrier,
        tracking_number: editedShipping.tracking_number,
        // Đảm bảo giá trị số là number hoặc null
        shipping_cost: editedShipping.shipping_cost === null ? null : Number(editedShipping.shipping_cost),
        status: editedShipping.status,
         // Xử lý ngày tháng: gửi null nếu không có giá trị
        actual_delivery_date: editedShipping.actual_delivery_date || null,
        delivery_date: editedShipping.delivery_date || null,
        weight: editedShipping.weight === null ? null : Number(editedShipping.weight),
        unit_weight: editedShipping.unit_weight,
        long: editedShipping.long === null ? null : Number(editedShipping.long),
        wide: editedShipping.wide === null ? null : Number(editedShipping.wide),
        hight: editedShipping.hight === null ? null : Number(editedShipping.hight),
        unit_size: editedShipping.unit_size,
        cod_shipping: editedShipping.cod_shipping,
    };


    try {
      const { data, error: updateError } = await supabase
        .from('shippings')
        .update(updateData)
        .eq('shipping_id', selectedShipping.shipping_id) // Sử dụng ID gốc
        .select() // Trả về bản ghi đã cập nhật để xác nhận
        .single() // Mong đợi chỉ một bản ghi được cập nhật

      if (updateError) {
        console.error('Lỗi khi cập nhật thông tin vận chuyển:', updateError)
        setError(`Lỗi khi cập nhật: ${updateError.message}`)
      } else {
        console.log('Cập nhật thành công:', data)
        // Cập nhật thành công
        setSelectedShipping(data); // Cập nhật selectedShipping với data mới nhất từ DB
        setEditedShipping(data); // Đồng bộ editedShipping
        setIsEditing(false)

        // Cập nhật lại danh sách (không cần reset page)
        searchShippings(false);
        // Đóng modal sau khi lưu thành công? Hoặc hiển thị thông báo?
        // closeModal(); // Tùy chọn: đóng modal sau khi lưu
      }
    } catch (error: any) {
      console.error('Lỗi không mong muốn khi lưu thông tin vận chuyển:', error)
      setError(`Có lỗi xảy ra khi lưu: ${error.message || 'Không xác định'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // --- Print & Export Functions ---

  // Hàm tạo HTML chung cho in ấn
  const generatePrintableHtml = (title: string, bodyContent: string, styles: string): string => {
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
          body { font-family: 'Roboto', sans-serif; line-height: 1.6; color: #333; margin: 20px; background-color: #fff; }
          .print-container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 20px; border: 1px solid #eee; }
          /* Common Styles */
          .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px; }
          .logo-container { display: flex; align-items: center; }
          .logo { height: 50px; width: 50px; margin-right: 15px; filter: invert(0); /* Adjust if needed */ }
          .company-name { font-size: 20px; font-weight: 700; margin: 0; color: #111827; }
          .doc-title { font-size: 24px; font-weight: 700; margin: 0; text-align: right; color: #1f2937; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 14px; }
          .info-section { }
          .section-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
          .info-row { margin-bottom: 6px; display: flex; }
          .label { font-weight: 500; color: #6b7280; width: 120px; flex-shrink: 0; }
          .value { color: #1f2937; flex-grow: 1; word-break: break-word; }
          .products-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
          .products-table th, .products-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          .products-table th { background-color: #f9fafb; font-weight: 600; color: #4b5563; }
          .text-right { text-align: right; }
          .summary { background-color: #f9fafb; padding: 15px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .summary-label { font-weight: 500; color: #6b7280; }
          .summary-value { font-weight: 600; color: #1f2937; text-align: right; }
          .total-row { font-size: 16px; font-weight: 700; color: #1f2937; border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px; }
          .status-badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; line-height: 1.2; vertical-align: middle; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-shipped { background-color: #dbeafe; color: #1e40af; }
          .status-delivered { background-color: #d1fae5; color: #065f46; }
          .status-cancelled { background-color: #fee2e2; color: #b91c1c; }
          .status-gray { background-color: #f3f4f6; color: #4b5563; } /* Fallback color */
          .cod-notice { background-color: #fefce8; border-left: 4px solid #facc15; padding: 10px; margin-bottom: 20px; font-style: italic; color: #a16207; font-size: 13px; }
          .barcode-section { text-align: center; margin: 20px 0; padding: 15px; border: 1px dashed #ccc; border-radius: 4px;}
          .barcode-number { font-family: 'Courier New', monospace; font-size: 20px; letter-spacing: 2px; margin-top: 5px; display: block; }
          .footer { text-align: center; padding-top: 20px; margin-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          @media print { body { margin: 0; } .print-container { border: none; box-shadow: none; max-width: 100%; margin: 0; padding: 0; } }
          /* Custom Styles */
          ${styles}
        </style>
      </head>
      <body>
        <div class="print-container">
          ${bodyContent}
        </div>
      </body>
      </html>
    `;
  }

  // Hàm mở cửa sổ in
  const openPrintWindow = (htmlContent: string, title: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'width=800,height=600');

    if (printWindow) {
        printWindow.onload = () => {
            printWindow.document.title = title;
            // Tự động in và đóng sau khi tải xong
            const printScript = printWindow.document.createElement('script');
            printScript.textContent = `
                setTimeout(() => {
                    try {
                        window.print();
                        // Đóng cửa sổ sau một khoảng trễ nhỏ để đảm bảo in được gửi đi
                         setTimeout(() => { window.close(); }, 500);
                    } catch (e) {
                        console.error('Error printing:', e);
                        // Đóng cửa sổ ngay cả khi có lỗi
                        setTimeout(() => { window.close(); }, 500);
                    } finally {
                         // Giải phóng URL object sau khi không cần nữa
                         URL.revokeObjectURL('${url}');
                    }
                }, 1000); // Chờ 1 giây để nội dung render hoàn chỉnh
            `;
            printWindow.document.body.appendChild(printScript);
        };
        printWindow.onerror = (err) => {
            console.error("Error loading print window:", err);
            alert('Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt trình duyệt.');
             URL.revokeObjectURL(url); // Giải phóng URL nếu lỗi
        }
    } else {
        alert('Không thể mở cửa sổ pop-up. Vui lòng cho phép pop-up từ trang web này để in.');
        URL.revokeObjectURL(url); // Giải phóng URL nếu không mở được window
    }
  }


  // In hóa đơn
  const printInvoice = () => {
    if (!selectedShipping || !selectedOrder) {
      alert('Không có đủ thông tin để in hóa đơn. Vui lòng thử tải lại chi tiết.');
      return;
    }

    const invoiceTitle = `Hóa đơn - ${selectedOrder.order_id}`;
    const statusColorClass = `status-${getStatusColor(selectedShipping.status)}`;

    const invoiceBody = `
      <div class="header">
        <div class="logo-container">
          <img src="${companyLogo}" alt="Logo" class="logo">
          <h1 class="company-name">QLBH SYSTEM</h1>
        </div>
        <h1 class="doc-title">HÓA ĐƠN</h1>
      </div>

      <div class="info-grid">
        <div class="info-section">
          <h2 class="section-title">Thông tin hóa đơn</h2>
          <div class="info-row"><span class="label">Mã hóa đơn:</span><span class="value">${selectedOrder.order_id}</span></div>
          <div class="info-row"><span class="label">Ngày đặt hàng:</span><span class="value">${formatDate(selectedOrder.order_date)}</span></div>
          <div class="info-row"><span class="label">Trạng thái ĐH:</span><span class="value">${selectedOrder.status || 'N/A'}</span></div>
          <div class="info-row"><span class="label">Trạng thái VC:</span><span class="value"><span class="status-badge ${statusColorClass}">${getStatusName(selectedShipping.status)}</span></span></div>
          <div class="info-row"><span class="label">Phương thức TT:</span><span class="value">${selectedOrder.payment_method_name || (selectedShipping.cod_shipping ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán trước')}</span></div>
        </div>
        <div class="info-section">
          <h2 class="section-title">Thông tin khách hàng</h2>
          <div class="info-row"><span class="label">Tên khách hàng:</span><span class="value">${selectedShipping.name_customer}</span></div>
          <div class="info-row"><span class="label">Số điện thoại:</span><span class="value">${selectedShipping.phone_customer}</span></div>
          <div class="info-row"><span class="label">Địa chỉ:</span><span class="value">${selectedShipping.shipping_address}</span></div>
        </div>
      </div>

       <div class="info-grid">
         <div class="info-section">
            <h2 class="section-title">Thông tin vận chuyển</h2>
            <div class="info-row"><span class="label">Mã vận chuyển:</span><span class="value">${selectedShipping.shipping_id}</span></div>
            <div class="info-row"><span class="label">ĐV vận chuyển:</span><span class="value">${selectedShipping.carrier || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Mã vận đơn:</span><span class="value">${selectedShipping.tracking_number || 'N/A'}</span></div>
          </div>
          <div class="info-section">
             <h2 class="section-title">Thời gian</h2>
             <div class="info-row"><span class="label">Ngày tạo VC:</span><span class="value">${formatDate(selectedShipping.created_at)}</span></div>
             <div class="info-row"><span class="label">Ngày bắt đầu giao:</span><span class="value">${formatDate(selectedShipping.actual_delivery_date)}</span></div>
             <div class="info-row"><span class="label">Ngày nhận hàng:</span><span class="value">${formatDate(selectedShipping.delivery_date)}</span></div>
          </div>
      </div>

      <h2 class="section-title">Chi tiết đơn hàng</h2>
      <table class="products-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th class="text-right">Đơn giá</th>
            <th class="text-right">Số lượng</th>
            <th class="text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${orderDetails.length > 0 ? orderDetails.map(detail => `
            <tr>
              <td>${detail.name_product}</td>
              <td class="text-right">${formatCurrency(detail.unit_price)}</td>
              <td class="text-right">${detail.quantity}</td>
              <td class="text-right">${formatCurrency(detail.subtotal)}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" style="text-align:center;">Không có chi tiết sản phẩm.</td></tr>'}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <div class="summary-label">Tổng tiền hàng:</div>
          <div class="summary-value">${formatCurrency(selectedOrder.price)}</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">Phí vận chuyển:</div>
          <div class="summary-value">${formatCurrency(selectedShipping.shipping_cost)}</div>
        </div>
        <div class="summary-row total-row">
          <div class="summary-label">Tổng thanh toán:</div>
          <div class="summary-value">${formatCurrency((selectedOrder.price || 0) + (selectedShipping.shipping_cost || 0))}</div>
        </div>
      </div>

      ${selectedShipping.cod_shipping ? `
        <div class="cod-notice">
          <strong>Lưu ý COD:</strong> Vui lòng thanh toán ${formatCurrency((selectedOrder.price || 0) + (selectedShipping.shipping_cost || 0))} khi nhận hàng.
        </div>
      ` : ''}

      <div class="barcode-section">
         <div>Mã vận đơn (Tracking)</div>
         <div class="barcode-number">*${selectedShipping.tracking_number || 'N/A'}*</div>
      </div>


      <div class="footer">
        <p>Cảm ơn quý khách đã mua hàng!</p>
        <p>CÔNG TY TNHH THƯƠNG MẠI ĐIỆN TỬ QLBH SYSTEM</p>
        <p>Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM | ĐT: (028) 1234 5678 | Email: contact@qlbh-system.com</p>
        <p>© ${new Date().getFullYear()} QLBH System. All rights reserved.</p>
      </div>
    `;

    const invoiceHtml = generatePrintableHtml(invoiceTitle, invoiceBody, ''); // Không cần style riêng
    openPrintWindow(invoiceHtml, invoiceTitle);
  }


  // Xuất đơn vận chuyển (Phiếu gửi hàng)
  const exportShippingOrder = () => {
    if (!selectedShipping || !selectedOrder) {
      alert('Không có đủ thông tin để xuất đơn vận chuyển. Vui lòng thử tải lại chi tiết.');
      return;
    }

    const shippingLabelTitle = `Đơn vận chuyển - ${selectedShipping.shipping_id}`;
    const statusColorClass = `status-${getStatusColor(selectedShipping.status)}`;
    const totalPayment = (selectedOrder.price || 0) + (selectedShipping.shipping_cost || 0);

    const shippingLabelBody = `
      <div class="header">
        <div class="logo-container">
          <img src="${companyLogo}" alt="Logo" class="logo">
          <h1 class="company-name">QLBH SYSTEM (Bên gửi)</h1>
        </div>
        <h1 class="doc-title">PHIẾU GỬI HÀNG</h1>
      </div>

      <div class="info-grid">
         <div class="info-section sender-info">
            <h2 class="section-title">Thông tin bên gửi</h2>
            <div class="info-row"><span class="label">Công ty:</span><span class="value">CÔNG TY TNHH TMĐT QLBH SYSTEM</span></div>
            <div class="info-row"><span class="label">Địa chỉ:</span><span class="value">123 Đường ABC, Quận XYZ, TP.HCM</span></div>
            <div class="info-row"><span class="label">Điện thoại:</span><span class="value">(028) 1234 5678</span></div>
          </div>
         <div class="info-section receiver-info">
            <h2 class="section-title">Thông tin bên nhận</h2>
            <div class="info-row"><span class="label">Tên người nhận:</span><span class="value">${selectedShipping.name_customer}</span></div>
            <div class="info-row"><span class="label">Số điện thoại:</span><span class="value">${selectedShipping.phone_customer}</span></div>
            <div class="info-row"><span class="label">Địa chỉ giao:</span><span class="value">${selectedShipping.shipping_address}</span></div>
          </div>
      </div>

      <div class="info-grid">
          <div class="info-section">
            <h2 class="section-title">Thông tin đơn hàng</h2>
            <div class="info-row"><span class="label">Mã đơn hàng:</span><span class="value">${selectedOrder.order_id}</span></div>
            <div class="info-row"><span class="label">Mã vận chuyển:</span><span class="value">${selectedShipping.shipping_id}</span></div>
            <div class="info-row"><span class="label">Ngày tạo ĐH:</span><span class="value">${formatDate(selectedOrder.order_date)}</span></div>
             <div class="info-row"><span class="label">Trạng thái VC:</span><span class="value"><span class="status-badge ${statusColorClass}">${getStatusName(selectedShipping.status)}</span></span></div>
          </div>
           <div class="info-section">
            <h2 class="section-title">Thông tin vận chuyển</h2>
            <div class="info-row"><span class="label">ĐV vận chuyển:</span><span class="value">${selectedShipping.carrier || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Mã vận đơn:</span><span class="value">${selectedShipping.tracking_number || 'N/A'}</span></div>
            <div class="info-row"><span class="label">COD:</span><span class="value">${selectedShipping.cod_shipping ? 'Có' : 'Không'}</span></div>
            <div class="info-row"><span class="label">Tiền thu hộ:</span><span class="value">${selectedShipping.cod_shipping ? formatCurrency(totalPayment) : '0 VND'}</span></div>
          </div>
      </div>

      <div class="info-grid">
         <div class="info-section">
            <h2 class="section-title">Thông tin kiện hàng</h2>
            <div class="info-row"><span class="label">Kích thước:</span><span class="value">${selectedShipping.long || '?'} x ${selectedShipping.wide || '?'} x ${selectedShipping.hight || '?'} ${selectedShipping.unit_size || 'cm'}</span></div>
            <div class="info-row"><span class="label">Trọng lượng:</span><span class="value">${selectedShipping.weight || '?'} ${selectedShipping.unit_weight || 'kg'}</span></div>
            <div class="info-row"><span class="label">Giá trị hàng:</span><span class="value">${formatCurrency(selectedOrder.price)}</span></div>
          </div>
          <div class="info-section">
             <h2 class="section-title">Nội dung hàng hóa</h2>
             <div class="product-list">
                 ${orderDetails.length > 0
                     ? orderDetails.map(d => `<div class="product-item">- ${d.name_product} (SL: ${d.quantity})</div>`).join('')
                     : '<span>Chi tiết xem trong hóa đơn.</span>'
                 }
             </div>
          </div>
       </div>


      ${selectedShipping.cod_shipping ? `
        <div class="cod-notice">
          <strong>Thu hộ COD: ${formatCurrency(totalPayment)}</strong>. Vui lòng không đồng kiểm. Liên hệ shop nếu có vấn đề.
        </div>
      ` : `
        <div class="cod-notice" style="background-color: #d1fae5; border-left-color: #065f46; color: #064e3b;">
          <strong>Đã thanh toán trước.</strong> Vui lòng không thu thêm tiền.
        </div>
      `}

       <div class="barcode-section">
         <div>Mã vận đơn (Quét để theo dõi)</div>
         <div class="barcode-number">*${selectedShipping.tracking_number || 'N/A'}*</div>
       </div>

      <div class="signature-section" style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 14px;">
         <div style="width: 45%; text-align: center;">
            <p style="font-weight: 600; margin-bottom: 40px;">Chữ ký người gửi</p>
            <p style="border-top: 1px solid #ccc; padding-top: 5px;">(QLBH System)</p>
         </div>
         <div style="width: 45%; text-align: center;">
            <p style="font-weight: 600; margin-bottom: 40px;">Chữ ký người nhận</p>
            <p style="border-top: 1px solid #ccc; padding-top: 5px;">(Xác nhận hàng nguyên vẹn)</p>
         </div>
      </div>

      <div class="footer">
        <p>Hotline hỗ trợ: (028) 1234 5678 - Cảm ơn quý khách!</p>
      </div>
    `;

     // Style riêng cho phiếu gửi hàng nếu cần
     const shippingLabelStyles = `
        .product-list { font-size: 13px; max-height: 100px; overflow-y: auto; }
        .product-item { margin-bottom: 3px; }
     `;

    const shippingHtml = generatePrintableHtml(shippingLabelTitle, shippingLabelBody, shippingLabelStyles);
    openPrintWindow(shippingHtml, shippingLabelTitle);
  }


  // --- Render Logic ---

  // Cần chờ mounted và theme được load
  if (!mounted || !themeState.theme) {
    // Có thể hiển thị một skeleton loader đơn giản ở đây thay vì null
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">Đang tải...</div>;
  }

  const { theme } = themeState;
  // Đảm bảo themeColor có giá trị fallback an toàn
  const themeColor = theme?.textColor?.split('-')[1] || 'indigo';


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Quản lý đơn vận chuyển</h1>

      {/* Bộ lọc và tìm kiếm */}
      <div className="bg-white shadow-sm rounded-lg mb-6">
        <div className="p-4">
          {/* Hàng 1: Tìm kiếm & Trạng thái */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
               <label htmlFor="search-term" className="sr-only">Tìm kiếm</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="search-term"
                placeholder="Tìm theo mã, tên KH, SĐT, vận đơn..."
                value={searchTerm}
                onChange={handleSearchTermChange}
                onKeyPress={handleSearchKeyPress}
                className={`block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 sm:text-sm h-10`}
              />
            </div>
            <div>
              <label htmlFor="status-filter" className="sr-only">Lọc theo trạng thái</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 sm:text-sm h-10`}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="shipped">Đang vận chuyển</option>
                <option value="delivered">Đã giao hàng</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>

          {/* Hàng 2: Ngày & Nút tìm kiếm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <input
                type="date"
                id="date-from"
                value={dateRange.from}
                onChange={handleDateChange('from')}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 sm:text-sm h-10`}
              />
            </div>
            <div>
              <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <input
                type="date"
                id="date-to"
                value={dateRange.to}
                onChange={handleDateChange('to')}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 sm:text-sm h-10`}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSearchButtonClick}
                className={`w-full h-10 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-medium rounded-md flex items-center justify-center shadow-sm transition duration-150 ease-in-out disabled:opacity-50`}
                disabled={loading}
              >
                {loading && !isSaving ? ( // Chỉ hiển thị loading tìm kiếm chính
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <MagnifyingGlassIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                )}
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Đã xảy ra lỗi</p>
              <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{error}</p>
               <div className="mt-2">
                 <button
                  onClick={() => {
                    setError(null)
                    searchShippings(false) // Thử lại trang hiện tại
                  }}
                  className="text-sm font-medium text-red-700 hover:text-red-600 underline"
                >
                  Thử lại
                </button>
                <button
                    onClick={() => setError(null)}
                    className="ml-4 text-sm font-medium text-gray-700 hover:text-gray-600"
                >
                    Bỏ qua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danh sách đơn vận chuyển */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-3 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Danh sách đơn vận chuyển</h2>
          <button
            onClick={() => searchShippings(false)} // Làm mới trang hiện tại
            className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 disabled:opacity-50`}
            disabled={loading}
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Làm mới
          </button>
        </div>

        {/* Phần hiển thị danh sách */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600">Đang tải danh sách...</span>
            </div>
          ) : shippings.length > 0 ? (
            shippings.map((shipping) => {
              const statusColor = getStatusColor(shipping.status);
              return (
                 <div
                  key={shipping.shipping_id}
                  className="p-2 hover:bg-gray-100 transition duration-150 ease-in-out cursor-pointer border border-gray-100 rounded-lg mb-2"
                  onClick={() => viewShippingDetails(shipping)}
                  role="button" // Accessibility
                  tabIndex={0} // Accessibility
                  onKeyPress={(e) => e.key === 'Enter' && viewShippingDetails(shipping)} // Accessibility
                >
                   <div className="flex flex-col md:flex-row md:items-stretch gap-4">
                      {/* Cột Trái: Trạng thái, Vận chuyển - với màu nền theo trạng thái */}
                      <div className={`md:w-1/4 flex-shrink-0 space-y-2 p-3 rounded-lg flex flex-col justify-between ${shipping.status === 'pending' ? 'bg-yellow-50' : shipping.status === 'delivered' ? 'bg-green-50' : shipping.status === 'cancelled' ? 'bg-red-50' : 'bg-blue-50'}`}>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-1">
                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
                                   {getStatusName(shipping.status)}
                                </span>
                                {shipping.cod_shipping && (
                                   <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                   COD
                                   </span>
                                )}
                             </div>
                             <span className="text-xs text-gray-500">
                                {formatDate(shipping.created_at).split(' ')[0]} {/* Chỉ lấy ngày */}
                             </span>
                          </div>
                          <div className="text-sm">
                             <p className="font-medium text-gray-800 flex items-center">
                               <TruckIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                               {shipping.carrier || 'Chưa rõ ĐVVC'}
                             </p>
                             <p className="text-xs text-gray-600 truncate" title={shipping.tracking_number || 'Chưa có mã vận đơn'}>
                                Mã VC: {shipping.tracking_number || 'N/A'}
                             </p>
                             <p className="text-xs text-gray-600">
                                Phí VC: {formatCurrency(shipping.shipping_cost)}
                              </p>
                          </div>
                      </div>

                      {/* Cột Phải: Thông tin KH, Địa chỉ và thông tin đơn hàng */}
                      <div className="md:w-3/4 flex-grow p-3 bg-white rounded-lg border border-gray-100">
                          <div className="flex flex-col md:flex-row md:justify-between gap-3">
                              {/* Thông tin khách hàng */}
                              <div className="space-y-2">
                                  <div className="flex items-start space-x-3">
                                      <div className="flex-shrink-0 pt-0.5">
                                         <UserCircleIcon className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{shipping.name_customer}</p>
                                        <p className="text-sm text-gray-600">{shipping.phone_customer}</p>
                                      </div>
                                  </div>
                                   <p className="text-sm text-gray-700 line-clamp-2" title={shipping.shipping_address}>
                                    <span className="font-medium text-gray-600">Địa chỉ:</span> {shipping.shipping_address}
                                   </p>
                                   <p className="text-sm text-gray-500">
                                        <span className="font-medium text-gray-600">Mã đơn hàng:</span> {shipping.order_id}
                                   </p>
                              </div>

                              {/* Thông tin đơn hàng */}
                              <div className="space-y-1 bg-gray-50 p-2 rounded-md border border-gray-100">
                                  <p className="text-sm">
                                      <span className="font-medium text-gray-600">Giá trị đơn hàng:</span>
                                      <span className="font-medium text-gray-900 ml-1">{formatCurrency(0)}</span>
                                  </p>
                                  <p className="text-sm">
                                      <span className="font-medium text-gray-600">Trạng thái thanh toán:</span>
                                      <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                                          Chưa thanh toán
                                      </span>
                                  </p>
                                  <p className="text-sm">
                                      <span className="font-medium text-gray-600">Số lượng sản phẩm:</span>
                                      <span className="text-gray-900 ml-1">0</span>
                                  </p>
                                  <p className="text-sm">
                                      <span className="font-medium text-gray-600">Ngày tạo:</span>
                                      <span className="text-gray-900 ml-1">{formatDate(shipping.created_at).split(' ')[0]}</span>
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-16 px-4">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy đơn vận chuyển</h3>
              <p className="mt-1 text-sm text-gray-500">
                Không có đơn vận chuyển nào khớp với tiêu chí tìm kiếm của bạn.
              </p>
            </div>
          )}
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            {/* Mobile Pagination */}
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Trước
              </button>
              <span className="text-sm text-gray-700">
                 Trang {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Sau
              </button>
            </div>
            {/* Desktop Pagination */}
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{shippings.length}</span> trên tổng số <span className="font-medium">{(currentPage - 1) * shippingsPerPage + shippings.length}</span> / <span className="font-medium">{ (totalPages -1 ) * shippingsPerPage + shippings.length }</span> {/* Cần tổng số từ count */} kết quả
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="sr-only">Trước</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {/* Logic hiển thị số trang có thể phức tạp hơn nếu nhiều trang */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      disabled={loading}
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? `z-10 bg-${themeColor}-50 border-${themeColor}-500 text-${themeColor}-600`
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      } ${loading ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="sr-only">Sau</span>
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

      {/* Modal chi tiết đơn vận chuyển */}
      {showShippingDetails && selectedShipping && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeModal}></div>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">​</span>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              {/* Modal Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-${themeColor}-100 sm:mx-0 sm:h-10 sm:w-10`}>
                    <TruckIcon className={`h-6 w-6 text-${themeColor}-600`} aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-grow">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Chi tiết đơn vận chuyển
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Mã VC: {selectedShipping.shipping_id} | Mã ĐH: {selectedShipping.order_id}
                    </p>
                     <div className="mt-1">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-${getStatusColor(selectedShipping.status)}-100 text-${getStatusColor(selectedShipping.status)}-800`}>
                           {getStatusName(selectedShipping.status)}
                        </span>
                     </div>
                  </div>
                   {/* Action Buttons Header */}
                  <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 flex space-x-2 justify-center sm:justify-end">
                     {!isEditing && (
                       <button
                          type="button"
                          onClick={() => {
                              setEditedShipping({ ...selectedShipping }); // Copy current data to edit form
                              setIsEditing(true);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                      >
                          <PencilIcon className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-500" />
                          Sửa
                      </button>
                     )}
                    <button
                      type="button"
                      onClick={exportShippingOrder}
                      disabled={loadingDetails || !selectedOrder} // Disable if still loading or no order info
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 disabled:opacity-50`}
                      title={!selectedOrder ? "Cần thông tin đơn hàng để xuất" : "Xuất phiếu gửi hàng"}
                    >
                      <DocumentTextIcon className="mr-1.5 h-4 w-4" />
                      Xuất phiếu gửi
                    </button>
                    <button
                      type="button"
                      onClick={printInvoice}
                      disabled={loadingDetails || !selectedOrder} // Disable if still loading or no order info
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50`}
                       title={!selectedOrder ? "Cần thông tin đơn hàng để in" : "In hóa đơn"}
                    >
                      <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" />
                      In hóa đơn
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
                 {/* Loading Indicator for Details */}
                 {loadingDetails && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10">
                        <svg className="animate-spin h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="ml-2 text-sm text-gray-600">Đang tải chi tiết...</span>
                    </div>
                 )}
              </div>

              {/* Modal Body */}
               <div className="px-4 py-5 sm:p-6 max-h-[70vh] overflow-y-auto">
                  {/* Display Error inside modal if details failed */}
                   {error && !loadingDetails && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
                        <p className="text-sm text-red-700 font-medium">Lỗi khi tải chi tiết:</p>
                        <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{error}</p>
                      </div>
                    )}

                   {/* Main content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Column 1: Order Info & Customer Info */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Thông tin đơn hàng */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-base font-medium text-gray-800 mb-3 border-b pb-2">Thông tin đơn hàng gốc</h4>
                                {selectedOrder ? (
                                <div className="space-y-2 text-sm">
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">Mã đơn:</span> {selectedOrder.order_id}</p>
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">Ngày đặt:</span> {formatDate(selectedOrder.order_date)}</p>
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">Tổng tiền:</span> {formatCurrency(selectedOrder.price)}</p>
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">Trạng thái ĐH:</span> {selectedOrder.status || 'N/A'}</p>
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">PT Thanh toán:</span> {selectedOrder.payment_method_name || 'N/A'}</p>
                                </div>
                                ) : (
                                 <p className="text-sm text-gray-500 italic">Không tìm thấy thông tin đơn hàng gốc.</p>
                                )}
                            </div>

                            {/* Thông tin người nhận */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-base font-medium text-gray-800 mb-3 border-b pb-2">Thông tin người nhận</h4>
                                {isEditing && editedShipping ? (
                                <div className="space-y-3">
                                    <div>
                                    <label htmlFor="name_customer" className="block text-sm font-medium text-gray-700">Tên người nhận</label>
                                    <input
                                        type="text" name="name_customer" id="name_customer" autoComplete='name'
                                        value={editedShipping.name_customer || ''} onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    </div>
                                    <div>
                                    <label htmlFor="phone_customer" className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                                    <input
                                        type="tel" name="phone_customer" id="phone_customer" autoComplete='tel'
                                        value={editedShipping.phone_customer || ''} onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    </div>
                                    <div>
                                    <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-700">Địa chỉ giao hàng</label>
                                    <textarea
                                        name="shipping_address" id="shipping_address" rows={3}
                                        value={editedShipping.shipping_address || ''} onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    ></textarea>
                                    </div>
                                </div>
                                ) : (
                                <div className="space-y-2 text-sm">
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">Tên:</span> {selectedShipping.name_customer}</p>
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">Điện thoại:</span> {selectedShipping.phone_customer}</p>
                                    <p><span className="font-medium text-gray-600 w-28 inline-block">Địa chỉ:</span> {selectedShipping.shipping_address}</p>
                                </div>
                                )}
                            </div>
                        </div>

                         {/* Column 2: Shipping Info & Package Info */}
                        <div className="lg:col-span-1 space-y-6">
                             {/* Thông tin vận chuyển */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-base font-medium text-gray-800 mb-3 border-b pb-2">Thông tin vận chuyển</h4>
                                {isEditing && editedShipping ? (
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="carrier" className="block text-sm font-medium text-gray-700">Đơn vị vận chuyển</label>
                                        <input
                                            type="text" name="carrier" id="carrier"
                                            value={editedShipping.carrier || ''} onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="tracking_number" className="block text-sm font-medium text-gray-700">Mã vận đơn</label>
                                        <input
                                            type="text" name="tracking_number" id="tracking_number"
                                            value={editedShipping.tracking_number || ''} onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="shipping_cost" className="block text-sm font-medium text-gray-700">Phí vận chuyển</label>
                                            <input
                                                type="number" step="1000" min="0" name="shipping_cost" id="shipping_cost"
                                                value={editedShipping.shipping_cost ?? ''} onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Trạng thái VC</label>
                                            <select
                                                name="status" id="status" value={editedShipping.status || ''} onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm h-[34px]" // Adjust height
                                            >
                                                <option value="pending">Chờ xử lý</option>
                                                <option value="shipped">Đang vận chuyển</option>
                                                <option value="delivered">Đã giao hàng</option>
                                                <option value="cancelled">Đã hủy</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox" name="cod_shipping" id="cod_shipping"
                                            checked={!!editedShipping.cod_shipping} onChange={handleInputChange}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="cod_shipping" className="ml-2 block text-sm text-gray-700">Thu tiền hộ (COD)</label>
                                    </div>
                                    {/* Thời gian */}
                                     <div className="pt-2 border-t mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian giao hàng</label>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label htmlFor="actual_delivery_date" className="block text-xs font-medium text-gray-500">Ngày bắt đầu giao</label>
                                                <input
                                                type="date" name="actual_delivery_date" id="actual_delivery_date"
                                                value={editedShipping.actual_delivery_date ? new Date(editedShipping.actual_delivery_date).toISOString().split('T')[0] : ''}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="delivery_date" className="block text-xs font-medium text-gray-500">Ngày nhận hàng</label>
                                                <input
                                                type="date" name="delivery_date" id="delivery_date"
                                                value={editedShipping.delivery_date ? new Date(editedShipping.delivery_date).toISOString().split('T')[0] : ''}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm"
                                                />
                                            </div>
                                         </div>
                                    </div>
                                </div>
                                ) : (
                                 <div className="space-y-2 text-sm">
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">ĐV vận chuyển:</span> {selectedShipping.carrier || 'N/A'}</p>
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">Mã vận đơn:</span> {selectedShipping.tracking_number || 'N/A'}</p>
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">Phí VC:</span> {formatCurrency(selectedShipping.shipping_cost)}</p>
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">Trạng thái VC:</span> {getStatusName(selectedShipping.status)}</p>
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">COD:</span> {selectedShipping.cod_shipping ? 'Có' : 'Không'}</p>
                                     <p className="pt-2 border-t mt-2"><span className="font-medium text-gray-600 w-28 inline-block">Ngày tạo VC:</span> {formatDate(selectedShipping.created_at)}</p>
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">Ngày giao:</span> {formatDate(selectedShipping.actual_delivery_date)}</p>
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">Ngày nhận:</span> {formatDate(selectedShipping.delivery_date)}</p>
                                 </div>
                                )}
                            </div>
                             {/* Kích thước & Trọng lượng */}
                             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-base font-medium text-gray-800 mb-3 border-b pb-2">Kích thước & Trọng lượng</h4>
                                {isEditing && editedShipping ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Trọng lượng</label>
                                        <input
                                            type="number" step="0.1" min="0" name="weight" id="weight"
                                            value={editedShipping.weight ?? ''} onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="unit_weight" className="block text-sm font-medium text-gray-700">Đơn vị</label>
                                        <select
                                            name="unit_weight" id="unit_weight"
                                            value={editedShipping.unit_weight || 'kg'} onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm h-[34px]"
                                        >
                                            <option value="kg">kg</option>
                                            <option value="g">g</option>
                                        </select>
                                    </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label htmlFor="long" className="block text-sm font-medium text-gray-700">Dài</label>
                                        <input type="number" min="0" name="long" id="long" value={editedShipping.long ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-1.5 px-2 sm:text-sm"/>
                                    </div>
                                    <div>
                                        <label htmlFor="wide" className="block text-sm font-medium text-gray-700">Rộng</label>
                                        <input type="number" min="0" name="wide" id="wide" value={editedShipping.wide ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-1.5 px-2 sm:text-sm"/>
                                    </div>
                                    <div>
                                        <label htmlFor="hight" className="block text-sm font-medium text-gray-700">Cao</label>
                                        <input type="number" min="0" name="hight" id="hight" value={editedShipping.hight ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md py-1.5 px-2 sm:text-sm"/>
                                    </div>
                                    </div>
                                    <div>
                                    <label htmlFor="unit_size" className="block text-sm font-medium text-gray-700">Đơn vị kích thước</label>
                                    <select
                                        name="unit_size" id="unit_size" value={editedShipping.unit_size || 'cm'} onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 sm:text-sm h-[34px]"
                                    >
                                        <option value="cm">cm</option>
                                        <option value="mm">mm</option>
                                        <option value="inch">inch</option>
                                    </select>
                                    </div>
                                </div>
                                ) : (
                                 <div className="space-y-2 text-sm">
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">Trọng lượng:</span> {selectedShipping.weight ?? 'N/A'} {selectedShipping.unit_weight || ''}</p>
                                     <p><span className="font-medium text-gray-600 w-28 inline-block">Kích thước:</span> {selectedShipping.long ?? '?'} x {selectedShipping.wide ?? '?'} x {selectedShipping.hight ?? '?'} {selectedShipping.unit_size || ''}</p>
                                 </div>
                                )}
                            </div>
                         </div>

                        {/* Column 3: Product List & Payment Summary */}
                         <div className="lg:col-span-1 space-y-6">
                             {/* Danh sách sản phẩm */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-base font-medium text-gray-800 mb-3 border-b pb-2">Danh sách sản phẩm</h4>
                                {orderDetails.length > 0 ? (
                                <div className="overflow-x-auto max-h-60">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL</th>
                                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orderDetails.map((detail) => (
                                        <tr key={detail.order_detail_id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 mr-2">
                                                {detail.product_image ? (
                                                    <img className="h-8 w-8 rounded-md object-cover" src={detail.product_image} alt={detail.name_product} />
                                                ) : (
                                                    <div className="h-8 w-8 bg-gray-200 rounded-md flex items-center justify-center">
                                                         <PhotoIcon className="h-5 w-5 text-gray-400"/>
                                                    </div>
                                                )}
                                                </div>
                                                <div className="text-gray-900 truncate" title={detail.name_product}>{detail.name_product}</div>
                                            </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right">{detail.quantity}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right font-medium">{formatCurrency(detail.subtotal)}</td>
                                        </tr>
                                        ))}
                                    </tbody>
                                    </table>
                                </div>
                                ) : (
                                 <p className="text-sm text-gray-500 italic text-center py-4">Không có thông tin sản phẩm.</p>
                                )}
                            </div>
                             {/* Thông tin thanh toán */}
                            <div className="bg-white p-4 rounded-lg border-2 border-indigo-200 shadow-sm">
                                <h4 className="text-base font-medium text-indigo-800 mb-3 border-b border-indigo-100 pb-2">Thông tin thanh toán</h4>
                                <div className="space-y-1 text-sm">
                                     <div className="flex justify-between">
                                        <span className="text-gray-600">Tiền hàng:</span>
                                        <span className="font-medium text-gray-800">{formatCurrency(selectedOrder?.price)}</span>
                                     </div>
                                     <div className="flex justify-between">
                                        <span className="text-gray-600">Phí vận chuyển:</span>
                                        <span className="font-medium text-gray-800">{formatCurrency(selectedShipping.shipping_cost)}</span>
                                     </div>
                                     <div className="flex justify-between pt-2 border-t mt-2">
                                         <span className="font-semibold text-gray-700">Tổng thanh toán:</span>
                                         <span className="font-bold text-lg text-indigo-700">{formatCurrency((selectedOrder?.price || 0) + (selectedShipping.shipping_cost || 0))}</span>
                                     </div>
                                    {selectedShipping.cod_shipping && (
                                        <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mt-2 italic text-center">
                                            Thu hộ COD: {formatCurrency((selectedOrder?.price || 0) + (selectedShipping.shipping_cost || 0))}
                                        </p>
                                    )}
                                    {!selectedShipping.cod_shipping && (
                                         <p className="text-xs text-green-700 bg-green-50 p-2 rounded mt-2 text-center">
                                            Đã thanh toán trước
                                         </p>
                                    )}
                                </div>
                             </div>
                         </div>

                    </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                 {isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={saveShippingInfo}
                      disabled={isSaving || loadingDetails}
                      className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50`}
                    >
                      {isSaving ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang lưu...
                          </>
                      ) : 'Lưu thay đổi'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)} // Hủy chỉnh sửa, giữ nguyên dữ liệu gốc
                      disabled={isSaving}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </>
                )}
                 {/* Nút đóng luôn hiển thị */}
                  <button
                    type="button"
                    onClick={closeModal}
                    className={`mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mt-0 ${isEditing ? '' : 'sm:ml-3'} sm:w-auto sm:text-sm`} // Thêm ml-3 nếu không ở chế độ edit
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