'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import { convertImageToBase64, validateImage } from '@/app/utils/imageUtils'

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
  }, [])
  
  // Xử lý đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (formData.showCategoryDropdown && !target.closest('.category-dropdown')) {
        setFormData(prev => ({ ...prev, showCategoryDropdown: false }))
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [formData.showCategoryDropdown])

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
          setError('File ảnh không hợp lệ')
          return
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra ảnh:', err)
        setError('Không thể kiểm tra file ảnh')
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
        setError('Không thể đọc file ảnh')
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
      setSuccessMessage('Thêm sản phẩm thành công!')

      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)

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
      if (err instanceof Error) {
        setError(`Lỗi: ${err.message}`)
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(`Lỗi từ Supabase: ${err.message}`)
      } else {
        setError('Có lỗi xảy ra khi thêm sản phẩm. Vui lòng kiểm tra console để biết chi tiết.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !themeState) return null


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Thông báo thành công */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
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

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Cột trái - Thông tin cơ bản */}
              <div className="space-y-6">
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

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Mô tả
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-32 px-3 py-2"
                      placeholder="Nhập mô tả sản phẩm"
                    />
                  </div>
                </div>

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
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
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
                  {formData.category_id === null && (
                    <p className="mt-1 text-sm text-red-600">Vui lòng chọn danh mục sản phẩm</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                      Màu sắc
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="color"
                        id="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-10 px-3"
                        placeholder="Nhập màu sắc"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                      Kích cỡ
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="size"
                        id="size"
                        value={formData.size}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-200 rounded-md h-10 px-3"
                        placeholder="Nhập kích cỡ"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cột phải - Giá và ảnh */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
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
                    </div>
                  </div>

                  <div>
                    <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                      Số lượng tồn kho
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hình ảnh sản phẩm
                  </label>
                  <div className="mt-1 flex justify-center">
                    <div className="relative w-48 h-48">
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
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
                              <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity duration-200">
                                Thay đổi ảnh
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p className="mt-1 text-sm text-gray-600">
                              Click để chọn ảnh
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              PNG, JPG, GIF tối đa 10MB
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
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  // Làm mới các ô thông tin
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

                  // Xóa thông báo lỗi nếu có
                  setError(null)
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Làm mới
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang thêm...
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
