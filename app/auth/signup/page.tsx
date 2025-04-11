'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormInput from '@/app/components/FormInput'
import { createClient } from '@/utils/supabase/client'

// Định nghĩa schema validation
const signupSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().min(10, 'Số điện thoại phải có ít nhất 10 ký tự').optional(),
  hometown: z.string().optional(),
  birthDate: z.string().optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  })

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setIsLoading(true)
      setAuthError(null)

      const supabase = createClient()

      // Log thông tin đăng ký để debug
      console.log('Đang đăng ký với thông tin:', {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        hometown: data.hometown,
        birthDate: data.birthDate
      })

      // Thử sử dụng cách đơn giản nhất trước - không dùng metadata
      console.log('Thử đăng ký không dùng metadata...')
      const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (signUpError) {
        console.error('Lỗi đăng ký:', signUpError)
        
        if (signUpError.message.includes('User already registered')) {
          setAuthError('Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.')
        } else if (signUpError.message.includes('Database error')) {
          setAuthError('Lỗi kết nối với cơ sở dữ liệu. Vui lòng liên hệ quản trị viên.')
        } else {
          setAuthError(`Lỗi đăng ký: ${signUpError.message}`)
        }
        return
      }

      console.log('Đăng ký thành công, bổ sung metadata...')
      
      // Nếu đăng ký thành công, cập nhật thông tin metadata
      if (signUpData?.user?.id) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: data.fullName,
            phone: data.phone || null,
            hometown: data.hometown || null,
            birth_date: data.birthDate || null
          }
        })
        
        if (updateError) {
          console.error('Không thể cập nhật metadata:', updateError)
          // Không hiển thị lỗi cho người dùng vì đăng ký vẫn thành công
        }
      }

      console.log('Kết quả đăng ký:', signUpData)

      // Đăng ký thành công, hiển thị thông báo
      setIsSuccess(true)
      
      // Chuyển hướng sau 5 giây
      setTimeout(() => {
        router.push('/auth/signin')
      }, 5000)
    } catch (error) {
      console.error('Lỗi đăng ký (ngoại lệ):', error)
      if (error instanceof Error) {
        setAuthError(`Đã xảy ra lỗi khi đăng ký: ${error.message}`)
      } else {
        setAuthError('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại sau.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Đăng ký thành công!</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Vui lòng kiểm tra email của bạn để xác nhận tài khoản. Bạn sẽ được chuyển hướng đến trang đăng nhập sau 5 giây.
            </p>
            <div className="mt-5 text-center">
              <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
                Đi đến trang đăng nhập ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Đăng ký tài khoản</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{' '}
            <Link 
              href="/auth/signin" 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              đăng nhập với tài khoản hiện có
            </Link>
          </p>
        </div>

        {authError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Lỗi đăng ký</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{authError}</p>
                  {authError.includes('email') && (
                    <div className="mt-2">
                      <p className="font-medium">Gợi ý:</p>
                      <ul className="list-disc pl-5 mt-1">
                        <li>Thử dùng email theo định dạng test@example.com</li>
                        <li>Tránh dùng Gmail nếu có thể</li>
                        <li>Kiểm tra cấu hình Email Allowlist trong Supabase</li>
                      </ul>
                    </div>
                  )}
                  {authError.includes('Database error') && (
                    <div className="mt-2">
                      <p className="font-medium">Gợi ý sửa lỗi Database:</p>
                      <ul className="list-disc pl-5 mt-1">
                        <li>Kiểm tra cấu trúc bảng Users và Accounts trong Supabase</li>
                        <li>Kiểm tra các trigger function và bảng SQL</li>
                        <li>Chạy script sửa lỗi database trong SQL Editor</li>
                        <li>Thử lại với một email khác</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm space-y-3">
            <FormInput
              id="fullName"
              type="text"
              label="Họ và tên"
              placeholder="Họ và tên"
              autoComplete="name"
              {...register('fullName')}
              error={errors.fullName?.message}
            />

            <FormInput
              id="email"
              type="email"
              label="Email"
              placeholder="Email"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
            />

            <FormInput
              id="phone"
              type="tel"
              label="Số điện thoại (tùy chọn)"
              placeholder="Số điện thoại"
              autoComplete="tel"
              {...register('phone')}
              error={errors.phone?.message}
            />

            <FormInput
              id="hometown"
              type="text"
              label="Địa chỉ (tùy chọn)"
              placeholder="Địa chỉ"
              autoComplete="address"
              {...register('hometown')}
              error={errors.hometown?.message}
            />

            <FormInput
              id="birthDate"
              type="date"
              label="Ngày sinh (tùy chọn)"
              autoComplete="bday"
              {...register('birthDate')}
              error={errors.birthDate?.message}
            />

            <FormInput
              id="password"
              type="password"
              label="Mật khẩu"
              placeholder="Mật khẩu"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
            />

            <FormInput
              id="confirmPassword"
              type="password"
              label="Xác nhận mật khẩu"
              placeholder="Xác nhận mật khẩu"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 