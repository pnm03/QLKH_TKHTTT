import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Kiểm tra phiên đăng nhập
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
    }

    // Lấy dữ liệu từ request
    const {
      name_return,
      order_id,
      return_reason,
      refund_amount,
      status,
    } = await request.json();

    // Kiểm tra dữ liệu
    if (!order_id || !return_reason || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Thêm vào database
    const { data, error } = await supabase
      .from('returns')
      .insert([
        {
          name_return,
          order_id,
          return_reason,
          refund_amount: refund_amount || null,
          status,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating return request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error in POST /api/partners/returns:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(_request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Kiểm tra phiên đăng nhập
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
    }

    // Lấy dữ liệu từ database
    const { data, error, count } = await supabase
      .from('returns')
      .select('*', { count: 'exact' })
      .order('return_date', { ascending: false });

    if (error) {
      console.error('Error fetching return requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count });
  } catch (err) {
    console.error('Unexpected error in GET /api/partners/returns:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
