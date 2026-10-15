// apply-rpc-fix.ts — Applies ONLY the corrected confirm_order_payment_atomic function 
// to the database. Does not re-run the full migration. Safe to run repeatedly (idempotent).
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_URL = process.argv[2] || '';
if (!DB_URL) { console.error('Pass DB URL as first arg'); process.exit(1); }

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('Connected to:', DB_URL.replace(/\/\/[^@]+@/, '//***@'));

  // Read the migration file and extract lines 193-722 (function definition + grants)
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20261009_webhook_events_and_payment_persistence.sql');
  const fullMigration = readFileSync(migrationPath, 'utf-8');
  const lines = fullMigration.split(/\r?\n/);

  // Extract function definition (lines 193-703, 1-indexed) and grants (lines 705-721)
  // Line 193 = CREATE OR REPLACE FUNCTION, Line 703 = $$;
  const functionDef = lines.slice(192, 703).join('\n');
  const grants = lines.slice(704, 721).join('\n');

  const sql = `
-- Targeted corrective migration: Replace confirm_order_payment_atomic
-- with v_existing_event RECORD bug fix (scalar variables)
-- Safe to run repeatedly: CREATE OR REPLACE is idempotent.

BEGIN;

${functionDef}

${grants}

COMMIT;
`;

  console.log('\n--- SQL to execute (first 500 chars of DECLARE) ---');
  const declIdx = sql.indexOf('DECLARE');
  const beginIdx = sql.indexOf('BEGIN', declIdx + 10);
  console.log(sql.substring(declIdx, beginIdx > 0 ? beginIdx + 6 : declIdx + 800));
  console.log('--- end preview ---');

  // Verify key fix markers before executing
  if (!sql.includes('v_evt_found')) {
    console.error('ABORT: Fix marker v_evt_found not found in extracted SQL!');
    process.exit(1);
  }
  // Check for the actual buggy declaration (not comments mentioning it)
  if (/^\s+v_existing_event\s+RECORD/m.test(sql)) {
    console.error('ABORT: Old buggy v_existing_event RECORD declaration still present!');
    process.exit(1);
  }

  console.log('\nExecuting corrective SQL...');
  await client.query(sql);
  console.log('SQL executed successfully.');

  // Verify the fix was applied
  const verifyRes = await client.query(
    `SELECT pg_get_functiondef(oid) AS src FROM pg_proc
     WHERE proname = 'confirm_order_payment_atomic'
       AND pronamespace = 'public'::regnamespace`
  );
  if (verifyRes.rows.length === 0) {
    console.error('VERIFICATION FAILED: Function not found after execution!');
    process.exit(1);
  }
  const src = verifyRes.rows[0].src;
  console.log('\n--- Post-execution verification ---');
  console.log('HAS_v_existing_event_RECORD:', src.includes('v_existing_event record'));
  console.log('HAS_v_evt_found:', src.includes('v_evt_found'));
  console.log('HAS_v_evt_id:', src.includes('v_evt_id'));

  if (src.includes('v_existing_event record')) {
    console.error('VERIFICATION FAILED: Old buggy RECORD still in installed function!');
    process.exit(1);
  }
  if (!src.includes('v_evt_found')) {
    console.error('VERIFICATION FAILED: Fix marker v_evt_found not found in installed function!');
    process.exit(1);
  }

  // Verify grants
  const grants2 = await client.query(
    `SELECT grantee, privilege_type FROM information_schema.routine_privileges
     WHERE routine_name = 'confirm_order_payment_atomic' AND routine_schema = 'public'`
  );
  console.log('\nRPC_GRANTS after fix:');
  grants2.rows.forEach((r: any) => console.log(' ', r.grantee, ':', r.privilege_type));

  // Verify existing data is preserved
  const cap = await client.query(`SELECT COUNT(*) AS cnt FROM public.payments WHERE status = 'CAPTURED'`);
  const ord = await client.query(`SELECT COUNT(*) AS cnt FROM public.orders`);
  console.log('\nData preservation check:');
  console.log('  CAPTURED payments:', cap.rows[0].cnt);
  console.log('  Total orders:', ord.rows[0].cnt);

  console.log('\n✓ Corrective RPC fix applied and verified successfully.');
  await client.end();
}

main().catch(e => { console.error('FATAL:', e.message); client.end(); process.exit(1); });
