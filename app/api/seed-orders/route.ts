import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Lấy danh sách người dùng để lấy customer_id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id')
      .limit(3)
    
    if (usersError) {
      throw new Error(`Lỗi khi lấy danh sách người dùng: ${usersError.message}`)
    }
    
    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Không tìm thấy người dùng nào. Vui lòng tạo người dùng trước.' 
      })
    }
    
    // Lấy danh sách phương thức thanh toán
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('payment_id')
      .limit(2)
    
    if (paymentsError) {
      throw new Error(`Lỗi khi lấy danh sách phương thức thanh toán: ${paymentsError.message}`)
    }
    
    if (!payments || payments.length === 0) {
      // Tạo phương thức thanh toán mẫu
      const { data: newPayment, error: newPaymentError } = await supabase
        .from('payments')
        .insert([
          {
            payment_method_name: 'Tiền mặt',
            description: 'Thanh toán bằng tiền mặt khi nhận hàng',
            user_id: users[0].user_id
          },
          {
            payment_method_name: 'Chuyển khoản',
            description: 'Thanh toán bằng chuyển khoản ngân hàng',
            user_id: users[0].user_id
          }
        ])
        .select()
      
      if (newPaymentError) {
        throw new Error(`Lỗi khi tạo phương thức thanh toán: ${newPaymentError.message}`)
      }
      
      payments = newPayment || []
    }
    
    // Lấy danh sách sản phẩm
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('product_id, product_name, price')
      .limit(5)
    
    if (productsError) {
      throw new Error(`Lỗi khi lấy danh sách sản phẩm: ${productsError.message}`)
    }
    
    if (!products || products.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Không tìm thấy sản phẩm nào. Vui lòng tạo sản phẩm trước.' 
      })
    }
    
    // Tạo 5 đơn hàng mẫu
    const orders = []
    const orderDetails = []
    
    for (let i = 0; i < 5; i++) {
      const userId = users[Math.floor(Math.random() * users.length)].user_id
      const paymentId = payments[Math.floor(Math.random() * payments.length)].payment_id
      const isShipping = Math.random() > 0.5
      const status = Math.random() > 0.5 ? 'Đã thanh toán' : 'Chưa thanh toán'
      
      // Tạo mã đơn hàng
      const orderId = `ORD${Date.now().toString().slice(-8)}${i}`
      
      // Tính tổng tiền đơn hàng
      let totalPrice = 0
      
      // Tạo chi tiết đơn hàng (2-3 sản phẩm mỗi đơn)
      const numProducts = Math.floor(Math.random() * 2) + 2
      for (let j = 0; j < numProducts; j++) {
        const product = products[Math.floor(Math.random() * products.length)]
        const quantity = Math.floor(Math.random() * 5) + 1
        const unitPrice = product.price
        const subtotal = quantity * unitPrice
        
        totalPrice += subtotal
        
        orderDetails.push({
          order_id: orderId,
          product_id: product.product_id,
          name_product: product.product_name,
          name_check: `Hóa đơn ${orderId}`,
          quantity: quantity,
          unit_price: unitPrice,
          subtotal: subtotal
        })
      }
      
      // Tạo đơn hàng
      orders.push({
        order_id: orderId,
        customer_id: userId,
        order_date: new Date().toISOString(),
        price: totalPrice,
        status: status,
        is_shipping: isShipping,
        payment_method: paymentId
      })
      
      // Nếu đơn hàng có vận chuyển, tạo thông tin vận chuyển
      if (isShipping) {
        const { data: userInfo, error: userInfoError } = await supabase
          .from('users')
          .select('full_name, phone, hometown')
          .eq('user_id', userId)
          .single()
        
        if (!userInfoError && userInfo) {
          const shippingStatuses = ['pending', 'shipped', 'delivered', 'cancelled']
          const randomStatus = shippingStatuses[Math.floor(Math.random() * shippingStatuses.length)]
          
          await supabase
            .from('shippings')
            .insert({
              shipping_id: `SHP${Date.now().toString().slice(-8)}${i}`,
              order_id: orderId,
              name_customer: userInfo.full_name,
              phone_customer: userInfo.phone,
              shipping_address: userInfo.hometown,
              carrier: 'Giao hàng nhanh',
              tracking_number: `TRK${Math.floor(Math.random() * 1000000)}`,
              shipping_cost: Math.floor(Math.random() * 50000) + 20000,
              status: randomStatus
            })
        }
      }
    }
    
    // Thêm đơn hàng vào database
    const { error: ordersError } = await supabase
      .from('orders')
      .insert(orders)
    
    if (ordersError) {
      throw new Error(`Lỗi khi tạo đơn hàng: ${ordersError.message}`)
    }
    
    // Thêm chi tiết đơn hàng vào database
    const { error: orderDetailsError } = await supabase
      .from('order_details')
      .insert(orderDetails)
    
    if (orderDetailsError) {
      throw new Error(`Lỗi khi tạo chi tiết đơn hàng: ${orderDetailsError.message}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Đã tạo dữ liệu mẫu thành công',
      data: {
        orders: orders.length,
        orderDetails: orderDetails.length
      }
    })
  } catch (error) {
    console.error('Lỗi khi tạo dữ liệu mẫu:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Lỗi không xác định',
    }, { status: 500 })
  }
}