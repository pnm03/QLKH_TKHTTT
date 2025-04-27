'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import { convertImageToBase64, validateImage } from '@/app/utils/imageUtils'
import { createClient } from '@/utils/supabase/client'
import AccessDenied from '@/components/AccessDenied'

interface ProductFormData {
  product_name: string
  description: string
  color: string
  size: string
  price: number
  stock_quantity: number
  image: File | null
  category_id: number | null
  showCategoryDropdown?: boolean
  showColorPicker?: boolean
  showSizeDropdown?: boolean
}

interface Category {
  category_id: number
  name_category: string
  image_category?: string
}

export default function AddProductPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState(themeColors.indigo)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    description: '',
    color: '',
    size: '',
    price: 0,
    stock_quantity: 0,
    image: null,
    category_id: null
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hệ thống thông báo mới
  interface NotificationState {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }

  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    message: '',
    type: 'info'
  })

  // Hàm hiển thị thông báo
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({
      visible: true,
      message,
      type
    })

    // Tự động ẩn thông báo sau một khoảng thời gian
    const timeout = type === 'error' ? 5000 : 2000 // Thông báo lỗi hiển thị lâu hơn
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }))
    }, timeout)
  }

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('category')
        .select('category_id, name_category, image_category')
        .order('category_id', { ascending: true })

      if (!error && data) {
        setCategories(data)
      } else if (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [supabase])

  // Kiểm tra vai trò người dùng hiện tại có phải admin hoặc NVK không
  useEffect(() => {
    if (mounted) {
      const checkUserRole = async () => {
        try {
          const client = createClient()
          const { data: { session }, error: sessionError } = await client.auth.getSession()

          if (sessionError || !session) {
            console.error('Không có phiên đăng nhập:', sessionError?.message)
            setIsAuthorized(false)
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
            setIsAuthorized(false)
            setAuthLoading(false)
            return
          }

          // Kiểm tra nếu role là admin hoặc NVK (Nhân viên kho)
          setIsAuthorized(accountData.role === 'admin' || accountData.role === 'NVK')
          setAuthLoading(false)
        } catch (error) {
          console.error('Lỗi khi kiểm tra vai trò:', error)
          setIsAuthorized(false)
          setAuthLoading(false)
        }
      }

      checkUserRole()
    }
  }, [mounted])

  // Xử lý đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Đóng category dropdown
      if (formData.showCategoryDropdown && !target.closest('.category-dropdown')) {
        setFormData(prev => ({ ...prev, showCategoryDropdown: false }))
      }

      // Đóng color picker
      if (formData.showColorPicker && !target.closest('.color-picker-container')) {
        setFormData(prev => ({ ...prev, showColorPicker: false }))
      }

      // Đóng size dropdown
      if (formData.showSizeDropdown && !target.closest('.size-dropdown-container')) {
        setFormData(prev => ({ ...prev, showSizeDropdown: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [formData.showCategoryDropdown, formData.showColorPicker, formData.showSizeDropdown])

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted && themeContext.currentTheme) {
      setThemeState(themeContext.currentTheme)
    }
  }, [mounted, themeContext.currentTheme])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Xử lý riêng cho các trường số
    if (name === 'price' || name === 'stock_quantity') {
      // Chỉ cho phép nhập số
      const numericValue = value.replace(/[^0-9]/g, '')
      setFormData(prev => ({
        ...prev,
        [name]: numericValue ? parseInt(numericValue) : 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Sử dụng hàm validateImage để kiểm tra file
      try {
        const isValid = await validateImage(file)
        if (!isValid) {
          const errorMsg = 'File ảnh không hợp lệ'
          setError(errorMsg)
          showNotification(errorMsg, 'error')
          return
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra ảnh:', err)
        const errorMsg = 'Không thể kiểm tra file ảnh'
        setError(errorMsg)
        showNotification(errorMsg, 'error')
        return
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }))

      try {
        // Sử dụng hàm convertImageToBase64 để chuyển đổi file thành base64
        const base64String = await convertImageToBase64(file)
        setPreviewUrl(base64String as string)
        setError(null) // Xóa lỗi nếu có
      } catch (error) {
        console.error('Lỗi khi chuyển đổi ảnh:', error)
        const errorMsg = 'Không thể đọc file ảnh'
        setError(errorMsg)
        showNotification(errorMsg, 'error')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Sử dụng base64 đã lưu trong previewUrl nếu có ảnh
      let imageUrl = null
      if (formData.image && previewUrl) {
        // Sử dụng trực tiếp chuỗi base64 đã được tạo trong handleImageChange
        imageUrl = previewUrl
        console.log('Sử dụng ảnh base64')
      }

      // Insert product data into database
      if (!formData.category_id) {
        throw new Error('Vui lòng chọn danh mục sản phẩm')
      }

      const { error: insertError } = await supabase
        .from('products')
        .insert([
          {
            product_name: formData.product_name,
            description: formData.description,
            color: formData.color,
            size: formData.size,
            price: formData.price,
            stock_quantity: formData.stock_quantity,
            image: imageUrl,
            category_id: formData.category_id
          }
        ])

      if (insertError) throw insertError

      // Hiển thị thông báo thành công
      showNotification('Thêm sản phẩm thành công!', 'success')

      // Làm mới các ô thông tin để tiếp tục thêm sản phẩm mới
      setFormData({
        product_name: '',
        description: '',
        color: '',
        size: '',
        price: 0,
        stock_quantity: 0,
        image: null,
        category_id: null
      })

      // Xóa ảnh xem trước
      setPreviewUrl(null)
    } catch (err) {
      console.error('Chi tiết lỗi khi thêm sản phẩm:', err)
      let errorMessage = 'Có lỗi xảy ra khi thêm sản phẩm. Vui lòng kiểm tra console để biết chi tiết.'

      if (err instanceof Error) {
        errorMessage = `Lỗi: ${err.message}`
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = `Lỗi từ Supabase: ${(err as any).message}`
      }

      setError(errorMessage)
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !themeState) return null

  // Hiển thị loading khi đang kiểm tra quyền
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-2 text-gray-500">Đang tải...</p>
      </div>
    )
  }

  // Hiển thị thông báo từ chối truy cập nếu không phải admin hoặc NVK
  if (!isAuthorized) {
    return <AccessDenied message="Truy cập bị từ chối. Bạn không có quyền truy cập chức năng thêm sản phẩm. Chỉ có admin hoặc nhân viên kho mới truy cập được." />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Hệ thống thông báo */}
      {notification.visible && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-md p-4 shadow-lg max-w-md transition-all duration-300 transform translate-y-0 opacity-100 ${
            notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' && (
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setNotification(prev => ({ ...prev, visible: false }))}
                  className={`inline-flex rounded-md p-1.5 ${
                    notification.type === 'success' ? 'text-green-500 hover:bg-green-100' :
                    notification.type === 'error' ? 'text-red-500 hover:bg-red-100' :
                    'text-blue-500 hover:bg-blue-100'
                  }`}
                >
                  <span className="sr-only">Đóng</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Thêm sản phẩm mới
              </h2>
              <button
                type="button"
                onClick={() => router.push('/dashboard/products')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Quay lại
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Hàng 1: Tên sản phẩm */}
            <div>
              <label htmlFor="product_name" className="block text-sm font-medium text-gray-700">
                Tên sản phẩm
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="product_name"
                  id="product_name"
                  required
                  value={formData.product_name}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-10 px-3"
                  placeholder="Nhập tên sản phẩm"
                />
              </div>
            </div>

            {/* Hàng 2: Mô tả và Hình ảnh */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Mô tả */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Mô tả
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md px-3 py-2"
                    style={{ height: '180px' }}
                    placeholder="Nhập mô tả sản phẩm"
                  />
                </div>
              </div>

              {/* Hình ảnh */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hình ảnh sản phẩm
                </label>
                <div className="mt-1 flex justify-center" style={{ height: '180px' }}>
                  <div className="relative w-40 h-40">
                    <label
                      htmlFor="image"
                      className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-500 cursor-pointer transition-colors duration-200"
                    >
                      {previewUrl ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-contain rounded-lg"
                            priority
                          />
                          <div className="absolute inset-0 hover:bg-black hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
                            <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50 px-2 py-1 rounded">
                              Thay đổi ảnh
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="mt-1 text-sm text-gray-600">
                            Click để chọn ảnh
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            PNG, JPG, GIF
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        name="image"
                        id="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Hàng 3: Giá, Tồn kho, Danh mục */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Giá */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Giá
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₫</span>
                  </div>
                  <input
                    type="text"
                    name="price"
                    id="price"
                    required
                    value={formData.price}
                    onChange={handleInputChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border border-gray-200 rounded-md h-10"
                    placeholder="0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">VND</span>
                  </div>
                </div>
              </div>

              {/* Số lượng */}
              <div>
                <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                  Số lượng
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="stock_quantity"
                    id="stock_quantity"
                    required
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-10 px-3"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Danh mục sản phẩm */}
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                  Danh mục sản phẩm
                </label>
                <div className="relative mt-1 category-dropdown">
                  <button
                    type="button"
                    id="category_id"
                    onClick={() => setFormData(prev => ({ ...prev, showCategoryDropdown: !prev.showCategoryDropdown }))}
                    className="relative w-full bg-white border border-gray-200 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {formData.category_id ? (
                      <div className="flex items-center">
                        {categories.find(c => c.category_id === formData.category_id)?.image_category ? (
                          <div className="flex-shrink-0 h-6 w-6 mr-2">
                            <img
                              src={categories.find(c => c.category_id === formData.category_id)?.image_category}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-6 w-6 mr-2 bg-gray-200 rounded-full flex items-center justify-center">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <span className="block truncate">
                          {categories.find(c => c.category_id === formData.category_id)?.name_category}
                        </span>
                      </div>
                    ) : (
                      <span className="block truncate text-gray-500">Chọn danh mục</span>
                    )}
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </button>

                  {formData.showCategoryDropdown && (
                    <div className="absolute z-10 bottom-full mb-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      {categories.length === 0 ? (
                        <div className="text-center py-2 px-4 text-sm text-gray-500">
                          Không có danh mục nào
                        </div>
                      ) : (
                        categories.map((category) => (
                          <div
                            key={category.category_id}
                            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 ${formData.category_id === category.category_id ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'}`}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                category_id: category.category_id,
                                showCategoryDropdown: false
                              }))
                            }}
                          >
                            <div className="flex items-center">
                              {category.image_category ? (
                                <div className="flex-shrink-0 h-6 w-6 mr-2">
                                  <img
                                    src={category.image_category}
                                    alt=""
                                    className="h-6 w-6 rounded-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="flex-shrink-0 h-6 w-6 mr-2 bg-gray-200 rounded-full flex items-center justify-center">
                                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <span className="font-medium block truncate">
                                {category.name_category}
                              </span>
                            </div>

                            {formData.category_id === category.category_id && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hàng 4: Màu sắc và Kích cỡ */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Màu sắc */}
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                  Màu sắc
                </label>
                <div className="mt-1 relative color-picker-container">
                  <div className="flex items-center">
                    <div
                      className="w-8 h-8 rounded-full border border-gray-300 mr-2 cursor-pointer"
                      style={{ backgroundColor: formData.color === 'Đỏ' ? '#FF0000' :
                                              formData.color === 'Xanh lá' ? '#00FF00' :
                                              formData.color === 'Xanh dương' ? '#0000FF' :
                                              formData.color === 'Vàng' ? '#FFFF00' :
                                              formData.color === 'Hồng' ? '#FF00FF' :
                                              formData.color === 'Xanh ngọc' ? '#00FFFF' :
                                              formData.color === 'Đen' ? '#000000' :
                                              formData.color === 'Trắng' ? '#FFFFFF' :
                                              formData.color === 'Xám' ? '#808080' :
                                              formData.color === 'Nâu đỏ' ? '#800000' :
                                              formData.color === 'Olive' ? '#808000' :
                                              formData.color === 'Xanh lục' ? '#008000' :
                                              formData.color === 'Tím' ? '#800080' :
                                              formData.color === 'Xanh lam' ? '#008080' :
                                              formData.color === 'Cam' ? '#FFA500' : '#ffffff' }}
                      onClick={() => setFormData(prev => ({ ...prev, showColorPicker: !prev.showColorPicker }))}
                    ></div>
                    <input
                      type="text"
                      name="color"
                      id="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-10 px-3"
                      placeholder="Nhập hoặc chọn màu sắc"
                      readOnly
                    />
                  </div>

                  {formData.showColorPicker && (
                    <div className="absolute z-10 bottom-full mb-1 bg-white rounded-md shadow-lg p-3 border border-gray-200">
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { color: '#FF0000', name: 'Đỏ' },
                          { color: '#00FF00', name: 'Xanh lá' },
                          { color: '#0000FF', name: 'Xanh dương' },
                          { color: '#FFFF00', name: 'Vàng' },
                          { color: '#FF00FF', name: 'Hồng' },
                          { color: '#00FFFF', name: 'Xanh ngọc' },
                          { color: '#000000', name: 'Đen' },
                          { color: '#FFFFFF', name: 'Trắng' },
                          { color: '#808080', name: 'Xám' },
                          { color: '#800000', name: 'Nâu đỏ' },
                          { color: '#808000', name: 'Olive' },
                          { color: '#008000', name: 'Xanh lục' },
                          { color: '#800080', name: 'Tím' },
                          { color: '#008080', name: 'Xanh lam' },
                          { color: '#FFA500', name: 'Cam' }
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: item.color }}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                color: item.name,
                                showColorPicker: false
                              }))
                            }}
                            title={item.name}
                          ></div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:text-gray-700"
                          onClick={() => setFormData(prev => ({ ...prev, showColorPicker: false }))}
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Kích cỡ */}
              <div>
                <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                  Kích cỡ
                </label>
                <div className="mt-1 relative size-dropdown-container">
                  <div
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-10 px-3 py-2 cursor-pointer flex items-center justify-between"
                    onClick={() => setFormData(prev => ({ ...prev, showSizeDropdown: !prev.showSizeDropdown }))}
                  >
                    <span className={formData.size ? 'text-gray-900' : 'text-gray-400'}>
                      {formData.size || 'Chọn kích cỡ'}
                    </span>
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>

                  {formData.showSizeDropdown && (
                    <div className="absolute z-10 bottom-full mb-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                      <ul className="py-1">
                        {[
                          { size: 'XS', description: '35-40kg' },
                          { size: 'S', description: '40-45kg' },
                          { size: 'M', description: '45-50kg' },
                          { size: 'L', description: '50-55kg' },
                          { size: 'XL', description: '55-60kg' },
                          { size: 'XXL', description: '60-65kg' },
                          { size: '3XL', description: '65-70kg' },
                          { size: '4XL', description: '70-75kg' },
                          { size: '5XL', description: '75-80kg' }
                        ].map((item, index) => (
                          <li
                            key={index}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${formData.size === item.size ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'}`}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                size: item.size,
                                showSizeDropdown: false
                              }))
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.size}</span>
                              <span className="text-sm text-gray-500">({item.description})</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Lỗi khi thêm sản phẩm
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  loading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  'Thêm sản phẩm'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}