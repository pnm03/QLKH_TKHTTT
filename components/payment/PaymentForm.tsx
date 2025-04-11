'use client'

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';

interface PaymentMethod {
  payment_id: number;
  payment_method_name: string;
  description: string;
  image: string;
  created_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

export default function PaymentForm() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(Date.now()); // Dùng để reset form
  const formRef = useRef<HTMLFormElement>(null);
  const supabase = createClient();

  // Fetch payment methods on component mount
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra kích thước file (giới hạn 1MB)
      if (file.size > 1024 * 1024) {
        toast.error('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 1MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const paymentMethodName = formData.get('paymentMethodName') as string;
    const description = formData.get('description') as string;

    if (!imageFile || !imagePreview) {
      toast.error('Vui lòng chọn ảnh minh họa');
      setLoading(false);
      return;
    }

    try {
      // Lấy user ID
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Lỗi khi lấy thông tin người dùng:', userError);
        toast.error('Không thể xác thực người dùng');
        setLoading(false);
        return;
      }

      // Sử dụng base64 image trực tiếp từ imagePreview
      // Lưu ý: imagePreview đã là chuỗi base64 từ FileReader.readAsDataURL

      // Insert payment method into database
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          payment_method_name: paymentMethodName,
          description: description,
          image: imagePreview, // Lưu trực tiếp chuỗi base64
          user_id: userData.user?.id || null,
        });

      if (insertError) {
        console.error('Lỗi khi thêm phương thức thanh toán:', insertError);
        toast.error('Không thể lưu phương thức thanh toán');
        setLoading(false);
        return;
      }

      toast.success('Thêm phương thức thanh toán thành công');

      // Đặt lại form và state bằng cách cập nhật key
      setFormKey(Date.now());
      setImagePreview(null);
      setImageFile(null);

      // Tải lại danh sách phương thức thanh toán
      fetchPaymentMethods();
    } catch (error) {
      console.error('Lỗi không xác định:', error);
      toast.error('Có lỗi xảy ra khi thêm phương thức thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      // Bước 1: Lấy danh sách phương thức thanh toán
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Lỗi khi tải danh sách phương thức thanh toán:', paymentsError);

        // Nếu lỗi là do bảng không tồn tại, hiển thị thông báo phù hợp
        if (paymentsError.code === '42P01') { // Mã lỗi PostgreSQL cho "relation does not exist"
          toast.error('Bảng payments chưa được tạo trong cơ sở dữ liệu');
        } else {
          toast.error('Không thể tải danh sách phương thức thanh toán');
        }

        // Trả về mảng rỗng để tránh lỗi
        setPaymentMethods([]);
        return;
      }

      if (!paymentsData || paymentsData.length === 0) {
        // Không có dữ liệu
        setPaymentMethods([]);
        return;
      }

      // Tạo một bản sao của dữ liệu để xử lý
      const processedData = [...paymentsData];

      // Bước 2: Lấy thông tin người dùng cho mỗi phương thức thanh toán có user_id
      const userIds = processedData
        .filter(item => item.user_id)
        .map(item => item.user_id);

      if (userIds.length > 0) {
        try {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('user_id, email, full_name')
            .in('user_id', userIds);

          if (!usersError && usersData) {
            // Tạo map để tra cứu nhanh
            const userMap = new Map();
            usersData.forEach(user => {
              userMap.set(user.user_id, user);
            });

            // Cập nhật thông tin người dùng cho mỗi phương thức thanh toán
            processedData.forEach(item => {
              const user = userMap.get(item.user_id);
              if (user) {
                item.user_email = user.email;
                item.user_name = user.full_name;
              } else {
                item.user_email = 'Không có thông tin';
                item.user_name = 'Người dùng ẩn danh';
              }
            });
          }
        } catch (userError) {
          console.error('Lỗi khi lấy thông tin người dùng:', userError);
          // Không hiển thị lỗi này cho người dùng, chỉ ghi log
        }
      }

      // Cập nhật state với dữ liệu đã xử lý
      setPaymentMethods(processedData);
    } catch (error) {
      console.error('Lỗi không xác định khi tải danh sách phương thức thanh toán:', error);
      toast.error('Không thể tải danh sách phương thức thanh toán');
      setPaymentMethods([]);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phương thức thanh toán này?')) {
      return;
    }

    try {
      // Xóa phương thức thanh toán từ cơ sở dữ liệu
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('payment_id', paymentId);

      if (deleteError) {
        console.error('Lỗi khi xóa phương thức thanh toán:', deleteError);
        toast.error('Không thể xóa phương thức thanh toán');
        return;
      }

      toast.success('Xóa phương thức thanh toán thành công');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Lỗi không xác định khi xóa phương thức thanh toán:', error);
      toast.error('Không thể xóa phương thức thanh toán');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Thêm phương thức thanh toán mới</h2>
          <p className="text-blue-100 text-sm">Tích hợp các phương thức thanh toán cho hệ thống bán hàng</p>
        </div>
        <div className="p-6">
          <form key={formKey} ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="paymentMethodName" className="block text-sm font-medium text-gray-700 mb-1">
                Tên phương thức thanh toán
              </label>
              <input
                id="paymentMethodName"
                name="paymentMethodName"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                required
                placeholder="Ví dụ: COD, Visa, MasterCard, MoMo, ZaloPay..."
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                required
                placeholder="Mô tả chi tiết về phương thức thanh toán, hướng dẫn sử dụng, thông tin liên hệ..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                  Ảnh minh họa
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Nhấp để tải lên</span> hoặc kéo và thả</p>
                      <p className="text-xs text-gray-500">SVG, PNG, JPG hoặc GIF (Tối đa 1MB)</p>
                    </div>
                    <input
                      id="image"
                      name="image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      required
                    />
                  </label>
                </div>
              </div>
              <div>
                {imagePreview ? (
                  <div className="mt-2">
                    <p className="block text-sm font-medium text-gray-700 mb-1">Xem trước ảnh</p>
                    <div className="w-full h-64 border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="block text-sm font-medium text-gray-700 mb-1">Xem trước ảnh</p>
                    <div className="w-full h-64 border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      <p className="text-gray-400">Chưa có ảnh được chọn</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : 'Thêm phương thức thanh toán'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-teal-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Danh sách phương thức thanh toán</h2>
          <p className="text-green-100 text-sm">Các phương thức thanh toán hiện có trong hệ thống</p>
        </div>
        <div className="p-6">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có phương thức thanh toán</h3>
              <p className="mt-1 text-sm text-gray-500">Bắt đầu bằng cách thêm phương thức thanh toán mới.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paymentMethods.map((method) => (
                <div key={method.payment_id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-200 overflow-hidden">
                    {method.image ? (
                      <img
                        src={method.image}
                        alt={method.payment_method_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Nếu hình ảnh không tải được, hiển thị placeholder
                          e.currentTarget.onerror = null; // Tránh vòng lặp vô hạn
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gray-100">
                              <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                              <p class="mt-2 text-sm text-gray-500">Hình ảnh không khả dụng</p>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">Không có hình ảnh</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{method.payment_method_name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{method.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Thêm ngày: {new Date(method.created_at).toLocaleDateString('vi-VN')}
                        </span>
                        <button
                          onClick={() => handleDeletePayment(method.payment_id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Xóa
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Người thêm: {method.user_name || 'Không xác định'}
                        {method.user_email ? ` (${method.user_email})` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}