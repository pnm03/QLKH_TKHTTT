'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormInput from '@/app/components/FormInput'
import { createClient } from '@/utils/supabase/client'

// Định nghĩa schema validation
const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ')
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [unlockAccount, setUnlockAccount] = useState(false)

  // Sử dụng useSearchParams để lấy email từ URL
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: emailFromUrl || ''
    }
  })

  // Set giá trị email từ URL khi component được mount
  useEffect(() => {
    if (emailFromUrl) {
      setValue('email', emailFromUrl)
      // Nếu có email từ URL, giả định là đang thử mở khóa tài khoản bị khóa
      setUnlockAccount(true)
    }
  }, [emailFromUrl, setValue])

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // Lấy site URL từ biến môi trường hoặc sử dụng window.location.origin nếu không có
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

      // Gửi email đặt lại mật khẩu
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${siteUrl}/auth/reset-password`
      })

      if (error) {
        setError(error.message)
        return
      }

      // Nếu đang mở khóa tài khoản, cập nhật trạng thái tài khoản trong database
      if (unlockAccount) {
        try {
          // Cập nhật trạng thái tài khoản trong database
          const { error: updateError } = await supabase
            .from('accounts')
            .update({
              status: 'active'
            })
            .eq('username', data.email);

          if (updateError) {
            console.error('Lỗi khi mở khóa tài khoản:', updateError);
            // Không hiển thị lỗi này cho người dùng vì email đặt lại mật khẩu vẫn đã được gửi
          } else {
            console.log('Đã đánh dấu tài khoản để mở khóa khi đặt lại mật khẩu:', data.email);
          }
        } catch (dbError) {
          console.error('Lỗi khi cập nhật database:', dbError);
        }
      }

      // Gửi email reset thành công
      setIsSuccess(true)
    } catch (error) {
      console.error('Lỗi khi gửi email khôi phục:', error)
      setError('Đã xảy ra lỗi khi gửi email khôi phục. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">Kiểm tra email của bạn</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu đến <span className="font-medium text-indigo-600">{emailFromUrl || 'địa chỉ email của bạn'}</span>.
            </p>
            <p className="mt-2 text-center text-sm text-gray-600">
              Vui lòng kiểm tra hộp thư (và thư mục spam) để tiếp tục.
            </p>
            {unlockAccount && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Lưu ý:</span> Sau khi đặt lại mật khẩu thành công, tài khoản của bạn sẽ được mở khóa.
                </p>
              </div>
            )}
            <div className="mt-6 text-center">
              <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                Quay lại trang đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            {unlockAccount ? 'Mở khóa tài khoản' : 'Quên mật khẩu?'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {unlockAccount
              ? 'Tài khoản của bạn đã bị khóa. Vui lòng đặt lại mật khẩu để mở khóa.'
              : 'Nhập địa chỉ email của bạn và chúng tôi sẽ gửi cho bạn liên kết để đặt lại mật khẩu.'}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
                <div className="mt-1 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <FormInput
              id="email"
              type="email"
              label="Email"
              placeholder="Nhập địa chỉ email của bạn"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
            />
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
              ) : (
                unlockAccount ? 'Gửi email mở khóa tài khoản' : 'Gửi email khôi phục'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Quay lại trang đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}