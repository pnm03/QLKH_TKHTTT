'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface PaymentMethod {
  payment_id: number
  payment_method_name: string
  description?: string
  image?: string | null
  created_at?: string
}

interface PaymentMethodSelectionPopupProps {
  order: any
  onClose: () => void
  onConfirm: (paymentMethod: PaymentMethod) => void
  themeColor: string
}

export default function PaymentMethodSelectionPopup({
  order,
  onClose,
  onConfirm,
  themeColor
}: PaymentMethodSelectionPopupProps) {
  const supabase = createClient()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lấy danh sách phương thức thanh toán khi component được mount
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('payment_method_name', { ascending: true })

        if (error) {
          console.error('Lỗi khi lấy phương thức thanh toán:', error.message)
          setError('Không thể tải danh sách phương thức thanh toán')
          return
        }

        setPaymentMethods(data || [])
      } catch (error: any) {
        console.error('Lỗi khi lấy phương thức thanh toán:', error)
        setError(`Lỗi khi lấy phương thức thanh toán: ${error.message || 'Không rõ nguyên nhân'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentMethods()
  }, [supabase])

  // Xử lý khi người dùng chọn phương thức thanh toán
  const handleSelectPaymentMethod = (paymentId: number) => {
    setSelectedPaymentMethod(paymentId)
  }

  // Xử lý khi người dùng xác nhận thanh toán
  const handleConfirm = () => {
    if (selectedPaymentMethod) {
      // Tìm phương thức thanh toán đã chọn từ danh sách
      const selectedMethod = paymentMethods.find(method => method.payment_id === selectedPaymentMethod)

      if (selectedMethod) {
        console.log('Đã chọn phương thức thanh toán:', selectedMethod)
        onConfirm(selectedMethod)
      } else {
        setError('Không tìm thấy thông tin phương thức thanh toán đã chọn')
      }
    } else {
      setError('Vui lòng chọn phương thức thanh toán')
    }
  }

  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 overflow-y-auto z-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Chọn phương thức thanh toán
                  </h3>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Đóng</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    Đơn hàng: <span className="font-medium">{order.order_id}</span> -
                    Tổng tiền: <span className="font-medium">{formatCurrency(order.price)}</span>
                  </p>

                  {error && (
                    <div className="mb-4 p-2 bg-red-50 text-red-500 text-sm rounded-md">
                      {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="flex justify-center py-4">
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Không có phương thức thanh toán nào
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {paymentMethods.map((method) => (
                        <div
                          key={method.payment_id}
                          onClick={() => handleSelectPaymentMethod(method.payment_id)}
                          className={`border rounded-md p-3 cursor-pointer transition-all duration-200 ${
                            selectedPaymentMethod === method.payment_id
                              ? `border-${themeColor}-500 bg-${themeColor}-50`
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center">
                            {method.image ? (
                              <img
                                src={method.image}
                                alt={method.payment_method_name}
                                className="w-10 h-10 object-contain mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 flex items-center justify-center mr-3 rounded-md">
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{method.payment_method_name}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedPaymentMethod || loading}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm ${(!selectedPaymentMethod || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Xác nhận thanh toán
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
