'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createAdminClient } from '@/utils/supabase/server'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  full_name: string | null
  role: string | null
  status: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionResult, setActionResult] = useState<{success: boolean, message: string} | null>(null)

  const supabase = createClient()

  // Load danh sách người dùng
  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true)
        setError(null)

        // Lấy dữ liệu kết hợp từ bảng auth.users và public tables
        const { data, error } = await supabase.from('users')
          .select(`
            id,
            email,
            user_id,
            full_name,
            accounts!inner (
              role,
              status,
              last_login
            )
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Lỗi khi lấy danh sách người dùng:', error)
          setError('Không thể tải danh sách người dùng. Vui lòng thử lại sau.')
          return
        }

        // Lấy thông tin chi tiết từ auth.users
        const { data: authUsers, error: authError } = await supabase.from('auth_users_view')
          .select('id, email, created_at, last_sign_in_at')

        if (authError) {
          console.error('Lỗi khi lấy thông tin auth users:', authError)
        }

        // Kết hợp dữ liệu
        const combinedUsers = data.map(user => {
          const authUser = authUsers?.find(au => au.id === user.user_id) || {}
          return {
            id: user.user_id,
            email: user.email || authUser.email,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            full_name: user.full_name,
            role: user.accounts?.role || 'Không xác định',
            status: user.accounts?.status || 'Không hoạt động'
          }
        })

        setUsers(combinedUsers)
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err)
        setError('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [supabase])

  // Xóa người dùng
  const deleteUser = async (userId: string) => {
    try {
      setLoading(true)
      setActionResult(null)

      // Gọi API endpoint để xóa người dùng (có thể tạo một API route riêng)
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Không thể xóa người dùng')
      }

      // Xóa người dùng khỏi state
      setUsers(users.filter(user => user.id !== userId))
      setActionResult({
        success: true,
        message: 'Người dùng đã được xóa thành công'
      })
    } catch (err) {
      console.error('Lỗi khi xóa người dùng:', err)
      setActionResult({
        success: false,
        message: err instanceof Error ? err.message : 'Lỗi không xác định khi xóa người dùng'
      })
    } finally {
      setLoading(false)
      setDeleteUserId(null)
      setConfirmDelete(false)
    }
  }

  // Hàm xử lý khi nhấn nút xóa
  const handleDeleteClick = (userId: string) => {
    setDeleteUserId(userId)
    setConfirmDelete(true)
  }

  // Huỷ xóa
  const cancelDelete = () => {
    setDeleteUserId(null)
    setConfirmDelete(false)
  }

  // Xác nhận xóa
  const confirmDeleteUser = () => {
    if (deleteUserId) {
      deleteUser(deleteUserId)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Quản lý người dùng</h1>

      {/* Thông báo kết quả */}
      {actionResult && (
        <div className={`mb-4 p-4 rounded ${actionResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {actionResult.message}
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {/* Bảng danh sách người dùng */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Email</th>
                <th className="py-2 px-4 border-b text-left">Tên</th>
                <th className="py-2 px-4 border-b text-left">Vai trò</th>
                <th className="py-2 px-4 border-b text-left">Trạng thái</th>
                <th className="py-2 px-4 border-b text-left">Ngày tạo</th>
                <th className="py-2 px-4 border-b text-left">Đăng nhập lần cuối</th>
                <th className="py-2 px-4 border-b text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">{user.full_name || 'Chưa cập nhật'}</td>
                    <td className="py-2 px-4 border-b">{user.role}</td>
                    <td className="py-2 px-4 border-b">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 
                        user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status === 'active' ? 'Đang hoạt động' : 
                         user.status === 'pending' ? 'Chờ xác nhận' : user.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="py-2 px-4 border-b">
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString('vi-VN') 
                        : 'Chưa đăng nhập'}
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      <button 
                        onClick={() => handleDeleteClick(user.id)} 
                        className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-xs"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500">
                    Không có người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Xác nhận xóa người dùng</h3>
            <p className="mb-6 text-gray-600">
              Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 