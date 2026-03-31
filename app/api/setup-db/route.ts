import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    
    // Gửi 1 bản ghi bằng 0 để xem nó trả về thế nào
    const { data, error } = await adminClient
      .from('accounts')
      .select('*')
      .limit(1);
      
    if (error) {
       return NextResponse.json({ success: false, error: error });
    }
    
    return NextResponse.json({ success: true, columns: data.length > 0 ? Object.keys(data[0]) : "No data", data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
