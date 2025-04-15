'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserIcon, LanguageIcon, ShoppingCartIcon, UserGroupIcon, CubeIcon, DocumentTextIcon, ChartBarIcon, ChevronDownIcon, Bars3Icon, SwatchIcon } from '@heroicons/react/24/outline'
import { useTheme, themeColors } from '../context/ThemeContext'

interface NavItem {
  name: string;
  href: string;
  icon: any;
  current: boolean;
  children?: NavItem[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeNavItem, setActiveNavItem] = useState('dashboard')
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [language, setLanguage] = useState('vi')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [autoCollapse, setAutoCollapse] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // Sử dụng usePathname để theo dõi đường dẫn hiện tại
  const pathname = usePathname()
  
  // Lấy thông tin theme từ context nhưng chỉ sử dụng khi component đã mounted
  const themeContext = useTheme()
  
  // Refs để kiểm soát click outside
  const userMenuRef = useRef<HTMLDivElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  
  // State và refs cho theme
  const [themeState, setThemeState] = useState({
    selectedTheme: 'blue',
    theme: themeColors.blue
  })

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
    
    // Đọc trạng thái autoCollapse từ localStorage
    if (typeof window !== 'undefined') {
      const savedAutoCollapse = localStorage.getItem('qlbh-auto-collapse');
      if (savedAutoCollapse) {
        setAutoCollapse(savedAutoCollapse === 'true');
      }
    }
  }, [])

  // Xử lý click outside để đóng các dropdown menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Đóng user menu khi click ra ngoài
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      
      // Đóng color picker khi click ra ngoài
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }

    // Chỉ thêm event listener khi menu đang mở
    if (showUserMenu || showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu, showColorPicker])

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        selectedTheme: themeContext.selectedTheme,
        theme: themeContext.currentTheme
      })
    }
  }, [mounted, themeContext.selectedTheme, themeContext.currentTheme])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Chỉ thực hiện các thao tác khi component đã mounted ở client-side
        if (!mounted) return;
        
        setLoading(true);
        
        // Lấy dữ liệu user từ Supabase
        const supabase = createClient();
        
        // Gọi refresh token nếu có
        let session = null;
        if ((supabase as any).customRefreshToken) {
          try {
            // Thử lấy session từ hàm refresh token đã được cải tiến
            session = await (supabase as any).customRefreshToken();
            console.log('Đã lấy session từ customRefreshToken:', !!session);
          } catch (refreshError) {
            console.error('Lỗi khi refresh token:', refreshError);
          }
        }
        
        // Nếu refresh token không trả về session, thử lấy bằng getSession
        if (!session) {
          try {
            const { data: sessionData, error } = await supabase.auth.getSession();
            if (error) {
              console.error('Lỗi khi lấy thông tin phiên:', error.message);
            } else if (sessionData.session) {
              session = sessionData.session;
            }
          } catch (sessionError) {
            console.error('Lỗi nghiêm trọng khi lấy session:', sessionError);
          }
        }
        
        // Nếu vẫn không có session, thử đọc từ cache localStorage
        if (!session) {
          try {
            const cachedSession = localStorage.getItem('sb_session_cache');
            if (cachedSession) {
              const parsed = JSON.parse(cachedSession);
              // Kiểm tra xem session cache có hết hạn không
              if (parsed.user && (!parsed.expires_at || parsed.expires_at * 1000 > Date.now())) {
                console.log('Sử dụng session từ cache');
                setUser(parsed.user);
                setLoading(false);
                return;
              }
            }
          } catch (cacheError) {
            console.error('Lỗi khi đọc cache session:', cacheError);
          }
        }
        
        if (!session) {
          console.log('Không tìm thấy phiên đăng nhập trong DashboardLayout');
          // Không cần tự chuyển hướng ở đây vì middleware sẽ xử lý
          setLoading(false);
          return;
        }
        
        console.log('Phiên hợp lệ, đang tải thông tin user:', session.user.email);
        setUser(session.user);
        
        // Cập nhật thông tin đăng nhập nếu có user_id
        if (session.user.id) {
          try {
            // Kiểm tra xem user_id có tồn tại trong bảng accounts chưa
            const { data: existingAccount, error: checkError } = await supabase
              .from('accounts')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();
              
            if (checkError) {
              console.error('Lỗi khi kiểm tra tài khoản:', checkError.message);
              // Tiếp tục xử lý, không dừng lại
            } else {
              // Nếu tài khoản tồn tại, cập nhật last_login
              if (existingAccount) {
                const { error: updateError } = await supabase
                  .from('accounts')
                  .update({ 
                    last_login: new Date().toISOString() 
                  })
                  .eq('user_id', session.user.id);
                
                if (updateError) {
                  console.error('Lỗi khi cập nhật last_login:', updateError.message);
                  // Tiếp tục xử lý, không dừng lại
                } else {
                  console.log('Cập nhật last_login thành công');
                }
              } else {
                console.log('Không tìm thấy tài khoản với user_id:', session.user.id);
                // Có thể tạo mới tài khoản ở đây nếu cần
              }
            }
          } catch (err) {
            console.error('Lỗi khi cập nhật thông tin đăng nhập:', err);
            // Tiếp tục xử lý, không dừng lại
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Lỗi khi tải thông tin user:', error);
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [mounted]);

  // Set activeNavItem dựa trên pathname hiện tại
  useEffect(() => {
    if (pathname) {
      const pathSegments = pathname.split('/')
      if (pathSegments.length > 2) {
        setActiveNavItem(pathSegments[2]) // /dashboard/[segment]
      }
    }
  }, [pathname])

  const navigation: NavItem[] = [
    {
      name: language === 'vi' ? 'Bán hàng' : 'Sales',
      href: '/dashboard/sales',
      icon: ShoppingCartIcon,
      current: activeNavItem === 'sales',
      children: [
        { name: language === 'vi' ? 'Tạo đơn hàng' : 'Create Order', href: '/dashboard/sales/create', icon: null, current: false },
        { name: language === 'vi' ? 'Tích hợp thanh toán' : 'Payment Integration', href: '/dashboard/sales/payment', icon: null, current: pathname.includes('/dashboard/sales/payment') },
      ]
    },
    {
      name: language === 'vi' ? 'Người dùng' : 'Users',
      href: '/dashboard/users',
      icon: UserGroupIcon,
      current: activeNavItem === 'users',
      children: [
        { name: language === 'vi' ? 'Thêm người dùng' : 'Add User', href: '/dashboard/users/add', icon: null, current: false },
        { name: language === 'vi' ? 'Tìm kiếm người dùng' : 'Search Users', href: '/dashboard/users/search', icon: null, current: false },
        { name: language === 'vi' ? 'Chỉnh sửa người dùng' : 'Edit User', href: user?.id ? `/dashboard/users/edit/${user.id}` : '/dashboard/users/edit', icon: null, current: pathname.includes('/dashboard/users/edit/') },
        { name: language === 'vi' ? 'Phân quyền người dùng' : 'User Permissions', href: user?.id ? `/dashboard/users/permissions/${user.id}` : '/dashboard/users/search', icon: null, current: pathname.includes('/dashboard/users/permissions') }
      ]
    },
    {
      name: language === 'vi' ? 'Sản phẩm' : 'Products',
      href: '/dashboard/products',
      icon: CubeIcon,
      current: activeNavItem === 'products',
      children: [
        { name: language === 'vi' ? 'Thêm sản phẩm' : 'Add Product', href: '/dashboard/products/add', icon: null, current: false },
        { name: language === 'vi' ? 'Tìm kiếm sản phẩm' : 'Search Products', href: '/dashboard/products/search', icon: null, current: false },
        { name: language === 'vi' ? 'Chỉnh sửa sản phẩm' : 'Edit Product', href: '/dashboard/products/edit', icon: null, current: false },
      ]
    },
    {
      name: language === 'vi' ? 'Đơn hàng và thanh toán' : 'Orders & Payments',
      href: '/dashboard/orders',
      icon: DocumentTextIcon,
      current: activeNavItem === 'orders',
      children: [
        { name: language === 'vi' ? 'Tìm & Xem đơn hàng' : 'Find & View Orders', href: '/dashboard/orders/search', icon: null, current: pathname.includes('/dashboard/orders/search') },
        { name: language === 'vi' ? 'Đơn vận chuyển' : 'Shipping Orders', href: '/dashboard/orders/shipping', icon: null, current: pathname.includes('/dashboard/orders/shipping') },
        { name: language === 'vi' ? 'Thanh toán' : 'Payment', href: '/dashboard/payment', icon: null, current: pathname.includes('/dashboard/payment') },
        { name: language === 'vi' ? 'In hóa đơn' : 'Print Invoice', href: '/dashboard/orders/invoice', icon: null, current: pathname.includes('/dashboard/orders/invoice') },
      ]
    },
    {
      name: language === 'vi' ? 'Báo cáo' : 'Reports',
      href: '/dashboard/reports',
      icon: ChartBarIcon,
      current: activeNavItem === 'reports',
      children: [
        { name: language === 'vi' ? 'Báo cáo đơn hàng' : 'Order Reports', href: '/dashboard/reports/orders', icon: null, current: pathname.includes('/dashboard/orders/invoice') },
        { name: language === 'vi' ? 'Báo cáo khách hàng' : 'Customer Reports', href: '/dashboard/reports/customers', icon: null, current: false },
        { name: language === 'vi' ? 'Báo cáo sản phẩm' : 'Product Reports', href: '/dashboard/reports/products', icon: null, current: false },
      ]
    },
  ]

  const toggleExpand = (itemName: string) => {
    // Tìm menu cha của chức năng đang active (nếu có)
    let activeParentMenu: string | null = null;
    
    navigation.forEach(item => {
      if (item.children) {
        // Kiểm tra nếu menu này có chức năng con đang active
        const hasActiveChild = item.children.some(child => pathname === child.href);
        if (hasActiveChild || item.current) {
          activeParentMenu = item.name;
        }
      }
    });

    setExpandedItems(prev => {
      // Tạo danh sách menu mới từ trạng thái hiện tại
      let newExpandedItems: string[] = [...prev];
      
      // Nếu item đang click đã mở, đóng nó (trừ khi đó là menu cha của chức năng đang active)
      if (prev.includes(itemName) && itemName !== activeParentMenu) {
        // Loại bỏ item này khỏi danh sách
        newExpandedItems = newExpandedItems.filter(item => item !== itemName);
      } else if (!prev.includes(itemName)) {
        // Nếu item đang click chưa mở, thêm nó vào và loại bỏ các item khác
        // (trừ menu cha của chức năng đang active)
        newExpandedItems = newExpandedItems.filter(item => 
          item === activeParentMenu
        );
        // Thêm item mới
        newExpandedItems.push(itemName);
      }
      
      // Đảm bảo menu cha của chức năng đang active luôn có trong danh sách
      if (activeParentMenu && !newExpandedItems.includes(activeParentMenu)) {
        newExpandedItems.push(activeParentMenu);
      }
      
      return newExpandedItems;
    });
  }

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi')
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
    if (!isCollapsed) {
      setExpandedItems([])
    }
  }

  const handleNavClick = (item: NavItem) => {
    // Không cần set activeNavItem vì useEffect sẽ tự động làm điều đó khi pathname thay đổi
    if (isCollapsed) {
      return;
    }
    
    // Cho phép đóng/mở menu khi click
    toggleExpand(item.name);
  }

  const handleThemeChange = (theme: string) => {
    if (mounted) {
      themeContext.setSelectedTheme(theme);
      setShowColorPicker(false);
    }
  }

  // Thêm hàm xử lý đăng xuất
  const handleLogout = async () => {
    console.log('Đang tiến hành đăng xuất từ menu avatar...');
    
    try {
      // Đánh dấu là đăng xuất có chủ ý
      sessionStorage.setItem('intentional_logout', 'true');
      sessionStorage.setItem('user_logged_out', 'true');
      
      // Đóng menu user
      setShowUserMenu(false);
      
      // Dùng hàm fetch để gọi API đăng xuất
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Xóa cache và session ngay lập tức
      localStorage.removeItem('sb_session_cache');
      
      // Nếu dùng client object để đăng xuất không được, xóa trực tiếp cookies
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Xóa cookies
      document.cookie.split(";").forEach(c => {
        const cookieName = c.split("=")[0].trim();
        if (cookieName.includes('supabase') || cookieName.includes('sb-')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // Chuyển hướng trực tiếp đến trang đăng nhập
      window.location.href = '/auth/signin?logout=true&t=' + Date.now();
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
      
      // Nếu có lỗi, vẫn thử logout bằng phương pháp thay thế
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Lỗi khi đăng xuất qua Supabase client:', e);
      }
      
      // Chuyển hướng bất kể thế nào
      window.location.href = '/auth/signin?logout=true&t=' + Date.now();
    }
  };

  // Xử lý kiểm tra xem đường dẫn có bắt đầu bằng một đường dẫn nhất định
  const patternMatch = (pattern: string, path: string) => {
    return path.startsWith(pattern);
  };

  // Thay thế useEffect để luôn giữ menu cha của chức năng đang active mở
  useEffect(() => {
    if (pathname) {
      // Tìm menu cha của chức năng đang active (nếu có)
      let activeParentMenu: string | null = null;
      
      navigation.forEach(item => {
        if (item.children) {
          // Kiểm tra nếu menu này có chức năng con đang active
          const hasActiveChild = item.children.some(child => 
            pathname === child.href || 
            (child.href.includes('/edit') && pathname.includes(child.href)) ||
            (child.href.includes('/permissions') && pathname.includes('/permissions'))
          );
          if (hasActiveChild || item.current) {
            activeParentMenu = item.name;
          }
        }
      });
      
      // Nếu có menu cha của chức năng đang active, đảm bảo nó được mở
      if (activeParentMenu) {
        setExpandedItems(prev => {
          // Nếu menu cha đã có trong danh sách, giữ nguyên
          if (prev.includes(activeParentMenu as string)) {
            return prev;
          }
          // Nếu chưa có, thêm vào và giữ nguyên các menu khác đang mở
          return [...prev, activeParentMenu as string];
        });
      }
    }
  }, [pathname, navigation]);

  // Xử lý khi thay đổi tùy chọn tự động thu gọn menu
  const handleAutoCollapseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoCollapse(newValue);
    
    // Lưu trạng thái vào localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('qlbh-auto-collapse', String(newValue));
    }
  };
  
  // Xử lý sự kiện di chuột vào sidebar
  const handleMouseEnter = () => {
    if (autoCollapse && isCollapsed) {
      setIsCollapsed(false);
    }
  };
  
  // Xử lý sự kiện di chuột ra khỏi sidebar
  const handleMouseLeave = () => {
    if (autoCollapse && !isCollapsed) {
      setIsCollapsed(true);
    }
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">{language === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
      </div>
    )
  }

  const { theme } = themeState

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex-shrink-0 flex items-center">
                <span className={`text-lg font-bold ${theme.textColor}`}>QLBH System</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {/* Color theme selector */}
              <div className="relative" ref={colorMenuRef}>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="rounded-full p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center"
                >
                  <SwatchIcon className="h-4 w-4" />
                  <span className="ml-2 text-sm">{language === 'vi' ? 'Màu' : 'Theme'}</span>
                </button>
                
                {showColorPicker && mounted && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1 transform transition-all duration-100 ease-out origin-top-right">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500">
                      {language === 'vi' ? 'Chọn màu chủ đề' : 'Select theme color'}
                    </div>
                    {Object.keys(themeContext.themeColors).map((key) => (
                      <button
                        key={key}
                        onClick={() => handleThemeChange(key)}
                        className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                          themeState.selectedTheme === key ? 'font-medium' : ''
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full bg-${key}-500 mr-3`}></div>
                        {key === 'blue' ? 'Xanh dương' : 
                         key === 'slate' ? 'Xám đá' :
                         key === 'green' ? 'Xanh lá' :
                         key === 'purple' ? 'Tím' :
                         key === 'rose' ? 'Đỏ hồng' :
                         key === 'teal' ? 'Xanh ngọc' :
                         key === 'emerald' ? 'Ngọc lục bảo' :
                         key === 'orange' ? 'Cam' : 'Hồng tím'}
                        {themeState.selectedTheme === key && (
                          <span className="ml-auto">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={toggleLanguage}
                className="rounded-full p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center"
              >
                <LanguageIcon className="h-4 w-4" />
                <span className="ml-2 text-sm flex items-center">
                  {language === 'vi' 
                    ? (
                      <>
                        <span className="w-4 h-3 mr-1 inline-block bg-red-600 relative overflow-hidden">
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="text-yellow-400 text-[8px]">★</span>
                          </span>
                        </span>
                        <span>VI</span>
                      </>
                    ) 
                    : (
                      <>
                        <span className="w-4 h-3 mr-1 inline-block relative overflow-hidden" style={{ 
                          background: '#012169'
                        }}>
                          <span className="absolute inset-0" style={{
                            backgroundImage: `
                              linear-gradient(to bottom right, transparent calc(50% - 1px), #fff calc(50% - 1px), #fff calc(50% + 1px), transparent calc(50% + 1px)),
                              linear-gradient(to bottom left, transparent calc(50% - 1px), #fff calc(50% - 1px), #fff calc(50% + 1px), transparent calc(50% + 1px))
                            `
                          }}></span>
                          <span className="absolute inset-0" style={{
                            backgroundImage: `
                              linear-gradient(to right, transparent calc(50% - 0.5px), #C8102E calc(50% - 0.5px), #C8102E calc(50% + 0.5px), transparent calc(50% + 0.5px)),
                              linear-gradient(to bottom, transparent calc(50% - 0.5px), #C8102E calc(50% - 0.5px), #C8102E calc(50% + 0.5px), transparent calc(50% + 0.5px))
                            `
                          }}></span>
                        </span>
                        <span>EN</span>
                      </>
                    )
                  }
                </span>
              </button>
              <div className="relative" ref={userMenuRef}>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.email}</span>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)} 
                    className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  </button>
                </div>
                
                {/* User dropdown menu */}
                {showUserMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 transform transition-all duration-100 ease-out">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-500">Đăng nhập với</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                      </div>
                      
                      <Link 
                        href="/dashboard/profile" 
                        className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${theme.textColor}`}
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        <span>{language === 'vi' ? 'Thông tin cá nhân' : 'Profile'}</span>
                      </Link>
                      
                      <button 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-red-500 w-full text-left"
                        onClick={handleLogout}
                      >
                        <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6A2.25 2.25 0 0 1 18.75 5.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                        </svg>
                        <span>{language === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar navigation */}
        <div 
          ref={sidebarRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`${isCollapsed ? 'w-16' : 'w-52'} ${theme.mainBg} text-white flex-shrink-0 transition-all duration-300 flex flex-col`}
        >
          {/* Nút toggle nằm trong sidebar */}
          <div className={`px-2 py-3 ${theme.borderColor} border-b flex-shrink-0 flex items-start justify-between`}>
            {isCollapsed ? (
              <button
                onClick={toggleCollapse}
                className={`p-1 rounded-md ${theme.hoverBg}`}
              >
                <Bars3Icon className="h-5 w-5 text-white opacity-90" />
              </button>
            ) : (
              <div className="w-full flex justify-between items-center">
                {/* Tùy chọn tự động thu gọn */}
                <div className="flex flex-col items-start">
                  <span className="text-[8px] font-medium text-white opacity-60 mb-0.5">Tự động thu nhỏ menu</span>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoCollapse} 
                      onChange={handleAutoCollapseChange}
                      className="sr-only peer" 
                    />
                    <div className="relative w-7 h-4 bg-gray-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <button
                  onClick={toggleCollapse}
                  className={`p-1 rounded-md ${theme.hoverBg}`}
                >
                  <Bars3Icon className="h-5 w-5 text-white opacity-90" />
                </button>
              </div>
            )}
          </div>

          <nav className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
            <div className="space-y-1 py-3 flex-1 overflow-y-auto scrollbar-hide">
              {navigation.map((item) => (
                <div key={item.name} className="px-2">
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`
                      group w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium rounded-md text-left
                      ${item.current ? 'text-white' : 'text-white opacity-80 hover:opacity-100'} 
                      ${item.current ? theme.darkBg : theme.hoverBg}
                    `}
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    <div className="flex items-center">
                      <item.icon className={`h-5 w-5 flex-shrink-0 ${item.current ? 'text-white' : 'text-white opacity-80'}`} aria-hidden="true" />
                      {!isCollapsed && (
                        <span className="ml-3 text-sm">{item.name}</span>
                      )}
                    </div>
                    {!isCollapsed && item.children && (
                      <ChevronDownIcon
                        className={`${expandedItems.includes(item.name) ? 'transform rotate-180' : ''} w-4 h-4 ${item.current ? 'text-white' : 'text-white opacity-80'}`}
                      />
                    )}
                  </button>

                  {/* Submenu */}
                  {!isCollapsed && item.children && expandedItems.includes(item.name) && (
                    <div 
                      className="overflow-hidden transition-all duration-300 ease-in-out" 
                      style={{ 
                        maxHeight: '500px', // Đủ cao để chứa tất cả menu con
                        animation: 'fadeIn 0.3s ease-in-out'
                      }}
                    >
                      <div className="mt-1 space-y-1 pl-4">
                        {item.children.map((subItem) => {
                          // Kiểm tra xem đường dẫn hiện tại có khớp với href của submenu không
                          const isActive = pathname === subItem.href || 
                            (subItem.href.includes('/edit') && pathname.includes(subItem.href)) ||
                            (subItem.href.includes('/permissions') && pathname.includes('/permissions/'));
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`
                                group flex items-center pl-3 pr-2 py-1.5 text-xs font-medium rounded-md text-left
                                ${isActive ? 'text-white' : 'text-white opacity-80 hover:opacity-100'}
                                ${isActive ? theme.darkBg : theme.hoverBg}
                                transition-all duration-200 ease-in-out transform hover:translate-x-1
                              `}
                              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                            >
                              {subItem.name}
                              {isActive && (
                                <span className="ml-auto">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className={`${theme.borderColor} border-t p-3 flex-shrink-0`}>
              {!isCollapsed && (
                <div className="flex items-start">
                  <div className="ml-2">
                    <button
                      onClick={handleLogout}
                      className="text-sm font-medium text-white opacity-80 hover:opacity-100 cursor-pointer"
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                      {language === 'vi' ? 'Đăng xuất' : 'Sign out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Thêm style toàn cục để ẩn thanh cuộn trong sidebar */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
