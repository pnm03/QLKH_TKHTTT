'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResendConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(defaultEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Vui lòng nhập địa chỉ email hợp lệ');
      }
      
      // Gọi API để gửi lại email xác thực
      const response = await fetch(`/api/debug/verify-test?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Không thể gửi lại email xác thực');
      }
      
      setSuccess('Email xác thực đã được gửi! Vui lòng kiểm tra hộp thư đến của bạn.');
      
      // Tự động chuyển hướng đến trang đăng nhập sau 3 giây
      setTimeout(() => {
        router.push(`/auth/signin?email=${encodeURIComponent(email)}`);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi gửi lại email xác thực');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Gửi lại email xác thực
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Nhập email của bạn để nhận lại email xác thực tài khoản
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <p>{success}</p>
            <p className="text-sm mt-2">Đang chuyển hướng đến trang đăng nhập...</p>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="example@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || !!success}
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading || !!success}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  Đang gửi...
                </>
              ) : (
                'Gửi lại email xác thực'
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <Link href="/auth/signin" className="text-sm text-indigo-600 hover:text-indigo-500">
            Quay lại trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
} 