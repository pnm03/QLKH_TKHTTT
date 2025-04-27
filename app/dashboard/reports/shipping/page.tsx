// app/dashboard/reports/shipping/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import ShippingReportClient from './ShippingReportClient';
import AccessDenied from '@/components/AccessDenied';

export default function ShippingReportPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalShipments: 0,
    successfulShipments: 0,
    successRate: 0,
    deliveredShipments: 0,
    deliverySuccessRate: 0,
    topProducts: [],
    totalError: null,
    successError: null,
    productError: null,
    deliveredError: null
  });

  useEffect(() => {
    // Kiểm tra vai trò người dùng
    const checkUserRole = async () => {
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error('Không có phiên đăng nhập:', sessionError?.message);
          setIsAdmin(false);
          setAuthLoading(false);
          return;
        }

        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (accountError || !accountData) {
          console.error('Lỗi khi lấy thông tin tài khoản:', accountError);
          setIsAdmin(false);
          setAuthLoading(false);
          return;
        }

        setIsAdmin(accountData.role === 'admin');

        // Kiểm tra xem bảng Shippings có dữ liệu hay không
        const { data: allShippings, error: shippingsError } = await supabase
          .from('shippings')
          .select('*');

        console.log('Tất cả dữ liệu vận chuyển:', allShippings);
        console.log('Lỗi khi lấy dữ liệu vận chuyển:', shippingsError);

        // Kiểm tra bảng shipping (không có s)
        const { data: shippingData, error: shippingError } = await supabase
          .from('shipping')
          .select('*');

        console.log('Dữ liệu từ bảng shipping (không có s):', shippingData);
        console.log('Lỗi khi lấy dữ liệu từ bảng shipping:', shippingError);

        // Nếu là admin, tiếp tục lấy dữ liệu báo cáo
        if (accountData.role === 'admin') {
          await fetchReportData(supabase);
        }

        setAuthLoading(false);
      } catch (error) {
        console.error('Lỗi khi kiểm tra vai trò:', error);
        setIsAdmin(false);
        setAuthLoading(false);
      }
    };

    checkUserRole();
  }, []);

  // Hàm lấy dữ liệu báo cáo
  const fetchReportData = async (supabase: SupabaseClient) => {
    try {
      console.log('Đang lấy dữ liệu báo cáo vận chuyển...');

      // --- Fetch Data ---
      // 1. Lấy tổng số đơn vận chuyển từ bảng orders với is_shipping = true
      const { count: totalShipmentCount, error: totalError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_shipping', true);

      console.log('Tổng số đơn vận chuyển (orders với is_shipping=true):', totalShipmentCount);

      if (totalError) {
        console.error('Lỗi khi lấy tổng số đơn vận chuyển:', totalError);
      }

      // Truy vấn chính: Lấy tất cả đơn hàng có is_shipping = true và join với bảng shippings
      const { data: ordersWithShipping, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          shippings (*)
        `)
        .eq('is_shipping', true);

      console.log('Dữ liệu đơn hàng có vận chuyển:', ordersWithShipping);

      if (ordersError) {
        console.error('Lỗi khi lấy đơn hàng có vận chuyển:', ordersError);
      }

      // Xử lý dữ liệu để tính toán các chỉ số
      let successfulShipmentCount = 0;
      let deliveredShipmentCount = 0;
      const successError = null;
      const deliveredError = null;

      if (ordersWithShipping && ordersWithShipping.length > 0) {
        // 2. Đơn đã thanh toán: Đếm số đơn hàng có status là "Đã thanh toán" và có vận chuyển
        const paidOrders = ordersWithShipping.filter(order => order.status === 'Đã thanh toán');
        successfulShipmentCount = paidOrders.length;

        console.log('Số lượng đơn hàng đã thanh toán và có vận chuyển:', successfulShipmentCount);
        console.log('Đơn hàng đã thanh toán:', paidOrders);

        // 3. Đơn đã giao hàng: Lọc các đơn hàng có trạng thái vận chuyển là "Đã giao hàng"
        const deliveredOrders = ordersWithShipping.filter(order =>
          order.shippings && order.shippings.status === 'Đã giao hàng'
        );
        deliveredShipmentCount = deliveredOrders.length;

        console.log('Số lượng đơn đã giao hàng:', deliveredShipmentCount);
        console.log('Dữ liệu đơn đã giao hàng:', deliveredOrders);
      } else {
        console.log('Không tìm thấy đơn hàng nào có vận chuyển');
      }

      // 4. Lấy top sản phẩm được vận chuyển nhiều nhất
      let topProductsData: Array<{product_name: string, shipment_count: number}> = [];
      let productError = null;

      try {
        // Thử sử dụng RPC function nếu có
        const { data, error } = await supabase
          .rpc('get_top_shipped_products_v2', { limit_count: 10 });

        if (error) {
          console.error('RPC function error:', error);

          // Nếu RPC fails, sử dụng truy vấn trực tiếp
          const { data: directData, error: directError } = await supabase
            .from('orderdetails')
            .select(`
              product_id,
              name_product,
              order_id,
              products (product_name)
            `)
            .order('product_id');

          if (directError) {
            console.error('Lỗi khi lấy chi tiết đơn hàng:', directError);
            productError = directError.message;
          } else if (directData) {
            // Lọc để chỉ bao gồm các đơn hàng có vận chuyển
            const { data: shippingOrders } = await supabase
              .from('orders')
              .select('order_id')
              .eq('is_shipping', true);

            const shippingOrderIds = shippingOrders?.map((order: {order_id: string}) => order.order_id) || [];

            // Đếm sản phẩm trong các đơn hàng có vận chuyển
            const productCounts: Record<string, number> = {};
            directData.forEach((detail: {order_id: string, name_product: string}) => {
              if (shippingOrderIds.includes(detail.order_id)) {
                const productName = detail.name_product;
                productCounts[productName] = (productCounts[productName] || 0) + 1;
              }
            });

            // Chuyển đổi thành mảng và sắp xếp
            topProductsData = Object.entries(productCounts)
              .map(([product_name, count]) => ({
                product_name,
                shipment_count: count
              }))
              .sort((a, b) => b.shipment_count - a.shipment_count)
              .slice(0, 10);
          }
        } else {
          topProductsData = data || [];
        }

        console.log('Số lượng sản phẩm top:', topProductsData.length);
        console.log('Dữ liệu sản phẩm top:', topProductsData);
      } catch (err: unknown) {
        console.error('Error fetching top products:', err);
        if (err instanceof Error) {
          productError = err.message;
        } else {
          productError = String(err);
        }
      }

      // --- Tính toán các chỉ số ---
      // Đảm bảo các giá trị là số hợp lệ
      // Nếu không có dữ liệu từ truy vấn, sử dụng độ dài mảng ordersWithShipping
      const finalTotalShipments = ordersWithShipping ? ordersWithShipping.length : 0;
      const finalSuccessfulShipments = typeof successfulShipmentCount === 'number' ? successfulShipmentCount : 0;
      const finalDeliveredShipments = typeof deliveredShipmentCount === 'number' ? deliveredShipmentCount : 0;

      console.log('Giá trị cuối cùng - Tổng đơn vận chuyển:', finalTotalShipments);

      // Tính tỷ lệ thanh toán
      const successRate = finalTotalShipments > 0
        ? (finalSuccessfulShipments / finalTotalShipments) * 100
        : 0;

      // Tính tỷ lệ giao hàng thành công
      const deliverySuccessRate = finalTotalShipments > 0
        ? (finalDeliveredShipments / finalTotalShipments) * 100
        : 0;

      // Chuyển đổi dữ liệu sang định dạng cần thiết cho việc hiển thị
      const topProducts = topProductsData.map(item => ({
        name: item.product_name || 'Unknown Product',
        count: typeof item.shipment_count === 'number' ? item.shipment_count : 0,
      }));

      console.log('Dữ liệu báo cáo đã sẵn sàng:', {
        totalShipments: finalTotalShipments,
        successfulShipments: finalSuccessfulShipments,
        successRate: successRate,
        deliveredShipments: finalDeliveredShipments,
        deliverySuccessRate: deliverySuccessRate,
        topProductsCount: topProducts.length
      });

      // Cập nhật state với dữ liệu báo cáo
      setReportData({
        totalShipments: finalTotalShipments,
        successfulShipments: finalSuccessfulShipments,
        successRate: successRate,
        deliveredShipments: finalDeliveredShipments,
        deliverySuccessRate: deliverySuccessRate,
        topProducts: topProducts,
        totalError: totalError ? totalError.message : null,
        successError: successError ? successError.message : null,
        productError: productError,
        deliveredError: deliveredError ? deliveredError.message : null
      });
    } catch (error: unknown) {
      console.error('Lỗi khi lấy dữ liệu báo cáo:', error);
      // Đặt giá trị mặc định để tránh lỗi NaN
      let errorMessage = 'Lỗi không xác định khi lấy dữ liệu báo cáo';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setReportData({
        totalShipments: 0,
        successfulShipments: 0,
        successRate: 0,
        deliveredShipments: 0,
        deliverySuccessRate: 0,
        topProducts: [],
        totalError: errorMessage,
        successError: null,
        productError: null,
        deliveredError: null
      });
    }
  };

  // Hiển thị loading khi đang kiểm tra quyền
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-2 text-gray-500">Đang tải...</p>
      </div>
    );
  }

  // Hiển thị thông báo từ chối truy cập nếu không phải admin
  if (!isAdmin) {
    return <AccessDenied message="Truy cập bị từ chối. Bạn không có quyền truy cập chức năng báo cáo vận chuyển. Chỉ có admin mới truy cập được." />;
  }

  // Hiển thị báo cáo vận chuyển nếu là admin
  return <ShippingReportClient {...reportData} />;


}
