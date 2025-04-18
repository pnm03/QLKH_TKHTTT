// execute-category-sql.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase connection details
const supabaseUrl = 'https://aacmtacfsqbalzydqqmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY210YWNmc3FiYWx6eWRxcW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDgyNzk5MiwiZXhwIjoyMDYwNDAzOTkyfQ.eI8h9j39JXveVtqo5gl66RLAn-tD5Oh0CyW-V-II4eo'; // Using service role key for admin operations

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Read SQL file
const sql = fs.readFileSync('./create-category-table.sql', 'utf8');

async function executeSQL() {
  try {
    console.log('Executing SQL to create Category table...');
    
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
}

executeSQL();