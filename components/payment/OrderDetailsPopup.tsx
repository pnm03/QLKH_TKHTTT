'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface OrderDetail {
  order_id: string
  product_id: string
  name_product: string
  quantity: number
  unit_price: number
  subtotal?: number
  product_image?: string | null
}

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

interface OrderDetailsPopupProps {
  order: Order
  onClose: () => void
  onPayment: (order: Order) => void
  themeColor: string
}

export default function OrderDetailsPopup({ order, onClose, onPayment, themeColor }: OrderDetailsPopupProps) {
  const supabase = createClient()
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lấy chi tiết đơn hàng khi component được mount
  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true)
      setError(null)
      
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
      } catch (error: any) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', error)
        setError(`Lỗi khi lấy chi tiết đơn hàng: ${error.message || 'Không rõ nguyên nhân'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchOrderDetails()
  }, [order.order_id, supabase])

  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
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

  return (
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
                  Chi tiết đơn hàng #{order.order_id}
                </h3>
                <div className="mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Thông tin đơn hàng</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm mb-1"><span className="font-medium">Mã đơn hàng:</span> {order.order_id}</p>
                        <p className="text-sm mb-1"><span className="font-medium">Ngày đặt:</span> {formatDate(order.order_date)}</p>
                        <p className="text-sm mb-1"><span className="font-medium">Trạng thái:</span> <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">{order.status}</span></p>
                        <p className="text-sm mb-1"><span className="font-medium">Người tạo:</span> {order.creator_name}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Thông tin khách hàng</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm mb-1"><span className="font-medium">Khách hàng:</span> {order.customer_name}</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-gray-500 mb-2">Chi tiết sản phẩm</h4>
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : error ? (
                      <div className="text-center py-4 text-red-500">{error}</div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sản phẩm
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Đơn giá
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Số lượng
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                                  <div className="text-sm font-medium text-gray-900">{detail.name_product}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {formatCurrency(detail.unit_price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {detail.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                {formatCurrency(detail.unit_price * detail.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50">
                            <td colSpan={3} className="px-6 py-4 text-right font-medium">
                              Tổng tiền:
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 text-right">
                              {formatCurrency(order.price)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => onPayment(order)}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm`}
            >
              Thanh toán
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
