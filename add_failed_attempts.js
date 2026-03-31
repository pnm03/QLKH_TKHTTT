const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aacmtacfsqbalzydqqmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY210YWNmc3FiYWx6eWRxcW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDgyNzk5MiwiZXhwIjoyMDYwNDAzOTkyfQ.eI8h9j39JXveVtqo5gl66RLAn-tD5Oh0CyW-V-II4eo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL() {
  try {
    const sql = "ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;";
    // In execute-category-sql.js the rpc was exec_sql
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error executing SQL via exec_sql:', error);
      // Try alternative name
      const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { query: sql });
      if (error2) console.error('Error executing SQL via execute_sql:', error2);
      else console.log('Column added successfully via execute_sql');
    } else {
      console.log('Column added successfully via exec_sql');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

executeSQL();
