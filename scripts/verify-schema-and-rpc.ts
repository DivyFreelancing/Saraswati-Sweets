import { Client } from 'pg';
import 'dotenv/config';

// Never print DB_URL or credentials
const DB_URL = process.env.DATABASE_URL || process.argv[2] || '';
if (!DB_URL) {
  console.error('ERROR: Database connection string not provided via DATABASE_URL or argument.');
  process.exit(1);
}

const client = new Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('--- DATABASE CONNECTION VERIFIED (Host connected, credentials hidden) ---');

  // 1. Verify RPC definition and grants
  console.log('\n=========================================');
  console.log('1. RPC DEFINITION & GRANTS VERIFICATION');
  console.log('=========================================');

  const fnRes = await client.query(`
    SELECT p.oid, p.proname, p.prosecdef, pg_get_functiondef(p.oid) AS src,
           pg_get_function_arguments(p.oid) AS args,
           pg_get_function_identity_arguments(p.oid) AS id_args,
           p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'confirm_order_payment_atomic' AND n.nspname = 'public';
  `);

  if (fnRes.rows.length === 0) {
    console.error('FAIL: confirm_order_payment_atomic is NOT installed in public schema!');
    process.exit(1);
  }

  const fn = fnRes.rows[0];
  console.log('Function Name:', fn.proname);
  console.log('Function Identity Arguments:', fn.id_args);
  console.log('Security Definer (prosecdef):', fn.prosecdef);
  console.log('Config (search_path):', fn.proconfig);

  const src: string = fn.src;
  const hasBuggyRecord = /v_existing_event\s+record/i.test(src);
  const hasScalarFound = src.includes('v_evt_found');
  const hasScalarId = src.includes('v_evt_id');
  const hasScalarStatus = src.includes('v_evt_status');
  const hasScalarProvPayId = src.includes('v_evt_prov_pay_id');

  console.log('Contains buggy `v_existing_event record`:', hasBuggyRecord);
  console.log('Contains scalar `v_evt_found`:', hasScalarFound);
  console.log('Contains scalar `v_evt_id`:', hasScalarId);
  console.log('Contains scalar `v_evt_status`:', hasScalarStatus);
  console.log('Contains scalar `v_evt_prov_pay_id`:', hasScalarProvPayId);

  // Check routine privileges
  const privRes = await client.query(`
    SELECT grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_name = 'confirm_order_payment_atomic'
      AND routine_schema = 'public';
  `);
  console.log('\nRoutine Privileges (Grants):');
  for (const row of privRes.rows) {
    console.log(` - Grantee: ${row.grantee}, Privilege: ${row.privilege_type}`);
  }

  // 2. Check webhook_events and other schema changes from migration 20261009
  console.log('\n=========================================');
  console.log('2. SCHEMA CHANGES FROM 20261009 VERIFICATION');
  console.log('=========================================');

  // 2a. webhook_events table
  const tblRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'webhook_events'
    ORDER BY ordinal_position;
  `);
  console.log(`webhook_events columns count: ${tblRes.rows.length}`);
  for (const c of tblRes.rows) {
    console.log(` - ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`);
  }

  // RLS on webhook_events
  const rlsRes = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname = 'webhook_events' AND relnamespace = 'public'::regnamespace;
  `);
  console.log('webhook_events RLS enabled:', rlsRes.rows[0]?.relrowsecurity);

  // Policies on webhook_events
  const polRes = await client.query(`
    SELECT polname, polcmd, polroles::regrole[] AS roles, pg_get_expr(polqual, polrelid) AS qual
    FROM pg_policy
    WHERE polrelid = 'public.webhook_events'::regclass;
  `);
  console.log('webhook_events Policies:');
  for (const p of polRes.rows) {
    console.log(` - Policy: ${p.polname}, Command: ${p.polcmd}, Roles: ${p.roles}, Qual: ${p.qual}`);
  }

  // Table grants on webhook_events
  const tblGrants = await client.query(`
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'webhook_events';
  `);
  console.log('webhook_events Table Grants:');
  for (const tg of tblGrants.rows) {
    console.log(` - Grantee: ${tg.grantee}, Privilege: ${tg.privilege_type}`);
  }

  // Indexes on webhook_events
  const whIdxRes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'webhook_events';
  `);
  console.log('webhook_events Indexes:');
  for (const idx of whIdxRes.rows) {
    console.log(` - ${idx.indexname}: ${idx.indexdef}`);
  }

  // 2b. payments table columns
  const payColRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments'
      AND column_name IN ('provider_order_id', 'provider_payment_id', 'currency', 'razorpay_order_id', 'razorpay_payment_id', 'raw_webhook_payload')
    ORDER BY column_name;
  `);
  console.log('\npayments extended columns:');
  for (const c of payColRes.rows) {
    console.log(` - ${c.column_name} (${c.data_type})`);
  }

  // Indexes on payments
  const payIdxRes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'payments'
      AND indexname IN ('idx_payments_provider_order_id', 'idx_payments_provider_payment_id', 'idx_payments_unique_order_captured', 'idx_payments_unique_provider_payment_captured');
  `);
  console.log('payments indexes from migration:');
  for (const idx of payIdxRes.rows) {
    console.log(` - ${idx.indexname}: ${idx.indexdef}`);
  }

  // 2c. orders table columns
  const ordColRes = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders'
      AND column_name IN ('payment_method', 'confirmed_at', 'cancelled_at', 'cancel_reason', 'paid_at', 'provider_order_id')
    ORDER BY column_name;
  `);
  console.log('\norders extended columns:');
  for (const c of ordColRes.rows) {
    console.log(` - ${c.column_name} (${c.data_type})`);
  }

  // orders check constraint
  const chkRes = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND conname = 'orders_payment_status_check';
  `);
  console.log('orders_payment_status_check constraint:');
  for (const chk of chkRes.rows) {
    console.log(` - ${chk.conname}: ${chk.def}`);
  }

  // Index on orders(provider_order_id)
  const ordIdxRes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'orders'
      AND indexname = 'idx_orders_provider_order_id';
  `);
  console.log('orders idx_orders_provider_order_id:');
  for (const idx of ordIdxRes.rows) {
    console.log(` - ${idx.indexname}: ${idx.indexdef}`);
  }

  // 3. Confirm test data isolation and genuine customer data preservation
  console.log('\n=========================================');
  console.log('3. DATA ISOLATION & CUSTOMER DATA CHECK');
  console.log('=========================================');

  // Count total orders, check for test orders vs genuine orders
  const ordersSummary = await client.query(`
    SELECT 
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE order_number LIKE 'TEST-%') AS test_orders_count,
      COUNT(*) FILTER (WHERE order_number NOT LIKE 'TEST-%') AS genuine_orders_count,
      COUNT(*) FILTER (WHERE payment_status = 'CAPTURED') AS captured_orders,
      COUNT(*) FILTER (WHERE payment_status = 'COMPLETED') AS completed_orders,
      COUNT(*) FILTER (WHERE payment_status = 'PENDING') AS pending_orders
    FROM public.orders;
  `);
  console.log('Orders Summary:', ordersSummary.rows[0]);

  // Payments summary
  const paymentsSummary = await client.query(`
    SELECT 
      COUNT(*) AS total_payments,
      COUNT(*) FILTER (WHERE status = 'CAPTURED') AS captured_payments,
      COUNT(*) FILTER (WHERE provider_payment_id LIKE 'pay_test_%' OR provider_payment_id LIKE 'cf_pay_%' OR provider_payment_id LIKE 'test_%') AS test_provider_payments,
      COUNT(*) FILTER (WHERE status = 'CAPTURED' AND (provider_payment_id IS NULL OR (provider_payment_id NOT LIKE 'pay_test_%' AND provider_payment_id NOT LIKE 'cf_pay_%' AND provider_payment_id NOT LIKE 'test_%'))) AS genuine_captured_payments
    FROM public.payments;
  `);
  console.log('Payments Summary:', paymentsSummary.rows[0]);

  // Webhook events summary
  const webhookSummary = await client.query(`
    SELECT 
      COUNT(*) AS total_webhook_events,
      COUNT(*) FILTER (WHERE event_id LIKE 'evt_test_%' OR event_id LIKE 'test_%') AS test_webhook_events,
      COUNT(*) FILTER (WHERE event_id NOT LIKE 'evt_test_%' AND event_id NOT LIKE 'test_%') AS genuine_webhook_events
    FROM public.webhook_events;
  `);
  console.log('Webhook Events Summary:', webhookSummary.rows[0]);

  // List genuine orders (non-sensitive fields: id, order_number, status, payment_status, created_at)
  const genuineOrders = await client.query(`
    SELECT id, order_number, status, payment_status, created_at, updated_at
    FROM public.orders
    WHERE order_number NOT LIKE 'TEST-%'
    ORDER BY created_at DESC;
  `);
  console.log('\nGenuine orders count:', genuineOrders.rows.length);
  for (const o of genuineOrders.rows) {
    console.log(` - Order: ${o.order_number} (${o.id}), Status: ${o.status}, PaymentStatus: ${o.payment_status}, Created: ${o.created_at}`);
  }

  // Check if any leftover TEST-% orders exist
  const leftoverTestOrders = await client.query(`
    SELECT id, order_number, status, payment_status, created_at
    FROM public.orders
    WHERE order_number LIKE 'TEST-%';
  `);
  console.log('\nLeftover TEST orders count:', leftoverTestOrders.rows.length);
  for (const to of leftoverTestOrders.rows) {
    console.log(` - Test Order: ${to.order_number} (${to.id}), Status: ${to.status}, PaymentStatus: ${to.payment_status}`);
  }

  // Check if any leftover test webhook events exist
  const leftoverTestEvents = await client.query(`
    SELECT id, event_id, event_type, status, created_at
    FROM public.webhook_events
    WHERE event_id LIKE 'evt_test_%' OR event_id LIKE 'test_%';
  `);
  console.log('Leftover TEST webhook events count:', leftoverTestEvents.rows.length);
  for (const te of leftoverTestEvents.rows) {
    console.log(` - Test Event: ${te.event_id}, Status: ${te.status}`);
  }

  await client.end();
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err.message);
  process.exit(1);
});
