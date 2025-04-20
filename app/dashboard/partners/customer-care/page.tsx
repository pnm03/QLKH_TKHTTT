'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { PlusIcon, XMarkIcon, PencilIcon, PrinterIcon, TrashIcon } from '@heroicons/react/24/outline'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Interfaces
interface ReturnRequest {
  return_id: number
  name_return: string | null
  order_id: string
  return_date: string
  return_reason: string
  refund_amount: number | null
  status: 'đang xử lý' | 'đã chấp nhận' | 'đã từ chối'
}

interface NewReturnRequest {
  name_return: string
  order_id: string
  return_reason: string
  refund_amount: string // Input is string, convert later
  status: 'đang xử lý' | 'đã chấp nhận' | 'đã từ chối'
}

export default function CustomerCarePage() {
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo,
  })

  // State for return requests
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // State for modal and form
  const [showAddReturnModal, setShowAddReturnModal] = useState(false)
  const [newReturn, setNewReturn] = useState<NewReturnRequest>({
    name_return: '',
    order_id: '',
    return_reason: '',
    refund_amount: '',
    status: 'đang xử lý', // Default status
  })
  const [addReturnLoading, setAddReturnLoading] = useState(false)
  const [addReturnErrors, setAddReturnErrors] = useState<Record<string, string>>(
    {}
  )

  // State for order suggestions
  const [orderSuggestions, setOrderSuggestions] = useState<Array<{order_id: string, price: number, order_date: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // State for return detail modal
  const [showReturnDetailModal, setShowReturnDetailModal] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<any>(null)
  const [returnDetailLoading, setReturnDetailLoading] = useState(false)
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false)

  // State for editing return
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedReturn, setEditedReturn] = useState<any>(null)
  const [editLoading, setEditLoading] = useState(false)

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Set mounted = true
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showSuggestions && !target.closest('#order-id-container')) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])



  // Update theme and fetch data
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo,
      })
      fetchReturnRequests()
    }
  }, [mounted, themeContext.currentTheme])

  // Fetch return requests
  const fetchReturnRequests = async () => {
    setLoading(true)
    setError(null)

    const supabase = createClientComponentClient()

    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .order('return_date', { ascending: false })

      if (error) {
        throw error
      }

      setReturns(data || [])
    } catch (err: unknown) {
      console.error('Error fetching return requests:', err)

      // Type check for error message
      const message = err instanceof Error ? err.message : String(err)

      // Hiển thị thông báo lỗi thân thiện hơn
      if (message.includes('401') || message.includes('auth')) {
        setError(
          'Phiên đăng nhập đã hết hạn. Vui lòng làm mới trang hoặc đăng nhập lại.'
        )
        setReturns([])
      } else {
        setError(`Không thể tải danh sách yêu cầu: ${message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Open modal
  const openAddReturnModal = () => {
    setNewReturn({
      name_return: '',
      order_id: '',
      return_reason: '',
      refund_amount: '',
      status: 'đang xử lý',
    })
    setAddReturnErrors({})
    setShowAddReturnModal(true)
  }

  // Close modal
  const closeAddReturnModal = () => {
    setShowAddReturnModal(false)
    setShowSuggestions(false)
    setOrderSuggestions([])
  }

  // Search for orders
  const searchOrders = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 1) {
      setOrderSuggestions([])
      setShowSuggestions(false)
      return
    }

    const supabase = createClientComponentClient()

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_id, price, order_date')
        .ilike('order_id', `%${searchTerm}%`)
        .limit(10)

      if (error) {
        console.error('Lỗi khi tìm kiếm đơn hàng:', error)
        return
      }

      setOrderSuggestions(data || [])
      setShowSuggestions(data && data.length > 0)
    } catch (err) {
      console.error('Lỗi khi tìm kiếm đơn hàng:', err)
    }
  }

  // Handle order selection from suggestions
  const handleOrderSelect = (orderId: string) => {
    setNewReturn({
      ...newReturn,
      order_id: orderId,
    })
    setShowSuggestions(false)

    // Clear error if exists
    if (addReturnErrors.order_id) {
      setAddReturnErrors({
        ...addReturnErrors,
        order_id: '',
      })
    }
  }

  // Handle form input change
  const handleNewReturnChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setNewReturn({
      ...newReturn,
      [name]: value,
    })

    // If changing order_id, search for suggestions
    if (name === 'order_id') {
      searchOrders(value)
    }

    // Clear error on input
    if (addReturnErrors[name]) {
      setAddReturnErrors({
        ...addReturnErrors,
        [name]: '',
      })
    }
  }

  // Validate form
  const validateNewReturnForm = () => {
    const errors: Record<string, string> = {}
    if (!newReturn.order_id.trim())
      errors.order_id = 'Mã đơn hàng không được để trống'
    if (!newReturn.return_reason.trim())
      errors.return_reason = 'Lý do đổi/trả không được để trống'
    if (!newReturn.status) errors.status = 'Trạng thái không được để trống'
    if (
      newReturn.refund_amount &&
      isNaN(parseFloat(newReturn.refund_amount))
    ) {
      errors.refund_amount = 'Số tiền hoàn lại phải là một số'
    } else if (
      newReturn.refund_amount &&
      parseFloat(newReturn.refund_amount) < 0
    ) {
      errors.refund_amount = 'Số tiền hoàn lại không được âm'
    }

    setAddReturnErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleAddReturnSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateNewReturnForm()) {
      return
    }

    setAddReturnLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Sử dụng Supabase trực tiếp thay vì gọi API
      const supabase = createClientComponentClient()
      console.log('Supabase client created')

      // Kiểm tra xem order_id có tồn tại trong bảng Orders không
      console.log('Checking if order exists:', newReturn.order_id)
      const { data: orderExists, error: orderCheckError } = await supabase
        .from('orders')
        .select('order_id')
        .eq('order_id', newReturn.order_id)
        .maybeSingle()

      if (orderCheckError) {
        console.error('Lỗi khi kiểm tra đơn hàng:', orderCheckError)
        throw new Error(`Lỗi kiểm tra đơn hàng: ${orderCheckError.message}`)
      }

      if (!orderExists) {
        const errorMsg = `Mã đơn hàng ${newReturn.order_id} không tồn tại trong hệ thống.`
        console.error(errorMsg)
        setError(errorMsg)
        setAddReturnLoading(false)
        return
      }

      // Kiểm tra xem đơn hàng đã có yêu cầu đổi/trả chưa
      console.log('Checking if return request already exists for order:', newReturn.order_id)
      const { data: existingReturn, error: checkExistingError } = await supabase
        .from('returns')
        .select('return_id')
        .eq('order_id', newReturn.order_id)
        .maybeSingle()

      if (checkExistingError) {
        console.error('Lỗi khi kiểm tra yêu cầu đổi/trả hiện có:', checkExistingError)
      }

      if (existingReturn) {
        const errorMsg = `Đơn hàng ${newReturn.order_id} đã có yêu cầu đổi/trả. Không thể tạo thêm.`
        console.error(errorMsg)
        setError(errorMsg)
        setAddReturnLoading(false)
        return
      }

      console.log('Order exists, preparing data')
      // Chuẩn bị dữ liệu
      let refundAmount = null;
      if (newReturn.refund_amount && newReturn.refund_amount.trim() !== '') {
        const parsedAmount = parseFloat(newReturn.refund_amount);
        if (isNaN(parsedAmount)) {
          const errorMsg = 'Số tiền hoàn lại không hợp lệ. Vui lòng nhập một số.';
          console.error(errorMsg);
          setError(errorMsg);
          setAddReturnLoading(false);
          return;
        }
        if (parsedAmount < 0) {
          const errorMsg = 'Số tiền hoàn lại không được âm.';
          console.error(errorMsg);
          setError(errorMsg);
          setAddReturnLoading(false);
          return;
        }
        refundAmount = parsedAmount;
      }

      const payload = {
        name_return: newReturn.name_return || null, // Có thể null
        order_id: newReturn.order_id,
        return_reason: newReturn.return_reason,
        refund_amount: refundAmount,
        status: newReturn.status,
      }

      // Đảm bảo status là một trong các giá trị hợp lệ
      if (!['đang xử lý', 'đã chấp nhận', 'đã từ chối'].includes(payload.status)) {
        payload.status = 'đang xử lý' // Mặc định nếu không hợp lệ
      }

      console.log('Inserting data into returns table:', payload)
      // Thêm trực tiếp vào database - sử dụng cách khác
      const insertResult = await supabase
        .from('returns')
        .insert(payload)

      const { error } = insertResult
      console.log('Insert result:', insertResult)

      if (error) {
        console.error('Lỗi khi thêm yêu cầu:', error)
        throw error
      }

      console.log('Return request added successfully:', insertResult)
      // Xử lý thành công
      setSuccessMessage('Thêm yêu cầu đổi/trả thành công!')
      closeAddReturnModal()
      fetchReturnRequests() // Làm mới danh sách

      // Tự động ẩn thông báo thành công sau 3 giây
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: unknown) {
      console.error('Error adding return request:', err)

      // Kiểm tra lỗi chi tiết
      let message = ''
      if (err instanceof Error) {
        message = err.message
        console.log('Error details:', JSON.stringify(err, null, 2))
      } else {
        message = String(err)
        console.log('Unknown error type:', typeof err, JSON.stringify(err, null, 2))
      }

      // Hiển thị thông báo lỗi thân thiện hơn
      if (message.includes('auth') || message.includes('401')) {
        setError(
          'Phiên đăng nhập đã hết hạn. Vui lòng làm mới trang hoặc đăng nhập lại.'
        )
      } else if (message.includes('null value') || message.includes('violates not-null') || message.includes('Missing required fields')) {
        setError('Vui lòng điền đầy đủ các trường bắt buộc.')
      } else if (message.includes('duplicate key') || message.includes('unique constraint')) {
        setError('Yêu cầu đổi/trả cho đơn hàng này đã tồn tại.')
      } else if (message.includes('check constraint') || message.includes('violates check constraint')) {
        if (message.includes('refund_amount')) {
          setError('Số tiền hoàn lại phải lớn hơn hoặc bằng 0.')
        } else if (message.includes('status')) {
          setError('Trạng thái không hợp lệ. Chỉ chấp nhận các giá trị: đang xử lý, đã chấp nhận, đã từ chối.')
        } else {
          setError('Dữ liệu không hợp lệ, vi phạm ràng buộc của hệ thống.')
        }
      } else if (message.includes('foreign key') || message.includes('violates foreign key constraint')) {
        setError('Mã đơn hàng không tồn tại trong hệ thống.')
      } else {
        setError(`Không thể thêm yêu cầu. Vui lòng kiểm tra lại dữ liệu và thử lại.`)
      }
    } finally {
      setAddReturnLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return ''
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN')
  }

  // Open return detail modal
  const openReturnDetailModal = async (returnId: number) => {
    setReturnDetailLoading(true)
    setSelectedReturn(null)
    setShowReturnDetailModal(true)

    const supabase = createClientComponentClient()

    try {
      // Fetch return details with related order information
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select('*')
        .eq('return_id', returnId)
        .single()

      if (returnError) {
        console.error('Lỗi khi lấy thông tin đơn đổi/trả:', returnError)
        setError('Không thể lấy thông tin đơn đổi/trả. Vui lòng thử lại sau.')
        setShowReturnDetailModal(false)
        return
      }

      if (!returnData) {
        setError('Không tìm thấy thông tin đơn đổi/trả.')
        setShowReturnDetailModal(false)
        return
      }

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, customers(*)')
        .eq('order_id', returnData.order_id)
        .single()

      if (orderError) {
        console.error('Lỗi khi lấy thông tin đơn hàng:', orderError)
      }

      // Fetch order details
      const { data: orderDetails, error: orderDetailsError } = await supabase
        .from('orderdetails')
        .select('*')
        .eq('order_id', returnData.order_id)

      if (orderDetailsError) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', orderDetailsError)
      }

      // Fetch shipping information if available
      const { data: shippingData, error: shippingError } = await supabase
        .from('shippings')
        .select('*')
        .eq('order_id', returnData.order_id)
        .maybeSingle()

      if (shippingError) {
        console.error('Lỗi khi lấy thông tin vận chuyển:', shippingError)
      }

      // Combine all data
      const detailData = {
        ...returnData,
        order: orderData || null,
        orderDetails: orderDetails || [],
        shipping: shippingData || null
      }

      setSelectedReturn(detailData)
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết đơn đổi/trả:', err)
      setError('Không thể lấy thông tin đơn đổi/trả. Vui lòng thử lại sau.')
    } finally {
      setReturnDetailLoading(false)
    }
  }

  // Close return detail modal
  const closeReturnDetailModal = () => {
    setShowReturnDetailModal(false)
    setSelectedReturn(null)
    setIsEditMode(false)
    setEditedReturn(null)
    setShowDeleteConfirm(false)
  }

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // Exit edit mode without saving
      setIsEditMode(false)
      setEditedReturn(null)
    } else {
      // Enter edit mode
      setIsEditMode(true)
      setEditedReturn({
        ...selectedReturn,
        name_return: selectedReturn.name_return || '',
        return_reason: selectedReturn.return_reason,
        refund_amount: selectedReturn.refund_amount,
        status: selectedReturn.status
      })
    }
  }

  // Handle edit form input change
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditedReturn({
      ...editedReturn,
      [name]: value
    })
  }

  // Save edited return
  const saveEditedReturn = async () => {
    if (!editedReturn) return

    // Validate
    if (!editedReturn.return_reason || editedReturn.return_reason.trim() === '') {
      setError('Lý do đổi/trả không được để trống')
      return
    }

    if (editedReturn.refund_amount && isNaN(parseFloat(editedReturn.refund_amount.toString()))) {
      setError('Số tiền hoàn lại phải là một số')
      return
    }

    if (editedReturn.refund_amount && parseFloat(editedReturn.refund_amount.toString()) < 0) {
      setError('Số tiền hoàn lại không được âm')
      return
    }

    if (!['đang xử lý', 'đã chấp nhận', 'đã từ chối'].includes(editedReturn.status)) {
      setError('Trạng thái không hợp lệ')
      return
    }

    setEditLoading(true)
    setError(null)

    const supabase = createClientComponentClient()

    try {
      // Prepare data
      const updateData = {
        name_return: editedReturn.name_return || null,
        return_reason: editedReturn.return_reason.trim(),
        refund_amount: editedReturn.refund_amount ? parseFloat(editedReturn.refund_amount.toString()) : null,
        status: editedReturn.status
      }

      const { error } = await supabase
        .from('returns')
        .update(updateData)
        .eq('return_id', editedReturn.return_id)

      if (error) {
        console.error('Lỗi khi cập nhật yêu cầu đổi/trả:', error)
        throw error
      }

      // Update local state
      setSelectedReturn({
        ...selectedReturn,
        ...updateData
      })

      // Exit edit mode
      setIsEditMode(false)
      setEditedReturn(null)

      // Refresh the list
      fetchReturnRequests()

      setSuccessMessage('Cập nhật yêu cầu đổi/trả thành công!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Lỗi khi cập nhật yêu cầu đổi/trả:', err)
      setError('Không thể cập nhật yêu cầu đổi/trả. Vui lòng thử lại sau.')
    } finally {
      setEditLoading(false)
    }
  }

  // Print return details
  const printReturnDetails = () => {
    if (!selectedReturn) return

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt trình duyệt.')
      return
    }

    // Format date for document
    const formattedDate = new Date().toLocaleDateString('vi-VN')

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Biên bản yêu cầu đổi/trả #${selectedReturn.return_id}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 14px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          .info-row { display: flex; margin-bottom: 5px; }
          .info-label { font-weight: bold; width: 150px; }
          .info-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 30px; text-align: center; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { width: 45%; text-align: center; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BIÊN BẢN YÊU CẦU ĐỔI/TRẢ HÀNG</div>
          <div class="subtitle">Mã yêu cầu: #${selectedReturn.return_id} - Ngày lập: ${formattedDate}</div>
        </div>

        <div class="section">
          <div class="section-title">THÔNG TIN YÊU CẦU ĐỔI/TRẢ</div>
          <div class="info-row">
            <div class="info-label">Mã yêu cầu:</div>
            <div class="info-value">${selectedReturn.return_id}</div>
          </div>
          ${selectedReturn.name_return ? `
          <div class="info-row">
            <div class="info-label">Tên yêu cầu:</div>
            <div class="info-value">${selectedReturn.name_return}</div>
          </div>` : ''}
          <div class="info-row">
            <div class="info-label">Ngày yêu cầu:</div>
            <div class="info-value">${new Date(selectedReturn.return_date).toLocaleString('vi-VN')}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Lý do đổi/trả:</div>
            <div class="info-value">${selectedReturn.return_reason}</div>
          </div>
          ${selectedReturn.refund_amount ? `
          <div class="info-row">
            <div class="info-label">Số tiền hoàn lại:</div>
            <div class="info-value">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedReturn.refund_amount)}</div>
          </div>` : ''}
          <div class="info-row">
            <div class="info-label">Trạng thái:</div>
            <div class="info-value">${selectedReturn.status}</div>
          </div>
        </div>

        ${selectedReturn.order ? `
        <div class="section">
          <div class="section-title">THÔNG TIN ĐƠN HÀNG</div>
          <div class="info-row">
            <div class="info-label">Mã đơn hàng:</div>
            <div class="info-value">${selectedReturn.order.order_id}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Ngày đặt hàng:</div>
            <div class="info-value">${new Date(selectedReturn.order.order_date).toLocaleString('vi-VN')}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Tổng giá trị:</div>
            <div class="info-value">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedReturn.order.price)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Trạng thái thanh toán:</div>
            <div class="info-value">${selectedReturn.order.status}</div>
          </div>
        </div>` : ''}

        ${selectedReturn.order && selectedReturn.order.customers ? `
        <div class="section">
          <div class="section-title">THÔNG TIN KHÁCH HÀNG</div>
          <div class="info-row">
            <div class="info-label">Tên khách hàng:</div>
            <div class="info-value">${selectedReturn.order.customers.full_name || 'Khách vãng lai'}</div>
          </div>
          ${selectedReturn.order.customers.phone ? `
          <div class="info-row">
            <div class="info-label">Số điện thoại:</div>
            <div class="info-value">${selectedReturn.order.customers.phone}</div>
          </div>` : ''}
          ${selectedReturn.order.customers.email ? `
          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${selectedReturn.order.customers.email}</div>
          </div>` : ''}
        </div>` : ''}

        ${selectedReturn.orderDetails && selectedReturn.orderDetails.length > 0 ? `
        <div class="section">
          <div class="section-title">CHI TIẾT SẢN PHẨM</div>
          <table>
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${selectedReturn.orderDetails.map(detail => `
              <tr>
                <td>${detail.name_product}</td>
                <td>${detail.quantity}</td>
                <td>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detail.unit_price)}</td>
                <td>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detail.subtotal)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}

        <div class="signatures">
          <div class="signature-box">
            <p><strong>Đại diện cửa hàng</strong></p>
            <p>(Ký, ghi rõ họ tên)</p>
          </div>
          <div class="signature-box">
            <p><strong>Khách hàng</strong></p>
            <p>(Ký, ghi rõ họ tên)</p>
          </div>
        </div>

        <div class="footer">
          <p>Biên bản này được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    // Write to the new window and print
    printWindow.document.open()
    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  // Show delete confirmation
  const showDeleteConfirmation = () => {
    setShowDeleteConfirm(true)
  }

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // Delete return request
  const deleteReturnRequest = async () => {
    if (!selectedReturn) return

    setDeleteLoading(true)
    setError(null)

    const supabase = createClientComponentClient()

    try {
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('return_id', selectedReturn.return_id)

      if (error) {
        console.error('Lỗi khi xóa yêu cầu đổi/trả:', error)
        throw error
      }

      // Close modal and refresh list
      closeReturnDetailModal()
      fetchReturnRequests()

      setSuccessMessage('Xóa yêu cầu đổi/trả thành công!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Lỗi khi xóa yêu cầu đổi/trả:', err)
      setError('Không thể xóa yêu cầu đổi/trả. Vui lòng thử lại sau.')
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  // Update return status
  const updateReturnStatus = async (returnId: number, newStatus: string) => {
    if (!['đang xử lý', 'đã chấp nhận', 'đã từ chối'].includes(newStatus)) {
      setError('Trạng thái không hợp lệ.')
      return
    }

    setUpdateStatusLoading(true)
    setError(null)

    const supabase = createClientComponentClient()

    try {
      const { error } = await supabase
        .from('returns')
        .update({ status: newStatus })
        .eq('return_id', returnId)

      if (error) {
        console.error('Lỗi khi cập nhật trạng thái:', error)
        throw error
      }

      // Update local state
      if (selectedReturn) {
        setSelectedReturn({
          ...selectedReturn,
          status: newStatus
        })
      }

      // Refresh the list
      fetchReturnRequests()

      setSuccessMessage('Cập nhật trạng thái thành công!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái:', err)
      setError('Không thể cập nhật trạng thái. Vui lòng thử lại sau.')
    } finally {
      setUpdateStatusLoading(false)
    }
  }

  if (!mounted) {
    return null // Or a loading spinner
  }

  const { theme } = themeState
  const themeColor =
    theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-md p-4 shadow-lg max-w-md transition-all duration-300 transform translate-y-0 opacity-100 bg-green-50 text-green-800 border border-green-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100"
                >
                  <span className="sr-only">Đóng</span>
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-md p-4 shadow-lg max-w-md transition-all duration-300 transform translate-y-0 opacity-100 bg-red-50 text-red-800 border border-red-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100"
                >
                  <span className="sr-only">Đóng</span>
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Chăm sóc khách hàng - Yêu cầu đổi/trả
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý các yêu cầu đổi/trả hàng từ khách hàng nữ
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchReturnRequests}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
            disabled={loading}
          >
            {loading ? (
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            Làm mới
          </button>
          <button
            onClick={openAddReturnModal}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Thêm yêu cầu
          </button>
        </div>
      </div>

      {/* Return Requests Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tên Yêu Cầu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Mã Đơn Hàng
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Ngày Yêu Cầu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Lý Do
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Hoàn Tiền
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Trạng Thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        className="animate-spin h-8 w-8 text-gray-400 mb-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 text-gray-300 mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1} // Changed strokeWidth to 1 for better rendering
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-base text-gray-500 mb-1">
                        Không có yêu cầu đổi/trả nào
                      </p>
                      <p className="text-sm text-gray-400">
                        Nhấn nút &quot;Thêm yêu cầu&quot; để tạo yêu cầu mới
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                returns.map((req) => (
                  <tr key={req.return_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openReturnDetailModal(req.return_id)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {req.return_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.name_return || (
                        <span className="text-gray-400 italic">Chưa đặt tên</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {req.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(req.return_date)}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate"
                      title={req.return_reason}
                    >
                      {req.return_reason.length > 50
                        ? `${req.return_reason.substring(0, 50)}...`
                        : req.return_reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {req.refund_amount ? (
                        formatCurrency(req.refund_amount)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          req.status === 'đã chấp nhận'
                            ? 'bg-green-100 text-green-800'
                            : req.status === 'đã từ chối'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination or summary */}
        {!loading && returns.length > 0 && (
          <div className="bg-gray-50 px-3 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Hiển thị {returns.length} yêu cầu đổi/trả
            </div>
          </div>
        )}
      </div>

      {/* Add Return Request Modal */}
      {showAddReturnModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black opacity-10"
            onClick={closeAddReturnModal}
          ></div>

          {/* Modal panel */}
          <div
            className={`bg-white bg-opacity-80 backdrop-filter backdrop-blur-md rounded-lg shadow-xl w-full max-w-lg border-2 ${
              theme?.borderColor || 'border-blue-500'
            } relative max-h-[90vh] overflow-y-auto`}
          >
            <form onSubmit={handleAddReturnSubmit}>
              <div className="px-6 pt-6 pb-6 sm:p-8">
                <div className="flex justify-between items-center mb-4">
                  <h3
                    className="text-xl font-semibold text-gray-900"
                    id="modal-title"
                  >
                    Thêm Yêu Cầu Đổi/Trả Mới
                  </h3>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={closeAddReturnModal}
                  >
                    <XMarkIcon className="h-6 w-6" />
                    <span className="sr-only">Đóng</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Form Fields */}
                  <div>
                    <label
                      htmlFor="name_return"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tên yêu cầu (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      name="name_return"
                      id="name_return"
                      value={newReturn.name_return}
                      onChange={handleNewReturnChange}
                      placeholder="Nhập tên yêu cầu đổi/trả"
                      className={`mt-1 block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-base py-3 px-3 border ${
                        addReturnErrors.name_return
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="order_id"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Mã đơn hàng gốc <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" id="order-id-container">
                      <input
                        type="text"
                        name="order_id"
                        id="order_id"
                        value={newReturn.order_id}
                        onChange={handleNewReturnChange}
                        required
                        placeholder="Nhập mã đơn hàng cần đổi/trả"
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-base py-3 px-3 border ${
                          addReturnErrors.order_id
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        autoComplete="off"
                      />

                      {/* Suggestions dropdown */}
                      {showSuggestions && orderSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                          <ul className="py-1">
                            {orderSuggestions.map((order) => (
                              <li
                                key={order.order_id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                onClick={() => handleOrderSelect(order.order_id)}
                              >
                                <div>
                                  <span className="font-medium">{order.order_id}</span>
                                </div>
                                <div className="text-sm text-gray-500 flex flex-col items-end">
                                  <span>{formatCurrency(order.price)}</span>
                                  <span className="text-xs">{new Date(order.order_date).toLocaleDateString('vi-VN')}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {addReturnErrors.order_id && (
                      <p className="mt-1 text-sm text-red-600">
                        {addReturnErrors.order_id}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-gray-500">
                      Gõ ít nhất 1 ký tự để tìm kiếm mã đơn hàng
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="return_reason"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Lý do đổi/trả <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="return_reason"
                      id="return_reason"
                      rows={4}
                      value={newReturn.return_reason}
                      onChange={handleNewReturnChange}
                      required
                      placeholder="Mô tả chi tiết lý do đổi/trả hàng"
                      className={`mt-1 block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-base py-3 px-3 border ${
                        addReturnErrors.return_reason
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {addReturnErrors.return_reason && (
                      <p className="mt-1 text-sm text-red-600">
                        {addReturnErrors.return_reason}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="refund_amount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Số tiền hoàn lại (Tùy chọn)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₫</span>
                      </div>
                      <input
                        type="number"
                        name="refund_amount"
                        id="refund_amount"
                        value={newReturn.refund_amount}
                        onChange={handleNewReturnChange}
                        step="1000"
                        min="0"
                        placeholder="0"
                        className={`pl-7 block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-base py-3 px-3 border ${
                          addReturnErrors.refund_amount
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {addReturnErrors.refund_amount && (
                      <p className="mt-1 text-sm text-red-600">
                        {addReturnErrors.refund_amount}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Nhập số tiền cần hoàn lại cho khách hàng (nếu có)
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Trạng thái <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      id="status"
                      value={newReturn.status}
                      onChange={handleNewReturnChange}
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-base py-3 px-3 border ${
                        addReturnErrors.status
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="đang xử lý">Đang xử lý</option>
                      <option value="đã chấp nhận">Đã chấp nhận</option>
                      <option value="đã từ chối">Đã từ chối</option>
                    </select>
                    {addReturnErrors.status && (
                      <p className="mt-1 text-sm text-red-600">
                        {addReturnErrors.status}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 bg-opacity-60 backdrop-filter backdrop-blur-sm px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  disabled={addReturnLoading}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-base ${
                    addReturnLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {addReturnLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    'Thêm yêu cầu'
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-base"
                  onClick={closeAddReturnModal}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Detail Modal */}
      {showReturnDetailModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          aria-labelledby="detail-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black opacity-10"
            onClick={closeReturnDetailModal}
          ></div>

          {/* Modal panel */}
          <div
            className={`bg-white bg-opacity-80 backdrop-filter backdrop-blur-md rounded-lg shadow-xl w-full max-w-6xl border-2 ${theme?.borderColor || 'border-blue-500'} relative max-h-[90vh] overflow-y-auto`} // Tăng max-w thành 6xl
          >
            <div className="px-6 pt-6 pb-4 sm:p-8">
              <div className="flex justify-between items-center mb-4">
                <h3
                  className="text-xl font-semibold text-gray-900"
                  id="detail-modal-title"
                >
                  Chi Tiết Yêu Cầu Đổi/Trả
                </h3>
                <div className="flex space-x-2">
                  {!isEditMode && !showDeleteConfirm && (
                    <>
                      <button
                        type="button"
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                        onClick={toggleEditMode}
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        onClick={printReturnDetails}
                      >
                        <PrinterIcon className="h-4 w-4 mr-1" />
                        In biên bản
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={showDeleteConfirmation}
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Xóa
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={closeReturnDetailModal}
                  >
                    <XMarkIcon className="h-6 w-6" />
                    <span className="sr-only">Đóng</span>
                  </button>
                </div>
              </div>

              {returnDetailLoading ? (
                <div className="flex justify-center items-center py-12">
                  <svg
                    className="animate-spin h-10 w-10 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              ) : selectedReturn ? (
                <div className="space-y-6"> {/* Container chính cho các phần thông tin */}

                  {/* --- Grid Container --- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* --- Cột 1: Thông tin yêu cầu đổi/trả --- */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-gray-900">Thông tin yêu cầu đổi/trả</h4>
                        {isEditMode && (
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                              onClick={saveEditedReturn}
                              disabled={editLoading}
                            >
                              {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              onClick={toggleEditMode}
                            >
                              Hủy
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Delete Confirmation - Vẫn nằm trong cột 1 */}
                      {showDeleteConfirm && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                          <h5 className="text-red-800 font-medium mb-2">Xác nhận xóa yêu cầu đổi/trả</h5>
                          <p className="text-red-700 mb-3">Bạn có chắc chắn muốn xóa yêu cầu đổi/trả này? Hành động này không thể hoàn tác.</p>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              onClick={deleteReturnRequest}
                              disabled={deleteLoading}
                            >
                              {deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              onClick={cancelDelete}
                              disabled={deleteLoading}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}

                      {/* --- Nội dung cột 1 --- */}
                      {!isEditMode ? (
                        // VIEW MODE
                        <div className="space-y-4"> {/* Tăng khoảng cách giữa các dòng một chút */}

                          {/* Hàng 1: Mã yêu cầu & Trạng thái */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2"> {/* Grid cho 2 cột, có khoảng cách */}
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Mã yêu cầu</div>
                              <div className="font-medium">{selectedReturn.return_id}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Trạng thái</div>
                              <div className="flex items-center flex-wrap gap-2"> {/* Flex wrap để select xuống dòng nếu cần */}
                                <span
                                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    selectedReturn.status === 'đã chấp nhận'
                                      ? 'bg-green-100 text-green-800'
                                      : selectedReturn.status === 'đã từ chối'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {selectedReturn.status}
                                </span>
                                <select
                                  value={selectedReturn.status}
                                  onChange={(e) => updateReturnStatus(selectedReturn.return_id, e.target.value)}
                                  disabled={updateStatusLoading}
                                  className={`rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-xs py-1 px-2 border border-gray-300`} // Bỏ ml-2, dùng gap
                                >
                                  <option value="đang xử lý">Đang xử lý</option>
                                  <option value="đã chấp nhận">Đã chấp nhận</option>
                                  <option value="đã từ chối">Đã từ chối</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Hàng 2: Tên yêu cầu & Số tiền hoàn lại */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2"> {/* Grid cho 2 cột */}
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Tên yêu cầu</div>
                              <div>{selectedReturn.name_return || <span className="text-gray-400 italic">Chưa đặt tên</span>}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Số tiền hoàn lại</div>
                              <div className="font-medium">
                                {selectedReturn.refund_amount != null ? formatCurrency(selectedReturn.refund_amount) : <span className="text-gray-400">-</span>}
                              </div>
                            </div>
                          </div>

                          {/* Hàng 3: Lý do đổi/trả (Full width) */}
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">Lý do đổi/trả</div>
                            <div className="bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{selectedReturn.return_reason}</div>
                          </div>

                          {/* Hàng 4: Ngày yêu cầu (Nhỏ lại) */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Ngày yêu cầu</div> {/* Đổi thành text-xs */}
                            <div className="text-xs">{formatDate(selectedReturn.return_date)}</div> {/* Đổi thành text-xs */}
                          </div>

                        </div>
                      ) : (
                        // --- Edit Mode cho Cột 1 ---
                        <div className="space-y-4"> {/* Tăng khoảng cách giữa các dòng một chút */}

                          {/* Hàng 1: Mã yêu cầu (Readonly) & Trạng thái (Select) */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-start"> {/* items-start để label thẳng hàng */}
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Mã yêu cầu</div>
                              <div className="font-medium pt-1.5"> {/* Căn chỉnh với input/select */}
                                {selectedReturn.return_id}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Trạng thái</div>
                              <select
                                name="status"
                                value={editedReturn.status}
                                onChange={handleEditChange}
                                className={`block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-sm py-1 px-2 border border-gray-300`}
                              >
                                <option value="đang xử lý">Đang xử lý</option>
                                <option value="đã chấp nhận">Đã chấp nhận</option>
                                <option value="đã từ chối">Đã từ chối</option>
                              </select>
                            </div>
                          </div>

                          {/* Hàng 2: Tên yêu cầu (Input) & Số tiền hoàn lại (Input) */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-start"> {/* items-start */}
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Tên yêu cầu</div>
                              <input
                                type="text"
                                name="name_return"
                                value={editedReturn.name_return || ''}
                                onChange={handleEditChange}
                                className={`block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-sm py-1 px-2 border border-gray-300`}
                                placeholder="Nhập tên yêu cầu (không bắt buộc)"
                              />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Số tiền hoàn lại</div>
                              <input
                                type="number"
                                name="refund_amount"
                                value={editedReturn.refund_amount === null ? '' : editedReturn.refund_amount} // Xử lý giá trị null
                                onChange={handleEditChange}
                                min="0"
                                step="1000"
                                className={`block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-sm py-1 px-2 border border-gray-300`}
                                placeholder="Nhập số tiền (không bắt buộc)"
                              />
                            </div>
                          </div>

                          {/* Hàng 3: Lý do đổi/trả (Textarea - Full width) */}
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">Lý do đổi/trả</div>
                            <textarea
                              name="return_reason"
                              value={editedReturn.return_reason}
                              onChange={handleEditChange}
                              required
                              rows={3}
                              className={`block w-full rounded-md shadow-sm focus:border-${themeColor}-500 focus:ring-${themeColor}-500 text-sm py-1 px-2 border border-gray-300`}
                              placeholder="Nhập lý do đổi/trả"
                            />
                          </div>

                          {/* Hàng 4: Ngày yêu cầu (Readonly - Nhỏ lại) */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Ngày yêu cầu</div> {/* Đổi thành text-xs */}
                            <div className="text-xs">{formatDate(selectedReturn.return_date)}</div> {/* Đổi thành text-xs */}
                          </div>

                        </div>
                      )}
                    </div>
                    {/* --- Hết Cột 1 --- */}

                    {/* --- Cột 2: Thông tin đơn hàng --- */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                      {selectedReturn.order ? (
                        <>
                          <h4 className="text-lg font-medium text-gray-900 mb-2">Thông tin đơn hàng</h4> {/* Giảm mb một chút */}
                          <div className="space-y-4"> {/* Container cho các hàng thông tin */}

                            {/* Hàng 1: Mã đơn hàng & Ngày đặt hàng */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Mã đơn hàng</div>
                                <div className="font-medium">{selectedReturn.order.order_id}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Ngày đặt hàng</div>
                                <div>{formatDate(selectedReturn.order.order_date)}</div>
                              </div>
                            </div>

                            {/* Hàng 2: Tổng giá trị & Trạng thái thanh toán */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-start"> {/* items-start để căn lề label */}
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Tổng giá trị</div>
                                <div className="font-medium">{formatCurrency(selectedReturn.order.price)}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Trạng thái thanh toán</div>
                                <div>
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedReturn.order.status === 'Đã thanh toán' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {selectedReturn.order.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Hàng 3: Khách hàng (Nếu có) */}
                            {selectedReturn.order.customers && (
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Khách hàng</div>
                                <div className="font-medium">{selectedReturn.order.customers.full_name || 'Khách vãng lai'}</div>
                                <div className="text-xs text-gray-500 mt-0.5"> {/* Giảm khoảng cách trên một chút */}
                                  {selectedReturn.order.customers.phone && <span className="block">ĐT: {selectedReturn.order.customers.phone}</span>} {/* Dùng block thay <br> */}
                                  {selectedReturn.order.customers.email && <span className="block">Email: {selectedReturn.order.customers.email}</span>} {/* Dùng block thay <br> */}
                                </div>
                              </div>
                            )}

                            {/* Bạn có thể thêm các thông tin khác của đơn hàng ở đây, theo cấu trúc grid hoặc dòng riêng */}

                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">Không có thông tin đơn hàng liên kết.</p>
                        </div>
                      )}
                    </div>
                    {/* --- Hết Cột 2 --- */}

                  </div>
                  {/* --- Hết Grid Container --- */}

                  {/* --- Chi tiết sản phẩm (Giữ nguyên) --- */}
                  {selectedReturn.orderDetails && selectedReturn.orderDetails.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Chi tiết sản phẩm</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SL</th>
                              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá</th>
                              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedReturn.orderDetails.map((detail) => (
                              <tr key={detail.orderdetail_id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{detail.name_product}</td>
                                <td className="px-3 py-2 text-sm text-gray-500 text-center">{detail.quantity}</td>
                                <td className="px-3 py-2 text-sm text-gray-500 text-right">{formatCurrency(detail.unit_price)}</td>
                                <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(detail.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --- Thông tin vận chuyển (Giữ nguyên) --- */}
                  {selectedReturn.shipping && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Thông tin vận chuyển</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> {/* Responsive grid cho shipping */}
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">Mã vận chuyển</div>
                            <div className="font-medium">{selectedReturn.shipping.shipping_id}</div>
                          </div>
                          {selectedReturn.shipping.tracking_num && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Mã vận đơn</div>
                              <div>{selectedReturn.shipping.tracking_num}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">Trạng thái vận chuyển</div>
                            <div>
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                selectedReturn.shipping.status === 'Đã giao hàng' ? 'bg-green-100 text-green-800' :
                                selectedReturn.shipping.status === 'Đã hủy' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'}`}>
                                {selectedReturn.shipping.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Địa chỉ giao hàng</div>
                          <div className="bg-white p-2 rounded border border-gray-100">{selectedReturn.shipping.shipping_address}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Responsive grid cho shipping cost/date */}
                          {selectedReturn.shipping.shipping_cost > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Phí vận chuyển</div>
                              <div>{formatCurrency(selectedReturn.shipping.shipping_cost)}</div>
                            </div>
                          )}
                          {selectedReturn.shipping.actual_delivery_date && (
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Ngày giao hàng thực tế</div>
                              <div>{formatDate(selectedReturn.shipping.actual_delivery_date)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div> // End space-y-6
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Không tìm thấy thông tin yêu cầu đổi/trả</p>
                </div>
              )}
            </div> {/* End px-6 pt-6 pb-4 sm:p-8 */}

            <div className="bg-gray-50 bg-opacity-60 backdrop-filter backdrop-blur-sm px-6 py-4 sm:px-8 flex justify-end sticky bottom-0">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-base"
                onClick={closeReturnDetailModal}
              >
                Đóng
              </button>
            </div>
          </div>
          /
        </div>
      )}
    </div>
  )
}