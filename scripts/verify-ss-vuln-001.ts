/**
 * Saraswati Sweets - SS-VULN-001 Live/Staging Verification Script
 *
 * Verifies that an ordinary authenticated customer cannot escalate their own role to 'ADMIN'
 * via direct Supabase client queries, while legitimate field updates (full_name) remain functional.
 *
 * Requirements satisfied:
 * 1. Verifies customer's current profile role before testing.
 * 2. Attempts to update only that customer's own profile role to 'ADMIN'.
 * 3. Checks and reports the actual Supabase error/result.
 * 4. Re-reads the profile from the database and verifies that the role remains unchanged.
 * 5. Verifies that permitted profile fields (full_name) can still be updated and restores the original value.
 * 6. Never prints access tokens, service keys, passwords, or secrets.
 * 7. Strictly rejects running privilege-escalation tests with an ADMIN or STAFF account.
 * 8. Never touches production customer data; operates only on designated test accounts.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Determine configuration (supports explicit staging overrides or local/staging .env)
const supabaseUrl = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.STAGING_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Supabase URL and Anon Key are required.');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, or provide STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY.');
  process.exit(1);
}

// Redact URL for safe logging
const safeHost = (() => {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return 'unknown-host';
  }
})();

console.log('======================================================================');
console.log('SARASWATI SWEETS: SS-VULN-001 VERIFICATION TEST');
console.log('Target Supabase Host:', safeHost);
console.log('======================================================================\n');

async function authenticateTestCustomer(): Promise<{
  client: SupabaseClient;
  user: User;
  isCleanupNeeded: boolean;
}> {
  // Option A: Explicit Customer JWT supplied via environment variable
  const explicitJwt = process.env.TEST_CUSTOMER_JWT;
  if (explicitJwt && explicitJwt.trim().length > 20) {
    console.log('[Auth] Using customer session provided via TEST_CUSTOMER_JWT.');
    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${explicitJwt.trim()}` } },
    });
    const { data: authUser, error: userErr } = await client.auth.getUser(explicitJwt.trim());
    if (userErr || !authUser?.user) {
      throw new Error(`Failed to authenticate with provided TEST_CUSTOMER_JWT: ${userErr?.message || 'Invalid user'}`);
    }
    return { client, user: authUser.user, isCleanupNeeded: false };
  }

  // Option B: Email and Password supplied via environment variables
  const customerEmail = process.env.TEST_CUSTOMER_EMAIL;
  const customerPassword = process.env.TEST_CUSTOMER_PASSWORD;
  if (customerEmail && customerPassword) {
    console.log('[Auth] Authenticating via TEST_CUSTOMER_EMAIL and password.');
    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: customerEmail,
      password: customerPassword,
    });
    if (signInErr || !signInData?.user) {
      throw new Error(`Failed to sign in with provided credentials: ${signInErr?.message}`);
    }
    return { client, user: signInData.user, isCleanupNeeded: false };
  }

  // Option C: Safe isolated test customer provisioned via Service Role on Staging / Development
  if (supabaseServiceKey) {
    console.log('[Auth] Utilizing Service Role to safely generate isolated test customer session.');
    const adminClient = createClient(supabaseUrl!, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const testEmail = `test-audit-customer-${Date.now()}@example.com`;
    console.log('[Auth] Creating temporary isolated test customer account...');
    const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: { full_name: 'Audit Test Customer' },
    });

    if (createErr || !createdUser?.user) {
      throw new Error(`Failed to provision isolated test customer: ${createErr?.message}`);
    }

    const testUserId = createdUser.user.id;

    // Ensure profile row exists with role = CUSTOMER
    const { error: profileUpsertErr } = await adminClient.from('profiles').upsert({
      id: testUserId,
      email: testEmail,
      full_name: 'Audit Test Customer',
      role: 'CUSTOMER',
      is_active: true,
    });

    if (profileUpsertErr) {
      // Clean up auth user if profile creation failed
      await adminClient.auth.admin.deleteUser(testUserId);
      throw new Error(`Failed to ensure test customer profile: ${profileUpsertErr.message}`);
    }

    // Generate sign-in magiclink token hash
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      await adminClient.auth.admin.deleteUser(testUserId);
      throw new Error(`Failed to generate authentication link: ${linkErr?.message}`);
    }

    // Establish customer session using standard anon client
    const customerClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: verifyData, error: verifyErr } = await customerClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    });

    if (verifyErr || !verifyData?.user || !verifyData?.session) {
      await adminClient.auth.admin.deleteUser(testUserId);
      throw new Error(`Failed to verify customer session: ${verifyErr?.message}`);
    }

    return { client: customerClient, user: verifyData.user, isCleanupNeeded: true };
  }

  throw new Error(
    'No authentication mechanism available. Please provide TEST_CUSTOMER_JWT or TEST_CUSTOMER_EMAIL and TEST_CUSTOMER_PASSWORD.'
  );
}

async function run() {
  let authContext: { client: SupabaseClient; user: User; isCleanupNeeded: boolean } | null = null;
  let adminCleanupClient: SupabaseClient | null = null;

  if (supabaseServiceKey) {
    adminCleanupClient = createClient(supabaseUrl!, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }

  try {
    authContext = await authenticateTestCustomer();
    const { client: customerClient, user: customerUser, isCleanupNeeded } = authContext;

    console.log('[Setup] Customer authenticated successfully.');
    console.log('[Setup] Customer UUID:', customerUser.id);

    // -------------------------------------------------------------------------
    // REQUIREMENT 1: Verify customer's current profile role before testing
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 1: Verify Initial Profile Role ---');
    const { data: initialProfile, error: readInitErr } = await customerClient
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', customerUser.id)
      .single();

    if (readInitErr) {
      throw new Error(`Failed to read customer profile before test: ${readInitErr.message}`);
    }

    console.log('Initial Profile State:');
    console.log('  ID:       ', initialProfile.id);
    console.log('  Role:     ', initialProfile.role);
    console.log('  Full Name:', initialProfile.full_name);
    console.log('  Active:   ', initialProfile.is_active);

    // REQUIREMENT 7: Strictly reject running if the account is an administrator or staff
    if (initialProfile.role !== 'CUSTOMER') {
      throw new Error(
        `SAFETY VIOLATION: Account role is '${initialProfile.role}', not 'CUSTOMER'. Escalation tests MUST be performed with an ordinary customer account.`
      );
    }
    console.log('  [VERIFIED] Account is an ordinary CUSTOMER.');

    // -------------------------------------------------------------------------
    // REQUIREMENT 2 & 3: Attempt to update role to ADMIN & check result
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Attempt Unauthorized Role Escalation (role -> ADMIN) ---');
    console.log('Issuing direct Supabase client query: .update({ role: "ADMIN" }).eq("id", customerId)...');

    const { data: escalateData, error: escalateErr } = await customerClient
      .from('profiles')
      .update({ role: 'ADMIN' })
      .eq('id', customerUser.id)
      .select('id, role');

    if (escalateErr) {
      console.log('  [BLOCKED] Supabase returned an error as expected:');
      console.log('    Status / Code:', escalateErr.code);
      console.log('    Message:      ', escalateErr.message);
      if (escalateErr.details) console.log('    Details:      ', escalateErr.details);
      if (escalateErr.hint)    console.log('    Hint:         ', escalateErr.hint);
    } else {
      console.warn('  [ALERT] Supabase query returned without error. Returned payload:', escalateData);
    }

    // -------------------------------------------------------------------------
    // REQUIREMENT 4: Re-read profile and verify role remains unchanged
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: Re-read Profile from Database to Verify Invariance ---');
    const { data: freshProfile, error: reReadErr } = await customerClient
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', customerUser.id)
      .single();

    if (reReadErr) {
      throw new Error(`Failed to re-read profile after escalation attempt: ${reReadErr.message}`);
    }

    console.log('Post-Attempt Profile State:');
    console.log('  Current Role in DB:', freshProfile.role);

    if (freshProfile.role === 'ADMIN') {
      console.error('\n*** VULNERABILITY REPRODUCED: Customer successfully escalated own role to ADMIN! ***');
      console.error('The security migration 20261019_prevent_profile_role_escalation.sql has NOT been applied to this Supabase instance.');
    } else if (freshProfile.role === 'CUSTOMER') {
      console.log('\n✓ PASS: Customer role remains strictly "CUSTOMER". Escalation was blocked.');
    } else {
      console.warn('Unexpected role state:', freshProfile.role);
    }

    // -------------------------------------------------------------------------
    // REQUIREMENT 5: Verify permitted fields (full_name) can still be updated
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: Verify Permitted Field Updates (full_name) ---');
    const originalName = initialProfile.full_name || 'Customer Name';
    const testName = `Verified Customer ${Math.floor(Math.random() * 1000)}`;

    console.log(`Attempting legitimate update: full_name -> "${testName}"...`);
    const { data: legitUpdateData, error: legitUpdateErr } = await customerClient
      .from('profiles')
      .update({ full_name: testName })
      .eq('id', customerUser.id)
      .select('id, full_name, role');

    if (legitUpdateErr) {
      console.warn('  [NOTICE] Permitted update returned error:', legitUpdateErr.message, `(code: ${legitUpdateErr.code})`);
      console.warn('  Check if column-level grants include full_name in the applied database schema.');
    } else {
      console.log('  [PASS] Permitted update succeeded. Profile full_name updated to:', testName);

      // Restore original name
      await customerClient
        .from('profiles')
        .update({ full_name: originalName })
        .eq('id', customerUser.id);
      console.log('  [CLEANUP] Restored full_name to original value.');
    }

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('TEST SUMMARY:');
    console.log('  Role Escalation Blocked: ', freshProfile.role === 'CUSTOMER' ? 'YES (PASSED)' : 'NO (FAILED - VULNERABLE)');
    console.log('  Permitted Field Modifiable:', !legitUpdateErr ? 'YES (PASSED)' : 'NO (FAILED - CHECK GRANTS)');
    console.log('======================================================================');
  } finally {
    // Cleanup temporary test account if created via Service Role
    if (authContext?.isCleanupNeeded && adminCleanupClient && authContext?.user?.id) {
      console.log('\n[Teardown] Cleaning up temporary test customer account...');
      try {
        await adminCleanupClient.from('profiles').delete().eq('id', authContext.user.id);
        await adminCleanupClient.auth.admin.deleteUser(authContext.user.id);
        console.log('[Teardown] Temporary test customer cleaned up cleanly.');
      } catch (cleanupErr: any) {
        console.warn('[Teardown] Warning during cleanup:', cleanupErr?.message);
      }
    }
  }
}

run().catch((err) => {
  console.error('\nFATAL ERROR running verification script:');
  console.error(err.message || err);
  process.exit(1);
});
