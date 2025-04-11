import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Lưu trữ client sau khi tạo để tái sử dụng
let supabaseClient: any = null;

// Thêm biến để theo dõi thời gian refresh token gần nhất
let lastTokenRefresh = 0;
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 phút

export const createClient = () => {
  // Kiểm tra xem đã có client chưa, nếu có thì sử dụng lại
  if (supabaseClient) {
    return supabaseClient;
  }
  
  try {
    // Lấy các biến môi trường
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Kiểm tra các biến môi trường
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Thiếu biến môi trường Supabase:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseAnonKey,
        keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
      });
      throw new Error('Biến môi trường Supabase URL hoặc Anon Key không tồn tại');
    }
    
    // Log debug thông tin
    console.log('Khởi tạo Supabase Client với URL:', 
      supabaseUrl?.substring(0, 20) + '...'
    );
    
    // Kiểm tra nếu đang chạy ở browser
    const isBrowser = typeof window !== 'undefined';
    
    // Sử dụng phương thức createClient trực tiếp từ @supabase/supabase-js
    const client = createSupabaseClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          autoRefreshToken: true,
          storageKey: 'sb:session',
          // Thiết lập storage
          storage: isBrowser ? window.localStorage : undefined
        },
        global: {
          headers: {
            apikey: supabaseAnonKey,
            // Thêm các headers khác nếu cần
            "Content-Type": "application/json",
            "X-Client-Info": isBrowser ? `supabase-js/2.x (${window.navigator.userAgent})` : "supabase-js/node"
          },
          fetch: customFetch
        }
      }
    );
    
    // Lưu client để tái sử dụng
    supabaseClient = client;
    
    // Theo dõi các sự kiện Auth nếu đang chạy trong browser
    if (isBrowser) {
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          // Xử lý khi đăng xuất
          console.log('Người dùng đã đăng xuất', event);
          
          // Chỉ xóa dữ liệu phiên nếu là đăng xuất thực sự, không phải do token hết hạn
          const isIntentionalLogout = sessionStorage.getItem('intentional_logout') === 'true';
          
          // Đánh dấu đã đăng xuất trong mọi trường hợp
          sessionStorage.setItem('user_logged_out', 'true');
          
          if (isIntentionalLogout) {
            // Xóa triệt để dữ liệu phiên
            try {
              // Xóa localStorage liên quan đến Supabase
              Object.keys(localStorage).forEach(key => {
                if (key.includes('supabase') || key.includes('sb-')) {
                  localStorage.removeItem(key);
                }
              });
              
              // Xóa sessionStorage liên quan đến Supabase
              Object.keys(sessionStorage).forEach(key => {
                if (key.includes('supabase') || key.includes('sb-')) {
                  sessionStorage.removeItem(key);
                }
              });
              
              // Xóa cookies liên quan đến Supabase
              document.cookie.split(";").forEach(c => {
                const cookieName = c.split("=")[0].trim();
                if (cookieName.includes('supabase') || cookieName.includes('sb-')) {
                  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
              });
              
              console.log('Đã xóa dữ liệu phiên, chuyển hướng đến trang đăng nhập...');
              
              // Reset client để tạo mới trong lần sau
              supabaseClient = null;
            } catch (error) {
              console.error('Lỗi khi xóa dữ liệu phiên:', error);
            }
            
            // Kiểm tra nếu đang ở trang đăng nhập thì không chuyển hướng
            if (!window.location.pathname.includes('/auth/signin')) {
              // Chuyển hướng đến trang đăng nhập với tham số logout=true để bypass middleware
              window.location.href = '/auth/signin?logout=true&t=' + Date.now();
            }
          } else {
            console.log('Phát hiện đăng xuất do token hết hạn, không phải chủ ý - KHÔNG chuyển hướng');
            // Đánh dấu đã đăng xuất nhưng không chuyển hướng, để trang Profile xử lý hiển thị guest view
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token đã được làm mới tự động');
          lastTokenRefresh = Date.now();
        } else if (event === 'SIGNED_IN') {
          console.log('Người dùng đã đăng nhập thành công');
          lastTokenRefresh = Date.now();
          
          // Kiểm tra nếu đang ở trang đăng nhập, chuyển hướng đến dashboard
          if (window.location.pathname.includes('/auth/signin')) {
            // Thêm một delay nhỏ để đảm bảo session được lưu đầy đủ
            setTimeout(() => {
              window.location.href = '/dashboard?login_success=true&ts=' + Date.now();
            }, 500);
          }
        }
      });

      // Hàm để chủ động refresh token
      const refreshToken = async () => {
        try {
          const now = Date.now();
          
          // Chỉ refresh token khi đã quá thời gian quy định hoặc bị buộc refresh
          if (now - lastTokenRefresh > TOKEN_REFRESH_INTERVAL) {
            console.log('Đang thử refresh token...');
            
            // Nếu đang ở trang đăng nhập, bỏ qua refresh
            if (window.location.pathname.includes('/auth/signin')) {
              console.log('Đang ở trang đăng nhập, bỏ qua refresh token');
              return null;
            }
            
            const { data, error } = await client.auth.getSession();
            
            if (error) {
              console.error('Lỗi khi lấy session:', error);
              
              // Kiểm tra cache session nếu có lỗi
              try {
                const cachedSession = localStorage.getItem('sb_session_cache');
                if (cachedSession) {
                  const parsed = JSON.parse(cachedSession);
                  // Kiểm tra xem session cache có hết hạn không
                  if (parsed.expires_at && parsed.expires_at * 1000 > now) {
                    console.log('Sử dụng session cache do lỗi refresh');
                    return { user: parsed.user };
                  }
                }
              } catch (e) {
                console.error('Lỗi khi đọc session cache:', e);
              }
              
              return null;
            }
            
            if (data.session) {
              // Session vẫn hợp lệ, cập nhật thời gian
              lastTokenRefresh = now;
              
              // Chủ động gọi getUser để kích hoạt refresh token
              const { data: userData } = await client.auth.getUser();
              
              console.log('Token đã được làm mới, phiên hợp lệ');
              
              // Lưu cache session vào localStorage để có thể sử dụng khi cần
              try {
                localStorage.setItem('sb_session_cache', JSON.stringify({
                  timestamp: now,
                  user: userData?.user || data.session.user,
                  expires_at: data.session.expires_at
                }));
              } catch (cacheError) {
                console.error('Không thể cache session:', cacheError);
              }
              
              return data.session;
            } else {
              console.log('Không có phiên hợp lệ');
              
              // Kiểm tra cache trước khi trả về null
              try {
                const cachedSession = localStorage.getItem('sb_session_cache');
                if (cachedSession) {
                  const parsed = JSON.parse(cachedSession);
                  // Nếu cache còn hạn (chưa hết hạn và không quá 10 phút)
                  if (parsed.expires_at && 
                      parsed.timestamp &&
                      parsed.expires_at * 1000 > now && 
                      now - parsed.timestamp < 10 * 60 * 1000) {
                    console.log('Sử dụng session cache vì không có phiên active');
                    return { user: parsed.user };
                  }
                }
              } catch (e) {
                console.error('Lỗi khi đọc session cache:', e);
              }
              
              return null;
            }
          } else {
            // Trả về phiên từ cache nếu có
            try {
              const cachedSession = localStorage.getItem('sb_session_cache');
              if (cachedSession) {
                const parsed = JSON.parse(cachedSession);
                // Kiểm tra xem session cache có hết hạn không
                if (parsed.expires_at && parsed.expires_at * 1000 > now) {
                  return { user: parsed.user };
                }
              }
            } catch (e) {
              console.error('Lỗi khi đọc session cache:', e);
            }
            
            // Nếu không có cache hoặc cache hết hạn, gọi getSession
            const { data } = await client.auth.getSession();
            return data.session;
          }
        } catch (error) {
          console.error('Lỗi khi refresh token:', error);
          return null;
        }
      };
      
      // Gắn refreshToken vào client nhưng không trực tiếp để tránh lỗi TypeScript
      (client as any).customRefreshToken = refreshToken;
      
      // Bắt đầu interval để refresh token định kỳ
      const refreshInterval = setInterval(refreshToken, 60 * 1000); // Mỗi 1 phút
      
      // Thêm sự kiện visibility change để refresh khi tab được kích hoạt lại
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('Tab kích hoạt lại, kiểm tra session...');
          refreshToken();
        }
      });
      
      // Gọi refresh token ngay lập tức khi khởi tạo
      refreshToken();
    }
    
    return client;
  } catch (error) {
    console.error('Lỗi khởi tạo Supabase Client:', error);
    
    // Log thông tin môi trường
    console.error('Thông tin môi trường:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) || 'không có',
      nodeEnv: process.env.NODE_ENV
    });
    
    // Fallback mặc định để tránh crash ứng dụng
    try {
      const isBrowser = typeof window !== 'undefined';
      const client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: true,
            detectSessionInUrl: true,
            autoRefreshToken: true,
            storageKey: 'sb:session',
            // Thiết lập storage
            storage: isBrowser ? window.localStorage : undefined
          },
          global: {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              "Content-Type": "application/json",
              "X-Client-Info": isBrowser ? `supabase-js/2.x (${window.navigator.userAgent})` : "supabase-js/node"
            }
          }
        }
      );
      
      // Lưu client để tái sử dụng
      supabaseClient = client;
      
      return client;
    } catch (fallbackError) {
      console.error('Lỗi khởi tạo Supabase Client fallback:', fallbackError);
      throw new Error('Không thể kết nối với Supabase');
    }
  }
};

// Custom fetch function với timeout và retry
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  // Đảm bảo apikey được thêm vào headers
  const headers = {
    ...options?.headers,
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    "Content-Type": "application/json"
  };
  
  const MAX_RETRIES = 3;
  let retries = 0;
  
  const fetchWithRetry = (): Promise<Response> => {
    // Set timeout 10 giây cho mỗi request
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout after 10 seconds'))
      }, 10000)
    });
    
    // Thực hiện request với headers đã sửa
    const fetchPromise = fetch(url, {
      ...options,
      headers
    });
    
    // Trả về promise đầu tiên hoàn thành hoặc bị từ chối
    return Promise.race([fetchPromise, timeoutPromise])
      .then((response) => {
        // Nếu response không thành công, thử lại
        if (!response.ok && retries < MAX_RETRIES) {
          retries++;
          console.log(`Request failed, retrying (${retries}/${MAX_RETRIES})...`);
          return fetchWithRetry();
        }
        return response;
      })
      .catch((error) => {
        // Nếu có lỗi và vẫn còn lượt thử lại, thử lại
        if (retries < MAX_RETRIES) {
          retries++;
          console.log(`Request error, retrying (${retries}/${MAX_RETRIES})...`, error);
          return fetchWithRetry();
        }
        throw error;
      });
  };
  
  return fetchWithRetry();
}; 