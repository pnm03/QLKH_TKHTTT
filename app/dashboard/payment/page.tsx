'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CreditCardIcon,
  BanknotesIcon,
  QrCodeIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

// Định nghĩa các interface
interface PaymentMethod {
  payment_id: number
  payment_method_name: string
  user_id: string
  description: string
  image: string | null
  created_at: string
  updated_at: string
}

export default function PaymentPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // State cho phương thức thanh toán
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null)
  
  // State cho form thêm/sửa
  const [formData, setFormData] = useState({
    payment_method_name: '',
    description: '',
    image: ''
  })
  
  // State cho thông báo
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })
      
      // Lấy danh sách phương thức thanh toán
      fetchPaymentMethods()
    }
  }, [mounted, themeContext.currentTheme])

  // Lấy danh sách phương thức thanh toán
  const fetchPaymentMethods = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_method_name', { ascending: true })
      
      if (error) throw error
      
      setPaymentMethods(data || [])
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phương thức thanh toán:', error)
      setError('Có lỗi xảy ra khi lấy danh sách phương thức thanh toán')
    } finally {
      setLoading(false)
    }
  }

  // Mở form thêm phương thức thanh toán
  const openAddForm = () => {
    setFormData({
      payment_method_name: '',
      description: '',
      image: ''
    })
    setShowAddForm(true)
  }

  // Mở form sửa phương thức thanh toán
  const openEditForm = (payment: PaymentMethod) => {
    setSelectedPayment(payment)
    setFormData({
      payment_method_name: payment.payment_method_name,
      description: payment.description,
      image: payment.image || ''
    })
    setShowEditForm(true)
  }

  // Đóng form
  const closeForm = () => {
    setShowAddForm(false)
    setShowEditForm(false)
    setSelectedPayment(null)
    setFormData({
      payment_method_name: '',
      description: '',
      image: ''
    })
  }

  // Xử lý thay đổi input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  // Thêm phương thức thanh toán
  const addPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Kiểm tra dữ liệu
      if (!formData.payment_method_name.trim()) {
        setError('Vui lòng nhập tên phương thức thanh toán')
        return
      }
      
      // Lấy thông tin người dùng hiện tại
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Bạn cần đăng nhập để thực hiện chức năng này')
        return
      }
      
      // Thêm phương thức thanh toán
      const { data, error } = await supabase
        .from('payments')
        .insert([
          {
            payment_method_name: formData.payment_method_name,
            description: formData.description,
            image: formData.image || null,
            user_id: user.id
          }
        ])
        .select()
      
      if (error) throw error
      
      // Cập nhật danh sách
      fetchPaymentMethods()
      
      // Đóng form và hiển thị thông báo thành công
      closeForm()
      setSuccessMessage('Thêm phương thức thanh toán thành công')
      
      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Lỗi khi thêm phương thức thanh toán:', error)
      setError('Có lỗi xảy ra khi thêm phương thức thanh toán')
    }
  }

  // Cập nhật phương thức thanh toán
  const updatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPayment) return
    
    try {
      // Kiểm tra dữ liệu
      if (!formData.payment_method_name.trim()) {
        setError('Vui lòng nhập tên phương thức thanh toán')
        return
      }
      
      // Cập nhật phương thức thanh toán
      const { data, error } = await supabase
        .from('payments')
        .update({
          payment_method_name: formData.payment_method_name,
          description: formData.description,
          image: formData.image || null,
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', selectedPayment.payment_id)
        .select()
      
      if (error) throw error
      
      // Cập nhật danh sách
      fetchPaymentMethods()
      
      // Đóng form và hiển thị thông báo thành công
      closeForm()
      setSuccessMessage('Cập nhật phương thức thanh toán thành công')
      
      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Lỗi khi cập nhật phương thức thanh toán:', error)
      setError('Có lỗi xảy ra khi cập nhật phương thức thanh toán')
    }
  }

  // Xóa phương thức thanh toán
  const deletePaymentMethod = async (paymentId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phương thức thanh toán này?')) {
      return
    }
    
    try {
      // Kiểm tra xem phương thức thanh toán có đang được sử dụng không
      const { count, error: checkError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method', paymentId)
      
      if (checkError) throw checkError
      
      if (count && count > 0) {
        setError('Không thể xóa phương thức thanh toán này vì đang được sử dụng trong đơn hàng')
        return
      }
      
      // Xóa phương thức thanh toán
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('payment_id', paymentId)
      
      if (error) throw error
      
      // Cập nhật danh sách
      fetchPaymentMethods()
      
      // Hiển thị thông báo thành công
      setSuccessMessage('Xóa phương thức thanh toán thành công')
      
      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Lỗi khi xóa phương thức thanh toán:', error)
      setError('Có lỗi xảy ra khi xóa phương thức thanh toán')
    }
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

  // Lấy icon cho phương thức thanh toán
  const getPaymentIcon = (paymentName: string) => {
    const name = paymentName.toLowerCase()
    if (name.includes('cod') || name.includes('tiền mặt')) {
      return <BanknotesIcon className="h-6 w-6" />
    } else if (name.includes('qr') || name.includes('momo') || name.includes('zalopay')) {
      return <QrCodeIcon className="h-6 w-6" />
    } else if (name.includes('banking') || name.includes('chuyển khoản')) {
      return <DevicePhoneMobileIcon className="h-6 w-6" />
    } else {
      return <CreditCardIcon className="h-6 w-6" />
    }
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Thông báo thành công */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-700 hover:text-red-900"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý phương thức thanh toán</h1>
        <button
          onClick={openAddForm}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Thêm phương thức
        </button>
      </div>

      {/* Danh sách phương thức thanh toán */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phương thức
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hình ảnh
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cập nhật lần cuối
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : paymentMethods.length > 0 ? (
                paymentMethods.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-${themeColor}-100 flex items-center justify-center`}>
                          {getPaymentIcon(payment.payment_method_name)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{payment.payment_method_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{payment.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.image ? (
                        <img src={payment.image} alt={payment.payment_method_name} className="h-10 w-10 object-contain" />
                      ) : (
                        <span className="text-sm text-gray-500">Không có</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payment.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payment.updated_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditForm(payment)}
                          className={`text-${themeColor}-600 hover:text-${themeColor}-900 p-1`}
                          title="Sửa"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deletePaymentMethod(payment.payment_id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Xóa"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Không có phương thức thanh toán nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal thêm phương thức thanh toán */}
      {showAddForm && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={addPaymentMethod}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Thêm phương thức thanh toán
                      </h3>
                      
                      <div className="mb-4">
                        <label htmlFor="payment_method_name" className="block text-sm font-medium text-gray-700 mb-1">
                          Tên phương thức thanh toán <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="payment_method_name"
                          name="payment_method_name"
                          value={formData.payment_method_name}
                          onChange={handleInputChange}
                          className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-3 pr-3`}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Mô tả
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 border border-gray-300 pl-3 pr-3 py-2`}
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                          URL hình ảnh
                        </label>
                        <input
                          type="text"
                          id="image"
                          name="image"
                          value={formData.image}
                          onChange={handleInputChange}
                          className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-3 pr-3`}
                          placeholder="https://example.com/image.jpg"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Nhập URL hình ảnh minh họa (QR code, logo,...)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm`}
                  >
                    Thêm
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal sửa phương thức thanh toán */}
      {showEditForm && selectedPayment && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={updatePaymentMethod}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Sửa phương thức thanh toán
                      </h3>
                      
                      <div className="mb-4">
                        <label htmlFor="payment_method_name" className="block text-sm font-medium text-gray-700 mb-1">
                          Tên phương thức thanh toán <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="payment_method_name"
                          name="payment_method_name"
                          value={formData.payment_method_name}
                          onChange={handleInputChange}
                          className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-3 pr-3`}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Mô tả
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 border border-gray-300 pl-3 pr-3 py-2`}
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                          URL hình ảnh
                        </label>
                        <input
                          type="text"
                          id="image"
                          name="image"
                          value={formData.image}
                          onChange={handleInputChange}
                          className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-3 pr-3`}
                          placeholder="https://example.com/image.jpg"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Nhập URL hình ảnh minh họa (QR code, logo,...)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${themeColor}-600 text-base font-medium text-white hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 sm:ml-3 sm:w-auto sm:text-sm`}
                  >
                    Cập nhật
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}