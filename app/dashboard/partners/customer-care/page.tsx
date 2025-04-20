'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
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

  // Set mounted = true
  useEffect(() => {
    setMounted(true)
  }, [])



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

    // Sử dụng Supabase trực tiếp thay vì gọi API
    const supabase = createClientComponentClient()

    try {
      // Kiểm tra xem order_id có tồn tại trong bảng Orders không
      const { data: orderExists, error: orderCheckError } = await supabase
        .from('orders')
        .select('order_id')
        .eq('order_id', newReturn.order_id)
        .maybeSingle()

      if (orderCheckError) {
        console.error('Lỗi khi kiểm tra đơn hàng:', orderCheckError)
      }

      if (!orderExists) {
        setError(`Mã đơn hàng ${newReturn.order_id} không tồn tại trong hệ thống.`)
        setAddReturnLoading(false)
        return
      }

      // Chuẩn bị dữ liệu
      const payload = {
        name_return: newReturn.name_return || null, // Có thể null
        order_id: newReturn.order_id,
        return_reason: newReturn.return_reason,
        refund_amount: newReturn.refund_amount ? parseFloat(newReturn.refund_amount) : null,
        status: newReturn.status,
      }

      // Đảm bảo status là một trong các giá trị hợp lệ
      if (!['đang xử lý', 'đã chấp nhận', 'đã từ chối'].includes(payload.status)) {
        payload.status = 'đang xử lý' // Mặc định nếu không hợp lệ
      }

      // Thêm trực tiếp vào database
      const { error } = await supabase
        .from('returns')
        .insert([payload])

      if (error) {
        console.error('Lỗi khi thêm yêu cầu:', error)
        throw error
      }

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
        console.log('Error details:', err)
      } else {
        message = String(err)
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
        setError(`Không thể thêm yêu cầu: ${message}`)
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
                  <tr key={req.return_id} className="hover:bg-gray-50">
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
                    />
                    {addReturnErrors.order_id && (
                      <p className="mt-1 text-sm text-red-600">
                        {addReturnErrors.order_id}
                      </p>
                    )}
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
    </div>
  )
}