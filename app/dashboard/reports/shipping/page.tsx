// app/dashboard/reports/shipping/page.tsx
import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import ShippingReportClient from './ShippingReportClient';

export default async function ShippingReportPage() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  // --- Fetch Data ---
  // Fix: Use lowercase 'shippings' table name
  const { count: totalShipmentCount, error: totalError } = await supabase
    .from('shippings')
    .select('*', { count: 'exact', head: true });

  // Đếm đơn đã thanh toán
  // Lấy danh sách các đơn hàng đã thanh toán
  const { data: paidOrders, error: paidOrdersError } = await supabase
    .from('orders')
    .select('order_id')
    .eq('status', 'Đã thanh toán')
    .eq('is_shipping', true);

  // Lấy số lượng đơn vận chuyển đã thanh toán
  let successfulShipmentCount = 0;
  let successError = null;

  if (paidOrdersError) {
    successError = paidOrdersError;
  } else {
    const paidOrderIds = paidOrders?.map(order => order.order_id) || [];

    if (paidOrderIds.length > 0) {
      const { count, error } = await supabase
        .from('shippings')
        .select('*', { count: 'exact', head: true })
        .in('order_id', paidOrderIds);

      if (error) {
        successError = error;
      } else {
        successfulShipmentCount = count || 0;
      }
    }
  }

  // Đếm đơn đã giao hàng
  const { count: deliveredShipmentCount, error: deliveredError } = await supabase
    .from('shippings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Đã giao hàng');

  // --- Alternative approach if RPC function doesn't exist yet ---
  // Fetch top products directly with a join query
  let topProductsData = [];
  let productError = null;

  try {
    // First try the RPC function
    const { data, error } = await supabase
      .rpc('get_top_shipped_products_v2', { limit_count: 10 });

    if (error) {
      console.error('RPC function error:', error);

      // Fallback to direct query if RPC fails
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
        productError = directError.message;
      } else if (directData) {
        // Filter to only include orders with shipping
        const { data: shippingOrders } = await supabase
          .from('orders')
          .select('order_id')
          .eq('is_shipping', true);

        const shippingOrderIds = shippingOrders?.map(order => order.order_id) || [];

        // Count products in shipping orders
        const productCounts = {};
        directData.forEach(detail => {
          if (shippingOrderIds.includes(detail.order_id)) {
            const productName = detail.name_product;
            productCounts[productName] = (productCounts[productName] || 0) + 1;
          }
        });

        // Convert to array and sort
        topProductsData = Object.entries(productCounts)
          .map(([product_name, count]) => ({
            product_name,
            shipment_count: count as number
          }))
          .sort((a, b) => (b.shipment_count as number) - (a.shipment_count as number))
          .slice(0, 10);
      }
    } else {
      topProductsData = data || [];
    }
  } catch (err) {
    console.error('Error fetching top products:', err);
    productError = err.message;
  }

  // --- Calculate Metrics ---
  const finalTotalShipments = totalShipmentCount ?? 0;
  const finalSuccessfulShipments = successfulShipmentCount ?? 0;
  const finalDeliveredShipments = deliveredShipmentCount ?? 0;

  // Tính tỷ lệ thanh toán
  const successRate = finalTotalShipments > 0
    ? (finalSuccessfulShipments / finalTotalShipments) * 100
    : 0;

  // Tính tỷ lệ giao hàng thành công
  const deliverySuccessRate = finalTotalShipments > 0
    ? (finalDeliveredShipments / finalTotalShipments) * 100
    : 0;

  // Map fetched data to the expected format for rendering
  const topProducts = topProductsData?.map(item => ({
    name: item.product_name ?? 'Unknown Product',
    count: item.shipment_count ?? 0,
  })) ?? [];

  // --- Render Client Component ---
  return (
    <ShippingReportClient
      totalShipments={finalTotalShipments}
      successfulShipments={finalSuccessfulShipments}
      successRate={successRate}
      deliveredShipments={finalDeliveredShipments}
      deliverySuccessRate={deliverySuccessRate}
      topProducts={topProducts}
      totalError={totalError ? totalError.message : null}
      successError={successError ? successError.message : null}
      productError={productError}
      deliveredError={deliveredError ? deliveredError.message : null}
    />
  );
}
