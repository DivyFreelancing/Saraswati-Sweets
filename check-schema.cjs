const supabase = require('@supabase/supabase-js');
const client = supabase.createClient('https://pdovuxqbymgqzvaxcwuk.supabase.co', '***REMOVED***');

async function checkSchema() {
  const { data, error } = await client.rpc('get_table_schema', { table_name_param: 'order_items' });
  console.log('rpc get_table_schema:', data, error);
}
checkSchema();
