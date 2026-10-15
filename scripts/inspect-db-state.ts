// inspect-db-state.ts — read-only DB inspection, never prints credentials
import { Client } from 'pg';

const DB_URL = process.argv[2] || process.env.DATABASE_URL || '';
if (!DB_URL) { console.error('Pass DB URL as first arg'); process.exit(1); }

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('Connected to:', DB_URL.replace(/\/\/[^@]+@/, '//***@'));

  // 1. Check installed function
  const fnRes = await client.query(
    `SELECT pg_get_functiondef(oid) AS src FROM pg_proc
     WHERE proname = 'confirm_order_payment_atomic'
       AND pronamespace = 'public'::regnamespace`
  );
  if (fnRes.rows.length === 0) {
    console.log('\nFUNCTION: NOT INSTALLED');
  } else {
    const src: string = fnRes.rows[0].src;
    console.log('\nFUNCTION_EXISTS: YES');
    console.log('HAS_v_existing_event_RECORD:', src.includes('v_existing_event record'));
    console.log('HAS_v_evt_found:', src.includes('v_evt_found'));
    console.log('HAS_v_evt_id:', src.includes('v_evt_id'));
    // Print DECLARE section
    const declIdx = src.indexOf('DECLARE');
    if (declIdx >= 0) {
      const beginIdx = src.indexOf('BEGIN', declIdx);
      console.log('\n--- DECLARE SECTION (installed) ---');
      console.log(src.substring(declIdx, beginIdx > 0 ? beginIdx + 6 : declIdx + 1000));
      console.log('--- END DECLARE ---');
    }
    // Print Step E
    const stepE = src.indexOf('Step E');
    if (stepE >= 0) {
      console.log('\n--- STEP E (installed, 400 chars) ---');
      console.log(src.substring(stepE, stepE + 400));
      console.log('--- END STEP E ---');
    }
  }

  // 2. webhook_events table
  const webhookCols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'webhook_events' AND table_schema = 'public'
     ORDER BY ordinal_position`
  );
  console.log('\nWEBHOOK_EVENTS:', webhookCols.rows.length > 0 ? 'EXISTS' : 'MISSING');
  if (webhookCols.rows.length > 0) {
    console.log('  Columns:', webhookCols.rows.map((r: any) => r.column_name).join(', '));
  }

  // 3. payments columns
  const payCols = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'payments' AND table_schema = 'public'
     ORDER BY ordinal_position`
  );
  console.log('\nPAYMENTS_COLS:', payCols.rows.map((r: any) => r.column_name).join(', '));

  // 4. orders CHECK constraints
  const chk = await client.query(
    `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
     WHERE conrelid = 'public.orders'::regclass AND contype = 'c'`
  );
  console.log('\nORDERS_CHECKS:');
  chk.rows.forEach((r: any) => console.log(' ', r.conname, ':', r.def));

  // 5. Unique indexes on payments
  const payIdx = await client.query(
    `SELECT indexname, indexdef FROM pg_indexes
     WHERE tablename = 'payments' AND schemaname = 'public'`
  );
  console.log('\nPAYMENTS_INDEXES:');
  payIdx.rows.forEach((r: any) => console.log(' ', r.indexname));

  // 6. RPC grants
  const grants = await client.query(
    `SELECT grantee, privilege_type FROM information_schema.routine_privileges
     WHERE routine_name = 'confirm_order_payment_atomic' AND routine_schema = 'public'`
  );
  console.log('\nRPC_GRANTS:');
  grants.rows.forEach((r: any) => console.log(' ', r.grantee, ':', r.privilege_type));

  // 7. webhook_events RLS
  const rlsEnabled = await client.query(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'webhook_events' AND relnamespace = 'public'::regnamespace`
  );
  console.log('\nWEBHOOK_RLS_ENABLED:', rlsEnabled.rows[0]?.relrowsecurity ?? 'table not found');

  const policies = await client.query(
    `SELECT polname, polcmd FROM pg_policy
     WHERE polrelid = 'public.webhook_events'::regclass`
  );
  console.log('WEBHOOK_POLICIES:');
  policies.rows.forEach((r: any) => console.log(' ', r.polname, r.polcmd));

  // 8. Migration history
  try {
    const mig = await client.query(
      `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10`
    );
    console.log('\nRECENT_MIGRATIONS:', mig.rows.map((r: any) => r.version).join(', '));
  } catch (e: any) {
    console.log('\nMIGRATION_HISTORY:', e.message);
  }

  // 9. Existing captured payments count and any test rows
  const capCount = await client.query(
    `SELECT COUNT(*) AS cnt FROM public.payments WHERE status = 'CAPTURED'`
  );
  console.log('\nEXISTING_CAPTURED_PAYMENTS:', capCount.rows[0].cnt);

  const orderCount = await client.query(
    `SELECT COUNT(*) AS cnt FROM public.orders`
  );
  console.log('EXISTING_ORDERS:', orderCount.rows[0].cnt);

  await client.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
