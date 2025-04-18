// create-category-table.js
const { createClient } = require('@supabase/supabase-js');

// Supabase connection details
const supabaseUrl = 'https://aacmtacfsqbalzydqqmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY210YWNmc3FiYWx6eWRxcW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDgyNzk5MiwiZXhwIjoyMDYwNDAzOTkyfQ.eI8h9j39JXveVtqo5gl66RLAn-tD5Oh0CyW-V-II4eo'; // Using service role key for admin operations

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// SQL to create category table
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

async function createCategoryTable() {
  try {
    console.log('Creating category table...');
    
    // First, check if the exec_sql RPC function exists
    try {
      const { data: rpcCheck, error: rpcError } = await supabase.rpc('exec_sql', { 
        sql_query: 'SELECT 1' 
      });
      
      if (rpcError) {
        console.error('Error checking RPC function:', rpcError);
        console.log('The exec_sql RPC function may not exist in your database.');
        console.log('Please run the SQL directly in the Supabase dashboard SQL editor.');
        return;
      }
      
      console.log('RPC function exists, executing SQL...');
      
      // Execute SQL using Supabase's rpc function
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error('Error executing SQL:', error);
      } else {
        console.log('Category table created successfully!');
        console.log(data);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

// Execute the function
createCategoryTable();