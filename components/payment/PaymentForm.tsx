'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';
import { PencilIcon } from '@heroicons/react/24/outline';

interface PaymentMethod {
  payment_id: number;
  payment_method_name: string;
  description: string;
  image: string;
  created_at: string;
  // user_id đã bị loại bỏ khỏi bảng
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

  // State cho modal chỉnh sửa
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [editFormData, setEditFormData] = useState({
    payment_method_name: '',
    description: '',
    image: ''
  });

  // Định nghĩa fetchPaymentMethods với useCallback
  const fetchPaymentMethods = useCallback(async () => {
    try {
      // Bước 1: Lấy danh sách phương thức thanh toán
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Lỗi khi tải danh sách phương thức thanh toán:', paymentsError);

        // Hiển thị chi tiết lỗi đầy đủ
        toast.error(
          <div>
            <p><strong>Lỗi khi tải danh sách phương thức thanh toán:</strong></p>
            <p><strong>Mã lỗi:</strong> {paymentsError.code || 'unknown'}</p>
            <p><strong>Thông báo:</strong> {paymentsError.message}</p>
            <p><strong>Chi tiết:</strong> {JSON.stringify(paymentsError, null, 2)}</p>
          </div>,
          {
            autoClose: false,
            closeButton: true,
            draggable: true
          }
        );

        // Nếu lỗi là do bảng không tồn tại, hiển thị thông báo phù hợp
        if (paymentsError.code === '42P01') { // Mã lỗi PostgreSQL cho "relation does not exist"
          toast.warning('Bảng payments chưa được tạo trong cơ sở dữ liệu. Vui lòng chạy migration để tạo bảng.', {
            autoClose: false,
            closeButton: true
          });
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

      // Đã loại bỏ phần xử lý liên quan đến user_id
      // Gán giá trị mặc định cho các trường user_email và user_name
      processedData.forEach(item => {
        item.user_email = 'Hệ thống';
        item.user_name = 'Hệ thống';
      });

      // Cập nhật state với dữ liệu đã xử lý
      setPaymentMethods(processedData);
    } catch (error) {
      console.error('Lỗi không xác định khi tải danh sách phương thức thanh toán:', error);

      // Hiển thị chi tiết lỗi
      let errorMessage = 'Không thể tải danh sách phương thức thanh toán';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'object' && error !== null) {
        errorDetails = JSON.stringify(error, null, 2);
      }

      toast.error(
        <div>
          <p><strong>Lỗi:</strong> {errorMessage}</p>
          {errorDetails && <p><strong>Chi tiết:</strong> {errorDetails}</p>}
        </div>,
        {
          autoClose: false,
          closeButton: true,
          draggable: true
        }
      );

      setPaymentMethods([]);
    }
  }, [supabase]);

  // Fetch payment methods on component mount
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

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
      toast.error('Vui lòng chọn ảnh minh họa', {
        autoClose: false,
        closeButton: true,
        draggable: true
      });
      setLoading(false);
      return;
    }

    try {

      // Insert payment method into database
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          payment_method_name: paymentMethodName,
          description: description,
          image: imagePreview,
          // Đã loại bỏ trường user_id
        });

      if (insertError) {
        console.error('Lỗi khi thêm phương thức thanh toán:', insertError);

        // Hiển thị chi tiết lỗi đầy đủ
        toast.error(
          <div>
            <p><strong>Lỗi database:</strong> {insertError.message}</p>
            <p><strong>Mã lỗi:</strong> {insertError.code || 'unknown'}</p>
            <p><strong>Chi tiết:</strong> {JSON.stringify(insertError, null, 2)}</p>
            <p><strong>Hint:</strong> {insertError.hint || 'Không có gợi ý'}</p>
            <p><strong>Details:</strong> {insertError.details || 'Không có chi tiết bổ sung'}</p>
          </div>,
          {
            autoClose: false,
            closeButton: true,
            draggable: true
          }
        );

        // Special handling for missing table error
        if (insertError.code === '42P01') {
          toast.warning('Bảng payments không tồn tại. Vui lòng tạo bảng trong Supabase trước.', {
            autoClose: false,
            closeButton: true
          });
        }
        // Xử lý lỗi vi phạm ràng buộc
        else if (insertError.code === '23505') {
          toast.warning('Phương thức thanh toán này đã tồn tại.', {
            autoClose: false,
            closeButton: true
          });
        }
        // Xử lý lỗi quyền truy cập
        else if (insertError.code === '42501') {
          toast.warning('Bạn không có quyền thêm phương thức thanh toán.', {
            autoClose: false,
            closeButton: true
          });
        }

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

      // Hiển thị chi tiết lỗi không xác định
      let errorMessage = 'Có lỗi xảy ra khi thêm phương thức thanh toán';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'object' && error !== null) {
        errorDetails = JSON.stringify(error, null, 2);
      }

      toast.error(
        <div>
          <p><strong>Lỗi:</strong> {errorMessage}</p>
          {errorDetails && <p><strong>Chi tiết:</strong> {errorDetails}</p>}
        </div>,
        {
          autoClose: false,
          closeButton: true,
          draggable: true
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setEditFormData({
      payment_method_name: method.payment_method_name,
      description: method.description,
      image: method.image || ''
    });
    setImagePreview(method.image || null);
    setImageFile(null); // Reset image file when editing
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedPaymentMethod(null);
    setEditFormData({
      payment_method_name: '',
      description: '',
      image: ''
    });
    setImagePreview(null);
    setImageFile(null);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  const updatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentMethod) return;

    setLoading(true);

    try {
      // Kiểm tra dữ liệu
      if (!editFormData.payment_method_name.trim()) {
        toast.error('Vui lòng nhập tên phương thức thanh toán');
        setLoading(false);
        return;
      }

      // Cập nhật phương thức thanh toán
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_method_name: editFormData.payment_method_name,
          description: editFormData.description,
          image: imagePreview || null,
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', selectedPaymentMethod.payment_id);

      if (updateError) {
        console.error('Lỗi khi cập nhật phương thức thanh toán:', updateError);
        toast.error(
          <div>
            <p><strong>Lỗi khi cập nhật phương thức thanh toán:</strong></p>
            <p><strong>Mã lỗi:</strong> {updateError.code || 'unknown'}</p>
            <p><strong>Thông báo:</strong> {updateError.message}</p>
            <p><strong>Chi tiết:</strong> {JSON.stringify(updateError, null, 2)}</p>
          </div>,
          {
            autoClose: false,
            closeButton: true,
            draggable: true
          }
        );
        setLoading(false);
        return;
      }

      toast.success('Cập nhật phương thức thanh toán thành công');

      // Đóng modal và tải lại danh sách
      closeEditModal();
      fetchPaymentMethods();
    } catch (error) {
      console.error('Lỗi không xác định khi cập nhật phương thức thanh toán:', error);

      // Hiển thị chi tiết lỗi
      let errorMessage = 'Không thể cập nhật phương thức thanh toán';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'object' && error !== null) {
        errorDetails = JSON.stringify(error, null, 2);
      }

      toast.error(
        <div>
          <p><strong>Lỗi:</strong> {errorMessage}</p>
          {errorDetails && <p><strong>Chi tiết:</strong> {errorDetails}</p>}
        </div>,
        {
          autoClose: false,
          closeButton: true,
          draggable: true
        }
      );
    } finally {
      setLoading(false);
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

        // Hiển thị chi tiết lỗi khi xóa
        toast.error(
          <div>
            <p><strong>Lỗi khi xóa phương thức thanh toán:</strong></p>
            <p><strong>Mã lỗi:</strong> {deleteError.code || 'unknown'}</p>
            <p><strong>Thông báo:</strong> {deleteError.message}</p>
            <p><strong>Chi tiết:</strong> {JSON.stringify(deleteError, null, 2)}</p>
          </div>,
          {
            autoClose: false,
            closeButton: true,
            draggable: true
          }
        );
        return;
      }

      toast.success('Xóa phương thức thanh toán thành công');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Lỗi không xác định khi xóa phương thức thanh toán:', error);

      // Hiển thị chi tiết lỗi
      let errorMessage = 'Không thể xóa phương thức thanh toán';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'object' && error !== null) {
        errorDetails = JSON.stringify(error, null, 2);
      }

      toast.error(
        <div>
          <p><strong>Lỗi:</strong> {errorMessage}</p>
          {errorDetails && <p><strong>Chi tiết:</strong> {errorDetails}</p>}
        </div>,
        {
          autoClose: false,
          closeButton: true,
          draggable: true
        }
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
        <div className="bg-gray-200 px-6 py-3 relative overflow-hidden">
          <h2 className="text-xl font-bold text-gray-700">
            Thêm phương thức thanh toán mới
          </h2>
          <p className="text-gray-500 text-sm mt-1">Tích hợp các phương thức thanh toán cho hệ thống bán hàng</p>
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
        <div className="bg-gray-200 px-6 py-3 relative overflow-hidden">
          <h2 className="text-xl font-bold text-gray-700">
            Danh sách phương thức thanh toán
          </h2>
          <p className="text-gray-500 text-sm mt-1">Các phương thức thanh toán hiện có trong hệ thống</p>
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
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gray-100">
                              <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                              <p class="mt-2 text-sm text-gray-500">Hình ảnh không khả dụng</p>
                            </div>
                          `;
                          }
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
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditPayment(method)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeletePayment(method.payment_id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Người thêm: Hệ thống
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal chỉnh sửa phương thức thanh toán */}
      {showEditModal && selectedPaymentMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Lớp nền trong suốt */}
          <div className="fixed inset-0 backdrop-brightness-[0.5] backdrop-blur-[0.8px]" onClick={closeEditModal}></div>

          {/* Modal content */}
          <div className="bg-white bg-opacity-70 backdrop-blur-md rounded-lg text-left overflow-hidden shadow-xl sm:max-w-lg sm:w-full relative z-10 border-2 border-indigo-300 transform transition-all">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white">Chỉnh sửa phương thức thanh toán</h2>
              <p className="text-purple-100 text-sm">Cập nhật thông tin phương thức thanh toán</p>
            </div>

            <form onSubmit={updatePaymentMethod} className="p-6 space-y-6">
              <div>
                <label htmlFor="edit_payment_method_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Tên phương thức thanh toán
                </label>
                <input
                    id="edit_payment_method_name"
                    name="payment_method_name"
                    value={editFormData.payment_method_name}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
              </div>

              <div>
                <label htmlFor="edit_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                    id="edit_description"
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="edit_image" className="block text-sm font-medium text-gray-700 mb-1">
                    Ảnh minh họa
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Nhấp để tải lên</span> hoặc kéo và thả</p>
                        <p className="text-xs text-gray-500">SVG, PNG, JPG hoặc GIF (Tối đa 1MB)</p>
                        </div>
                      <input
                        id="edit_image"
                        name="image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      </label>
                    </div>
                </div>
                <div>
                  {imagePreview ? (
                    <div className="mt-2">
                      <p className="block text-sm font-medium text-gray-700 mb-1">Xem trước ảnh</p>
                      <div className="w-full h-48 border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
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
                      <div className="w-full h-48 border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        <p className="text-gray-400">Chưa có ảnh được chọn</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang xử lý...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
