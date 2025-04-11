'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function DebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [cookies, setCookies] = useState<string[]>([])
  const [localStorage, setLocalStorage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)
        // Kiểm tra session
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Lỗi khi kiểm tra session:', error)
          setError(error.message)
        } else {
          setSessionInfo(data.session)
        }

        // Lấy danh sách cookies
        const cookieList = document.cookie.split(';').map(cookie => cookie.trim())
        setCookies(cookieList)

        // Lấy danh sách localStorage
        const localStorageItems: Record<string, string> = {}
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key) {
            localStorageItems[key] = window.localStorage.getItem(key) || ''
          }
        }
        setLocalStorage(localStorageItems)
      } catch (err: any) {
        setError(err.message || 'Lỗi không xác định')
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const handleRefreshSession = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setError(error.message)
      } else {
        setSessionInfo(data.session)
        alert('Đã refresh session!')
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  const handleClearLocalStorage = () => {
    try {
      Object.keys(window.localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          window.localStorage.removeItem(key)
        }
      })
      alert('Đã xóa localStorage liên quan đến Supabase!')
      // Reload trang
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Lỗi không xác định')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Auth</h1>
      
      {loading ? (
        <p>Đang tải...</p>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded mb-4">
          <h2 className="text-red-700 font-bold">Lỗi</h2>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Session</h2>
            {sessionInfo ? (
              <div className="bg-green-100 p-4 rounded">
                <p className="text-green-700 font-bold">Đang đăng nhập</p>
                <p>User: {sessionInfo.user?.email}</p>
                <p>Expires at: {new Date(sessionInfo.expires_at * 1000).toLocaleString()}</p>
                <pre className="mt-2 bg-gray-800 text-white p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(sessionInfo, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="bg-yellow-100 p-4 rounded">
                <p className="text-yellow-700 font-bold">Chưa đăng nhập</p>
                <p>Không tìm thấy session</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Cookies</h2>
            {cookies.length > 0 ? (
              <ul className="bg-blue-50 p-4 rounded">
                {cookies.map((cookie, index) => (
                  <li key={index} className="mb-1">
                    {cookie}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Không tìm thấy cookies</p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Local Storage</h2>
            {localStorage && Object.keys(localStorage).length > 0 ? (
              <pre className="bg-gray-800 text-white p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(localStorage, null, 2)}
              </pre>
            ) : (
              <p>Không tìm thấy dữ liệu localStorage</p>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleRefreshSession}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Refresh Session
            </button>
            <button
              onClick={handleClearLocalStorage}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Xóa localStorage
            </button>
            <a
              href="/api/auth/refresh?redirect=/debug"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded inline-block"
            >
              Gọi API Refresh
            </a>
          </div>
        </>
      )}
    </div>
  )
} 