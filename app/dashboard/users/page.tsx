'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, KeyIcon, ArrowUpIcon, ArrowDownIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { Dialog, Transition } from '@headlessui/react'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

// Định nghĩa kiểu dữ liệu cho người dùng
interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  avatar_url?: string | null
  created_at: string
}

type SortField = 'name' | 'email' | 'role' | 'status' | 'created_at'
type SortOrder = 'asc' | 'desc'

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Sắp xếp
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Lấy thông tin theme từ context nhưng chỉ sử dụng khi component đã mounted
  const themeContext = useTheme()
  
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })
  
  const [showUserSearchModal, setShowUserSearchModal] = useState(false)
  const [searchModalTerm, setSearchModalTerm] = useState('')
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })
    }
  }, [mounted, themeContext.currentTheme])
  
  // Thêm giá trị mặc định cho theme để tránh lỗi
  useEffect(() => {
    // Đảm bảo theme luôn có giá trị mặc định ngay cả khi context chưa load xong
    if (!themeState.theme || !themeState.theme.textColor) {
      setThemeState({
        theme: {
          ...themeColors.indigo,
          textColor: 'text-indigo-600',
          name: 'indigo',
          buttonBg: 'bg-indigo-600',
          buttonHoverBg: 'hover:bg-indigo-700'
        }
      });
    }
  }, [themeState.theme]);
  
  // Tải dữ liệu người dùng từ Supabase
  useEffect(() => {
    if (mounted) {
      const fetchUsers = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const supabase = createClient();
          
          // Join bảng users và accounts để lấy thông tin đầy đủ
          const { data, error } = await supabase
            .from('users')
            .select(`
              user_id,
              email,
              full_name,
              avatar_url,
              created_at,
              accounts:user_id (
                role,
                status
              )
            `)
            .order('created_at', { ascending: false });
          
          if (error) {
            throw error;
          }
          
          if (data) {
            // Chuyển đổi dữ liệu trả về thành định dạng phù hợp
            const formattedUsers: User[] = data.map((item: any) => ({
              id: item.user_id,
              name: item.full_name || 'Chưa cập nhật',
              email: item.email,
              role: item.accounts?.role || 'Không có quyền',
              status: item.accounts?.status || 'inactive',
              avatar_url: item.avatar_url,
              created_at: item.created_at
            }));
            
            setUsers(formattedUsers);
          }
        } catch (error: any) {
          console.error('Lỗi khi tải dữ liệu người dùng:', error);
          setError(error.message || 'Đã xảy ra lỗi khi tải dữ liệu người dùng');
        } finally {
          setLoading(false);
        }
      };
      
      fetchUsers();
    }
  }, [mounted]);
  
  // Kiểm tra vai trò người dùng hiện tại có phải admin không
  useEffect(() => {
    if (mounted) {
      const checkUserRole = async () => {
        try {
          const supabase = createClient();
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.error('Không có phiên đăng nhập:', sessionError?.message);
            setIsUserAdmin(false);
            return;
          }
          
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (accountError || !accountData) {
            console.error('Lỗi khi lấy thông tin tài khoản:', accountError);
            setIsUserAdmin(false);
            return;
          }
          
          setIsUserAdmin(accountData.role === 'admin');
        } catch (error: any) {
          console.error('Lỗi khi kiểm tra vai trò:', error);
          setIsUserAdmin(false);
        }
      };
      
      checkUserRole();
    }
  }, [mounted]);
  
  // Chức năng sắp xếp
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Nếu đang sắp xếp theo field này rồi, đảo chiều sắp xếp
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Nếu là field mới, mặc định sắp xếp tăng dần
      setSortField(field);
      setSortOrder('asc');
    }
    setShowSortMenu(false);
  };
  
  // Lọc và sắp xếp users
  const filteredUsers = [...users]
    .filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const compareValueA = a[sortField] || '';
      const compareValueB = b[sortField] || '';
      
      if (sortOrder === 'asc') {
        return compareValueA.localeCompare(compareValueB);
      } else {
        return compareValueB.localeCompare(compareValueA);
      }
    });
 
  // Mapping vai trò hiển thị thân thiện
  const roleMapping: Record<string, string> = {
    'admin': 'Quản trị viên',
    'NVBH': 'Nhân viên bán hàng',
    'NVK': 'Nhân viên kho'
  };
 
  // Component cho dấu sắp xếp
  const SortIndicator = ({ currentField }: { currentField: SortField }) => {
    if (sortField !== currentField) return null;
    
    return sortOrder === 'asc' 
      ? <ArrowUpIcon className="h-4 w-4 inline ml-1" /> 
      : <ArrowDownIcon className="h-4 w-4 inline ml-1" />;
  };

  if (!mounted) {
    return null;
  }

  const { theme } = themeState;
  const themeColor = theme.textColor.split('-')[1];

  const getFriendlyRole = (role: string) => roleMapping[role] || role;

  // Hàm mở modal tìm kiếm người dùng
  const openUserSearchModal = () => {
    // Nếu không phải admin, không cho phép mở modal
    if (!isUserAdmin) {
      alert('Bạn không có quyền truy cập chức năng này. Chỉ admin mới có thể quản lý phân quyền người dùng.');
      return;
    }
    
    setSearchModalTerm('');
    setSearchResults([]);
    setShowUserSearchModal(true);
  };

  // Hàm tìm kiếm người dùng cho modal
  const searchUsers = async () => {
    if (!searchModalTerm.trim()) return;
    
    try {
      setSearchingUsers(true);
      setModalError(null);
      
      const supabase = createClient();
      
      // Tìm kiếm trong bảng users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          user_id,
          email,
          full_name,
          created_at
        `)
        .or(`full_name.ilike.%${searchModalTerm}%,email.ilike.%${searchModalTerm}%`)
        .limit(10);
      
      if (userError) {
        throw userError;
      }
      
      if (userData && userData.length > 0) {
        // Lấy thông tin tài khoản cho các người dùng
        const userIds = userData.map(user => user.user_id);
        
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('user_id, role, status')
          .in('user_id', userIds);
        
        if (accountsError) {
          throw accountsError;
        }
        
        // Tạo map user_id -> account info
        const accountsMap = new Map();
        if (accountsData) {
          accountsData.forEach((account: any) => {
            accountsMap.set(account.user_id, {
              role: account.role,
              status: account.status
            });
          });
        }
        
        // Kết hợp dữ liệu
        const formattedUsers: User[] = userData.map((user: any) => {
          const account = accountsMap.get(user.user_id);
          return {
            id: user.user_id,
            name: user.full_name || 'Chưa cập nhật',
            email: user.email,
            role: account?.role || 'Không có quyền',
            status: account?.status || 'inactive',
            created_at: user.created_at
          };
        });
        
        setSearchResults(formattedUsers);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('Lỗi khi tìm kiếm người dùng:', error);
      setModalError('Đã xảy ra lỗi khi tìm kiếm: ' + error.message);
    } finally {
      setSearchingUsers(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4 md:mb-0">Quản lý người dùng</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Link
            href="/dashboard/users/add"
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${theme.buttonBg} ${theme.buttonHoverBg}`}
          >
            <PlusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
            Thêm người dùng
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex rounded-md shadow-sm flex-grow">
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
                placeholder="Tìm kiếm theo tên, email hoặc vai trò..."
              />
            </div>
          </div>
          
          {/* Dropdown cho sắp xếp nâng cao */}
          <div className="flex-shrink-0 relative">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-${themeColor}-500 focus:ring-offset-2 focus:ring-offset-gray-100`}
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
              Sắp xếp
              <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
            </button>
            
            {showSortMenu && (
              <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <button
                    onClick={() => handleSort('name')}
                    className="w-full text-left hover:bg-gray-100 hover:text-gray-900 text-gray-700 flex justify-between px-4 py-2 text-sm"
                  >
                    <span>Tên</span>
                    {sortField === 'name' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('email')}
                    className="w-full text-left hover:bg-gray-100 hover:text-gray-900 text-gray-700 flex justify-between px-4 py-2 text-sm"
                  >
                    <span>Email</span>
                    {sortField === 'email' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('role')}
                    className="w-full text-left hover:bg-gray-100 hover:text-gray-900 text-gray-700 flex justify-between px-4 py-2 text-sm"
                  >
                    <span>Vai trò</span>
                    {sortField === 'role' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('status')}
                    className="w-full text-left hover:bg-gray-100 hover:text-gray-900 text-gray-700 flex justify-between px-4 py-2 text-sm"
                  >
                    <span>Trạng thái</span>
                    {sortField === 'status' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('created_at')}
                    className="w-full text-left hover:bg-gray-100 hover:text-gray-900 text-gray-700 flex justify-between px-4 py-2 text-sm"
                  >
                    <span>Ngày tạo</span>
                    {sortField === 'created_at' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </div>
              </div>
            )}
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
              onClick={() => window.location.reload()} 
              className={`mt-2 px-4 py-2 border text-sm font-medium rounded-md text-white ${theme.buttonBg} ${theme.buttonHoverBg}`}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <span className="inline-flex items-center">
                        Người dùng
                        <SortIndicator currentField="name" />
                      </span>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('role')}
                    >
                      <span className="inline-flex items-center">
                        Vai trò
                        <SortIndicator currentField="role" />
                      </span>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <span className="inline-flex items-center">
                        Trạng thái
                        <SortIndicator currentField="status" />
                      </span>
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            {user.avatar_url ? (
                              <Image
                                src={user.avatar_url}
                                alt={user.name}
                                className="h-10 w-10 rounded-full object-cover"
                                width={40}
                                height={40}
                              />
                            ) : (
                              <div className={`h-10 w-10 bg-${themeColor}-100 rounded-full flex items-center justify-center`}>
                                <span className={`text-${themeColor}-800 font-medium`}>
                                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getFriendlyRole(user.role)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <Link
                            href={`/dashboard/users/edit/${user.id}`}
                            className={theme.textColor}
                            title="Chỉnh sửa thông tin"
                          >
                            <PencilIcon className="h-5 w-5" aria-hidden="true" />
                          </Link>
                          <Link
                            href={`/dashboard/users/permissions/${user.id}`}
                            className={theme.textColor}
                            title="Quản lý quyền"
                          >
                            <KeyIcon className="h-5 w-5" aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="py-10 text-center border-t border-gray-200">
                <p className="text-gray-500">Không tìm thấy người dùng nào phù hợp.</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Phân quyền người dùng</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Hệ thống phân quyền cho phép kiểm soát chính xác những chức năng mà người dùng có thể sử dụng.
            </p>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              type="button"
              onClick={openUserSearchModal}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${theme.buttonBg} ${theme.buttonHoverBg}`}
            >
              <MagnifyingGlassIcon className="mr-2 h-5 w-5" aria-hidden="true" />
              Tìm kiếm người dùng
            </button>
            <Link
              href="/dashboard/users/roles"
              className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50`}
            >
              <AdjustmentsHorizontalIcon className="mr-2 h-5 w-5" aria-hidden="true" />
              Quản lý vai trò
            </Link>
          </div>
        </div>
      </div>

      {/* Modal tìm kiếm người dùng cho phân quyền */}
      <Transition.Root show={showUserSearchModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={setShowUserSearchModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                  <div>
                    <div className="flex justify-between items-center mb-5">
                      <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                        Tìm kiếm người dùng để phân quyền
                      </Dialog.Title>
                      <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                        onClick={() => setShowUserSearchModal(false)}
                      >
                        <span className="sr-only">Đóng</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                    
                    {/* Thanh tìm kiếm */}
                    <div className="mb-5">
                      <div className="flex rounded-md shadow-sm">
                        <div className="relative flex-grow focus-within:z-10">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                          <input
                            type="text"
                            value={searchModalTerm}
                            onChange={(e) => setSearchModalTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                            className={`focus:ring-${themeColor}-500 focus:border-${themeColor}-500 block w-full rounded-md pl-10 sm:text-sm border-gray-300`}
                            placeholder="Nhập tên hoặc email người dùng..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={searchUsers}
                          disabled={searchingUsers}
                          className={`ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${theme.buttonBg} ${theme.buttonHoverBg}`}
                        >
                          {searchingUsers ? 'Đang tìm...' : 'Tìm kiếm'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Kết quả tìm kiếm */}
                    {modalError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {modalError}
                      </div>
                    )}
                    
                    {searchingUsers ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                        <p className="mt-2 text-gray-500">Đang tìm kiếm...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="bg-white overflow-hidden border border-gray-200 rounded-md">
                        <ul className="divide-y divide-gray-200">
                          {searchResults.map((user) => (
                            <li key={user.id} className="px-4 py-3 hover:bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center min-w-0">
                                  <div className={`h-10 w-10 bg-${themeColor}-100 rounded-full flex items-center justify-center border-[1px] border-${themeColor}-300 overflow-hidden shadow-sm mr-3`}>
                                    <span className={`text-${themeColor}-800 font-medium`}>
                                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                    <div className="flex mt-1 space-x-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        user.status === 'active' 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {user.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {getFriendlyRole(user.role)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <Link
                                    href={`/dashboard/users/permissions/${user.id}`}
                                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${theme.buttonBg} ${theme.buttonHoverBg}`}
                                    onClick={() => setShowUserSearchModal(false)}
                                  >
                                    <KeyIcon className="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />
                                    Phân quyền
                                  </Link>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : searchModalTerm && !searchingUsers ? (
                      <div className="text-center py-8 bg-gray-50 rounded-md">
                        <p className="text-gray-500">Không tìm thấy người dùng nào phù hợp.</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-md">
                        <p className="text-gray-500">Nhập tên hoặc email để tìm kiếm người dùng</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={() => setShowUserSearchModal(false)}
                    >
                      Đóng
                    </button>
                    <Link
                      href="/dashboard/users/search"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={() => setShowUserSearchModal(false)}
                    >
                      Đi đến trang tìm kiếm đầy đủ
                    </Link>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  )
} 