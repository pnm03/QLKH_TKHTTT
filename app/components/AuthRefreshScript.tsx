'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AuthRefreshScript() {
  useEffect(() => {
    const checkAuthState = async () => {
      // Kiểm tra trạng thái đăng xuất trước khi làm bất cứ việc gì
      const isLoggedOut = sessionStorage.getItem('user_logged_out') === 'true' ||
                          sessionStorage.getItem('intentional_logout') === 'true';
      
      if (isLoggedOut) {
        console.log('[AuthRefresh] Đã đăng xuất - bỏ qua refresh')
        return
      }

      // Kiểm tra nếu có tham số logout trong URL
      if (window.location.search.includes('logout=true')) {
        console.log('[AuthRefresh] Phát hiện tham số logout trong URL')
        sessionStorage.setItem('user_logged_out', 'true')
        sessionStorage.setItem('intentional_logout', 'true')
        return
      }

      // Kiểm tra nếu đang ở dashboard, bỏ qua kiểm tra
      if (window.location.pathname.includes('/dashboard')) {
        console.log('[AuthRefresh] Đang ở trang dashboard - Bỏ qua kiểm tra phiên')
        return
      }

      // Kiểm tra tham số URL để tránh vòng lặp
      const urlParams = new URLSearchParams(window.location.search)
      const isRedirect = urlParams.get('redirectTo') !== null
      const hasLoginSuccess = urlParams.get('login_success') === 'true'
      const ts = urlParams.get('ts')
      const recent = ts ? (Date.now() - parseInt(ts)) < 30000 : false // 30 giây

      // Nếu có tham số redirectTo và đang ở trang đăng nhập, bỏ qua kiểm tra
      if (window.location.pathname.includes('/auth/signin') && isRedirect) {
        console.log('[AuthRefresh] On signin page with redirect param - Skip check')
        return
      }
      
      // Nếu vừa đăng nhập thành công, bỏ qua kiểm tra
      if (hasLoginSuccess && recent) {
        console.log('[AuthRefresh] Recent login success - Skip check')
        return
      }

      // Đánh dấu đang kiểm tra để tránh vòng lặp vô hạn
      const isProcessing = sessionStorage.getItem('auth_checking')
      if (isProcessing === 'true') {
        console.log('[AuthRefresh] Already checking auth - Skip')
        return
      }

      // Kiểm tra xem có phải trang yêu cầu đặc biệt không cần kiểm tra
      if (window.location.pathname.includes('/auth/signin')) {
        console.log('[AuthRefresh] On signin page - Skip check')
        return
      }

      try {
        // Đánh dấu đang kiểm tra
        sessionStorage.setItem('auth_checking', 'true')
        
        // Kiểm tra session từ localStorage trước nếu có
        const cachedSession = localStorage.getItem('sb_session_cache')
        let hasValidCachedSession = false
        
        if (cachedSession) {
          try {
            const parsedSession = JSON.parse(cachedSession)
            const now = Date.now()
            
            // Kiểm tra nếu cache còn hạn (chưa hết hạn và không quá 10 phút)
            if (parsedSession.expires_at && 
                parsedSession.timestamp &&
                parsedSession.expires_at * 1000 > now && 
                now - parsedSession.timestamp < 10 * 60 * 1000) {
              console.log('[AuthRefresh] Found valid cached session')
              hasValidCachedSession = true
            }
          } catch (e) {
            console.error('[AuthRefresh] Error parsing cached session:', e)
          }
        }

        // Nếu không có cache hợp lệ, thử lấy session mới
        if (!hasValidCachedSession) {
          console.log('[AuthRefresh] No valid cache, checking actual session')
          const supabase = createClient()
          const { data, error } = await supabase.auth.getSession()

          // Nếu có lỗi nhưng đang ở trang dashboard, không làm gì
          if ((error || !data.session) && window.location.pathname.includes('/dashboard')) {
            console.log('[AuthRefresh] No session but on dashboard page - Skipping redirect')
            sessionStorage.removeItem('auth_checking')
            return
          }

          if (error || !data.session) {
            // Chỉ thử refresh token một lần để tránh vòng lặp vô hạn
            const hasAttempted = sessionStorage.getItem('auth_refresh_attempted')
            
            if (hasAttempted !== 'true') {
              console.log('[AuthRefresh] No valid session, attempting refresh once')
              sessionStorage.setItem('auth_refresh_attempted', 'true')
              
              // Thử gọi refresh API
              window.location.href = `/api/auth/refresh?redirect=${encodeURIComponent(window.location.href)}&ts=${Date.now()}`
              return
            } else {
              console.log('[AuthRefresh] Already attempted refresh, redirecting to signin')
              sessionStorage.removeItem('auth_refresh_attempted')
              
              // Kiểm tra nếu đã ở trang đăng nhập thì không chuyển hướng
              if (!window.location.pathname.includes('/auth/signin') && 
                  !window.location.pathname.includes('/dashboard')) {
                window.location.href = `/auth/signin?expired=true&redirectTo=${encodeURIComponent(window.location.pathname)}`
              }
              return
            }
          }

          // Lưu session mới vào cache
          try {
            localStorage.setItem('sb_session_cache', JSON.stringify({
              timestamp: Date.now(),
              user: data.session.user,
              expires_at: data.session.expires_at
            }))
          } catch (cacheError) {
            console.error('[AuthRefresh] Failed to cache session:', cacheError)
          }
        }

        console.log('[AuthRefresh] Valid session confirmed')
        sessionStorage.removeItem('auth_checking')
        sessionStorage.removeItem('auth_refresh_attempted')
      } catch (error) {
        console.error('[AuthRefresh] Error:', error)
        // Đảm bảo xóa flag khi có lỗi
        sessionStorage.removeItem('auth_checking')
      }
    }

    // Gọi checkAuthState khi component mount
    checkAuthState()
    
    // Đăng ký sự kiện khi trang được focus lại để kiểm tra phiên
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[AuthRefresh] Page visible again, checking auth state')
        checkAuthState()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup
    return () => {
      sessionStorage.removeItem('auth_checking')
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
} 