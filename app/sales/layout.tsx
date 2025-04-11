'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bán hàng</h1>
          <div className="mt-4 flex space-x-4">
            <Link
              href="/sales/orders"
              className={`px-4 py-2 rounded-md ${
                isActive('/sales/orders')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tạo đơn hàng
            </Link>
            <Link
              href="/sales/payment"
              className={`px-4 py-2 rounded-md ${
                isActive('/sales/payment')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tích hợp thanh toán
            </Link>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
} 