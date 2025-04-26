'use client'

import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface PaymentConfirmationPopupProps {
  order: any
  paymentMethod: any
  onClose: () => void
  onConfirm: () => void
  themeColor: string
  isProcessing?: boolean
}

export default function PaymentConfirmationPopup({
  order,
  paymentMethod,
  onClose,
  onConfirm,
  themeColor,
  isProcessing = false
}: PaymentConfirmationPopupProps) {
  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  // Kiểm tra dữ liệu phương thức thanh toán
  console.log('PaymentConfirmationPopup - Payment Method:', paymentMethod)

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
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Xác nhận thanh toán
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Bạn có chắc chắn muốn thanh toán đơn hàng này với phương thức thanh toán đã chọn?
                  </p>

                  <div className="mt-4 bg-gray-50 p-3 rounded-md">
                    <p className="text-sm mb-1"><span className="font-medium">Mã đơn hàng:</span> {order.order_id}</p>
                    <p className="text-sm mb-1"><span className="font-medium">Tổng tiền:</span> {formatCurrency(order.price)}</p>
                    <p className="text-sm mb-1">
                      <span className="font-medium">Phương thức thanh toán:</span> {
                        paymentMethod && paymentMethod.payment_method_name
                          ? paymentMethod.payment_method_name
                          : 'Không xác định'
                      }
                    </p>
                    <p className="text-sm mb-1">
                      <span className="font-medium">Mã phương thức:</span> {
                        paymentMethod && paymentMethod.payment_id
                          ? paymentMethod.payment_id
                          : 'Không xác định'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className={`mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
