'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { use } from 'react'
import { convertImageToBase64, validateImage } from '@/app/utils/imageUtils'

interface ProductFormData {
  product_name: string
  description: string
  color: string
  size: string
  price: number
  stock_quantity: number
  image: File | null
  imageUrl: string | null
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  // Unwrap params using React.use
  const unwrappedParams = use(params);
  const hasProductId = unwrappedParams && unwrappedParams.id && unwrappedParams.id !== 'undefined';
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [originalData, setOriginalData] = useState<any>(null)

  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    description: '',
    color: '',
    size: '',
    price: 0,
    stock_quantity: 0,
    image: null,
    imageUrl: null
  })

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
    }
  }, [mounted, themeContext.currentTheme])

  // Fetch product data when component mounts
  useEffect(() => {
    if (mounted && hasProductId) {
      fetchProductData(unwrappedParams.id)
    }
  }, [mounted, hasProductId, unwrappedParams.id])

  // Fetch product data from Supabase
  const fetchProductData = async (productId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_id', productId)
        .single()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('Không tìm thấy sản phẩm')
      }

      // Lưu dữ liệu gốc
      setOriginalData(data)

      // Cập nhật form data
      setFormData({
        product_name: data.product_name || '',
        description: data.description || '',
        color: data.color || '',
        size: data.size || '',
        price: data.price || 0,
        stock_quantity: data.stock_quantity || 0,
        image: null,
        imageUrl: data.image || null
      })

      // Cập nhật preview URL nếu có ảnh
      if (data.image) {
        setPreviewUrl(data.image)
      }
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu sản phẩm:', error)
      setError(error.message || 'Đã xảy ra lỗi khi tải dữ liệu sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === 'price' || name === 'stock_quantity') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  // Handle image upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Sử dụng hàm validateImage để kiểm tra file
      const validation = validateImage(file)
      if (!validation.valid) {
        setError(validation.error)
        return
      }

      setFormData({
        ...formData,
        image: file
      })

      try {
        // Sử dụng hàm convertImageToBase64 để chuyển đổi file thành base64
        const base64String = await convertImageToBase64(file)
        setPreviewUrl(base64String as string)
        setError(null) // Xóa lỗi nếu có
      } catch (error) {
        console.error('Lỗi khi chuyển đổi ảnh:', error)
        setError('Không thể đọc file ảnh')
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Validate form data
      if (!formData.product_name) {
        throw new Error('Vui lòng nhập tên sản phẩm')
      }

      if (formData.price < 0) {
        throw new Error('Giá sản phẩm không thể là số âm')
      }

      if (formData.stock_quantity < 0) {
        throw new Error('Số lượng tồn kho không thể là số âm')
      }

      // Sử dụng base64 đã lưu trong previewUrl nếu có ảnh mới
      let imageUrl = formData.imageUrl

      if (formData.image && previewUrl) {
        // Sử dụng trực tiếp chuỗi base64 đã được tạo trong handleImageChange
        imageUrl = previewUrl
        console.log('Sử dụng ảnh base64')
      }

      // Update product data in database
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('products')
        .update({
          product_name: formData.product_name,
          description: formData.description,
          color: formData.color,
          size: formData.size,
          price: formData.price,
          stock_quantity: formData.stock_quantity,
          image: imageUrl,
          updated_at: now
        })
        .eq('product_id', unwrappedParams.id)

      if (updateError) {
        throw new Error(`Lỗi khi cập nhật sản phẩm: ${updateError.message}`)
      }

      // Show success message
      setSuccessMessage('Cập nhật sản phẩm thành công!')

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)

      // Update original data
      setOriginalData({
        ...originalData,
        product_name: formData.product_name,
        description: formData.description,
        color: formData.color,
        size: formData.size,
        price: formData.price,
        stock_quantity: formData.stock_quantity,
        image: imageUrl,
        updated_at: now
      })
    } catch (err) {
      console.error('Lỗi:', err)
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật sản phẩm')
    } finally {
      setSaving(false)
    }
  }

  // Reset form to original data
  const handleReset = () => {
    if (originalData) {
      setFormData({
        product_name: originalData.product_name || '',
        description: originalData.description || '',
        color: originalData.color || '',
        size: originalData.size || '',
        price: originalData.price || 0,
        stock_quantity: originalData.stock_quantity || 0,
        image: null,
        imageUrl: originalData.image || null
      })

      setPreviewUrl(originalData.image || null)
    }
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Thông báo thành công */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/dashboard/products/search" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Chỉnh sửa sản phẩm</h1>
        </div>
      </div>

      {!hasProductId ? (
        <div className="py-20 text-center">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 inline-block text-left">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">Chưa có sản phẩm nào được chọn. Vui lòng chọn sản phẩm từ trang tìm kiếm.</p>
                <div className="mt-4">
                  <Link
                    href="/dashboard/products/search"
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                  >
                    Quay về trang tìm kiếm sản phẩm
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Tên sản phẩm */}
            <div>
              <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-1">
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="product_name"
                name="product_name"
                value={formData.product_name}
                onChange={handleInputChange}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 sm:text-sm h-10 border border-gray-300`}
                required
              />
            </div>

            {/* Mô tả */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 sm:text-sm h-24 border border-gray-300`}
              />
            </div>

            {/* Màu sắc và kích thước */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                  Màu sắc
                </label>
                <input
                  type="text"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 sm:text-sm h-10 border border-gray-300`}
                />
              </div>
              <div>
                <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                  Kích thước
                </label>
                <input
                  type="text"
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 sm:text-sm h-10 border border-gray-300`}
                />
              </div>
            </div>

            {/* Giá và số lượng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Giá (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="1000"
                  className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 sm:text-sm h-10 border border-gray-300`}
                  required
                />
              </div>
              <div>
                <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng tồn kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="stock_quantity"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                  min="0"
                  className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 sm:text-sm h-10 border border-gray-300`}
                  required
                />
              </div>
            </div>

            {/* Hình ảnh */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hình ảnh sản phẩm
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {previewUrl ? (
                    <div className="mb-3">
                      <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-auto" />
                    </div>
                  ) : (
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="image"
                      className={`relative cursor-pointer bg-white rounded-md font-medium text-${themeColor}-600 hover:text-${themeColor}-500 focus-within:outline-none`}
                    >
                      <span>Tải ảnh lên</span>
                      <input
                        id="image"
                        name="image"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="pl-1">hoặc kéo thả</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF tối đa 10MB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 text-right space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Đặt lại
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang lưu...
                </>
              ) : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
