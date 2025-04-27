'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ShippingOrder {
  shipping_id: string
  order_id: string
  status: string
  shipping_date: string
  customer_name?: string
  address?: string
  phone?: string
  product_name?: string
  quantity?: number
}

interface ProductShippingDetailsPopupProps {
  productName: string
  onClose: () => void
  themeColor: string
}

export default function ProductShippingDetailsPopup({
  productName,
  onClose,
  themeColor
}: ProductShippingDetailsPopupProps) {
  const supabase = createClient()
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lấy danh sách đơn vận chuyển của sản phẩm khi component được mount
  useEffect(() => {
    const fetchShippingOrders = async () => {
      setLoading(true)
      setError(null)

      try {
        // Lấy danh sách đơn hàng có chứa sản phẩm này
        const { data: orderDetailsData, error: orderDetailsError } = await supabase
          .from('orderdetails')
          .select('order_id')
          .ilike('name_product', `%${productName}%`)

        if (orderDetailsError) {
          console.error('Lỗi khi lấy danh sách đơn hàng:', orderDetailsError)
          setError(`Lỗi khi lấy danh sách đơn hàng. Vui lòng thử lại sau.`)
          return
        }

        if (!orderDetailsData || orderDetailsData.length === 0) {
          setShippingOrders([])
          setLoading(false)
          return
        }

        // Lấy danh sách order_id
        const orderIds = orderDetailsData.map(detail => detail.order_id)

        // Lấy thông tin vận chuyển từ bảng shippings
        const { data: shippingsData, error: shippingsError } = await supabase
          .from('shippings')
          .select(`
            shipping_id,
            order_id,
            status,
            created_at,
            shipping_address,
            phone_customer,
            name_customer
          `)
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })

        if (shippingsError) {
          console.error('Lỗi khi lấy thông tin vận chuyển:', shippingsError)
          setError(`Lỗi khi lấy thông tin vận chuyển. Vui lòng thử lại sau.`)
          return
        }

        // Lấy thông tin số lượng sản phẩm trong mỗi đơn hàng
        const { data: productQuantityData, error: productQuantityError } = await supabase
          .from('orderdetails')
          .select('order_id, quantity')
          .in('order_id', orderIds)
          .eq('name_product', productName)

        if (productQuantityError) {
          console.error('Lỗi khi lấy số lượng sản phẩm:', productQuantityError)
          setError(`Lỗi khi lấy số lượng sản phẩm. Vui lòng thử lại sau.`)
          return
        }

        // Tạo map để lưu số lượng sản phẩm theo order_id
        const quantityMap = {}
        productQuantityData.forEach(item => {
          quantityMap[item.order_id] = item.quantity
        })

        // Kết hợp dữ liệu
        const formattedShippingOrders = shippingsData.map(shipping => ({
          shipping_id: shipping.shipping_id,
          order_id: shipping.order_id,
          status: shipping.status,
          shipping_date: shipping.created_at,
          customer_name: shipping.name_customer,
          address: shipping.shipping_address,
          phone: shipping.phone_customer,
          product_name: productName,
          quantity: quantityMap[shipping.order_id] || 1
        }))

        setShippingOrders(formattedShippingOrders)
      } catch (error: any) {
        console.error('Lỗi khi lấy danh sách đơn vận chuyển:', error)
        setError(`Lỗi khi lấy danh sách đơn vận chuyển: ${error.message || 'Không rõ nguyên nhân'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchShippingOrders()
  }, [productName, supabase])

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

  // Lấy màu trạng thái
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã giao hàng':
        return 'text-green-600 bg-green-100'
      case 'Đang giao hàng':
        return 'text-blue-600 bg-blue-100'
      case 'Đang chuẩn bị':
        return 'text-yellow-600 bg-yellow-100'
      case 'Chưa giao hàng':
        return 'text-gray-600 bg-gray-100'
      case 'Đang hoàn về':
        return 'text-orange-600 bg-orange-100'
      case 'Đã hủy':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Đóng</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Danh sách đơn vận chuyển: {productName}
                </h3>

                {error && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                  </div>
                ) : shippingOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Không có đơn vận chuyển</h3>
                    <p className="mt-1 text-sm text-gray-500">Không tìm thấy đơn vận chuyển nào cho sản phẩm này.</p>
                  </div>
                ) : (
                  <div className="mt-2 overflow-x-auto">
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
                            Số lượng
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trạng thái
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ngày vận chuyển
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Địa chỉ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {shippingOrders.map((order) => (
                          <tr key={order.shipping_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.order_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>{order.customer_name || 'Không có tên'}</div>
                              <div className="text-xs text-gray-400">{order.phone || 'Không có SĐT'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.shipping_date ? formatDate(order.shipping_date) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {order.address || 'Không có địa chỉ'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm`}
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
