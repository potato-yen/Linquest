const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function listTables() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(url, key);
  
  const { data, error } = await supabase.rpc('get_tables'); // Custom RPC or just try a known table
  
  console.log('Testing connection to "users" table...');
  const { data: users, error: userErr } = await supabase.from('users').select('id').limit(1);
  if (userErr) {
    console.error('Error fetching users:', userErr.message);
  } else {
    console.log('Successfully connected to "users" table.');
  }

  console.log('Testing connection to "roadmap_mastery" table again...');
  const { data: rm, error: rmErr } = await supabase.from('roadmap_mastery').select('*').limit(1);
  if (rmErr) {
    console.error('Error fetching roadmap_mastery:', rmErr.message);
  } else {
    console.log('Successfully connected to "roadmap_mastery" table!');
  }
}

listTables();
