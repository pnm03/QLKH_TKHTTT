'use client'

import { useState, useEffect } from 'react'
import PaymentForm from '@/components/payment/PaymentForm'
import { createClient } from '@/utils/supabase/client'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import AccessDenied from '@/components/AccessDenied'

export default function PaymentPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Kiểm tra vai trò người dùng hiện tại có phải admin không
  useEffect(() => {
    if (mounted) {
      const checkUserRole = async () => {
        try {
          const supabase = createClient()
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError || !session) {
            console.error('Không có phiên đăng nhập:', sessionError?.message)
            setIsAdmin(false)
            setLoading(false)
            return
          }

          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (accountError || !accountData) {
            console.error('Lỗi khi lấy thông tin tài khoản:', accountError)
            setIsAdmin(false)
            setLoading(false)
            return
          }

          setIsAdmin(accountData.role === 'admin')
          setLoading(false)
        } catch (error: any) {
          console.error('Lỗi khi kiểm tra vai trò:', error)
          setIsAdmin(false)
          setLoading(false)
        }
      }

      checkUserRole()
    }
  }, [mounted])

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-2 text-gray-500">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quản lý phương thức thanh toán</h1>

        {isAdmin ? (
          <>
            <PaymentForm />
            <ToastContainer position="top-right" autoClose={3000} />
          </>
        ) : (
          <AccessDenied />
        )}
      </div>
    </div>
  )
}