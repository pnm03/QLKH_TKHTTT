import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    const { data, error } = await supabase
      .from('category')
      .select('*')
      .order('category_id', { ascending: true })

    if (error) {
      console.error('Database error when fetching categories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Server error when fetching categories:', err)
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi tải danh mục sản phẩm' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { name_category, description_category, image_category } = await request.json()

  try {
    // Validate required fields
    if (!name_category || !description_category) {
      return NextResponse.json(
        { error: 'Tên danh mục và mô tả là bắt buộc' }, 
        { status: 400 }
      )
    }

    // Insert category with image if provided
    const categoryData: any = { 
      name_category,
      description_category
    }

    // Add image if provided
    if (image_category) {
      categoryData.image_category = image_category
    }

    const { data, error } = await supabase
      .from('category')
      .insert([categoryData])
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi xử lý yêu cầu' }, 
      { status: 500 }
    )
  }
}
