import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Khởi tạo Supabase client (server side)
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const results = {
      database: {
        users: null as any,
        accounts: null as any,
        usersCount: null as any,
        accountsCount: null as any,
        error: null as any
      },
      auth: {
        session: null as any,
        error: null as any
      },
      timestamp: new Date().toISOString(),
      serverInfo: {
        environment: process.env.NODE_ENV,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length : 0
      }
    }
    
    // 1. Kiểm tra kết nối cơ sở dữ liệu 
    try {
      // Kiểm tra user count
      const { count: usersCount, error: usersCountError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      results.database.usersCount = usersCount
      
      if (usersCountError) {
        results.database.error = {
          message: usersCountError.message,
          code: usersCountError.code,
          hint: usersCountError.hint,
          details: usersCountError.details
        }
      }
      
      // Lấy mẫu dữ liệu từ bảng users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(3)
      
      if (usersError) {
        results.database.error = {
          message: usersError.message,
          code: usersError.code,
          hint: usersError.hint,
          details: usersError.details
        }
      } else {
        results.database.users = usersData
      }
      
      // Lấy mẫu dữ liệu từ bảng accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .limit(3)
      
      if (accountsError) {
        if (!results.database.error) {
          results.database.error = {
            message: accountsError.message,
            code: accountsError.code,
            hint: accountsError.hint,
            details: accountsError.details
          }
        }
      } else {
        results.database.accounts = accountsData
      }
      
      // Đếm số lượng accounts
      const { count: accountsCount, error: accountsCountError } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
      
      results.database.accountsCount = accountsCount
      
    } catch (dbError: any) {
      results.database.error = {
        message: dbError.message || 'Unknown database error',
        stack: dbError.stack,
        name: dbError.name
      }
    }
    
    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Unknown error', 
      stack: error.stack,
      name: error.name
    }, { status: 500 })
  }
} 