'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, XMarkIcon, TagIcon, CurrencyDollarIcon, SwatchIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Product {
  id: string
  product_name: string
  description: string
  color: string
  size: string
  price: number
  stock_quantity: number
  image: string | null
  created_at: string
  updated_at: string
}

interface ProductDetailProps {
  product: Product
  onClose: () => void
  onDelete: (product: Product) => void
  theme: any
}

// Component hiển thị chi tiết sản phẩm trong popup
const ProductDetail = ({ product, onClose, onDelete, theme }: ProductDetailProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        {/* Overlay mờ để vẫn nhìn thấy bên dưới */}
        <div className="fixed inset-0 backdrop-blur-[2px] bg-white bg-opacity-10" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className={`inline-block align-middle bg-transparent backdrop-filter backdrop-blur-md rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full relative z-50 border border-${themeColor}-500`}>
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Đóng</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/3 flex justify-center">
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-gray-200">
                          <ArchiveBoxIcon className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {product.product_name}
                    </h3>
                    <div className="mt-4 space-y-3">
                      <div key="price" className="flex items-center">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-700 font-medium">{formatCurrency(product.price)}</span>
                      </div>
                      <div key="color" className="flex items-center">
                        <SwatchIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-700">Màu: {product.color || 'Không có'}</span>
                      </div>
                      <div key="size" className="flex items-center">
                        <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-700">Kích thước: {product.size || 'Không có'}</span>
                      </div>
                      <div key="stock" className="flex items-center">
                        <ArchiveBoxIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-700">Tồn kho: {product.stock_quantity}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900">Mô tả:</h4>
                      <p className="mt-1 text-sm text-gray-500">{product.description || 'Không có mô tả'}</p>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      <p key="created-date">Ngày tạo: {formatDate(product.created_at)}</p>
                      <p key="updated-date">Cập nhật: {formatDate(product.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Link
              href={`/dashboard/products/edit/${product.id}`}
              className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-${theme.name}-600 text-base font-medium text-white hover:bg-${theme.name}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${theme.name}-500 sm:ml-3 sm:w-auto sm:text-sm`}
            >
              <PencilIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Chỉnh sửa
            </Link>
            <button
              type="button"
              onClick={() => onDelete(product)}
              className="sm:ml-3 sm:w-auto sm:text-sm inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Xóa
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [mounted, setMounted] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Lấy thông tin theme từ context nhưng chỉ sử dụng khi component đã mounted
  const themeContext = useTheme()

  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
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

  // Fetch products from Supabase
  useEffect(() => {
    if (mounted) {
      fetchProducts()
    }
  }, [mounted])

  // Fetch products from Supabase
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientComponentClient()

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setProducts(data || [])
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu sản phẩm:', error)
      setError(error.message || 'Đã xảy ra lỗi khi tải dữ liệu sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  // Lọc sản phẩm theo từ khóa tìm kiếm
  const filteredProducts = products.filter(product =>
    product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.size?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Định dạng tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Mở popup chi tiết sản phẩm
  const openProductDetail = (product: Product) => {
    setSelectedProduct(product)
  }

  // Đóng popup chi tiết sản phẩm
  const closeProductDetail = () => {
    setSelectedProduct(null)
  }

  // Hiển thị popup xác nhận xóa
  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteConfirm(true)
    setSelectedProduct(null) // Đóng popup chi tiết
  }

  // Đóng popup xác nhận xóa
  const cancelDelete = () => {
    setProductToDelete(null)
    setShowDeleteConfirm(false)
  }

  // Xóa sản phẩm
  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      setDeleteLoading(true)
      const supabase = createClientComponentClient()

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)

      if (error) throw error

      // Cập nhật danh sách sản phẩm
      setProducts(products.filter(p => p.id !== productToDelete.id))
      setShowDeleteConfirm(false)
      setProductToDelete(null)
    } catch (error: any) {
      console.error('Lỗi khi xóa sản phẩm:', error)
      alert(`Lỗi khi xóa sản phẩm: ${error.message || 'Đã xảy ra lỗi'}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div>
      {/* Hiển thị popup chi tiết sản phẩm khi được chọn */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={closeProductDetail}
          onDelete={handleDeleteClick}
          theme={theme}
        />
      )}

      {/* Popup xác nhận xóa */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 backdrop-blur-[2px] bg-white bg-opacity-10" onClick={cancelDelete}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-middle bg-transparent backdrop-filter backdrop-blur-md rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full relative z-50 border border-red-500">
              <div className="bg-white bg-opacity-80 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Xác nhận xóa sản phẩm
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Bạn có chắc chắn muốn xóa sản phẩm <span className="font-medium">{productToDelete.product_name}</span>? Hành động này không thể hoàn tác.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 bg-opacity-80 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xóa...
                    </>
                  ) : 'Xóa'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={cancelDelete}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4 md:mb-0">Quản lý sản phẩm</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Link
            href="/dashboard/products/add"
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${theme?.buttonBg || 'bg-indigo-600'} ${theme?.buttonHoverBg || 'hover:bg-indigo-700'}`}
          >
            <PlusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
            Thêm sản phẩm
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex rounded-md shadow-sm">
            <div className="relative flex-grow focus-within:z-10">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`focus:ring-${themeColor}-500 focus:border-${themeColor}-500 block w-full rounded-md pl-10 sm:text-sm border-gray-300`}
                placeholder="Tìm kiếm sản phẩm hoặc danh mục..."
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-500">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center border-t border-gray-200">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchProducts()}
              className={`mt-2 px-4 py-2 border text-sm font-medium rounded-md text-white ${theme?.buttonBg || 'bg-indigo-600'} ${theme?.buttonHoverBg || 'hover:bg-indigo-700'}`}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer"
                  onClick={() => openProductDetail(product)}
                >
                  <div className="relative h-48 bg-gray-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.product_name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-gray-200">
                        <ArchiveBoxIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {/* Hàng 1: Tên sản phẩm */}
                    <h3 className="text-sm font-medium text-gray-900 truncate mb-2">{product.product_name}</h3>

                    {/* Hàng 2: Màu và kích thước */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <SwatchIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500 truncate">{product.color || 'Không có'}</span>
                      </div>
                      <div className="flex items-center">
                        <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500 truncate">{product.size || 'Không có'}</span>
                      </div>
                    </div>

                    {/* Hàng 3: Giá và tồn kho */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</span>
                      <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                        product.stock_quantity > 10
                          ? 'bg-green-100 text-green-800'
                          : product.stock_quantity > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock_quantity}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-10 text-center">
                  <p className="text-gray-500">Không tìm thấy sản phẩm nào phù hợp.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thông báo đã được xử lý trong phần grid */}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Thống kê</h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Tổng sản phẩm</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{products.length}</dd>
            </div>
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Sản phẩm có sẵn</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {products.filter(p => p.stock_quantity > 0).length}
              </dd>
            </div>
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Sản phẩm cần nhập thêm</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {products.filter(p => p.stock_quantity < 10).length}
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}