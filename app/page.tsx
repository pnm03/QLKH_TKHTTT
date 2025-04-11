'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Chuyển hướng đến trang đăng nhập khi trang chính được tải
    router.push('/auth/signin');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Hệ thống Quản lý Bán Hàng</h1>
        <p className="mb-4">Đang chuyển hướng...</p>
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}
