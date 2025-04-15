import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kiểm tra bảng orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('order_id')
      .limit(1)
    
    // Kiểm tra bảng oorders
    const { data: oordersData, error: oordersError } = await supabase
      .from('oorders')
      .select('order_id')
      .limit(1)
    
    return NextResponse.json({ 
      success: true, 
      tables: {
        orders: {
          exists: !ordersError,
          error: ordersError ? ordersError.message : null,
          data: ordersData
        },
        oorders: {
          exists: !oordersError,
          error: oordersError ? oordersError.message : null,
          data: oordersData
        }
      }
    })
  } catch (error) {
    console.error('Lỗi khi kiểm tra bảng:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Lỗi không xác định',
    }, { status: 500 })
  }
}import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kiểm tra bảng orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('order_id')
      .limit(1)
    
    // Kiểm tra bảng oorders
    const { data: oordersData, error: oordersError } = await supabase
      .from('oorders')
      .select('order_id')
      .limit(1)
    
    return NextResponse.json({ 
      success: true, 
      tables: {
        orders: {
          exists: !ordersError,
          error: ordersError ? ordersError.message : null,
          data: ordersData
        },
        oorders: {
          exists: !oordersError,
          error: oordersError ? oordersError.message : null,
          data: oordersData
        }
      }
    })
  } catch (error) {
    console.error('Lỗi khi kiểm tra bảng:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Lỗi không xác định',
    }, { status: 500 })
  }
}