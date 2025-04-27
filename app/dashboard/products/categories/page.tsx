'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { convertImageToBase64, validateImage } from '@/app/utils/imageUtils'
import Image from 'next/image'
import AccessDenied from '@/components/AccessDenied'
import { createClient } from '@/utils/supabase/client'

interface Category {
  category_id: number
  name_category: string
  description_category: string
  image_category?: string
}

// Modal state interface
interface ModalState {
  isOpen: boolean
  mode: 'view' | 'edit' | 'delete'
  category: Category | null
}

interface NotificationState {
  type: 'success' | 'error' | 'info'
  message: string
  visible: boolean
}

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [newCategory, setNewCategory] = useState({
    name_category: '',
    description_category: '',
    image_category: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal state
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'view',
    category: null
  })

  // Notification state
  const [notification, setNotification] = useState<NotificationState>({
    type: 'info',
    message: '',
    visible: false
  })

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({
      type,
      message,
      visible: true
    })

    // Auto hide notification after delay
    const timeout = type === 'success' ? 2000 : 5000
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }))
    }, timeout)
  }

  const fetchCategories = async (supabase) => {
    setLoading(true)
    setError(null)

    try {
      // Fetch categories from Supabase
      const { data, error } = await supabase
        .from('category')
        .select('*')
        .order('category_id', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        console.log('Error details:', JSON.stringify(error, null, 2))
        throw new Error(`Lỗi khi tải danh mục: ${error.message || 'Không xác định'}`)
      }

      // Set categories data
      setCategories(data || [])

      if (data?.length === 0) {
        console.log('No categories found')
      } else {
        console.log(`Loaded ${data?.length} categories successfully`)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh mục sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  // Modal handlers
  const openModal = (category: Category, mode: 'view' | 'edit' | 'delete') => {
    setModal({
      isOpen: true,
      mode,
      category
    })

    if (mode === 'edit') {
      // Set form data for editing
      setNewCategory({
        name_category: category.name_category,
        description_category: category.description_category,
        image_category: category.image_category || ''
      })

      // Set image preview if available
      if (category.image_category) {
        setImagePreview(category.image_category)
      } else {
        setImagePreview(null)
      }
    }
  }

  const closeModal = () => {
    setModal({
      isOpen: false,
      mode: 'view',
      category: null
    })

    // Reset form if was in edit mode
    if (modal.mode === 'edit') {
      setNewCategory({
        name_category: '',
        description_category: '',
        image_category: ''
      })
      setImagePreview(null)
      setImageFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteCategory = async () => {
    if (!modal.category) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('category')
        .delete()
        .eq('category_id', modal.category.category_id)

      if (error) {
        console.error('Error deleting category:', error)
        console.log('Error details:', JSON.stringify(error, null, 2))
        throw new Error(`Lỗi khi xóa danh mục: ${error.message || 'Không xác định'}`)
      }

      // Close modal and refresh categories
      closeModal()
      await fetchCategories(supabase)

      // Show success notification
      showNotification('success', `Đã xóa danh mục "${modal.category.name_category}" thành công!`)

    } catch (err) {
      console.error('Failed to delete category:', err)
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi xóa danh mục'
      setError(errorMessage)
      showNotification('error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!modal.category) return

    setLoading(true)
    setError(null)

    // Validate required fields
    if (!newCategory.name_category.trim()) {
      const errorMessage = 'Tên danh mục không được để trống'
      setError(errorMessage)
      showNotification('error', errorMessage)
      setLoading(false)
      return
    }

    if (!newCategory.description_category.trim()) {
      const errorMessage = 'Mô tả danh mục không được để trống'
      setError(errorMessage)
      showNotification('error', errorMessage)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('category')
        .update({
          name_category: newCategory.name_category,
          description_category: newCategory.description_category,
          image_category: newCategory.image_category || null
        })
        .eq('category_id', modal.category.category_id)

      if (error) {
        console.error('Error updating category:', error)
        console.log('Error details:', JSON.stringify(error, null, 2))
        throw new Error(`Lỗi khi cập nhật danh mục: ${error.message || 'Không xác định'}`)
      }

      // Close modal and refresh categories
      closeModal()
      await fetchCategories(supabase)

      // Show success notification
      showNotification('success', `Đã cập nhật danh mục "${newCategory.name_category}" thành công!`)

    } catch (err) {
      console.error('Failed to update category:', err)
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi cập nhật danh mục'
      setError(errorMessage)
      showNotification('error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Kiểm tra vai trò người dùng
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        setAuthLoading(true)
        const supabase = createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          console.error('Không có phiên đăng nhập:', sessionError?.message)
          setIsAdmin(false)
          setAuthLoading(false)
          return
        }

        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (accountError || !accountData) {
          console.error('Lỗi khi lấy thông tin tài khoản:', accountError)
          setIsAdmin(false)
          setAuthLoading(false)
          return
        }

        setIsAdmin(accountData.role === 'admin')

        // Nếu là admin, tiếp tục lấy dữ liệu danh mục
        if (accountData.role === 'admin') {
          await fetchCategories(supabase)
        }

        setAuthLoading(false)
      } catch (error) {
        console.error('Lỗi khi kiểm tra vai trò:', error)
        setIsAdmin(false)
        setAuthLoading(false)
      }
    }

    checkUserRole()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewCategory(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate image
    const validation = validateImage(file, 5 * 1024 * 1024) // 5MB limit
    if (!validation.valid) {
      setImageError(validation.error)
      return
    }

    setImageError(null)
    setImageFile(file)

    try {
      // Create preview immediately using URL.createObjectURL for faster preview
      const objectUrl = URL.createObjectURL(file)
      setImagePreview(objectUrl)

      // Convert to base64 in background for storage
      const base64 = await convertImageToBase64(file)

      // Update category state with base64 image
      setNewCategory(prev => ({
        ...prev,
        image_category: base64 as string
      }))

      // Revoke object URL to free memory
      URL.revokeObjectURL(objectUrl)

      // Update preview with base64 after conversion is complete
      setImagePreview(base64 as string)
    } catch (err) {
      console.error('Error processing image:', err)
      setImageError('Lỗi khi xử lý ảnh. Vui lòng thử lại.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate required fields
    if (!newCategory.name_category.trim()) {
      const errorMessage = 'Tên danh mục không được để trống'
      setError(errorMessage)
      showNotification('error', errorMessage)
      setLoading(false)
      return
    }

    if (!newCategory.description_category.trim()) {
      const errorMessage = 'Mô tả danh mục không được để trống'
      setError(errorMessage)
      showNotification('error', errorMessage)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('category')
        .insert([newCategory])
        .select()

      if (error) {
        console.error('Error adding category:', error)
        console.log('Error details:', JSON.stringify(error, null, 2))
        throw new Error(`Lỗi khi thêm danh mục: ${error.message || 'Không xác định'}`)
      }

      // Show success notification
      showNotification('success', `Đã thêm danh mục "${newCategory.name_category}" thành công!`)

      // Reset form
      setNewCategory({
        name_category: '',
        description_category: '',
        image_category: ''
      })
      setImagePreview(null)
      setImageFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      await fetchCategories(supabase)
    } catch (err) {
      console.error('Error adding category:', err)
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi thêm danh mục'
      setError(errorMessage)
      showNotification('error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Kiểm tra quyền admin */}
      {authLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-2 text-gray-500">Đang tải...</p>
        </div>
      ) : !isAdmin ? (
        <AccessDenied message="Truy cập bị từ chối. Bạn không có quyền truy cập chức năng quản lý danh mục sản phẩm. Chỉ có admin mới truy cập được." />
      ) : (
        <>
      {/* Notification */}
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
            <h2 className="text-2xl font-bold text-gray-900">
              Quản lý Danh mục Sản phẩm
            </h2>
          </div>

          <div className="p-6 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name_category" className="block text-sm font-medium text-gray-700">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name_category"
                  id="name_category"
                  required
                  value={newCategory.name_category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="description_category" className="block text-sm font-medium text-gray-700">
                    Mô tả <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description_category"
                    id="description_category"
                    rows={8}
                    required
                    value={newCategory.description_category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full h-40 border border-gray-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    style={{ minHeight: "160px", resize: "none" }}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hình ảnh danh mục
                  </label>

                  <input
                    type="file"
                    name="image_category"
                    id="image_category"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div
                      className="relative h-40 w-40 overflow-hidden rounded-md border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity mx-auto"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-sm font-medium">Thay đổi ảnh</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="h-40 w-40 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors mx-auto"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="mt-2 text-sm text-gray-500">Nhấp để chọn ảnh</span>
                    </div>
                  )}

                  {imageError && (
                    <p className="mt-1 text-sm text-red-600 text-center">{imageError}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang thêm...' : 'Thêm danh mục'}
                </button>
              </div>
            </form>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
                {error.includes('does not exist') && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 mb-2">
                      Bảng danh mục chưa được tạo. Bạn có thể tạo bảng bằng cách nhấn nút bên dưới:
                    </p>
                    <a
                      href="/debug/category"
                      target="_blank"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Tạo bảng danh mục
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hình ảnh
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên danh mục
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mô tả
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {loading ? 'Đang tải danh mục...' : 'Không có danh mục nào'}
                      </td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr
                        key={category.category_id}
                        onClick={() => openModal(category, 'view')}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.category_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {category.image_category ? (
                            <div className="h-12 w-12 relative overflow-hidden rounded-md">
                              <img
                                src={category.image_category}
                                alt={category.name_category}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded-md flex items-center justify-center">
                              <span className="text-xs text-gray-500">No image</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {category.name_category}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {category.description_category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(category, 'view');
                            }}
                            className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Modal header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-white">
                  {modal.mode === 'view' && 'Chi tiết danh mục'}
                  {modal.mode === 'edit' && 'Chỉnh sửa danh mục'}
                  {modal.mode === 'delete' && 'Xóa danh mục'}
                </h3>
                <button
                  type="button"
                  className="text-white hover:text-gray-200 transition-colors"
                  onClick={closeModal}
                >
                  <span className="sr-only">Đóng</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal content */}
              <div className="bg-white px-6 py-5">
                {(modal.mode === 'view' || modal.mode === 'edit') && modal.category && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            ID
                          </label>
                          {modal.mode === 'view' ? (
                            <div className="mt-1 py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
                              <span className="text-gray-900">{modal.category.category_id}</span>
                            </div>
                          ) : (
                            <div className="mt-1 py-2 px-3 bg-gray-50 rounded-md border border-gray-200 text-gray-500">
                              {modal.category.category_id} <span className="text-xs">(không thể thay đổi)</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label htmlFor="edit_name_category" className="block text-sm font-medium text-gray-700">
                            Tên danh mục {modal.mode === 'edit' && <span className="text-red-500">*</span>}
                          </label>
                          {modal.mode === 'view' ? (
                            <div className="mt-1 py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
                              <span className="text-gray-900 font-medium">{modal.category.name_category}</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              name="name_category"
                              id="edit_name_category"
                              required
                              value={newCategory.name_category}
                              onChange={handleInputChange}
                              className="mt-1 block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          )}
                        </div>

                        <div>
                          <label htmlFor="edit_description_category" className="block text-sm font-medium text-gray-700">
                            Mô tả {modal.mode === 'edit' && <span className="text-red-500">*</span>}
                          </label>
                          {modal.mode === 'view' ? (
                            <div className="mt-1 py-2 px-3 bg-gray-50 rounded-md border border-gray-200 h-40 overflow-y-auto">
                              <p className="text-gray-900 whitespace-pre-wrap">{modal.category.description_category}</p>
                            </div>
                          ) : (
                            <textarea
                              name="description_category"
                              id="edit_description_category"
                              rows={5}
                              required
                              value={newCategory.description_category}
                              onChange={handleInputChange}
                              className="mt-1 block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-40"
                              style={{ resize: "none" }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hình ảnh danh mục
                        </label>

                        {modal.mode === 'edit' && (
                          <input
                            type="file"
                            name="image_category"
                            id="edit_image_category"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            ref={fileInputRef}
                          />
                        )}

                        {modal.mode === 'view' ? (
                          modal.category.image_category ? (
                            <div className="relative h-40 w-40 overflow-hidden rounded-md border-2 border-gray-200 mx-auto">
                              <img
                                src={modal.category.image_category}
                                alt={modal.category.name_category}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-40 w-40 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center mx-auto">
                              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="mt-2 text-sm text-gray-500">Không có hình ảnh</span>
                            </div>
                          )
                        ) : (
                          imagePreview ? (
                            <div
                              className="relative h-40 w-40 overflow-hidden rounded-md border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity mx-auto"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-white text-sm font-medium">Thay đổi ảnh</span>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="h-40 w-40 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors mx-auto"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="mt-2 text-sm text-gray-500">Nhấp để chọn ảnh</span>
                            </div>
                          )
                        )}

                        {modal.mode === 'edit' && imageError && (
                          <p className="mt-1 text-sm text-red-600 text-center">{imageError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {modal.mode === 'delete' && modal.category && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Xác nhận xóa danh mục
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Bạn có chắc chắn muốn xóa danh mục "<span className="font-medium">{modal.category.name_category}</span>"?
                          Hành động này không thể hoàn tác.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                {modal.mode === 'view' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openModal(modal.category!, 'edit')}
                      className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Chỉnh sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => openModal(modal.category!, 'delete')}
                      className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Xóa
                    </button>

                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Đóng
                    </button>
                  </>
                )}

                {modal.mode === 'edit' && (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateCategory}
                      disabled={loading}
                      className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Lưu thay đổi
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Hủy
                    </button>
                  </>
                )}

                {modal.mode === 'delete' && (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteCategory}
                      disabled={loading}
                      className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang xóa...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Xóa
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Hủy
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
