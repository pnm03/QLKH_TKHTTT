'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme } from '@/app/context/ThemeContext'
import { BuildingOfficeIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'

// Định nghĩa kiểu dữ liệu cho chi nhánh
interface Branch {
  branch_id: number
  branch_name: string
  branch_address: string
  manager_id: string | null
}

// Định nghĩa kiểu dữ liệu cho người dùng (để hiển thị danh sách quản lý)
interface User {
  user_id: string
  full_name: string
  email: string
}

export default function BranchesPage() {
  const supabase = createClientComponentClient()
  const themeContext = useTheme()
  const [mounted, setMounted] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State cho popup
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [showViewPopup, setShowViewPopup] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<{
    branch_name: string
    branch_address: string
    manager_id: string | null
  }>({
    branch_name: '',
    branch_address: '',
    manager_id: null
  })

  // Thông báo
  interface NotificationState {
    visible: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }
  
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    message: '',
    type: 'info'
  })
  
  // Hiển thị thông báo
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
  }, [])

  // Fetch dữ liệu chi nhánh và người dùng
  useEffect(() => {
    if (!mounted) return
    
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch danh sách chi nhánh
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .order('branch_id', { ascending: true })
        
        if (branchError) throw branchError
        
        // Fetch danh sách người dùng (để chọn quản lý)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id, full_name, email')
          .order('full_name', { ascending: true })
        
        if (userError) throw userError
        
        setBranches(branchData || [])
        setUsers(userData || [])
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error)
        setError('Không thể tải dữ liệu chi nhánh. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [mounted, supabase])

  // Xử lý thay đổi input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'manager_id' ? (value === '' ? null : value) : value
    }))
  }

  // Mở popup thêm chi nhánh mới
  const openAddPopup = () => {
    setFormData({
      branch_name: '',
      branch_address: '',
      manager_id: null
    })
    setIsEditing(false)
    setShowAddPopup(true)
  }

  // Đóng popup thêm/sửa
  const closeAddPopup = () => {
    setShowAddPopup(false)
  }

  // Mở popup xem chi tiết
  const openViewPopup = (branch: Branch) => {
    setSelectedBranch(branch)
    setShowViewPopup(true)
  }

  // Đóng popup xem chi tiết
  const closeViewPopup = () => {
    setShowViewPopup(false)
    setSelectedBranch(null)
  }

  // Chuyển sang chế độ chỉnh sửa
  const startEditing = () => {
    if (selectedBranch) {
      setFormData({
        branch_name: selectedBranch.branch_name,
        branch_address: selectedBranch.branch_address,
        manager_id: selectedBranch.manager_id
      })
      setIsEditing(true)
      setShowViewPopup(false)
      setShowAddPopup(true)
    }
  }

  // Hiển thị xác nhận xóa
  const confirmDelete = () => {
    setShowDeleteConfirm(true)
  }

  // Hủy xóa
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // Xử lý thêm chi nhánh mới
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isEditing && selectedBranch) {
        // Cập nhật chi nhánh
        const { error } = await supabase
          .from('branches')
          .update({
            branch_name: formData.branch_name,
            branch_address: formData.branch_address,
            manager_id: formData.manager_id
          })
          .eq('branch_id', selectedBranch.branch_id)
        
        if (error) throw error
        
        // Cập nhật state
        setBranches(prev => prev.map(branch => 
          branch.branch_id === selectedBranch.branch_id 
            ? { ...branch, ...formData } 
            : branch
        ))
        
        showNotification('Cập nhật chi nhánh thành công!', 'success')
      } else {
        // Thêm chi nhánh mới
        const { data, error } = await supabase
          .from('branches')
          .insert({
            branch_name: formData.branch_name,
            branch_address: formData.branch_address,
            manager_id: formData.manager_id
          })
          .select()
        
        if (error) throw error
        
        // Cập nhật state
        if (data && data.length > 0) {
          setBranches(prev => [...prev, data[0]])
        }
        
        showNotification('Thêm chi nhánh thành công!', 'success')
      }
      
      // Đóng popup
      closeAddPopup()
      
      // Reset form
      setFormData({
        branch_name: '',
        branch_address: '',
        manager_id: null
      })
      
      setIsEditing(false)
      setSelectedBranch(null)
    } catch (error: any) {
      console.error('Lỗi khi lưu chi nhánh:', error)
      showNotification(`Lỗi: ${error.message || 'Không thể lưu chi nhánh'}`, 'error')
    }
  }

  // Xử lý xóa chi nhánh
  const handleDelete = async () => {
    if (!selectedBranch) return
    
    try {
      // Kiểm tra xem chi nhánh có người dùng không
      const { data: usersInBranch, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .eq('branch_id', selectedBranch.branch_id)
      
      if (checkError) throw checkError
      
      if (usersInBranch && usersInBranch.length > 0) {
        throw new Error('Không thể xóa chi nhánh này vì có người dùng đang thuộc về chi nhánh')
      }
      
      // Xóa chi nhánh
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('branch_id', selectedBranch.branch_id)
      
      if (error) throw error
      
      // Cập nhật state
      setBranches(prev => prev.filter(branch => branch.branch_id !== selectedBranch.branch_id))
      
      showNotification('Xóa chi nhánh thành công!', 'success')
      
      // Đóng popup
      setShowDeleteConfirm(false)
      setShowViewPopup(false)
      setSelectedBranch(null)
    } catch (error: any) {
      console.error('Lỗi khi xóa chi nhánh:', error)
      showNotification(`Lỗi: ${error.message || 'Không thể xóa chi nhánh'}`, 'error')
      setShowDeleteConfirm(false)
    }
  }

  // Lấy tên người quản lý từ user_id
  const getManagerName = (managerId: string | null) => {
    if (!managerId) return 'Chưa có quản lý'
    const manager = users.find(user => user.user_id === managerId)
    return manager ? manager.full_name : 'Không tìm thấy'
  }

  if (!mounted) return null

  // Lấy theme hiện tại
  const currentTheme = themeContext.currentTheme

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BuildingOfficeIcon className={`h-8 w-8 ${currentTheme?.textColor || 'text-blue-500'} mr-3`} />
                <h2 className="text-2xl font-bold text-gray-900">
                  Quản lý chi nhánh
                </h2>
              </div>
              <button
                type="button"
                onClick={openAddPopup}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${currentTheme?.bgColor || 'bg-blue-600'} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme?.ringColor || 'focus:ring-blue-500'}`}
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Thêm chi nhánh
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${currentTheme?.borderColor || 'border-blue-500'}`}></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Lỗi! </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-8">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có chi nhánh</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Bắt đầu bằng cách thêm chi nhánh đầu tiên cho doanh nghiệp của bạn.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={openAddPopup}
                    className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${currentTheme?.bgColor || 'bg-blue-600'} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme?.ringColor || 'focus:ring-blue-500'}`}
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Thêm chi nhánh
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tên chi nhánh
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Địa chỉ
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quản lý
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Hành động</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {branches.map((branch) => (
                      <tr 
                        key={branch.branch_id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openViewPopup(branch)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {branch.branch_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{branch.branch_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{branch.branch_address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{getManagerName(branch.manager_id)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBranch(branch);
                              startEditing();
                            }}
                            className={`text-indigo-600 hover:text-indigo-900 mr-3`}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBranch(branch);
                              confirmDelete();
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
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

      {/* Popup thêm/sửa chi nhánh */}
      {showAddPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={closeAddPopup}></div>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md p-6 border-2 ${currentTheme?.borderColor || 'border-blue-500'} relative`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {isEditing ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}
              </h3>
              <button
                onClick={closeAddPopup}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700">
                    Tên chi nhánh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="branch_name"
                    id="branch_name"
                    required
                    value={formData.branch_name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Nhập tên chi nhánh"
                  />
                </div>

                <div>
                  <label htmlFor="branch_address" className="block text-sm font-medium text-gray-700">
                    Địa chỉ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="branch_address"
                    id="branch_address"
                    required
                    value={formData.branch_address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Nhập địa chỉ chi nhánh"
                  />
                </div>

                <div>
                  <label htmlFor="manager_id" className="block text-sm font-medium text-gray-700">
                    Quản lý
                  </label>
                  <select
                    id="manager_id"
                    name="manager_id"
                    value={formData.manager_id || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">-- Chọn quản lý --</option>
                    {users.map(user => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeAddPopup}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${currentTheme?.bgColor || 'bg-blue-600'} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme?.ringColor || 'focus:ring-blue-500'}`}
                >
                  {isEditing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup xem chi tiết chi nhánh */}
      {showViewPopup && selectedBranch && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={closeViewPopup}></div>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md p-6 border-2 ${currentTheme?.borderColor || 'border-blue-500'} relative`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Chi tiết chi nhánh</h3>
              <button
                onClick={closeViewPopup}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">ID</h4>
                <p className="mt-1 text-sm text-gray-900">{selectedBranch.branch_id}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Tên chi nhánh</h4>
                <p className="mt-1 text-sm text-gray-900">{selectedBranch.branch_name}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Địa chỉ</h4>
                <p className="mt-1 text-sm text-gray-900">{selectedBranch.branch_address}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Quản lý</h4>
                <p className="mt-1 text-sm text-gray-900">{getManagerName(selectedBranch.manager_id)}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeViewPopup}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="-ml-1 mr-2 h-4 w-4" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup xác nhận xóa */}
      {showDeleteConfirm && selectedBranch && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={cancelDelete}></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border-2 border-red-500 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-red-600">Xác nhận xóa</h3>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Bạn có chắc chắn muốn xóa chi nhánh <span className="font-semibold">{selectedBranch.branch_name}</span>? 
                Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}