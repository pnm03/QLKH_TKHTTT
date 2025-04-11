import PaymentForm from '@/components/payment/PaymentForm';

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quản lý phương thức thanh toán</h1>
        <PaymentForm />
      </div>
    </div>
  );
} 