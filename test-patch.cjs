const http = require('http');

async function testPatch() {
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9161110030', role: 'ADMIN' })
  });
  const { token } = await loginRes.json();
  console.log('Got admin token');

  // get order ID for SS-1681-0619
  const id = '2112c14b-9896-4896-a910-f21b6fe00221';

  const res = await fetch(`http://127.0.0.1:3000/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'DELIVERED' })
  });
  const data = await res.json();
  console.log('Response:', data);
  
  // verify in DB
  const supabase = require('@supabase/supabase-js');
  const client = supabase.createClient('https://pdovuxqbymgqzvaxcwuk.supabase.co', '***REMOVED***');
  
  const { data: dbData } = await client.from('orders').select('status, payment_status').eq('id', id).single();
  console.log('In DB:', dbData);
}

testPatch().catch(console.error);
