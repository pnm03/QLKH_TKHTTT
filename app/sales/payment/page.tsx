'use client'

import PaymentForm from '@/components/payment/PaymentForm';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tích hợp thanh toán</h1>
        <p className="text-gray-600 mb-8">Quản lý các phương thức thanh toán cho hệ thống bán hàng</p>
        <PaymentForm />
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
} 