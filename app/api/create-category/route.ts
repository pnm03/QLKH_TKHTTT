import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // SQL to create category table with lowercase name
    const sql = `
    CREATE TABLE IF NOT EXISTS category (
        category_id SERIAL PRIMARY KEY,
        name_category VARCHAR(255) NOT NULL UNIQUE,
        description_category TEXT NOT NULL,
        image_category TEXT NULL
    );
    
    COMMENT ON TABLE category IS 'Bảng lưu thông tin danh mục sản phẩm';
    COMMENT ON COLUMN category.category_id IS 'Mã danh mục (tự tăng)';
    COMMENT ON COLUMN category.name_category IS 'Tên danh mục sản phẩm (duy nhất)';
    COMMENT ON COLUMN category.description_category IS 'Mô tả về danh mục';
    COMMENT ON COLUMN category.image_category IS 'URL/Đường dẫn ảnh danh mục (dạng text, base64 hoặc url)';
    `;
    
    // Try direct SQL execution if available
    try {
      const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', { 
        sql_query: sql 
      });
      
      if (sqlError) {
        console.error('Error executing SQL via RPC:', sqlError);
        throw sqlError;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Category table created successfully via SQL',
        data: sqlResult
      });
    } catch (sqlErr) {
      console.log('SQL execution failed, trying alternative method:', sqlErr);
      
      // Alternative: Check if table exists
      const { error: checkError } = await supabase
        .from('category')
        .select('category_id')
        .limit(1);
      
      if (checkError && checkError.message.includes('does not exist')) {
        // Table doesn't exist, create it using Supabase's schema builder
        // This is a fallback and may not work as expected
        console.log('Table does not exist, trying to create via schema builder');
        
        // We can't directly create tables via the JS client, so return instructions
        return NextResponse.json({ 
          success: false, 
          message: 'Category table does not exist and could not be created automatically',
          error: checkError.message,
          instructions: 'Please run the SQL script manually in the Supabase dashboard'
        }, { status: 500 });
      } else if (checkError) {
        return NextResponse.json({ 
          success: false, 
          message: 'Error checking if table exists',
          error: checkError.message
        }, { status: 500 });
      } else {
        return NextResponse.json({ 
          success: true, 
          message: 'Category table already exists'
        });
      }
    }
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json(
      { 
        success: false,
        error: err instanceof Error ? err.message : 'Server error when creating table'
      }, 
      { status: 500 }
    );
  }
}