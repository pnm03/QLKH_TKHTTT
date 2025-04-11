'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormInput from '@/app/components/FormInput'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon, XMarkIcon, ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'

// Định nghĩa schema validation
const signinSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  rememberMe: z.boolean().optional().default(false)
})

const passwordOnlySchema = z.object({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
})

type SigninFormValues = z.infer<typeof signinSchema>
type PasswordOnlyFormValues = z.infer<typeof passwordOnlySchema>

// Định nghĩa kiểu dữ liệu cho tài khoản đã lưu - giữ đơn giản
type SavedAccount = {
  email: string;
  lastLogin: number;
  role?: string; // Giữ lại trường role nhưng là tùy chọn
  avatar_url?: string; // Thêm avatar_url nếu có
  name?: string; // Tên người dùng nếu có
}

export default function SigninPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const isLogout = searchParams.get('logout') === 'true'
  const isExpired = searchParams.get('expired') === 'true'
  const noRedirect = searchParams.get('noRedirect') === 'true'
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showPasswordPopup, setShowPasswordPopup] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null)
  // Biến để đánh dấu đã bắt đầu quá trình chuyển hướng
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  // Thêm state cho popup tài khoản bị khóa
  const [showLockedAccountPopup, setShowLockedAccountPopup] = useState(false)
  const [lockedAccountEmail, setLockedAccountEmail] = useState('')
  const [loginAttempts, setLoginAttempts] = useState<{[email: string]: number}>({})
  
  // Form cho đăng nhập thông thường
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true
    }
  })
  
  // Lấy giá trị email hiện tại từ form
  const emailValue = watch('email');

  // Form cho nhập mật khẩu trong popup
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors }
  } = useForm<PasswordOnlyFormValues>({
    resolver: zodResolver(passwordOnlySchema)
  })

  // Đồng bộ giá trị rememberMe với form
  useEffect(() => {
    if (rememberMe) {
      setValue('rememberMe', true);
    }
  }, [rememberMe, setValue]);

  // Load danh sách tài khoản đã lưu và xử lý tham số URL
  useEffect(() => {
    // Tránh lặp lại useEffect quá nhiều lần
    if (typeof window !== 'undefined') {
      // QUAN TRỌNG: Xác định nếu trang vừa mới tải (hoặc refresh)
      // và đã có phiên lưu từ trước, chúng ta sẽ kiểm tra session ngay lập tức
      const isFirstLoad = !sessionStorage.getItem('page_loaded');
      if (isFirstLoad) {
        sessionStorage.setItem('page_loaded', 'true');
        console.log('Trang đăng nhập vừa được tải lần đầu tiên');
      }

      // Xử lý trường hợp đăng xuất
      if (isLogout) {
        console.log('Người dùng đã đăng xuất, đang xóa dữ liệu phiên...');
        try {
          // Đặt cờ đánh dấu đã đăng xuất trước khi xóa dữ liệu
          sessionStorage.setItem('user_logged_out', 'true');
          
          // Xóa dữ liệu Supabase
          const supabase = createClient();
          supabase.auth.signOut().catch((error: unknown) => {
            console.error('Lỗi khi đăng xuất từ Supabase:', error);
          });
          
          // Xóa localStorage liên quan
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase') || key.includes('sb-') || key.includes('sb:')) {
              localStorage.removeItem(key);
              console.log('Đã xóa localStorage:', key);
            }
          });
          
          // Xóa cookies
          document.cookie.split(";").forEach(c => {
            const cookieName = c.split("=")[0].trim();
            if (cookieName.includes('supabase') || cookieName.includes('sb-')) {
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              console.log('Đã xóa cookie:', cookieName);
            }
          });
          
          // Xóa các cờ đánh dấu trong sessionStorage nhưng giữ lại cờ đăng xuất
          console.log('Đang xóa các cờ đánh dấu trong sessionStorage...');
          Object.keys(sessionStorage).forEach(key => {
            if (key !== 'user_logged_out') {
              sessionStorage.removeItem(key);
            }
          });
          
          // Đặt lại cờ page_loaded để biết trang đã tải
          sessionStorage.setItem('page_loaded', 'true');
          setAuthSuccess('Bạn đã đăng xuất thành công.');
        } catch (error: unknown) {
          console.error('Lỗi khi xóa dữ liệu phiên:', error);
        }
        // Return để không kiểm tra session sau khi đăng xuất
        return;
      }
      
      if (isExpired) {
        setAuthError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      
      // Kiểm tra chỉ khi page mới load hoặc refresh - KHÔNG kiểm tra nhiều lần
      if (isFirstLoad && !isLogout && !noRedirect) {
        console.log('Kiểm tra phiên đăng nhập sau khi trang vừa tải...');
        
        const checkSession = async () => {
          try {
            // Ngăn các cuộc gọi trùng lặp
            const sessionChecking = sessionStorage.getItem('signin_checking_session');
            if (sessionChecking === 'true') {
              console.log('Đang có quá trình kiểm tra session khác, bỏ qua...');
              return;
            }
            
            sessionStorage.setItem('signin_checking_session', 'true');
            
            console.log('Đang gọi API kiểm tra phiên...');
            const supabase = createClient();
            const { data, error } = await supabase.auth.getSession();
            
            // Xóa flag kiểm tra ngay lập tức
            sessionStorage.removeItem('signin_checking_session');
            
            if (error) {
              console.error('Lỗi khi kiểm tra phiên:', error);
              return;
            }
            
            console.log('Kết quả kiểm tra phiên:', data.session ? 'Có phiên hợp lệ' : 'Không có phiên');
            
            if (data.session) {
              console.log('Đã đăng nhập, chuẩn bị chuyển hướng đến dashboard...');
              
              // Kiểm tra redirectTo param và sử dụng nó nếu có
              const redirectParam = searchParams.get('redirectTo');
              const redirectPath = redirectParam || '/dashboard';
              
              // Xóa cờ kiểm tra để tránh vòng lặp
              sessionStorage.removeItem('auth_check_done');
              sessionStorage.removeItem('signin_checking_session');
              
              // Kiểm tra nếu đang chuyển hướng thì không làm gì
              if (isRedirecting) {
                console.log('Đang chuyển hướng, bỏ qua...');
                return;
              }
              
              // Chuyển hướng nhưng đợi một chút để cho người dùng thấy thông báo
              setTimeout(() => {
                console.log('Thực hiện chuyển hướng đến:', redirectPath);
                setIsRedirecting(true);
                // Thêm tham số để đảm bảo không bị vòng lặp middleware
                window.location.href = `${redirectPath}?login_success=true&ts=${Date.now()}&bypass_auth=true`;
              }, 500);
            } else {
              console.log('Chưa đăng nhập, ở lại trang đăng nhập');
            }
          } catch (error: unknown) {
            console.error('Lỗi khi kiểm tra phiên:', error);
            sessionStorage.removeItem('signin_checking_session');
          }
        };
        
        checkSession();
      }
      
      // Load danh sách tài khoản đã lưu
      try {
        const savedAccountsJson = localStorage.getItem('qlbh_saved_accounts');
        if (savedAccountsJson) {
          const accounts = JSON.parse(savedAccountsJson);
          console.log('Đã tìm thấy', accounts.length, 'tài khoản đã lưu');
          setSavedAccounts(accounts);
        }
      } catch (e: unknown) {
        console.error('Lỗi khi đọc danh sách tài khoản đã lưu:', e);
      }
    }
    
    return () => {
      // Không xóa cờ page_loaded khi unmount để tránh kiểm tra lại liên tục
    };
  }, [isLogout, isExpired, noRedirect]);

  // Lưu tài khoản vào localStorage
  const saveAccount = async (email: string, userData?: any) => {
    try {
      // Tạo key riêng cho ứng dụng này
      const STORAGE_KEY = 'qlbh_saved_accounts';
      // Thời gian hiện tại
      const now = Date.now();
      
      // Lấy danh sách tài khoản đã lưu
      let accounts: SavedAccount[] = [];
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          accounts = JSON.parse(savedData);
          // Kiểm tra dữ liệu hợp lệ
          if (!Array.isArray(accounts)) {
            accounts = [];
          }
        }
      } catch (e: unknown) {
        console.error('Lỗi khi đọc dữ liệu từ localStorage:', e);
        accounts = [];
      }
      
      // Kiểm tra xem email đã tồn tại chưa
      const existingIndex = accounts.findIndex(acc => acc.email === email);
      
      // Tạo object tài khoản mới hoặc cập nhật
      const accountData: SavedAccount = {
        email,
        lastLogin: now,
        role: userData?.role || (existingIndex >= 0 ? accounts[existingIndex].role : undefined),
        avatar_url: userData?.avatar_url || (existingIndex >= 0 ? accounts[existingIndex].avatar_url : undefined),
        name: userData?.name || userData?.full_name || (existingIndex >= 0 ? accounts[existingIndex].name : undefined)
      };
      
      if (existingIndex >= 0) {
        // Cập nhật tài khoản hiện có
        accounts[existingIndex] = {
          ...accounts[existingIndex],
          ...accountData
        };
      } else {
        // Thêm tài khoản mới
        accounts.push(accountData);
      }
      
      // Sắp xếp theo thời gian đăng nhập gần đây nhất
      accounts.sort((a, b) => b.lastLogin - a.lastLogin);
      
      // Giới hạn số lượng tài khoản lưu trữ
      const MAX_ACCOUNTS = 3;
      if (accounts.length > MAX_ACCOUNTS) {
        accounts = accounts.slice(0, MAX_ACCOUNTS);
      }
      
      // Lưu lại vào localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      
      // Cập nhật state
      setSavedAccounts(accounts);
      console.log('Đã lưu tài khoản:', email);
      
    } catch (error: unknown) {
      console.error('Lỗi khi lưu tài khoản:', error);
    }
  };

  // Xóa tài khoản đã lưu
  const removeAccount = (email: string, event: React.MouseEvent<HTMLButtonElement>) => {
    // Ngăn sự kiện click lan truyền đến phần tử cha
    event.stopPropagation();
    
    try {
      const STORAGE_KEY = 'qlbh_saved_accounts';
      
      // Lấy danh sách hiện tại
      let accounts: SavedAccount[] = [];
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        accounts = JSON.parse(savedData);
      }
      
      // Lọc tài khoản cần xóa
      const updatedAccounts = accounts.filter(acc => acc.email !== email);
      
      // Lưu lại
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAccounts));
      
      // Cập nhật state
      setSavedAccounts(updatedAccounts);
      console.log('Đã xóa tài khoản:', email);
    } catch (error: unknown) {
      console.error('Lỗi khi xóa tài khoản:', error);
    }
  };

  // Load danh sách tài khoản đã lưu khi component được mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const STORAGE_KEY = 'qlbh_saved_accounts';
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const accounts = JSON.parse(savedData);
          if (Array.isArray(accounts) && accounts.length > 0) {
            console.log('Đã tìm thấy', accounts.length, 'tài khoản đã lưu');
            setSavedAccounts(accounts);
          }
        }
      } catch (e: unknown) {
        console.error('Lỗi khi đọc danh sách tài khoản đã lưu:', e);
      }
    }
  }, []);

  // Hàm xử lý đăng nhập với email và mật khẩu
  const onSubmit = async (data: SigninFormValues) => {
    setIsLoading(true);
    
    // Reset lỗi mỗi khi bắt đầu đăng nhập
    setAuthError(null);
    setAuthSuccess(null);
    
    console.log('Đang đăng nhập với email:', data.email, 'Remember me:', data.rememberMe);
    
    try {
      const supabase = createClient();
      
      // Kiểm tra xem email có tồn tại trong bảng accounts không
      try {
        // Thêm kiểm tra chi tiết hơn về cấu trúc dữ liệu trả về
        let hasLockedAccount = false;
        
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('status')
          .eq('username', data.email)
          .maybeSingle();
        
        // Kiểm tra lỗi cụ thể hơn
        if (accountError) {
          // Lỗi 404 là bình thường khi không tìm thấy tài khoản
          if (accountError.code === "PGRST116" || (accountError.message && accountError.message.includes("not found"))) {
            console.log('Tài khoản chưa tồn tại trong database:', data.email);
          } else {
            // Chỉ log lỗi khi thực sự có lỗi nghiêm trọng từ database
            console.error('Lỗi kiểm tra trạng thái tài khoản:', accountError.code, accountError.message || accountError);
          }
        } else if (accountData) {
          // Kiểm tra trạng thái tài khoản nếu tìm thấy
          if (accountData.status === 'locked') {
            hasLockedAccount = true;
            setLockedAccountEmail(data.email);
            setShowLockedAccountPopup(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (checkError: any) {
        // Xử lý lỗi chi tiết hơn
        if (checkError instanceof Error) {
          console.error('Lỗi khi kiểm tra tài khoản:', checkError.message);
        } else {
          console.error('Lỗi khi kiểm tra tài khoản:', JSON.stringify(checkError));
        }
        // Tiếp tục quy trình đăng nhập ngay cả khi không thể kiểm tra
      }
      
      // Thực hiện đăng nhập
      const { data: sessionData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.warn('Lỗi đăng nhập:', error.message);
        
        // Hiển thị thông báo lỗi cho người dùng
        if (error.message.includes("Invalid login credentials")) {
          // Sử dụng callback để đảm bảo state được cập nhật đúng
          setAuthError(() => {
            const errorMsg = 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.';
            console.log('Đã đặt thông báo lỗi:', errorMsg);
            return errorMsg;
          });
        } else {
          setAuthError('Đăng nhập thất bại: ' + error.message);
        }
        
        try {
          // Kiểm tra lại tài khoản để cập nhật số lần đăng nhập sai
          const { data: accountCheck } = await supabase
            .from('accounts')
            .select('status')
            .eq('username', data.email)
            .maybeSingle();
            
            // Nếu tài khoản tồn tại
            if (accountCheck) {
              // Lấy giá trị từ state thay vì database
              const currentAttempts = (loginAttempts[data.email] || 0) + 1;
              
              // Cập nhật state để theo dõi
              setLoginAttempts({
                ...loginAttempts,
                [data.email]: currentAttempts
              });
              
              // Nếu sai quá 3 lần, khóa tài khoản
              if (currentAttempts >= 3) {
                try {
                  const { error: lockError } = await supabase
                    .from('accounts')
                    .update({ 
                      status: 'locked'
                    })
                    .eq('username', data.email);
                  
                  if (!lockError) {
                    console.log('Đã khóa tài khoản sau 3 lần đăng nhập sai:', data.email);
                    setLockedAccountEmail(data.email);
                    setShowLockedAccountPopup(true);
                    
                    // Reset số lần đăng nhập sai trong state
                    const newLoginAttempts = { ...loginAttempts };
                    delete newLoginAttempts[data.email];
                    setLoginAttempts(newLoginAttempts);
                  } else {
                    console.error('Lỗi khi khóa tài khoản:', lockError);
                  }
                } catch (lockError) {
                  console.error('Lỗi khi cập nhật trạng thái tài khoản:', lockError);
                }
              } else {
                // Hiển thị số lần đăng nhập sai còn lại
                const attemptsLeft = 3 - currentAttempts;
                setAuthError(`Email hoặc mật khẩu không chính xác. Bạn còn ${attemptsLeft} lần thử trước khi tài khoản bị khóa.`);
              }
            }
        } catch (attemptError) {
          console.error('Lỗi khi kiểm tra số lần đăng nhập sai:', attemptError);
        }
        
        setIsLoading(false);
        
        // Log state authError trước khi return
        console.log('authError trước khi return:', authError);
        return;
      }
      
      // Đăng nhập thành công - reset số lần đăng nhập sai trong state
      const newLoginAttempts = { ...loginAttempts };
      delete newLoginAttempts[data.email];
      setLoginAttempts(newLoginAttempts);
      
      console.log('Đăng nhập thành công!');
      
      // Nếu người dùng chọn "Lưu tài khoản"
      if (data.rememberMe) {
        // Lấy thêm thông tin về người dùng để lưu
        try {
          const user = sessionData?.session?.user;
          
          // Thử lấy thêm thông tin vai trò từ database
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('user_id', user?.id)
              .maybeSingle();
              
            // Nếu có thông tin từ database, sử dụng nó
            if (userData && !userError) {
              await saveAccount(data.email, {
                ...user,
                ...user?.user_metadata,
                ...userData
              });
            } else {
              // Nếu không lấy được từ database, tiếp tục thử lấy vai trò từ bảng accounts
              const { data: accountData, error: accountError } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', user?.id)
                .maybeSingle();
                
              if (accountData && !accountError) {
                await saveAccount(data.email, {
                  ...user,
                  ...user?.user_metadata,
                  role: accountData.role
                });
              } else {
                // Nếu không có thông tin từ cả hai bảng, chỉ lưu dữ liệu cơ bản
                if (user) {
                  await saveAccount(data.email, {
                    ...user,
                    ...user.user_metadata
                  });
                } else {
                  await saveAccount(data.email);
                }
              }
            }
          } catch (dbError) {
            console.error('Lỗi khi truy vấn database:', dbError);
            // Fallback lưu thông tin cơ bản nếu có lỗi
            if (user) {
              await saveAccount(data.email, {
                ...user,
                ...user.user_metadata
              });
            } else {
              await saveAccount(data.email);
            }
          }
        } catch (e) {
          console.error('Lỗi khi lưu thông tin tài khoản:', e);
          await saveAccount(data.email);
        }
      }
      
      setAuthSuccess('Đăng nhập thành công!');
      setIsRedirecting(true);
      
      // Chuyển hướng đến dashboard
      setTimeout(() => {
        window.location.href = '/dashboard?login_success=true&ts=' + Date.now() + '&bypass_auth=true';
      }, 1000);
    } catch (error: any) {
      if (error instanceof Error) {
        console.error('Lỗi không xác định:', error.message);
      } else {
        console.error('Lỗi không xác định:', JSON.stringify(error));
      }
      setAuthError('Đã xảy ra lỗi không xác định khi đăng nhập');
      setIsLoading(false);
    }
  };

  // Xử lý đăng nhập từ tài khoản đã lưu
  const onPasswordSubmit = async (data: PasswordOnlyFormValues) => {
    if (!selectedAccount) {
      console.error('Không có tài khoản nào được chọn');
      return;
    }
    
    setIsLoading(true);
    
    // Reset lỗi mỗi khi bắt đầu đăng nhập
    setAuthError(null);
    setAuthSuccess(null);
    
    console.log('Đang đăng nhập với tài khoản đã lưu:', selectedAccount.email);
    
    try {
      const supabase = createClient();
      
      // Kiểm tra trạng thái tài khoản trước khi đăng nhập
      try {
        // Thêm kiểm tra chi tiết hơn về cấu trúc dữ liệu trả về
        let hasLockedAccount = false;
        
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('status')
          .eq('username', selectedAccount.email)
          .maybeSingle();
        
        // Kiểm tra lỗi cụ thể hơn
        if (accountError) {
          // Lỗi 404 là bình thường khi không tìm thấy tài khoản
          if (accountError.code === "PGRST116" || (accountError.message && accountError.message.includes("not found"))) {
            console.log('Tài khoản chưa tồn tại trong database:', selectedAccount.email);
          } else {
            // Chỉ log lỗi khi thực sự có lỗi nghiêm trọng từ database
            console.error('Lỗi kiểm tra trạng thái tài khoản:', accountError.code, accountError.message || accountError);
          }
        } else if (accountData) {
          // Kiểm tra trạng thái tài khoản nếu tìm thấy
          if (accountData.status === 'locked') {
            hasLockedAccount = true;
            setLockedAccountEmail(selectedAccount.email);
            setShowPasswordPopup(false);
            setShowLockedAccountPopup(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (checkError: any) {
        // Xử lý lỗi chi tiết hơn
        if (checkError instanceof Error) {
          console.error('Lỗi khi kiểm tra tài khoản:', checkError.message);
        } else {
          console.error('Lỗi khi kiểm tra tài khoản:', JSON.stringify(checkError));
        }
        // Tiếp tục quy trình đăng nhập ngay cả khi không thể kiểm tra
      }
      
      // Thực hiện đăng nhập
      const { data: sessionData, error } = await supabase.auth.signInWithPassword({
        email: selectedAccount.email,
        password: data.password,
      });

      if (error) {
        console.warn('Lỗi đăng nhập với tài khoản đã lưu:', error.message);
        
        // Hiển thị thông báo lỗi cho người dùng
        if (error.message.includes("Invalid login credentials")) {
          // Sử dụng callback để đảm bảo state được cập nhật đúng
          setAuthError(() => {
            const errorMsg = 'Mật khẩu không chính xác. Vui lòng thử lại.';
            console.log('Đã đặt thông báo lỗi:', errorMsg);
            return errorMsg;
          });
        } else {
          setAuthError('Đăng nhập thất bại: ' + error.message);
        }
        
        try {
          // Kiểm tra lại tài khoản để cập nhật số lần đăng nhập sai
          const { data: accountCheck } = await supabase
            .from('accounts')
            .select('status')
            .eq('username', selectedAccount.email)
            .maybeSingle();
            
            // Nếu tài khoản tồn tại
            if (accountCheck) {
              // Lấy giá trị từ state thay vì database
              const currentAttempts = (loginAttempts[selectedAccount.email] || 0) + 1;
              
              // Cập nhật state để theo dõi
              setLoginAttempts({
                ...loginAttempts,
                [selectedAccount.email]: currentAttempts
              });
              
              // Nếu sai quá 3 lần, khóa tài khoản
              if (currentAttempts >= 3) {
                try {
                  const { error: lockError } = await supabase
                    .from('accounts')
                    .update({ 
                      status: 'locked'
                    })
                    .eq('username', selectedAccount.email);
                  
                  if (!lockError) {
                    console.log('Đã khóa tài khoản sau 3 lần đăng nhập sai:', selectedAccount.email);
                    setLockedAccountEmail(selectedAccount.email);
                    setShowPasswordPopup(false);
                    setShowLockedAccountPopup(true);
                    
                    // Reset số lần đăng nhập sai trong state
                    const newLoginAttempts = { ...loginAttempts };
                    delete newLoginAttempts[selectedAccount.email];
                    setLoginAttempts(newLoginAttempts);
                  } else {
                    console.error('Lỗi khi khóa tài khoản:', lockError);
                  }
                } catch (lockError) {
                  console.error('Lỗi khi cập nhật trạng thái tài khoản:', lockError);
                }
              } else {
                // Hiển thị số lần đăng nhập sai còn lại
                const attemptsLeft = 3 - currentAttempts;
                setAuthError(`Mật khẩu không chính xác. Bạn còn ${attemptsLeft} lần thử trước khi tài khoản bị khóa.`);
              }
            }
        } catch (attemptError) {
          console.error('Lỗi khi kiểm tra số lần đăng nhập sai:', attemptError);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Đăng nhập thành công - reset số lần đăng nhập sai trong state
      const newLoginAttempts = { ...loginAttempts };
      delete newLoginAttempts[selectedAccount.email];
      setLoginAttempts(newLoginAttempts);
      
      console.log('Đăng nhập thành công!');
      
      // Cập nhật thời gian đăng nhập gần nhất
      await saveAccount(selectedAccount.email);
      
      setAuthSuccess('Đăng nhập thành công!');
      setShowPasswordPopup(false);
      setIsRedirecting(true);
      
      // Chuyển hướng sau 1 giây
      setTimeout(() => {
        window.location.href = '/dashboard?login_success=true&ts=' + Date.now() + '&bypass_auth=true';
      }, 1000);
    } catch (error: any) {
      if (error instanceof Error) {
        console.error('Lỗi không xác định:', error.message);
      } else {
        console.error('Lỗi không xác định:', JSON.stringify(error));
      }
      setAuthError('Đã xảy ra lỗi không xác định khi đăng nhập');
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const selectAccount = (account: SavedAccount) => {
    setSelectedAccount(account)
    setShowPasswordPopup(true)
    setAuthError(null)
  }

  const closePasswordPopup = () => {
    setShowPasswordPopup(false)
    setSelectedAccount(null)
  }

  // Hàm tạo avatar từ email
  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  // Hàm tạo màu ngẫu nhiên nhưng ổn định cho avatar
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = email.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }
  
  // Hàm trích xuất tên người dùng từ email và viết hoa chữ đầu
  const getUsernameFromEmail = (email: string): string => {
    // Lấy phần trước @ trong email
    const username = email.split('@')[0];
    // Tách các từ bằng dấu gạch dưới, dấu chấm, hoặc các dấu phân cách thông thường
    const words = username.split(/[_.\-+]/);
    // Viết hoa chữ đầu tiên của mỗi từ
    const capitalizedWords = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    // Nối lại các từ bằng khoảng trắng
    return capitalizedWords.join(' ');
  };

  // Viết hoa chữ đầu của vai trò 
  const formatRole = (role: string | undefined): string => {
    if (!role) return 'User';
    // Viết hoa chữ đầu tiên
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Thay đổi hàm getDisplayRole để sử dụng hàm formatRole
  const getDisplayRole = (role: string | undefined): string => {
    return formatRole(role || 'user');
  };

  // Debug tài khoản đã lưu
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAccountsJson = localStorage.getItem('qlbh_saved_accounts');
      if (savedAccountsJson) {
        try {
          const accounts = JSON.parse(savedAccountsJson);
          console.log('Debug tài khoản đã lưu:', accounts);
        } catch (e: unknown) {
          console.error('Lỗi khi parse savedAccounts:', e);
        }
      } else {
        console.log('Không tìm thấy savedAccounts trong localStorage');
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Phần logo bên trái */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-indigo-300 to-purple-400 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-3 text-indigo-900">Hệ thống quản lý bán hàng</h1>
            <p className="text-indigo-800">Giải pháp quản lý hiệu quả cho doanh nghiệp của bạn</p>
          </div>
          <div className="flex justify-center relative h-56 w-56 mx-auto overflow-hidden">
            {/* Sử dụng base64 hoặc inline SVG để tránh lỗi chuyển hướng tài nguyên */}
            <div className="w-full h-full flex items-center justify-center">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg hover:scale-105 transition-transform duration-300">
                <path d="M100 0C44.8 0 0 44.8 0 100C0 155.2 44.8 200 100 200C155.2 200 200 155.2 200 100C200 44.8 155.2 0 100 0Z" fill="#4338CA"/>
                <path d="M140 60H60V140H140V60Z" fill="white"/>
                <path d="M120 80H80V120H120V80Z" fill="#4338CA"/>
                <path d="M155 45L45 155" stroke="white" strokeWidth="12"/>
                <path d="M45 45L155 155" stroke="white" strokeWidth="12"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Phần đăng nhập bên phải */}
      <div className="w-full lg:w-3/5 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg space-y-6">
          <div>
            {/* Logo cho màn hình nhỏ */}
            <div className="flex justify-center lg:hidden mb-6">
              <div className="h-20 w-20 overflow-hidden">
                <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                  <path d="M100 0C44.8 0 0 44.8 0 100C0 155.2 44.8 200 100 200C155.2 200 200 155.2 200 100C200 44.8 155.2 0 100 0Z" fill="#4338CA"/>
                  <path d="M140 60H60V140H140V60Z" fill="white"/>
                  <path d="M120 80H80V120H120V80Z" fill="#4338CA"/>
                  <path d="M155 45L45 155" stroke="white" strokeWidth="12"/>
                  <path d="M45 45L155 155" stroke="white" strokeWidth="12"/>
                </svg>
              </div>
            </div>
            <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">Đăng nhập</h2>
            <p className="text-center text-sm text-gray-600">
              Hoặc{' '}
              <Link 
                href="/auth/signup" 
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                đăng ký tài khoản mới
              </Link>
            </p>
          </div>

          {/* Hiển thị tài khoản đã lưu */}
          {savedAccounts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Tài khoản đã lưu</h3>
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                {savedAccounts.map((account, index) => (
                  <div 
                    key={index} 
                    className="flex flex-col items-center cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-all duration-200 relative"
                    onClick={() => selectAccount(account)}
                    title={`Đăng nhập với ${account.email}`}
                  >
                    <div className="relative">
                      {account.avatar_url ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-indigo-500 transition-all duration-200 shadow-md">
                          <Image 
                            src={account.avatar_url} 
                            alt={account.name || getUsernameFromEmail(account.email)} 
                            width={64} 
                            height={64}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold 
                          shadow-md border-2 border-transparent group-hover:border-indigo-500 group-hover:scale-105 transition-all duration-200 
                          ${getAvatarColor(account.email)}`}>
                          {getInitials(account.email)}
                        </div>
                      )}
                      <button 
                        onClick={(e) => removeAccount(account.email, e)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                        aria-label="Xóa tài khoản"
                        title="Xóa tài khoản này"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 text-center">
                      <span className="text-sm font-medium text-gray-800 block truncate max-w-[100px]">
                        {account.name || getUsernameFromEmail(account.email)}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[100px] block">
                        {getDisplayRole(account.role)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thông báo lỗi - đặt ở vị trí dễ thấy hơn */}
          {authError ? (
            <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500 my-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Lỗi đăng nhập</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{authError}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {authSuccess && !isLogout && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex items-center">
                <div>
                  <p className="text-sm text-green-700">
                    {authSuccess}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Nhập email của bạn"
                  autoComplete="email"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  {...register('email')}
                />
                {errors.email?.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu của bạn"
                    autoComplete="current-password"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                    {...register('password')}
                  />
                  <button 
                    type="button" 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password?.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    // Cập nhật giá trị vào form
                    setValue('rememberMe', e.target.checked);
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <input
                  type="checkbox"
                  className="hidden"
                  {...register('rememberMe')}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <div className="text-sm flex justify-between mt-2">
                <Link href="/auth/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 shadow-md"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </span>
                ) : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Popup tài khoản bị khóa */}
      {showLockedAccountPopup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fadeIn">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
              <div className="bg-red-100 rounded-full p-3 border-4 border-white shadow-md">
                <LockClosedIcon className="h-10 w-10 text-red-600" />
              </div>
            </div>
            
            <div className="mt-5 text-center">
              <h3 className="text-xl font-bold text-gray-900 mt-2">Tài khoản đã bị khóa</h3>
              
              <div className="mt-4 bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Tài khoản <span className="font-semibold">{lockedAccountEmail}</span> đã bị khóa vì lý do bảo mật.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="mt-4 text-gray-600">
                Vui lòng thực hiện lấy lại mật khẩu để mở khóa tài khoản của bạn.
              </p>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-2 justify-center">
                <Link
                  href={`/auth/forgot-password?email=${encodeURIComponent(lockedAccountEmail)}`}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Lấy lại mật khẩu
                </Link>
                
                <button
                  onClick={() => setShowLockedAccountPopup(false)}
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup nhập mật khẩu */}
      {showPasswordPopup && selectedAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button 
              onClick={closePasswordPopup}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            
            <div className="flex flex-col items-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold mb-2 ${getAvatarColor(selectedAccount.email)}`}>
                {getInitials(selectedAccount.email)}
              </div>
              <h3 className="text-lg font-medium text-gray-900">{selectedAccount.email}</h3>
              <span className="text-sm font-medium text-gray-800">
                {getUsernameFromEmail(selectedAccount.email)}
              </span>
              <span className="text-sm text-gray-600">
                {getDisplayRole(selectedAccount.role)}
              </span>
            </div>
            
            {authError && (
              <div className="rounded-md bg-red-50 p-3 border-l-4 border-red-500 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{authError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
              <div className="mb-4">
                <label htmlFor="popup-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="popup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu của bạn"
                    autoFocus
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                    {...registerPassword('password')}
                  />
                  <button 
                    type="button" 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {passwordErrors.password?.message && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.password.message}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}