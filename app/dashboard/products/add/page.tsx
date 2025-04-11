'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'

interface ProductFormData {
  product_name: string
  description: string
  color: string
  size: string
  price: number
  stock_quantity: number
  image: File | null
}

export default function AddProductPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState(themeColors.indigo)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    description: '',
    color: '',
    size: '',
    price: 0,
    stock_quantity: 0,
    image: null
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Kiểm tra kích thước file (tối đa 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Kích thước ảnh không được vượt quá 10MB')
        return
      }

      // Kiểm tra định dạng file
      if (!file.type.startsWith('image/')) {
        setError('File phải là định dạng ảnh')
        return
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }))
      
      // Tạo URL để xem trước ảnh
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
        setError(null) // Xóa lỗi nếu có
      }
      reader.onerror = () => {
        setError('Không thể đọc file ảnh')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Upload image to Supabase Storage if exists
      let imageUrl = null
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, formData.image)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        imageUrl = publicUrl
      }

      // Insert product data into database
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
            image: imageUrl
          }
        ])

      if (insertError) throw insertError

      router.push('/dashboard/products')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi thêm sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !themeState) return null

  const themeColor = themeState.textColor.split('-')[1]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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

            <div className="flex justify-end">
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