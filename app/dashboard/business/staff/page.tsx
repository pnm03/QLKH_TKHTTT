'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme } from '@/app/context/ThemeContext'
import { UserIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CalendarIcon, CurrencyDollarIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { createClient } from '@/utils/supabase/client'
import AccessDenied from '@/components/AccessDenied'

// Định nghĩa kiểu dữ liệu cho chi nhánh
interface Branch {
  branch_id: number
  branch_name: string
  branch_address: string
  manager_id: string | null
  manager?: User // Thông tin người quản lý
}

// Định nghĩa kiểu dữ liệu cho nhân viên
interface Staff {
  staff_id: number
  user_id: string
  start_date: string
  end_date: string | null
  work_shift: string
  salary: number
  contract_type: 'full-time' | 'part-time' | 'contract'
  employment_status: 'active' | 'on-leave' | 'terminated'
  reports_to_user_id: string | null
  // Thông tin từ bảng Users
  user?: User
  manager?: User
  manager_branch?: Branch // Chi nhánh của người quản lý
}

// Định nghĩa kiểu dữ liệu cho người dùng
interface User {
  user_id: string
  full_name: string
  email: string
  phone?: string
  birth_date?: string
  hometown?: string
  branch_id?: number
  branch?: Branch // Thông tin chi nhánh
}

// Hàm cắt ngắn văn bản và thêm dấu "..." nếu vượt quá độ dài cho phép
function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Hàm định dạng tiền tệ
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount);
}

// Hàm định dạng ngày tháng
function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: vi });
  } catch (error) {
    console.error('Lỗi định dạng ngày:', error);
    return dateString;
  }
}

// Hàm chuyển đổi loại hợp đồng sang tiếng Việt
function getContractTypeText(type: string): string {
  switch (type) {
    case 'full-time': return 'Toàn thời gian';
    case 'part-time': return 'Bán thời gian';
    case 'contract': return 'Hợp đồng';
    default: return type;
  }
}

// Hàm chuyển đổi trạng thái làm việc sang tiếng Việt
function getEmploymentStatusText(status: string): string {
  switch (status) {
    case 'active': return 'Đang làm việc';
    case 'on-leave': return 'Nghỉ phép';
    case 'terminated': return 'Đã nghỉ việc';
    default: return status;
  }
}

// Hàm lấy màu cho trạng thái làm việc
function getEmploymentStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'on-leave': return 'bg-yellow-100 text-yellow-800';
    case 'terminated': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function StaffPage() {
  const supabase = createClientComponentClient()
  const themeContext = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [managers, setManagers] = useState<(User & { branch?: Branch })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State cho popup
  const [showAddPopup, setShowAddPopup] = useState(false)
  const [showViewPopup, setShowViewPopup] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)

  // Form data
  const [formData, setFormData] = useState<{
    user_id: string
    start_date: string
    end_date: string | null
    work_shift: string
    salary: number
    contract_type: 'full-time' | 'part-time' | 'contract'
    employment_status: 'active' | 'on-leave' | 'terminated'
    reports_to_user_id: string | null
    branch_id?: number | null
  }>({
    user_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    work_shift: '',
    salary: 0,
    contract_type: 'full-time',
    employment_status: 'active',
    reports_to_user_id: null,
    branch_id: null
  })

  // Hệ thống thông báo
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
  }, [])

  // Kiểm tra vai trò người dùng hiện tại có phải admin không
  useEffect(() => {
    if (mounted) {
      const checkUserRole = async () => {
        try {
          const client = createClient()
          const { data: { session }, error: sessionError } = await client.auth.getSession()

          if (sessionError || !session) {
            console.error('Không có phiên đăng nhập:', sessionError?.message)
            setIsAdmin(false)
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
            setIsAdmin(false)
            setAuthLoading(false)
            return
          }

          setIsAdmin(accountData.role === 'admin')
          setAuthLoading(false)
        } catch (error) {
          console.error('Lỗi khi kiểm tra vai trò:', error)
          setIsAdmin(false)
          setAuthLoading(false)
        }
      }

      checkUserRole()
    }
  }, [mounted])

  // Fetch dữ liệu nhân viên và người dùng
  useEffect(() => {
    if (!mounted) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch danh sách chi nhánh
        console.log('Đang tải dữ liệu chi nhánh...')
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('branch_id, branch_name, branch_address, manager_id')
          .order('branch_id', { ascending: true })

        if (branchError) {
          console.error('Lỗi khi tải dữ liệu chi nhánh:', branchError)
          console.error('Chi tiết lỗi:', JSON.stringify(branchError, null, 2))
          setError(`Không thể tải dữ liệu chi nhánh: ${branchError.message}`)
          setLoading(false)
          return
        }

        console.log('Đã tải dữ liệu chi nhánh thành công:', branchData?.length || 0, 'chi nhánh')
        setBranches(branchData || [])

        // Fetch danh sách người dùng
        console.log('Đang tải dữ liệu người dùng...')
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id, full_name, email, phone, birth_date, hometown, branch_id')
          .order('full_name', { ascending: true })

        if (userError) {
          console.error('Lỗi khi tải dữ liệu người dùng:', userError)
          console.error('Chi tiết lỗi:', JSON.stringify(userError, null, 2))
          setError(`Không thể tải dữ liệu người dùng: ${userError.message}`)
          setLoading(false)
          return
        }

        console.log('Đã tải dữ liệu người dùng thành công:', userData?.length || 0, 'người dùng')

        // Kết hợp thông tin chi nhánh vào người dùng
        const enhancedUserData = userData.map((user: User) => {
          const branch = branchData.find((b: Branch) => b.branch_id === user.branch_id)
          return {
            ...user,
            branch
          }
        })

        setUsers(enhancedUserData || [])

        // Tạo danh sách quản lý (người dùng là quản lý của chi nhánh)
        const managerList = enhancedUserData.filter((user: User) => {
          return branchData.some((branch: Branch) => branch.manager_id === user.user_id)
        })

        // Thêm thông tin chi nhánh vào quản lý
        const managersWithBranch = managerList.map((manager: User) => {
          const branch = branchData.find((b: Branch) => b.manager_id === manager.user_id)
          return {
            ...manager,
            branch
          }
        })

        setManagers(managersWithBranch || [])
        console.log('Đã tải dữ liệu quản lý thành công:', managersWithBranch?.length || 0, 'quản lý')

        // Fetch danh sách nhân viên
        console.log('Đang tải dữ liệu nhân viên...')
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .order('staff_id', { ascending: true })

        if (staffError) {
          console.error('Lỗi khi tải dữ liệu nhân viên:', staffError)
          console.error('Chi tiết lỗi:', JSON.stringify(staffError, null, 2))
          setError(`Không thể tải dữ liệu nhân viên: ${staffError.message}`)
          setLoading(false)
          return
        }

        console.log('Đã tải dữ liệu nhân viên thành công:', staffData?.length || 0, 'nhân viên')

        // Kết hợp dữ liệu nhân viên với thông tin người dùng và chi nhánh
        console.log('Đang kết hợp dữ liệu...')
        const enhancedStaffData = staffData.map((staff: Staff) => {
          const user = enhancedUserData.find((u: User) => u.user_id === staff.user_id)
          const manager = enhancedUserData.find((u: User) => u.user_id === staff.reports_to_user_id)

          // Tìm chi nhánh của người quản lý
          let manager_branch = null
          if (manager) {
            manager_branch = branchData.find((b: Branch) => b.manager_id === manager.user_id)
          }

          return {
            ...staff,
            user,
            manager,
            manager_branch
          }
        })

        setStaffList(enhancedStaffData || [])
        console.log('Đã hoàn thành việc tải dữ liệu')
      } catch (error: any) {
        // Hiển thị chi tiết lỗi
        console.error('Lỗi khi tải dữ liệu:', error)

        // Hiển thị thêm thông tin về lỗi
        console.error('Loại lỗi:', typeof error)
        console.error('Chuỗi lỗi:', String(error))
        console.error('Stack trace:', error?.stack)

        // Thử chuyển đổi lỗi thành JSON để xem tất cả thuộc tính
        try {
          console.error('Chi tiết lỗi (JSON):', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
        } catch (jsonError) {
          console.error('Không thể chuyển đổi lỗi thành JSON:', jsonError)
        }

        // Hiển thị thông báo lỗi chi tiết hơn
        let errorMessage = 'Không thể tải dữ liệu: ';

        if (error instanceof Error) {
          errorMessage += `${error.name}: ${error.message}`;
          if (error.stack) {
            errorMessage += ` (Stack: ${error.stack.split('\n')[0]})`;
          }
        } else if (typeof error === 'object' && error !== null) {
          errorMessage += JSON.stringify(error);
        } else {
          errorMessage += String(error);
        }

        setError(errorMessage)
        setUsers([]) // Đặt mảng rỗng để tránh lỗi khi render
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [mounted, supabase])

  // Xử lý thay đổi input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (name === 'salary') {
      // Chỉ cho phép nhập số
      const numericValue = value.replace(/[^0-9]/g, '')
      setFormData(prev => ({
        ...prev,
        [name]: numericValue ? parseInt(numericValue) : 0
      }))
    } else if (name === 'end_date' && value === '') {
      // Xử lý trường hợp end_date rỗng
      setFormData(prev => ({
        ...prev,
        [name]: null
      }))
    } else if (name === 'user_id') {
      // Xử lý trường select với giá trị rỗng
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : value
      }))
    } else if (name === 'reports_to_user_id') {
      // Xử lý khi chọn quản lý
      if (value === '') {
        // Nếu không chọn quản lý
        setFormData(prev => ({
          ...prev,
          reports_to_user_id: null,
          branch_id: null // Xóa chi nhánh
        }))
      } else {
        // Tìm chi nhánh của quản lý đã chọn
        const manager = managers.find(m => m.user_id === value)
        const managerBranch = branches.find(b => b.manager_id === value)

        // Nếu quản lý có chi nhánh, cập nhật branch_id
        if (manager && manager.branch) {
          setFormData(prev => ({
            ...prev,
            reports_to_user_id: value,
            branch_id: manager.branch?.branch_id
          }))
        } else if (managerBranch) {
          // Nếu quản lý là manager_id trong bảng branches
          setFormData(prev => ({
            ...prev,
            reports_to_user_id: value,
            branch_id: managerBranch.branch_id
          }))
        } else {
          // Nếu không tìm thấy chi nhánh
          setFormData(prev => ({
            ...prev,
            reports_to_user_id: value,
            branch_id: null
          }))
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // Mở popup thêm nhân viên mới
  const openAddPopup = () => {
    setFormData({
      user_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      work_shift: '',
      salary: 0,
      contract_type: 'full-time',
      employment_status: 'active',
      reports_to_user_id: null
    })
    setIsEditing(false)
    setShowAddPopup(true)
  }

  // Đóng popup thêm/sửa
  const closeAddPopup = () => {
    setShowAddPopup(false)
  }

  // Mở popup xem chi tiết
  const openViewPopup = (staff: Staff) => {
    setSelectedStaff(staff)
    setShowViewPopup(true)
  }

  // Đóng popup xem chi tiết
  const closeViewPopup = () => {
    setShowViewPopup(false)
    setSelectedStaff(null)
  }

  // Chuyển sang chế độ chỉnh sửa
  const startEditing = () => {
    if (selectedStaff) {
      setFormData({
        user_id: selectedStaff.user_id,
        start_date: selectedStaff.start_date,
        end_date: selectedStaff.end_date,
        work_shift: selectedStaff.work_shift,
        salary: selectedStaff.salary,
        contract_type: selectedStaff.contract_type,
        employment_status: selectedStaff.employment_status,
        reports_to_user_id: selectedStaff.reports_to_user_id
      })
      setIsEditing(true)
      setShowViewPopup(false)
      setShowAddPopup(true)
    }
  }

  // Mở popup xác nhận xóa
  const openDeleteConfirm = () => {
    setShowViewPopup(false)
    setShowDeleteConfirm(true)
  }

  // Hủy xóa
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // Xử lý xóa nhân viên
  const handleDelete = async () => {
    if (!selectedStaff) return

    try {
      // Lấy ngày hiện tại ở định dạng ISO
      const currentDate = new Date().toISOString().split('T')[0];

      // Gọi API để xóa tài khoản từ bảng accounts
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedStaff.user_id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Không thể xóa tài khoản');
      }

      // Cập nhật trạng thái nhân viên thành "terminated" và ngày kết thúc thành ngày hiện tại
      const { error: updateError } = await supabase
        .from('staff')
        .update({
          employment_status: 'terminated',
          end_date: currentDate
        })
        .eq('staff_id', selectedStaff.staff_id);

      if (updateError) throw updateError;

      // Cập nhật state
      setStaffList(prev => prev.map(staff =>
        staff.staff_id === selectedStaff.staff_id
          ? {
              ...staff,
              employment_status: 'terminated',
              end_date: currentDate
            }
          : staff
      ));

      showNotification('Đã vô hiệu hóa tài khoản nhân viên thành công!', 'success');

      // Đóng popup
      setShowDeleteConfirm(false);
      setSelectedStaff(null);
    } catch (error: any) {
      console.error('Lỗi khi vô hiệu hóa nhân viên:', error);
      showNotification(`Lỗi: ${error.message || 'Không thể vô hiệu hóa nhân viên'}`, 'error');
    }
  }

  // Xử lý thêm/sửa nhân viên
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Kiểm tra người dùng đã tồn tại trong bảng staff chưa
      if (!isEditing) {
        const { data: existingStaff, error: checkError } = await supabase
          .from('staff')
          .select('staff_id')
          .eq('user_id', formData.user_id)

        if (checkError) throw checkError

        if (existingStaff && existingStaff.length > 0) {
          throw new Error('Người dùng này đã là nhân viên. Vui lòng chọn người dùng khác.')
        }
      }

      // Cập nhật branch_id trong bảng users
      if (formData.user_id && formData.branch_id !== undefined) {
        console.log('Cập nhật chi nhánh cho người dùng:', formData.user_id, 'thành', formData.branch_id)

        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            branch_id: formData.branch_id
          })
          .eq('user_id', formData.user_id)

        if (updateUserError) {
          console.error('Lỗi khi cập nhật chi nhánh cho người dùng:', updateUserError)
          // Không throw lỗi ở đây, vẫn tiếp tục lưu thông tin nhân viên
        }
      }

      if (isEditing && selectedStaff) {
        // Cập nhật nhân viên
        const { error } = await supabase
          .from('staff')
          .update({
            user_id: formData.user_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            work_shift: formData.work_shift,
            salary: formData.salary,
            contract_type: formData.contract_type,
            employment_status: formData.employment_status,
            reports_to_user_id: formData.reports_to_user_id
          })
          .eq('staff_id', selectedStaff.staff_id)

        if (error) throw error

        // Tìm thông tin người dùng và người quản lý
        const user = users.find(u => u.user_id === formData.user_id)
        const manager = users.find(u => u.user_id === formData.reports_to_user_id)

        // Tìm chi nhánh của người quản lý
        let manager_branch = null
        if (manager) {
          manager_branch = branches.find(b => b.manager_id === manager.user_id)
        }

        // Cập nhật state
        setStaffList(prev => prev.map(staff =>
          staff.staff_id === selectedStaff.staff_id
            ? {
                ...staff,
                ...formData,
                user: {
                  ...user,
                  branch_id: formData.branch_id
                },
                manager,
                manager_branch
              }
            : staff
        ))

        // Cập nhật danh sách users
        setUsers(prev => prev.map(user =>
          user.user_id === formData.user_id
            ? {
                ...user,
                branch_id: formData.branch_id
              }
            : user
        ))

        showNotification('Cập nhật nhân viên thành công!', 'success')
      } else {
        // Thêm nhân viên mới
        const { data, error } = await supabase
          .from('staff')
          .insert({
            user_id: formData.user_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            work_shift: formData.work_shift,
            salary: formData.salary,
            contract_type: formData.contract_type,
            employment_status: formData.employment_status,
            reports_to_user_id: formData.reports_to_user_id
          })
          .select()

        if (error) throw error

        // Tìm thông tin người dùng và người quản lý
        const user = users.find(u => u.user_id === formData.user_id)
        const manager = users.find(u => u.user_id === formData.reports_to_user_id)

        // Tìm chi nhánh của người quản lý
        let manager_branch = null
        if (manager) {
          manager_branch = branches.find(b => b.manager_id === manager.user_id)
        }

        // Cập nhật state
        if (data && data.length > 0) {
          const newStaff = {
            ...data[0],
            user: {
              ...user,
              branch_id: formData.branch_id
            },
            manager,
            manager_branch
          }
          setStaffList(prev => [...prev, newStaff])

          // Cập nhật danh sách users
          setUsers(prev => prev.map(user =>
            user.user_id === formData.user_id
              ? {
                  ...user,
                  branch_id: formData.branch_id
                }
              : user
          ))
        }

        showNotification('Thêm nhân viên thành công!', 'success')
      }

      // Đóng popup
      closeAddPopup()

      // Reset form
      setFormData({
        user_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        work_shift: '',
        salary: 0,
        contract_type: 'full-time',
        employment_status: 'active',
        reports_to_user_id: null,
        branch_id: null
      })

      setIsEditing(false)
      setSelectedStaff(null)
    } catch (error: any) {
      console.error('Lỗi khi lưu nhân viên:', error)
      showNotification(`Lỗi: ${error.message || 'Không thể lưu nhân viên'}`, 'error')
    }
  }

  if (!mounted) return null

  // Lấy theme hiện tại
  const currentTheme = themeContext.currentTheme

  // Hiển thị loading khi đang kiểm tra quyền
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-2 text-gray-500">Đang tải...</p>
      </div>
    )
  }

  // Hiển thị thông báo từ chối truy cập nếu không phải admin
  if (!isAdmin) {
    return <AccessDenied message="Truy cập bị từ chối. Bạn không có quyền truy cập chức năng quản lý nhân viên. Chỉ có admin mới truy cập được." />
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserIcon className={`h-8 w-8 ${currentTheme?.textColor || 'text-blue-500'} mr-3`} />
                <h2 className="text-2xl font-bold text-gray-900">
                  Quản lý nhân viên
                </h2>
              </div>
              <button
                type="button"
                onClick={openAddPopup}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${currentTheme?.bgColor || 'bg-blue-600'} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme?.ringColor || 'focus:ring-blue-500'}`}
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Thêm nhân viên
              </button>
            </div>
          </div>

          <div className="px-6 py-8">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 my-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-red-800">Lỗi khi tải dữ liệu:</p>
                    <div className="mt-1 text-sm text-red-700 break-words whitespace-pre-wrap">
                      {error}
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Tải lại trang
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có nhân viên</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Bắt đầu bằng cách thêm nhân viên mới.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={openAddPopup}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${currentTheme?.bgColor || 'bg-blue-600'} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme?.ringColor || 'focus:ring-blue-500'}`}
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Thêm nhân viên
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
                        Nhân viên
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày bắt đầu
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ca làm việc
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lương
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loại hợp đồng
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quản lý
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chi nhánh
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffList.map(staff => (
                      <tr
                        key={staff.staff_id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openViewPopup(staff)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.staff_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${currentTheme?.bgLight || 'bg-blue-100'}`}>
                                <UserCircleIcon className={`h-6 w-6 ${currentTheme?.textColor || 'text-blue-600'}`} />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900" title={staff.user?.full_name || ''}>
                                {truncateText(staff.user?.full_name || '', 30)}
                              </div>
                              <div className="text-sm text-gray-500" title={staff.user?.email || ''}>
                                {truncateText(staff.user?.email || '', 30)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(staff.start_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={staff.work_shift}>
                          {truncateText(staff.work_shift, 20)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(staff.salary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getContractTypeText(staff.contract_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEmploymentStatusColor(staff.employment_status)}`}>
                            {getEmploymentStatusText(staff.employment_status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={staff.manager?.full_name || 'Không có'}>
                          {staff.manager ? truncateText(staff.manager.full_name, 20) : 'Không có'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={branches.find(b => b.branch_id === staff.user?.branch_id)?.branch_name || 'Chưa có chi nhánh'}>
                          {staff.user?.branch_id
                            ? truncateText(branches.find(b => b.branch_id === staff.user?.branch_id)?.branch_name || 'Không xác định', 20)
                            : 'Chưa có chi nhánh'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStaff(staff);
                              startEditing();
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStaff(staff);
                              openDeleteConfirm();
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

      {/* Popup xem chi tiết nhân viên */}
      {showViewPopup && selectedStaff && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={closeViewPopup}></div>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md p-6 border-2 ${currentTheme?.borderColor || 'border-blue-500'} relative`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Chi tiết nhân viên</h3>
              <button
                onClick={closeViewPopup}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-16 w-16">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${currentTheme?.bgLight || 'bg-blue-100'}`}>
                    <UserCircleIcon className={`h-10 w-10 ${currentTheme?.textColor || 'text-blue-600'}`} />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">{selectedStaff.user?.full_name}</h4>
                  <p className="text-sm text-gray-500">{selectedStaff.user?.email}</p>
                  {selectedStaff.user?.phone && (
                    <p className="text-sm text-gray-500">{selectedStaff.user.phone}</p>
                  )}
                  {selectedStaff.user?.hometown && (
                    <p className="text-sm text-gray-500">Quê quán: {selectedStaff.user.hometown}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">ID nhân viên</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedStaff.staff_id}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Trạng thái</h4>
                  <p className="mt-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEmploymentStatusColor(selectedStaff.employment_status)}`}>
                      {getEmploymentStatusText(selectedStaff.employment_status)}
                    </span>
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Ngày bắt đầu</h4>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedStaff.start_date)}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Ngày kết thúc</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedStaff.end_date ? formatDate(selectedStaff.end_date) : 'N/A'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Ca làm việc</h4>
                  <p className="mt-1 text-sm text-gray-900 break-words">{selectedStaff.work_shift}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Lương</h4>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedStaff.salary)}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Loại hợp đồng</h4>
                  <p className="mt-1 text-sm text-gray-900">{getContractTypeText(selectedStaff.contract_type)}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Quản lý</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedStaff.manager?.full_name || 'Không có'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Chi nhánh</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedStaff.user?.branch_id
                      ? branches.find(b => b.branch_id === selectedStaff.user?.branch_id)?.branch_name || 'Không xác định'
                      : 'Chưa có chi nhánh'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={startEditing}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${currentTheme?.bgColor || 'bg-blue-600'} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme?.ringColor || 'focus:ring-blue-500'}`}
              >
                <PencilIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={openDeleteConfirm}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup thêm/sửa nhân viên */}
      {showAddPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={closeAddPopup}></div>
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-md p-6 border-2 ${currentTheme?.borderColor || 'border-blue-500'} relative`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {isEditing ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
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
                  <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                    Người dùng <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="user_id"
                    name="user_id"
                    required
                    disabled={isEditing}
                    value={formData.user_id || ''}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isEditing ? 'bg-gray-100' : ''}`}
                  >
                    <option value="">-- Chọn người dùng --</option>
                    {users.map(user => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                      Ngày bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      id="start_date"
                      required
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      id="end_date"
                      value={formData.end_date || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="work_shift" className="block text-sm font-medium text-gray-700">
                    Ca làm việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="work_shift"
                    id="work_shift"
                    required
                    value={formData.work_shift}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: 8:00 - 17:00, Thứ 2 - Thứ 6"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                    Lương (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="salary"
                    id="salary"
                    required
                    value={formData.salary}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Nhập lương"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contract_type" className="block text-sm font-medium text-gray-700">
                      Loại hợp đồng <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="contract_type"
                      name="contract_type"
                      required
                      value={formData.contract_type}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="full-time">Toàn thời gian</option>
                      <option value="part-time">Bán thời gian</option>
                      <option value="contract">Hợp đồng</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="employment_status" className="block text-sm font-medium text-gray-700">
                      Trạng thái <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="employment_status"
                      name="employment_status"
                      required
                      value={formData.employment_status}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="active">Đang làm việc</option>
                      <option value="on-leave">Nghỉ phép</option>
                      <option value="terminated">Đã nghỉ việc</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="reports_to_user_id" className="block text-sm font-medium text-gray-700">
                    Quản lý trực tiếp
                  </label>
                  <select
                    id="reports_to_user_id"
                    name="reports_to_user_id"
                    value={formData.reports_to_user_id || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">-- Không có quản lý --</option>
                    {managers.length > 0 ? (
                      managers.map(manager => (
                        <option key={manager.user_id} value={manager.user_id}>
                          {manager.full_name} - Chi nhánh: {manager.branch?.branch_name || 'Không xác định'}
                        </option>
                      ))
                    ) : (
                      <option disabled>Không có quản lý nào</option>
                    )}
                  </select>
                  {formData.branch_id && (
                    <p className="mt-1 text-xs text-gray-500">
                      Chi nhánh: {branches.find(b => b.branch_id === formData.branch_id)?.branch_name || 'Không xác định'}
                    </p>
                  )}
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

      {/* Popup xác nhận xóa */}
      {showDeleteConfirm && selectedStaff && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-10" onClick={cancelDelete}></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border-2 border-red-500 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-red-600">Xác nhận vô hiệu hóa tài khoản</h3>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Bạn có chắc chắn muốn vô hiệu hóa tài khoản của nhân viên <span className="font-semibold">{selectedStaff.user?.full_name}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                <strong>Lưu ý:</strong> Hành động này sẽ:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-500 mt-1 ml-2">
                <li>Xóa tài khoản đăng nhập của nhân viên</li>
                <li>Đổi trạng thái làm việc thành "Đã nghỉ việc"</li>
                <li>Cập nhật ngày kết thúc thành ngày hiện tại ({new Date().toLocaleDateString('vi-VN')})</li>
                <li>Giữ lại thông tin cá nhân của nhân viên trong hệ thống</li>
              </ul>
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
                Xác nhận vô hiệu hóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}