'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function SimpleRegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = createClient()
      console.log('Đang đăng ký với email:', email)

      // Đăng ký đơn giản không có metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('Lỗi đăng ký:', error)
        setError(error.message)
      } else {
        console.log('Kết quả đăng ký:', data)
        setMessage('Đăng ký thành công! Kiểm tra email của bạn để xác nhận.')
      }
    } catch (e) {
      console.error('Ngoại lệ khi đăng ký:', e)
      setError(e instanceof Error ? e.message : 'Lỗi không xác định khi đăng ký')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng ký đơn giản
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Form đăng ký tối giản để kiểm tra kết nối Supabase
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <p>{message}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Gợi ý email thử nghiệm:</p>
          <ul className="list-disc pl-5 mt-1 text-sm">
            <li>test@example.com (định dạng email cơ bản)</li>
            <li>user1@test.com (email đơn giản)</li>
            <li>test.user@yourdomain.com (thay yourdomain.com bằng tên miền thực)</li>
          </ul>
          <p className="text-xs mt-2">Có thể Supabase đang hạn chế email Gmail trong quá trình phát triển</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 